# CLAUDE.md — JS Visualizer

Project context for Claude Code. JS Visualizer is a free, browser-based tool that
animates JavaScript execution step by step — call stack, Web APIs, task (macrotask)
queue, microtask queue, event loop, variable state, and a force-directed memory graph.

**Live:** https://www.jsvisualizer.bytefront.dev/ · **Repo:** github.com/supratik01/js-visualizer

---

## Commands

```bash
npm install
npm run dev          # dev server — tsx server/index.ts (Express + Vite middleware)
npm run build        # tsx script/build.ts → vite build (client) + esbuild (server) → dist/
npm run start        # NODE_ENV=production node dist/index.cjs
npm run check        # tsc (type-check only, no emit)
```

- **Dev server port:** 5000 (the Claude Code preview launch config "JS Visualizer Dev"
  uses `autoPort`, so it may bind a different port if 5000 is busy).
- **Package manager:** npm (`package-lock.json`). ES modules (`"type": "module"`).

### ⚠️ Pre-existing `tsc` errors — do not chase these
`npm run check` reports ~21 errors that are **config-level, not code bugs**, all from
`tsconfig` `target`/`downlevelIteration` settings:
- `TS2802` — iterating `Map`/`Set`/`RegExp` matches (needs target ≥ es2015 / downlevelIteration)
- `TS2737` / `TS2791` — `BigInt` literals / exponentiation (needs target ≥ es2020)
- `TS2322` at executionEngine — a `"runtime-error"` union-literal mismatch

When verifying a change with `tsc`, **diff against this baseline** — only flag *new*
errors your change introduces. The app builds and runs fine despite these.

---

## Architecture

Client-side SPA + thin Express server. The server serves the built static client and
exists mainly for deployment; **all the interesting logic is client-side.**

```
client/          React 18 + TS + Vite SPA (the whole app)
  src/
    pages/       Route components (Visualizer, Blog, BlogPost, FAQ, PrivacyPolicy, NotFound)
    components/  ~20 UI components (CallStack, WebAPIs, TaskQueue, MicrotaskQueue,
                 EventLoop, Console, memory/*, ControlBar, CodeEditor, etc.)
    lib/         Engine + data + stores (see below)
    hooks/       useSEO, etc.
    data/        blogPosts.tsx, faqs.ts
  index.html     Meta + JSON-LD + noscript SEO content; #root stays empty (see SEO section)
  public/        sitemap.xml, robots.txt, manifest, og-image, etc.
server/          Express: index.ts, routes.ts, static.ts (serves dist), vite.ts, storage.ts
shared/          schema.ts (shared types)
script/build.ts  Build orchestration (vite + esbuild)
knowledge/       Spec-grounded reference docs (NOT shipped; see Knowledge base section)
```

**Stack:** React 18 · TypeScript · Vite · Wouter (routing) · Zustand (state) ·
Monaco Editor · Framer Motion · Tailwind CSS · shadcn/ui (Radix) · Acorn (JS parser).

**Routes** (`client/src/App.tsx`, Wouter):
`/` Visualizer · `/blogs` index · `/blogs/:slug` post · `/faq` · `/privacy`.

---

## The execution engine (the core)

`client/src/lib/executionEngine.ts` (~5,500 lines) is the heart of the app. It parses
user code with **Acorn**, walks the AST, and **simulates** the JS runtime, producing a
flat array of **steps** that the UI replays as an animation.

### Step-stream model
- `parseAndSimulate(code)` returns `ExecutionStep[]`. Each step is `{ type, line, data }`
  with types like `highlight-line`, `push-stack`, `pop-stack`, `add-webapi`,
  `add-task`, `add-microtask`, `remove-*`, `console`, `event-loop-phase`,
  `memory-snapshot`, `explanation`.
- Steps are emitted by **pushing onto `ctx.steps`** during the walk
  (e.g. `ctx.steps.push({ type: 'console', ... })`).
- `client/src/pages/Visualizer.tsx` runs the steps on a `setInterval(speed)` (default
  600ms/step), dispatching each into the Zustand store; the panels render from the store.

### Async / event-loop simulation
The engine reproduces real spec ordering (verified end-to-end against
`knowledge/ecmascript-rules.md`):
- **Microtasks** (Promise reactions, `await` continuations, `queueMicrotask`) drain
  fully before the next **macrotask** (`setTimeout`/`setInterval`).
- `await` suspends the async function (frame leaves the call stack) and resumes via a
  microtask — see `processStatementWithAwait` / `processAsyncResumeMicrotask`.
- `ctx.thisBinding` must be saved/restored across async suspensions and arrow-callback
  macrotasks (timers), or `this` is wrong after the first `await`.

### Generators (important gotcha)
Generators use a **pre-collection + segment-replay** model in `callGeneratorNext`, NOT a
true resumable interpreter:
- On the first `.next()`, the whole body is run once into a **kept** step buffer; the
  buffer length at each `yield` is recorded as a boundary; the buffer is sliced into
  **one segment per `.next()`**.
- Each later `.next()` **replays its segment into the live `ctx.steps`**, so body side
  effects (console, line highlights) appear in correct order. `yield*` works because the
  delegated generator's `.next()` runs while `ctx.steps` is the parent collector.
- **Known limitations:**
  - `.next(value)` **input injection** is NOT modeled (`const x = yield;` won't receive
    the next call's argument) — would require a real resumable interpreter.
  - **Async generators** (`async function*` / `for await…of`) use a *separate*
    pre-collection path (`callGeneratorNext` bails for `__type !== 'Generator'`; see
    ~lines 2755 and 4762) and **still drop body side effects** — open defect, same root
    cause, fixable with the same segment-replay technique applied to those two sites.

### Other engine notes
- Function expressions/arrows snapshot closure vars via `makeClosureVars(ctx)` so outer
  params survive after the defining function returns.
- Destructured params with defaults — e.g. `constructor({ a = 1 } = {})` — are handled in
  `callFunction` (AssignmentPattern + ObjectPattern branch). Watch this when touching
  parameter binding.

### Other lib files
- `runtimeStore.ts` — Zustand store (call stack, queues, console, performance metrics,
  panel toggles, `customExamples`, speed, breakpoints). **Not exposed on `window`.**
- `codeExamples.ts` — 80+ built-in examples in ~22 categories; seeds `customExamples`.
- `tour.ts` — product-tour step definitions (includes the Import-button step).
- `analytics.ts` — GA4 event helpers (consent-gated).
- `jsKnowledgeBase.ts`, `ecmaSpecKnowledgeBase.ts` — see below.

---

## Knowledge base / spec grounding

Two related artifacts — **keep their roles distinct:**

1. **`knowledge/ecmascript-rules.md`** — the **authoritative, spec-grounded source**.
   Behavioral runtime rules extracted *verbatim* from ECMA-262 PDFs (ES2015 6th →
   ES2024 15th, plus ES2019 for the await tick-count change) and the **WHATWG HTML spec**
   (event loop §8.1.7, timers §8.6). Each entry cites section + page and is marked ✅
   verified. Editions live in `/Users/supratik/Projects/ECMA Scripts/` (PDFs +
   `whatwg-html-spec.html`). Key facts encoded: PromiseJobs = microtasks; HTML event-loop
   processing model (task queue is a *set*, first-runnable; microtask checkpoint drains
   FIFO while non-empty); 4ms timer clamp at nesting > 5; top-level await (ES2022)
   mechanism; await native = 1 tick / thenable = +1 tick.

2. **`client/src/lib/ecmaSpecKnowledgeBase.ts`** — the **live runtime file** the
   visualizer imports (explanations, spec section index, `SPEC_TO_VISUALIZER_MAP`).
   It was reconciled against the authoritative `.md`: event-loop queues attributed to
   WHATWG HTML §8.1.7 (not ECMA-262 §9.5); Promise §27.2, Reflect §28.1, Proxy §28.2,
   Iterator §27.1, Generator §27.5.

3. **`knowledge/reconciliation-report.md`** — the diff/review record between the two.

**Rule of thumb:** if you change runtime *behavior*, check it against
`ecmascript-rules.md`; if you change *displayed explanations/citations*, edit
`ecmaSpecKnowledgeBase.ts`. The event loop, macrotask queue, Web APIs, and timers are
**host (WHATWG HTML) concepts, not ECMA-262** — cite accordingly.
Next planned KB work: `knowledge/host-api-rules.md`, starting with `queueMicrotask`.

---

## SEO & content

On-page SEO is already strong (the bottleneck is off-page authority — see
`SEO-ACTION-PLAN.md`). Structure to preserve when editing:

- **`client/index.html`** — `#root` is **intentionally empty**. Markup placed inside it
  stays visible until React mounts, which reads as a flash on every page load; a
  pre-rendered SEO block was tried there and removed for exactly that reason. Keep
  crawler-facing content in the `<noscript>` block and the 6 JSON-LD blocks
  (WebApplication, SoftwareApplication, Organization, Breadcrumb, FAQPage, etc.).
- **Blog** — `client/src/data/blogPosts.tsx` (JSX content + metadata). `BlogPost.tsx`
  injects per-post `TechArticle` JSON-LD. Posts deep-link into the visualizer with
  `/?code=<encoded JS>` ("Try it" links).
- **FAQ** — `client/src/data/faqs.ts` is the single source; mirror any change into the
  static FAQPage JSON-LD in `index.html`.
- **`client/public/sitemap.xml`** — add an entry for every new route/post.
- **`useSEO` hook** — sets title/meta/canonical/OG per SPA route; `BASE_URL` lives here
  (update it if the domain ever moves off the subdomain).

---

## Conventions & gotchas

- **Match surrounding style.** Tailwind utility classes; semantic tokens
  (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`,
  `bg-[hsl(var(--app-bar))]`). Amber is the accent (`amber-500/400`).
- **Avoid dynamic Tailwind class names** (e.g. `` `bg-${color}-500` ``) in new code —
  they get purged. Existing blog content uses some; prefer explicit classes.
- **Routing is `/blogs`** (plural). `/blog` is dead — watch for stale redirects.
- The visualizer page is full-screen (`h-screen`, `overflow-hidden`); there's no room for
  large content sections on `/`.
- **Verifying engine changes:** drive the real app via the preview tools — load code with
  `/?code=…`, click RUN, read the Console panel. The panel's **first line is an
  entry-count badge**, not output; the trailing "Console" is a label. Numeric log values
  (`1`,`2`,`3`) are real output — don't filter them as the badge. Long snippets
  (`allSettled`) take ~15–20s at 600ms/step.

---

## Git / workflow

- Default branch: `main`. Commits in this project have been made directly to `main` when
  the user explicitly asks; **commit/push only when asked.**
- Untracked drafts that intentionally stay out of commits: `devto-*.md`,
  `Why_Do_Promises_*.md` (article drafts).
- End commit messages with the `Co-Authored-By:` trailer.
