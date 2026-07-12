import { ReactNode } from 'react';

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;           // SEO <title> — can differ from display title
  metaDescription: string;
  publishedAt: string;         // ISO date
  updatedAt?: string;
  readingTime: string;
  tags: string[];
  excerpt: string;             // Used on the blog index card
  content: ReactNode;          // Full article body as JSX
}

/* ─── Reusable components for blog content ────────────────────────── */

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'await', 'async', 'if', 'else', 'for',
  'while', 'do', 'new', 'class', 'extends', 'yield', 'of', 'in', 'typeof', 'instanceof',
  'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'default',
  'this', 'super', 'import', 'export', 'from', 'using', 'static', 'get', 'set',
  'true', 'false', 'null', 'undefined', 'void', 'delete',
]);

/**
 * Lightweight JS syntax highlighter for blog code blocks. Single-pass tokenizer
 * (string-aware, so `//` inside a string is not mistaken for a comment) that
 * colors comments, strings, numbers, and keywords distinctly from plain code.
 */
function highlightCode(code: string): ReactNode[] {
  const result: ReactNode[] = [];
  let k = 0;
  const push = (cls: string, text: string) => {
    if (text) result.push(<span key={k++} className={cls}>{text}</span>);
  };
  const pushPlain = (text: string) => {
    if (!text) return;
    // split into identifiers / numbers / everything else, keeping delimiters
    for (const tok of text.split(/(\b[A-Za-z_$][A-Za-z0-9_$]*\b|\b\d[\w.]*\b)/)) {
      if (!tok) continue;
      if (JS_KEYWORDS.has(tok)) push('text-purple-400', tok);
      else if (/^\d/.test(tok)) push('text-orange-300', tok);
      else push('text-emerald-400', tok);
    }
  };

  let inBlockComment = false;
  const lines = code.split('\n');
  lines.forEach((line, li) => {
    let i = 0;
    while (i < line.length) {
      if (inBlockComment) {
        const end = line.indexOf('*/', i);
        if (end === -1) { push('text-zinc-500 italic', line.slice(i)); i = line.length; }
        else { push('text-zinc-500 italic', line.slice(i, end + 2)); i = end + 2; inBlockComment = false; }
        continue;
      }
      const two = line.slice(i, i + 2);
      if (two === '//') { push('text-zinc-500 italic', line.slice(i)); i = line.length; continue; }
      if (two === '/*') {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) { push('text-zinc-500 italic', line.slice(i)); inBlockComment = true; i = line.length; }
        else { push('text-zinc-500 italic', line.slice(i, end + 2)); i = end + 2; }
        continue;
      }
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === ch) { j++; break; }
          j++;
        }
        push('text-amber-300', line.slice(i, j));
        i = j;
        continue;
      }
      // plain run up to the next string/comment delimiter
      let j = i + 1;
      while (j < line.length) {
        const c = line[j], t = line.slice(j, j + 2);
        if (c === '"' || c === "'" || c === '`' || t === '//' || t === '/*') break;
        j++;
      }
      pushPlain(line.slice(i, j));
      i = j;
    }
    if (li < lines.length - 1) result.push(<span key={k++}>{'\n'}</span>);
  });
  return result;
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-6">
      {title && (
        <div className="text-xs text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 border-b-0 rounded-t-lg px-4 py-2">
          {title}
        </div>
      )}
      <pre className={`bg-zinc-900 border border-zinc-800 ${title ? 'rounded-b-lg' : 'rounded-lg'} p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed`}>
        <code>{highlightCode(children)}</code>
      </pre>
    </div>
  );
}

function Callout({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'tip' | 'warning' }) {
  const styles = {
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    tip: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    warning: 'border-red-500/30 bg-red-500/5 text-red-300',
  };
  const labels = { info: 'Note', tip: 'Try it', warning: 'Common mistake' };
  return (
    <div className={`my-6 border-l-4 rounded-r-lg p-4 ${styles[type]}`}>
      <span className="text-xs font-bold uppercase tracking-wider block mb-1">{labels[type]}</span>
      <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

function TryItLink({ code, label }: { code?: string; label?: string }) {
  const href = code
    ? `/?code=${encodeURIComponent(code)}`
    : '/';
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-colors no-underline"
    >
      ▶ {label || 'Try it in JS Visualizer'}
    </a>
  );
}

/* ─── Blog posts ──────────────────────────────────────────────────── */

export const blogPosts: BlogPost[] = [
  {
    slug: 'new-javascript-features-es2026',
    title: '9 New JavaScript Features in ES2026 (Including the Two Everyone Was Waiting For)',
    metaTitle: 'New JavaScript Features in ES2026 — Temporal, using, and More (2026)',
    metaDescription: 'A practical tour of the new JavaScript features finalized in ES2026 — Temporal, explicit resource management (using), Array.fromAsync, Promise.try, Math.sumPrecise, Error.isError, and more — with code examples and the runtime details that matter.',
    publishedAt: '2026-06-30',
    readingTime: '11 min read',
    tags: ['JavaScript', 'ES2026', 'TC39', 'Features'],
    excerpt: 'ES2026 is finalized — and the two features developers have wanted for years, Temporal and the using keyword, finally made the cut. Here are nine additions worth knowing, with a focus on the ones that actually change how your code runs.',
    content: (
      <>
        <p>
          JavaScript ships on a yearly cadence now, and <strong>ES2026</strong> was finalized by TC39 in
          early 2026. Most of these features are already landing in modern browsers and Node.js, so they're
          not "someday" — they're "this year." The headline: the <em>two</em> features developers have asked
          for over and over, <strong>Temporal</strong> and the <strong><code>using</code> keyword</strong>,
          both reached Stage 4 and are in.
        </p>

        <p>
          We pay close attention to each release because we keep{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JS Visualizer</a>{' '}
          accurate against the spec. So here's a practical tour of nine ES2026 additions — with a note on
          which ones change <em>runtime behavior</em> (scheduling, the event loop) versus which are
          quality-of-life value APIs.
        </p>

        <h2 id="temporal" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          1. Temporal — a real date & time API
        </h2>

        <p>
          The single biggest addition. <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Date</code>{' '}
          has been broken for decades — mutable, timezone-ambiguous, off-by-one on parsing.{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Temporal</code> replaces it
          with explicit, immutable types.
        </p>

        <CodeBlock title="temporal.js">{`// Old: ambiguous and mutable
const d = new Date("2026-03-30"); // may be "yesterday" in your timezone
d.setMonth(d.getMonth() + 1);     // can skip a month near month-end

// New: explicit, immutable, unambiguous
const today    = Temporal.Now.plainDateISO();
const birthday = Temporal.PlainDate.from("1987-07-23");
const meeting  = Temporal.ZonedDateTime.from(
  "2026-11-03T10:00:00[Europe/Warsaw]"
);
const nextMonth = today.add({ months: 1 }); // returns a new value`}</CodeBlock>

        <Callout type="info">
          Separate types (<code>PlainDate</code>, <code>PlainTime</code>, <code>PlainDateTime</code>,{' '}
          <code>ZonedDateTime</code>, <code>Duration</code>, <code>Instant</code>) mean the type system tells
          you whether a value carries a timezone. Moment.js, date-fns, and Luxon become largely optional.
        </Callout>

        <Callout type="tip">
          <TryItLink
            code={`const jan31 = Temporal.PlainDate.from("2026-01-31");\nconsole.log(jan31.add({ months: 1 }).toString());   // constrain: 2026-02-28\nconsole.log(jan31.subtract({ months: 2 }).toString());\n\nconst meeting = Temporal.ZonedDateTime.from("2026-11-03T10:00:00[Europe/Warsaw]");\nconsole.log(meeting.toString());\n\nconsole.log(Temporal.Now.plainDateISO().toString());`}
            label="Run Temporal date math in JS Visualizer"
          />
        </Callout>

        <h2 id="using" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          2. Explicit Resource Management — the <code>using</code> keyword
        </h2>

        <p>
          The other long-awaited feature. <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">using</code>{' '}
          (and <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">await using</code>)
          gives deterministic cleanup when a scope exits — like <code>with</code> in Python or{' '}
          <code>using</code> in C#. A resource implements <code>[Symbol.dispose]()</code> (or{' '}
          <code>[Symbol.asyncDispose]()</code>).
        </p>

        <CodeBlock title="using.js">{`// Before: manual try/finally
const file = openFile("data.txt");
try {
  process(file);
} finally {
  file.close();
}

// After: automatic cleanup at end of scope
using file = openFile("data.txt");
process(file);
// file[Symbol.dispose]() runs automatically when the block ends`}</CodeBlock>

        <Callout type="tip">
          Cleanup runs in <strong>reverse order</strong> of declaration (LIFO), and{' '}
          <code>await using</code> awaits each async disposal. Most useful for file handles, DB connections,
          locks, and stream subscriptions.
        </Callout>

        <Callout type="warning">
          <code className="text-amber-400">using</code> / <code className="text-amber-400">await using</code>{' '}
          is new <em>syntax</em>, not just a new API — JS Visualizer's parser doesn't accept it yet, so these
          snippets won't run in the visualizer for now.
        </Callout>

        <h2 id="array-fromasync" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          3. Array.fromAsync — collect an async iterable
        </h2>

        <p>
          The async counterpart to <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Array.from()</code>.
          It awaits each value of an async iterable <em>in sequence</em> and resolves to an array — replacing
          the manual <code>for await … push</code> loop.
        </p>

        <CodeBlock title="from-async.js">{`async function* pages() {
  yield await fetchPage(1);
  yield await fetchPage(2);
}

// Before
const out = [];
for await (const p of pages()) out.push(p);

// After
const all = await Array.fromAsync(pages());

// Optional mapping, like Array.from's second arg
const titles = await Array.fromAsync(pages(), p => p.title);`}</CodeBlock>

        <Callout type="info">
          <strong>Runtime note:</strong> each <code>await</code> here is a microtask resumption — the values
          are collected one at a time, not in parallel. If you need concurrency, reach for{' '}
          <code>Promise.all</code> instead. This is exactly the kind of ordering JS Visualizer animates.
        </Callout>

        <Callout type="tip">
          <TryItLink
            code={`(async () => {\n  const a = await Array.fromAsync([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);\n  console.log('values: ' + a.join(','));\n\n  const b = await Array.fromAsync([10, 20], x => x * 2);\n  console.log('mapped: ' + b.join(','));\n})();\nconsole.log('sync runs first');`}
            label="Run Array.fromAsync in JS Visualizer"
          />
        </Callout>

        <h2 id="promise-try" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          4. Promise.try — uniform sync/async error handling
        </h2>

        <p>
          Call a function that <em>might</em> be sync or async and get a promise either way — with synchronous
          throws captured as rejections, no <code>try/catch</code> wrapper needed.
        </p>

        <CodeBlock title="promise-try.js">{`// Catches both sync throws and async rejections uniformly
Promise.try(() => mightThrowOrReturnAPromise())
  .then(handle)
  .catch(onError);`}</CodeBlock>

        <p>
          The callback runs synchronously, but <code>.then</code>/<code>.catch</code> fire as{' '}
          <strong>microtasks</strong> — the same scheduling rule behind why a Promise callback always beats a{' '}
          <code>setTimeout(fn, 0)</code>. If that ordering isn't second nature yet, watch it run:
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log('sync start');\nsetTimeout(() => console.log('macrotask'), 0);\nPromise.resolve().then(() => console.log('microtask'));\nconsole.log('sync end');`}
            label="See microtask vs macrotask ordering in JS Visualizer"
          />
        </Callout>

        <h2 id="iterator-helpers" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          5. Iterator helpers & Iterator sequencing
        </h2>

        <p>
          Lazy <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">.map()</code>,{' '}
          <code>.filter()</code>, <code>.take()</code>, <code>.drop()</code>, and friends now work directly on
          any iterator — processing one element at a time without building intermediate arrays. Iterator
          sequencing adds <code>Iterator.concat()</code> to chain multiple iterators lazily.
        </p>

        <CodeBlock title="iterator-helpers.js">{`function* naturals() { let n = 1; while (true) yield n++; }

// Lazy: never materializes an infinite array
const firstThreeSquares = naturals()
  .map(n => n * n)
  .take(3)
  .toArray(); // [1, 4, 9]

const combined = Iterator.concat([1, 2], [3, 4]); // lazy chain`}</CodeBlock>

        <h2 id="math-sumprecise" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          6. Math.sumPrecise — floating-point summation done right
        </h2>

        <p>
          Summing floats with <code>.reduce((a, b) =&gt; a + b)</code> accumulates rounding error
          across the intermediate sums.{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Math.sumPrecise()</code>{' '}
          computes the sum as if with infinite precision, then rounds once at the end.
        </p>

        <CodeBlock title="sum-precise.js">{`// reduce loses the 0.1 entirely — absorbed by 1e20, then cancelled
[1e20, 0.1, -1e20].reduce((a, b) => a + b); // 0
Math.sumPrecise([1e20, 0.1, -1e20]);        // 0.1

// drift across many additions disappears
sum1000TenthsWithReduce();       // 99.9999999999986
Math.sumPrecise(thousandTenths); // 100`}</CodeBlock>

        <Callout type="warning">
          It does <em>not</em> fix the classic <code>0.1 + 0.2</code> case —{' '}
          <code className="text-amber-400">Math.sumPrecise([0.1, 0.2])</code> still returns{' '}
          <code className="text-amber-400">0.30000000000000004</code>, because 0.1 and 0.2 are already
          imprecise as floating-point <em>inputs</em>. sumPrecise eliminates error introduced{' '}
          <em>during summation</em>, not error baked into the values themselves.
        </Callout>

        <p className="text-sm text-zinc-400">
          Matters most for finance, statistics, and simulations where errors compound over many operations.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log([1e20, 0.1, -1e20].reduce((a, b) => a + b)); // 0 — the 0.1 is lost\nconsole.log(Math.sumPrecise([1e20, 0.1, -1e20]));        // 0.1\n\nconst t = [0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1];\nconsole.log(t.reduce((a, b) => a + b)); // 0.9999999999999999\nconsole.log(Math.sumPrecise(t));        // 1`}
            label="Compare reduce vs sumPrecise in JS Visualizer"
          />
        </Callout>

        <h2 id="error-iserror" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          7. Error.isError — reliable cross-realm error checks
        </h2>

        <p>
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">value instanceof Error</code>{' '}
          returns <code>false</code> for errors that crossed a realm boundary (iframe, Worker, vm context).{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Error.isError(value)</code>{' '}
          is the reliable check.
        </p>

        <CodeBlock title="is-error.js">{`Error.isError(new TypeError("boom")); // true
Error.isError({ message: "fake" });   // false — not a real Error
// Works even for an Error created in another realm`}</CodeBlock>

        <h2 id="uint8array-base64" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          8. Uint8Array ↔ Base64 / Hex
        </h2>

        <p>
          First-class binary-to-text conversion, replacing the awkward{' '}
          <code>btoa(String.fromCharCode(...bytes))</code> dance.
        </p>

        <CodeBlock title="base64.js">{`const bytes = new Uint8Array(await blob.arrayBuffer());

const b64 = bytes.toBase64();        // declarative
const hex = bytes.toHex();
const back = Uint8Array.fromBase64(b64);`}</CodeBlock>

        <h2 id="map-getorinsert" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          9. Map.getOrInsert — the upsert pattern
        </h2>

        <p>
          Kills the <code>has</code> → <code>set</code> → <code>get</code> boilerplate that shows up in every
          grouping and caching routine.
        </p>

        <CodeBlock title="get-or-insert.js">{`// Before
if (!map.has(key)) map.set(key, []);
map.get(key).push(item);

// After
map.getOrInsert(key, []).push(item);

// Lazy default (only built when the key is missing)
map.getOrInsertComputed(key, () => expensiveDefault()).push(item);`}</CodeBlock>

        <Callout type="tip">
          <TryItLink
            code={`const opinions = new Map();\nopinions.getOrInsert('js', []).push('fun');\nopinions.getOrInsert('js', []).push('fast');\nconsole.log(opinions.get('js').join(', '));\n\nlet calls = 0;\nopinions.getOrInsertComputed('js', () => { calls++; return []; });\nconsole.log('computed callback ran ' + calls + ' times'); // 0 — key already exists`}
            label="Run Map.getOrInsert in JS Visualizer"
          />
        </Callout>

        <h2 id="runtime-lens" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          The runtime lens: which of these change <em>ordering</em>?
        </h2>

        <p>
          Most of ES2026 is new <em>values</em> and <em>methods</em> — they don't touch the event loop. But a
          few change <strong>when</strong> code runs:
        </p>

        <ul className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-2">• <strong className="text-cyan-400">Array.fromAsync</strong> — sequential <code>await</code>s, each a microtask resumption.</li>
          <li className="flex gap-2">• <strong className="text-cyan-400">Promise.try</strong> — sync callback now, reactions as microtasks.</li>
          <li className="flex gap-2">• <strong className="text-cyan-400">await using</strong> — async disposal awaited (LIFO) as the scope unwinds.</li>
        </ul>

        <p>
          The other six are pure value APIs — no scheduling impact. When a feature <em>does</em> affect
          ordering, the fastest way to build intuition is to watch the call stack, microtask queue, and task
          queue move in real time.
        </p>

        <div className="my-8 flex justify-center">
          <TryItLink label="Open JS Visualizer — watch async code run, free" />
        </div>

        <h2 id="visualizer-support" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          What runs in JS Visualizer today
        </h2>

        <p>
          Every "Try it" link above executes in our simulated runtime — so here's the honest support
          status for these features, verified against real-engine behavior:
        </p>

        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-4 bg-emerald-500/5 border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-400 mb-2">✅ Simulated today</h3>
            <ul className="text-xs text-zinc-400 leading-relaxed space-y-1">
              <li>• <code>Math.sumPrecise</code></li>
              <li>• <code>Error.isError</code></li>
              <li>• <code>Map.getOrInsert</code> / <code>getOrInsertComputed</code></li>
              <li>• <code>Uint8Array</code> <code>toBase64/fromBase64/toHex/fromHex</code> (incl. <code>base64url</code>, <code>omitPadding</code>)</li>
              <li>• <code>Array.fromAsync</code> — arrays, promise arrays, Set/Map, strings, sync generators, <code>mapFn</code></li>
              <li>• <code>Promise.try</code> — incl. forwarded args and sync throws → rejections</li>
              <li>• <code>Temporal</code> core: <code>PlainDate</code> (<code>from/add/subtract/toString/equals/compare</code> + properties), <code>ZonedDateTime.from</code> + <code>toString</code> (real IANA offsets), <code>Temporal.Now</code>, <code>Instant</code> basics</li>
            </ul>
          </div>
          <div className="rounded-lg border p-4 bg-red-500/5 border-red-500/20">
            <h3 className="text-sm font-bold text-red-400 mb-2">⛔ Not simulated yet</h3>
            <ul className="text-xs text-zinc-400 leading-relaxed space-y-1">
              <li>• <code>using</code> / <code>await using</code> — new syntax; our parser doesn't accept it yet</li>
              <li>• <code>Temporal.Duration</code>, <code>.with()</code>, <code>.until()/.since()</code>, non-ISO calendars, and exact DST-transition offsets</li>
              <li>• <code>Array.fromAsync</code> with an <em>async generator</em> as input</li>
              <li>• Iterator helpers beyond the basics (<code>Iterator.concat</code> is partial)</li>
            </ul>
            <p className="text-[11px] text-zinc-500 mt-2">
              Unsupported calls degrade gracefully — you'll see a console note instead of a crash.
            </p>
          </div>
        </div>

        <h2 id="whats-next" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          What's still cooking
        </h2>

        <p>
          A few proposals are close but not yet finalized — including richer{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">JSON.parse</code> source-text
          access (Stage 3) for round-tripping huge integers via <code>BigInt</code> without precision loss.
          Worth watching for ES2027.
        </p>

        <p>
          Want the deeper "why" behind the async ones? Read the{' '}
          <a href="/blogs/javascript-event-loop-explained" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JavaScript Event Loop guide</a>{' '}
          and{' '}
          <a href="/blogs/microtask-vs-macrotask-javascript" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">Microtask vs Macrotask</a>.
        </p>
      </>
    ),
  },
  {
    slug: 'javascript-event-loop-explained',
    title: 'JavaScript Event Loop Explained — A Visual, Step-by-Step Guide',
    metaTitle: 'JavaScript Event Loop Explained — Visual Step-by-Step Guide (2026)',
    metaDescription: 'Understand the JavaScript event loop with interactive animations. Learn how the call stack, Web APIs, task queue, and microtask queue work together — with code examples you can run yourself.',
    publishedAt: '2026-06-07',
    readingTime: '12 min read',
    tags: ['JavaScript', 'Event Loop', 'Async', 'Tutorial'],
    excerpt: 'The event loop is the most misunderstood concept in JavaScript. This visual guide breaks it down step by step — with interactive examples you can run yourself.',
    content: (
      <>
        <p>
          Ask ten developers how the JavaScript event loop works, and you'll get eleven different answers.
          That's because the event loop is <em>invisible</em>. You can't console.log it. You can't set a breakpoint on it.
          You just have to <em>know</em> it's there, orchestrating everything.
        </p>

        <p>
          This guide changes that. We'll walk through the event loop step by step, with code you can actually
          run and <em>see</em> in{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JS Visualizer</a>{' '}
          — watching functions enter the call stack, callbacks move through Web APIs, and promises flush
          from the microtask queue.
        </p>

        <h2 id="the-puzzle" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          The Puzzle That Trips Everyone Up
        </h2>

        <p>Before we dive in, try to predict the output of this code:</p>

        <CodeBlock title="event-loop-puzzle.js">{`console.log('A');

setTimeout(() => console.log('B'), 0);

Promise.resolve().then(() => console.log('C'));

console.log('D');`}</CodeBlock>

        <p>
          Most beginners guess <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">A, B, C, D</code>.
          The actual output is:
        </p>

        <CodeBlock>{`A
D
C
B`}</CodeBlock>

        <p>
          If that surprises you, you're in exactly the right place.
          By the end of this article, you'll understand <em>why</em> — and it will feel obvious.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log('A');\n\nsetTimeout(() => console.log('B'), 0);\n\nPromise.resolve().then(() => console.log('C'));\n\nconsole.log('D');`}
            label="Run this puzzle in JS Visualizer"
          />
        </Callout>

        <h2 id="javascript-runtime" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          The JavaScript Runtime: Four Moving Parts
        </h2>

        <p>
          JavaScript's runtime has four key components. Every line of code you write passes through them:
        </p>

        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Call Stack', color: 'amber', desc: 'Where functions execute. One function at a time — JavaScript is single-threaded.' },
            { name: 'Web APIs', color: 'purple', desc: 'Browser-provided features (setTimeout, fetch, DOM events) that run outside the main thread.' },
            { name: 'Task Queue', color: 'red', desc: 'Callbacks from Web APIs (setTimeout, setInterval) waiting for the call stack to be empty.' },
            { name: 'Microtask Queue', color: 'cyan', desc: 'Promise callbacks (.then, .catch, .finally) and queueMicrotask(). Always processed before the task queue.' },
          ].map(({ name, color, desc }) => (
            <div key={name} className={`rounded-lg border p-4 bg-${color}-500/5 border-${color}-500/20`}>
              <h3 className={`text-sm font-bold text-${color}-400 mb-1`}>{name}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p>
          And then there's the <strong className="text-emerald-400">event loop</strong> itself — the coordinator
          that ties them all together. Its job is deceptively simple: when the call stack is empty, pick the
          next thing to run.
        </p>

        <h2 id="call-stack" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 1: The Call Stack — One Thing at a Time
        </h2>

        <p>
          JavaScript is single-threaded. That means it has <strong>one call stack</strong> and can do{' '}
          <strong>one thing at a time</strong>. When you call a function, it gets pushed onto the stack.
          When it returns, it gets popped off.
        </p>

        <CodeBlock title="call-stack.js">{`function greet(name) {
  return 'Hello, ' + name;
}

function processUser(name) {
  const message = greet(name);
  console.log(message);
}

processUser('Supratik');`}</CodeBlock>

        <p>Here's what happens on the call stack:</p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">1.</span> <code className="text-zinc-400">processUser('Supratik')</code> is pushed onto the stack</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">2.</span> Inside it, <code className="text-zinc-400">greet('Supratik')</code> is pushed on top</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">3.</span> <code className="text-zinc-400">greet</code> returns → popped off the stack</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">4.</span> <code className="text-zinc-400">console.log(message)</code> is pushed, executes, popped</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">5.</span> <code className="text-zinc-400">processUser</code> returns → popped off. Stack is empty.</li>
        </ol>

        <Callout type="info">
          The call stack is like a stack of plates. You can only add or remove from the top.
          If a function calls another function, the new one goes on top and must finish before
          we return to the one below it.
        </Callout>

        <h2 id="web-apis" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 2: Web APIs — Where Async Things Wait
        </h2>

        <p>
          When you call <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout</code>,{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">fetch</code>, or add a DOM event listener,
          JavaScript doesn't handle the waiting itself. It hands the job off to <strong>Web APIs</strong> — features provided by the browser (or Node.js runtime).
        </p>

        <CodeBlock title="web-api.js">{`console.log('Start');

setTimeout(() => {
  console.log('Timer done');
}, 2000);

console.log('End');`}</CodeBlock>

        <p>Here's the flow:</p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">1.</span> <code className="text-zinc-400">console.log('Start')</code> → runs immediately on the call stack</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">2.</span> <code className="text-zinc-400">setTimeout</code> → registers the callback with the Web API. The timer starts counting <em>outside</em> the call stack. setTimeout itself returns immediately.</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">3.</span> <code className="text-zinc-400">console.log('End')</code> → runs immediately</li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">4.</span> After 2000ms, the Web API moves the callback to the <strong>task queue</strong></li>
          <li className="flex gap-3"><span className="text-amber-400 font-mono font-bold flex-shrink-0">5.</span> The event loop sees the call stack is empty → picks the callback → runs it</li>
        </ol>

        <p>
          Output: <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Start → End → Timer done</code>.
          The timer callback runs <em>last</em>, even though it was registered second.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log('Start');\n\nsetTimeout(() => {\n  console.log('Timer done');\n}, 2000);\n\nconsole.log('End');`}
            label="Watch the timer move through Web APIs"
          />
        </Callout>

        <h2 id="task-queue" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 3: The Task Queue (Macrotask Queue)
        </h2>

        <p>
          When a Web API finishes its work (timer expires, fetch returns, click happens), it doesn't
          interrupt whatever's currently running. Instead, it places the callback in the <strong>task queue</strong>{' '}
          (also called the macrotask queue).
        </p>

        <p>
          The event loop's rule is simple: <em>when the call stack is empty, take the first task from the
          queue and push it onto the stack.</em>
        </p>

        <CodeBlock title="task-queue.js">{`setTimeout(() => console.log('First timeout'), 0);
setTimeout(() => console.log('Second timeout'), 0);

console.log('Synchronous');`}</CodeBlock>

        <p>
          Output: <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Synchronous → First timeout → Second timeout</code>.
          Both timeouts go to the task queue, and they're processed in order — but only after all synchronous code finishes.
        </p>

        <Callout type="warning">
          <code className="text-amber-400">setTimeout(fn, 0)</code> does NOT mean "run immediately."
          It means "run as soon as the call stack is empty and you get to the front of the queue."
          If there's a lot of synchronous code running, the 0ms timer could wait hundreds of milliseconds.
        </Callout>

        <h2 id="microtask-queue" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 4: The Microtask Queue — Promises Jump the Line
        </h2>

        <p>
          This is where most developers get confused. There are actually <strong>two queues</strong>,
          and one has priority over the other.
        </p>

        <p>
          The <strong className="text-cyan-400">microtask queue</strong> holds callbacks from:
        </p>

        <ul className="my-4 space-y-1 text-sm text-zinc-300">
          <li className="flex gap-2">• <code className="text-zinc-400">Promise.then()</code>, <code className="text-zinc-400">.catch()</code>, <code className="text-zinc-400">.finally()</code></li>
          <li className="flex gap-2">• <code className="text-zinc-400">queueMicrotask()</code></li>
          <li className="flex gap-2">• <code className="text-zinc-400">MutationObserver</code></li>
        </ul>

        <p>
          <strong>The critical rule:</strong> the event loop drains the <em>entire</em> microtask queue
          before touching the task queue. Every. Single. Time. If a microtask adds another microtask,
          that runs too — before any setTimeout callback gets a chance.
        </p>

        <CodeBlock title="microtask-vs-macrotask.js">{`setTimeout(() => console.log('Macrotask'), 0);

Promise.resolve().then(() => console.log('Microtask 1'));
Promise.resolve().then(() => console.log('Microtask 2'));

console.log('Synchronous');`}</CodeBlock>

        <p>
          Output:
        </p>
        <CodeBlock>{`Synchronous
Microtask 1
Microtask 2
Macrotask`}</CodeBlock>

        <p>
          Even though setTimeout was registered first, both Promise callbacks run before it.
          The microtask queue always gets priority.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`setTimeout(() => console.log('Macrotask'), 0);\n\nPromise.resolve().then(() => console.log('Microtask 1'));\nPromise.resolve().then(() => console.log('Microtask 2'));\n\nconsole.log('Synchronous');`}
            label="Watch microtasks jump the line"
          />
        </Callout>

        <h2 id="event-loop-algorithm" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 5: The Event Loop Algorithm
        </h2>

        <p>Now we can state the event loop's actual algorithm:</p>

        <ol className="my-4 space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span>
            <span>Run all <strong>synchronous code</strong> on the call stack until it's empty.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span>
            <span>Drain the <strong className="text-cyan-400">entire microtask queue</strong>. If any microtask adds new microtasks, drain those too.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold flex-shrink-0">3.</span>
            <span>Take <strong>one task</strong> from the <strong className="text-red-400">task queue</strong> and push it onto the call stack.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 font-mono font-bold flex-shrink-0">4.</span>
            <span>Go back to step 2. (Yes — microtasks are checked again after every single macrotask.)</span>
          </li>
        </ol>

        <p>
          That's it. The entire event loop is these four steps, on repeat, forever.
        </p>

        <h2 id="solving-the-puzzle" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Solving the Original Puzzle
        </h2>

        <p>Now let's go back to our puzzle and trace through it:</p>

        <CodeBlock>{`console.log('A');           // 1. Synchronous → runs immediately
setTimeout(() =>
  console.log('B'), 0);    // 2. Registers with Web API → callback goes to TASK queue
Promise.resolve().then(()
  => console.log('C'));    // 3. Already resolved → callback goes to MICROTASK queue
console.log('D');           // 4. Synchronous → runs immediately`}</CodeBlock>

        <p><strong>Step by step:</strong></p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span> <code className="text-zinc-400">console.log('A')</code> → prints <strong>A</strong></li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span> <code className="text-zinc-400">setTimeout</code> → callback sent to Web API → moves to task queue</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">3.</span> <code className="text-zinc-400">Promise.resolve().then()</code> → already resolved → callback goes to microtask queue</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">4.</span> <code className="text-zinc-400">console.log('D')</code> → prints <strong>D</strong></li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">5.</span> Call stack is empty → drain microtask queue → <code className="text-zinc-400">console.log('C')</code> → prints <strong>C</strong></li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">6.</span> Microtask queue empty → take from task queue → <code className="text-zinc-400">console.log('B')</code> → prints <strong>B</strong></li>
        </ol>

        <p>
          Final output: <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-bold">A, D, C, B</code>. Mystery solved.
        </p>

        <h2 id="async-await" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Bonus: How async/await Fits In
        </h2>

        <p>
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">async/await</code> is just syntactic sugar
          over Promises. When you <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">await</code> something,
          everything after the await becomes a <em>microtask</em>.
        </p>

        <CodeBlock title="async-await.js">{`async function demo() {
  console.log('Before await');
  await Promise.resolve();
  console.log('After await');  // This is a microtask!
}

console.log('Start');
demo();
console.log('End');`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`Start
Before await
End
After await`}</CodeBlock>

        <p>
          "After await" runs as a microtask — same as if you'd written{' '}
          <code className="text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Promise.resolve().then(() =&gt; console.log('After await'))</code>.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`async function demo() {\n  console.log('Before await');\n  await Promise.resolve();\n  console.log('After await');\n}\n\nconsole.log('Start');\ndemo();\nconsole.log('End');`}
            label="See async/await as microtasks"
          />
        </Callout>

        <h2 id="common-mistakes" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Common Mistakes and Misconceptions
        </h2>

        <div className="space-y-4 my-6">
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">Myth: setTimeout(fn, 0) runs immediately</p>
            <p className="text-sm text-zinc-400">It runs after all synchronous code AND all microtasks. The 0 is a minimum delay, not a guarantee.</p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">Myth: Promises are asynchronous</p>
            <p className="text-sm text-zinc-400">The Promise <em>constructor</em> runs synchronously. Only the <code className="text-zinc-400">.then()</code> callback is deferred (as a microtask).</p>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">Myth: JavaScript is multi-threaded because it can do async things</p>
            <p className="text-sm text-zinc-400">JavaScript itself is single-threaded. Web APIs (provided by the browser) can run in parallel, but your JS code always runs one line at a time on one call stack.</p>
          </div>
        </div>

        <h2 id="summary" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Summary
        </h2>

        <div className="my-6 rounded-lg border border-zinc-700 bg-zinc-900/50 p-6">
          <ol className="space-y-3 text-sm text-zinc-300">
            <li><strong className="text-zinc-100">1.</strong> JavaScript has one call stack — it's single-threaded.</li>
            <li><strong className="text-zinc-100">2.</strong> Async operations (timers, network) are handled by Web APIs outside the main thread.</li>
            <li><strong className="text-zinc-100">3.</strong> When Web APIs finish, callbacks go to the task queue (macrotask queue).</li>
            <li><strong className="text-zinc-100">4.</strong> Promise callbacks go to the microtask queue, which has higher priority.</li>
            <li><strong className="text-zinc-100">5.</strong> The event loop: run sync code → drain all microtasks → pick one macrotask → repeat.</li>
            <li><strong className="text-zinc-100">6.</strong> async/await is syntactic sugar — everything after <code className="text-amber-400">await</code> becomes a microtask.</li>
          </ol>
        </div>

        <p>
          The best way to internalize this? <strong>See it happen.</strong> Open{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JS Visualizer</a>,
          paste any code snippet from this article, and watch every step unfold across the call stack,
          queues, and event loop — in real time.
        </p>

        <div className="my-8 flex justify-center">
          <TryItLink label="Open JS Visualizer — it's free" />
        </div>
      </>
    ),
  },
  {
    slug: 'microtask-vs-macrotask-javascript',
    title: 'Microtask vs Macrotask in JavaScript: The Complete Guide',
    metaTitle: 'Microtask vs Macrotask in JavaScript — The Complete Guide (2026)',
    metaDescription: 'What is the difference between a microtask and a macrotask in JavaScript? Learn how Promise callbacks, queueMicrotask, setTimeout, and setInterval are scheduled — with runnable examples.',
    publishedAt: '2026-06-25',
    readingTime: '9 min read',
    tags: ['JavaScript', 'Event Loop', 'Microtask', 'Async'],
    excerpt: 'Promise callbacks always run before setTimeout — even setTimeout(fn, 0). The reason is the difference between microtasks and macrotasks. Here is exactly how each queue is scheduled.',
    content: (
      <>
        <p>
          If you've ever been surprised that a <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Promise.then()</code>{' '}
          callback ran before a <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout(fn, 0)</code>,
          you've run into the difference between <strong>microtasks</strong> and <strong>macrotasks</strong>.
          They are the two kinds of asynchronous work the JavaScript event loop schedules — and they are
          <em> not</em> treated equally.
        </p>

        <p>
          This guide explains exactly what goes into each queue, the rule the event loop follows, and the
          gotchas that trip up even experienced developers. Every snippet is runnable in{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JS Visualizer</a>{' '}
          so you can watch the queues drain in real time.
        </p>

        <h2 id="two-queues" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Two Queues, One Rule
        </h2>

        <p>
          The event loop maintains two separate queues for deferred callbacks:
        </p>

        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-4 bg-cyan-500/5 border-cyan-500/20">
            <h3 className="text-sm font-bold text-cyan-400 mb-1">Microtask Queue</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Promise <code>.then/.catch/.finally</code>, <code>queueMicrotask()</code>,{' '}
              <code>await</code> continuations, MutationObserver.
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-red-500/5 border-red-500/20">
            <h3 className="text-sm font-bold text-red-400 mb-1">Macrotask Queue</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <code>setTimeout</code>, <code>setInterval</code>, <code>setImmediate</code> (Node),
              I/O, UI events, <code>MessageChannel</code>.
            </p>
          </div>
        </div>

        <p>
          The rule that governs them is short but absolute: <strong>after every single macrotask, the event
          loop drains the entire microtask queue before running the next macrotask.</strong> Microtasks always
          jump ahead.
        </p>

        <Callout type="info">
          A useful mental model: macrotasks are scheduled "one per tick," while microtasks are "finish
          everything pending right now, before doing anything else."
        </Callout>

        <h2 id="the-classic-example" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          The Classic Example
        </h2>

        <CodeBlock title="micro-vs-macro.js">{`console.log('script start');

setTimeout(() => console.log('setTimeout'), 0);

Promise.resolve()
  .then(() => console.log('promise 1'))
  .then(() => console.log('promise 2'));

console.log('script end');`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`script start
script end
promise 1
promise 2
setTimeout`}</CodeBlock>

        <p>
          Both synchronous logs run first. Then the microtask queue drains completely —{' '}
          <code className="text-zinc-400">promise 1</code> and <code className="text-zinc-400">promise 2</code>{' '}
          — and only then does the single macrotask (<code className="text-zinc-400">setTimeout</code>) get its turn.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log('script start');\n\nsetTimeout(() => console.log('setTimeout'), 0);\n\nPromise.resolve()\n  .then(() => console.log('promise 1'))\n  .then(() => console.log('promise 2'));\n\nconsole.log('script end');`}
            label="Watch the queues drain in JS Visualizer"
          />
        </Callout>

        <h2 id="starvation" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Microtasks Can Starve the Macrotask Queue
        </h2>

        <p>
          Because the event loop refuses to move on until the microtask queue is empty, a microtask that keeps
          scheduling more microtasks can block timers and rendering indefinitely:
        </p>

        <CodeBlock title="starvation.js">{`let count = 0;

function loop() {
  if (count++ < 3) {
    console.log('microtask', count);
    queueMicrotask(loop);
  }
}

setTimeout(() => console.log('timeout (waited)'), 0);
queueMicrotask(loop);`}</CodeBlock>

        <p>
          The three queued microtasks all run before the timeout, because each one is added to the
          <em> same</em> draining pass. In a real infinite version, the timeout would never fire.
        </p>

        <Callout type="warning">
          Recursively scheduling microtasks (or long <code>await</code> chains in a tight loop) can freeze the
          UI. If you need to yield to rendering or timers, use a macrotask like{' '}
          <code className="text-amber-400">setTimeout</code> instead of <code className="text-amber-400">queueMicrotask</code>.
        </Callout>

        <h2 id="async-await" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Where async/await Fits
        </h2>

        <p>
          Everything after an <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">await</code>{' '}
          is scheduled as a microtask. That's why awaited code interleaves with{' '}
          <code className="text-zinc-400">.then()</code> callbacks but still beats any{' '}
          <code className="text-zinc-400">setTimeout</code>:
        </p>

        <CodeBlock title="await-is-a-microtask.js">{`async function run() {
  console.log('A');
  await null;          // suspends; rest becomes a microtask
  console.log('B');
}

setTimeout(() => console.log('timeout'), 0);
run();
console.log('C');`}</CodeBlock>

        <p>Output: <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">A → C → B → timeout</code>.</p>

        <Callout type="tip">
          <TryItLink
            code={`async function run() {\n  console.log('A');\n  await null;\n  console.log('B');\n}\n\nsetTimeout(() => console.log('timeout'), 0);\nrun();\nconsole.log('C');`}
            label="Step through the await continuation"
          />
        </Callout>

        <h2 id="summary" className="text-xl font-bold text-zinc-100 mt-12 mb-4">Summary</h2>

        <div className="my-6 rounded-lg border border-zinc-700 bg-zinc-900/50 p-6">
          <ol className="space-y-3 text-sm text-zinc-300">
            <li><strong className="text-zinc-100">1.</strong> Microtasks: Promise callbacks, <code>queueMicrotask</code>, <code>await</code> continuations.</li>
            <li><strong className="text-zinc-100">2.</strong> Macrotasks: <code>setTimeout</code>, <code>setInterval</code>, I/O, UI events.</li>
            <li><strong className="text-zinc-100">3.</strong> The whole microtask queue drains after every macrotask — and after the initial synchronous script.</li>
            <li><strong className="text-zinc-100">4.</strong> That's why Promises always beat <code>setTimeout(fn, 0)</code>.</li>
            <li><strong className="text-zinc-100">5.</strong> Runaway microtasks can starve timers and block rendering.</li>
          </ol>
        </div>

        <p>
          The fastest way to internalize this is to <strong>watch it</strong>. Open{' '}
          <a href="/" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JS Visualizer</a>{' '}
          and step through any snippet above — the microtask and macrotask queues are shown side by side so the
          ordering becomes obvious.
        </p>

        <div className="my-8 flex justify-center">
          <TryItLink label="Open JS Visualizer — it's free" />
        </div>
      </>
    ),
  },
  {
    slug: 'why-promises-run-before-settimeout',
    title: 'Why Do Promises Run Before setTimeout? (Explained Visually)',
    metaTitle: 'Why Do Promises Run Before setTimeout? — Explained Visually (2026)',
    metaDescription: 'Understand why Promise callbacks always execute before setTimeout(0) by learning how JavaScript\'s Event Loop, Microtask Queue, and Task Queue really work — with step-by-step examples.',
    publishedAt: '2026-06-25',
    readingTime: '8 min read',
    tags: ['JavaScript', 'Promises', 'setTimeout', 'Event Loop'],
    excerpt: 'setTimeout(fn, 0) looks like it should run immediately — yet a Promise callback still beats it. The answer lies in how the Event Loop, Microtask Queue, and Task Queue work together.',
    content: (
      <>
        <p>
          Almost every JavaScript developer has seen this:
        </p>

        <CodeBlock title="the-puzzle.js">{`console.log("Start");

setTimeout(() => {
  console.log("setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`Start
End
Promise
setTimeout`}</CodeBlock>

        <p>
          At first glance, this seems strange.{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout(..., 0)</code>{' '}
          looks like it should execute immediately. So why does the Promise callback run first?
        </p>

        <p>The answer lies in <strong>JavaScript's Event Loop</strong>.</p>

        <Callout type="tip">
          <TryItLink
            code={`console.log("Start");\n\nsetTimeout(() => {\n  console.log("setTimeout");\n}, 0);\n\nPromise.resolve().then(() => {\n  console.log("Promise");\n});\n\nconsole.log("End");`}
            label="Watch the queues in JS Visualizer"
          />
        </Callout>

        <h2 id="step1" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 1: JavaScript Executes Synchronous Code First
        </h2>

        <p>
          Everything in the current script executes on the <strong>Call Stack</strong>.{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">console.log("Start")</code>{' '}
          prints immediately.
        </p>

        <p>
          When JavaScript encounters <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout</code>,
          it <strong>does not execute the callback</strong>. Instead, it hands the callback to the browser
          timer system and continues executing. The Promise is already resolved, so its{' '}
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">.then()</code>{' '}
          callback is immediately scheduled in the <strong>Microtask Queue</strong>.
          Then <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">console.log("End")</code> prints.
        </p>

        <p>Current output after synchronous code:</p>
        <CodeBlock>{`Start
End`}</CodeBlock>

        <h2 id="step2" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 2: The Call Stack Becomes Empty
        </h2>

        <p>At this point, both queues look like this:</p>

        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-4 bg-cyan-500/5 border-cyan-500/20">
            <h3 className="text-sm font-bold text-cyan-400 mb-2">Microtask Queue</h3>
            <code className="text-xs text-zinc-300">Promise callback</code>
          </div>
          <div className="rounded-lg border p-4 bg-red-500/5 border-red-500/20">
            <h3 className="text-sm font-bold text-red-400 mb-2">Task Queue (Macrotask)</h3>
            <code className="text-xs text-zinc-300">setTimeout callback</code>
          </div>
        </div>

        <h2 id="step3" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 3: The Event Loop Rule
        </h2>

        <p>The Event Loop always follows this order:</p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span> Execute one Task (current script).</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span> Empty the <strong>entire Microtask Queue</strong>.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">3.</span> Optionally allow rendering.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">4.</span> Execute the next Task (Macrotask).</li>
        </ol>

        <p>
          Because Promise callbacks are <strong className="text-cyan-400">Microtasks</strong>, they execute
          before timer callbacks. Output becomes:
        </p>
        <CodeBlock>{`Start
End
Promise`}</CodeBlock>

        <h2 id="step4" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step 4: Finally, setTimeout Runs
        </h2>

        <p>
          After the Microtask Queue is empty, the Event Loop processes the next Task. Final output:
        </p>
        <CodeBlock>{`Start
End
Promise
setTimeout`}</CodeBlock>

        <h2 id="misconception" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Common Misconception
        </h2>

        <div className="my-6 space-y-3">
          <div className="rounded-lg border border-zinc-800 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">❌ Promises have higher priority than setTimeout.</p>
            <p className="text-sm text-zinc-400">This is an oversimplification.</p>
          </div>
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400 mb-1">✅ The real reason:</p>
            <p className="text-sm text-zinc-300">
              The Event Loop <strong>must completely drain the Microtask Queue before executing the next Task (Macrotask)</strong>.
            </p>
          </div>
        </div>

        <h2 id="what-0ms-means" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Why Doesn't setTimeout(0) Run Immediately?
        </h2>

        <p>
          <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout(fn, 0)</code> means
          "execute after <em>at least</em> 0 milliseconds" — not "execute instantly."
          Even after the timer expires, its callback waits until:
        </p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span> The current script finishes.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span> The Call Stack becomes empty.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">3.</span> Every pending Microtask has completed.</li>
        </ol>

        <h2 id="example2" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Example 2: Chained Promises
        </h2>

        <CodeBlock title="example-2.js">{`console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve()
  .then(() => console.log(3))
  .then(() => console.log(4));

console.log(5);`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`1
5
3
4
2`}</CodeBlock>

        <p>
          The second <code className="text-zinc-400">.then()</code> is also a Microtask, so it executes
          before <code className="text-zinc-400">setTimeout</code>. Both microtasks drain completely before
          the macrotask gets a turn.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log(1);\n\nsetTimeout(() => console.log(2), 0);\n\nPromise.resolve()\n  .then(() => console.log(3))\n  .then(() => console.log(4));\n\nconsole.log(5);`}
            label="Step through Example 2 in JS Visualizer"
          />
        </Callout>

        <h2 id="example3" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Example 3: Nested Microtasks
        </h2>

        <CodeBlock title="example-3.js">{`console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise 1");

  Promise.resolve().then(() => {
    console.log("Promise 2");
  });
});

console.log("End");`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`Start
End
Promise 1
Promise 2
Timeout`}</CodeBlock>

        <p>
          While executing <code className="text-zinc-400">Promise 1</code>, another Microtask is scheduled.
          The Event Loop continues draining Microtasks until none remain — so{' '}
          <code className="text-zinc-400">Promise 2</code> also runs before <code className="text-zinc-400">Timeout</code>.
        </p>

        <Callout type="tip">
          <TryItLink
            code={`console.log("Start");\n\nsetTimeout(() => {\n  console.log("Timeout");\n}, 0);\n\nPromise.resolve().then(() => {\n  console.log("Promise 1");\n\n  Promise.resolve().then(() => {\n    console.log("Promise 2");\n  });\n});\n\nconsole.log("End");`}
            label="Watch nested microtasks in JS Visualizer"
          />
        </Callout>

        <h2 id="starvation" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Microtask Starvation
        </h2>

        <CodeBlock title="starvation.js">{`function loop() {
  Promise.resolve().then(loop);
}

loop();`}</CodeBlock>

        <p>
          Because every Microtask schedules another Microtask,{' '}
          <code className="text-zinc-400">setTimeout</code> never executes, rendering may be blocked,
          and the application appears frozen. This is called <strong>Microtask Starvation</strong>.
        </p>

        <Callout type="warning">
          If you need to yield to rendering or timers, use a macrotask like{' '}
          <code className="text-amber-400">setTimeout</code> instead of chaining endless microtasks.
        </Callout>

        <h2 id="mental-model" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Mental Model
        </h2>

        <div className="my-6 rounded-lg border border-zinc-700 bg-zinc-900/50 p-6 font-mono text-sm text-zinc-300 leading-relaxed">
          <div>Current Script</div>
          <div className="text-zinc-500 pl-4">↓</div>
          <div>Drain <span className="text-cyan-400">ALL Microtasks</span></div>
          <div className="text-zinc-500 pl-4">↓</div>
          <div>Browser may Render</div>
          <div className="text-zinc-500 pl-4">↓</div>
          <div>Run <span className="text-red-400">ONE Task</span></div>
          <div className="text-zinc-500 pl-4">↓</div>
          <div>Repeat</div>
        </div>

        <h2 id="takeaways" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Key Takeaways
        </h2>

        <div className="my-6 rounded-lg border border-zinc-700 bg-zinc-900/50 p-6">
          <ol className="space-y-3 text-sm text-zinc-300">
            <li><strong className="text-zinc-100">1.</strong> <code className="text-amber-400">setTimeout(..., 0)</code> schedules a <strong>Macrotask</strong> after <em>at least</em> the specified delay.</li>
            <li><strong className="text-zinc-100">2.</strong> Promise callbacks (<code className="text-zinc-400">.then</code>, <code className="text-zinc-400">.catch</code>, <code className="text-zinc-400">.finally</code>) are <strong className="text-cyan-400">Microtasks</strong>.</li>
            <li><strong className="text-zinc-100">3.</strong> The Event Loop drains the <strong>entire Microtask Queue</strong> before processing the next Task.</li>
            <li><strong className="text-zinc-100">4.</strong> This is why Promises execute before <code className="text-zinc-400">setTimeout()</code>.</li>
            <li><strong className="text-zinc-100">5.</strong> Microtasks can enqueue more Microtasks — they all finish before the next Task.</li>
          </ol>
        </div>

        <p>
          For the full picture including <code className="text-zinc-400">async/await</code> and{' '}
          <code className="text-zinc-400">queueMicrotask</code>, read{' '}
          <a href="/blogs/microtask-vs-macrotask-javascript" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">Microtask vs Macrotask in JavaScript</a>{' '}
          and the{' '}
          <a href="/blogs/javascript-event-loop-explained" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JavaScript Event Loop guide</a>.
        </p>

        <div className="my-8 flex justify-center">
          <TryItLink label="See it animate in JS Visualizer — free" />
        </div>
      </>
    ),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
