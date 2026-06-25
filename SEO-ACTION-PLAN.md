# JS Visualizer — SEO Action Plan

> **Diagnosis (June 2026):** Our *on-page* SEO already beats the sites ranking
> above us. The #1 result, [jsv9000.app](https://www.jsv9000.app/), has **no meta
> description, no structured data, and an empty client-rendered page** — yet it
> ranks first. It wins on **domain authority, age, and backlinks**, not markup.
>
> Therefore: more meta tags will *not* move us. The gap is ~80% off-page
> (authority/backlinks/domain) and ~20% technical. This document is the off-page
> playbook. The technical 20% has already been implemented (see bottom).

---

## Why we're not ranking (the honest version)

| Factor | jsv9000.app (rank #1) | Us |
| --- | --- | --- |
| Backlinks / referring domains | Thousands (blogs, courses, SO, GitHub 1k+★) since ~2018 | ~0 |
| Domain | `jsv9000.app` — short, brandable, **root domain** | `jsvisualizer.bytefront.dev` — **subdomain** |
| Age & branded search volume | Years of people searching it by name | None yet |
| On-page SEO | Minimal | **Already excellent** |

Two structural truths:

1. **The subdomain is our biggest ceiling.** Google treats
   `jsvisualizer.bytefront.dev` as quasi-separate from `bytefront.dev`; it neither
   fully inherits nor compounds authority like a root domain. See the domain
   section below.
2. **Backlinks are the lever for the head term "js visualizer."** They are earned
   off-site. No code change substitutes for them.

---

## Phase 1 — Quick wins (week 1)

- [ ] **Google Search Console** — verify the property, submit `sitemap.xml`,
      request indexing for `/`, `/blogs`, `/faq`, and each blog post. Confirm pages
      are *indexed* (not just crawled). This is step zero — do it first.
- [ ] **Bing Webmaster Tools** — same: verify + submit sitemap.
- [ ] **Publish the dev.to article** (`devto-event-loop-article.md`, already
      drafted). Canonical it to our blog post. dev.to has very high domain
      authority → fast, real backlink + referral traffic.
- [ ] **Cross-post** the same article to Hashnode and Medium, each with a link
      back and `rel=canonical` to our version.
- [ ] **Product Hunt launch** — "JS Visualizer." PH listings rank and drive a
      backlink + launch-day traffic spike.

## Phase 2 — Backlinks & distribution (weeks 2–6)

- [ ] **GitHub repo** — open-source (or a public landing repo) with a great README
      linking the site. GitHub README links + stars are strong trust signals; this
      is a big part of *why* jsv9000 ranks.
- [ ] **Reddit**: r/javascript, r/webdev, r/learnjavascript — share as a genuinely
      useful free tool (follow each sub's self-promo rules; lead with value).
- [ ] **Stack Overflow**: answer event-loop / microtask / `setTimeout`-ordering
      questions with a real explanation, linking the relevant blog post where it
      genuinely helps. (Don't spam — quality answers only.)
- [ ] **Hacker News** "Show HN: JS Visualizer".
- [ ] **Free-tool directories**: FreeForDev, Toolfolio, There's An AI For That
      (if applicable), alternativeto.net (as an alternative to jsv9000 / Loupe /
      Python Tutor), Awesome-JavaScript lists (PR to the GitHub awesome lists).
- [ ] **Dev newsletters**: submit to JavaScript Weekly, Bytes, Frontend Focus.
      A single mention in JavaScript Weekly is worth a lot.
- [ ] **Comparison/alternative pages**: write "JS Visualizer vs Loupe vs Python
      Tutor" — captures comparison search intent *and* earns links.

## Phase 3 — Content compounding (ongoing)

- [ ] Keep publishing **long-tail guides** (we can win these long before the head
      term). Already shipped: *Microtask vs Macrotask*, *Why Promises Run Before
      setTimeout*. Next candidates:
  - [ ] "How async/await Works Under the Hood"
  - [ ] "JavaScript Call Stack Explained"
  - [ ] "Event Loop in Node.js vs the Browser"
  - [ ] "What is `queueMicrotask` and When to Use It"
  - [ ] "Closures in JavaScript, Visualized"
- [ ] Internally link every new post to 2–3 related posts + the tool (done for the
      current set).
- [ ] Add a "Try it" deep-link from each concept to the pre-loaded visualizer
      (`/?code=…`) — already the pattern in our posts.

---

## Domain decision (advisory — not yet actioned)

**The subdomain is the single biggest structural handicap.** Options:

1. **Stay on the subdomain.** Zero migration risk, but a permanent authority
   ceiling vs root-domain competitors. Viable *only* if we lean hard on content +
   backlinks and accept slower progress on the head term.
2. **Move to a root domain** (e.g. `jsvisualizer.dev` or a `.app`). Bigger
   long-term payoff. If done, do it **once, early, and correctly**:
   - Buy the domain; serve the app there.
   - **301-redirect** every old subdomain URL → matching new URL (preserves the
     little equity we have).
   - Update `canonical`, `og:url`, `sitemap.xml`, `robots.txt` sitemap line, and
     the `BASE_URL` in `client/src/hooks/useSEO.ts`.
   - Re-verify in Search Console and use the **Change of Address** tool.
   - Keep the redirects live indefinitely.

**Recommendation:** if there's any intent to compete for "js visualizer"
long-term, move to a root domain *now* while the cost of migration is lowest
(few backlinks to carry over). The longer we wait, the more equity gets stranded
on the subdomain.

---

## Technical work already shipped (the 20%)

- **Pre-rendered, crawler-visible content** inside `#root` in `client/index.html`
  (real `<h1>` + value-prop prose in the initial HTML, not just `<noscript>`,
  which Google discounts). Doubles as a themed loading screen.
- **TechArticle JSON-LD** injected per blog post (`client/src/pages/BlogPost.tsx`)
  for rich-result eligibility.
- **Two long-tail posts** added (`microtask-vs-macrotask-javascript`,
  `why-promises-run-before-settimeout`) with internal linking.
- **Sitemap** updated with the new posts.
- Existing strong baseline retained: full meta set, 6× JSON-LD blocks
  (WebApplication, SoftwareApplication, Organization, Breadcrumb, FAQPage),
  canonical, OG/Twitter cards, robots.txt, manifest.

> The technical box is essentially ticked. **Ranking now depends on Phases 1–3
> and the domain decision — none of which live in the codebase.**
