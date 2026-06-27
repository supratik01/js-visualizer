# Reconciliation Report — `ecmascript-rules.md` (authoritative) vs `ecmaSpecKnowledgeBase.ts` (live)

> **Decision basis.** `knowledge/ecmascript-rules.md` is the authoritative, spec-grounded
> source (verbatim ECMA-262 ES2015–2024 + WHATWG HTML, read this session).
> `client/src/lib/ecmaSpecKnowledgeBase.ts` is the live runtime file the visualizer uses.
> **This is a review-only diff. No writes were made to the live file.**
>
> **STATUS (applied):** ✅ **B1**, ✅ **A1**, ✅ **A2** applied to
> `client/src/lib/ecmaSpecKnowledgeBase.ts` (SPEC_TO_VISUALIZER_MAP `taskQueue`/
> `microtaskQueue` + `JOBS.description`); type-checked, no new errors. Still **pending
> your call**: B2, B3, B4 (low-severity citation/consistency cleanups) and A3 (TLA
> mechanism). A4 intentionally skipped.
>
> Overall: the live KB is high quality and ~90% consistent. It is written against the
> *modern* spec vocabulary (`HostEnqueuePromiseJob`/`HostEnqueueTimeoutJob`, §9.5),
> whereas the authoritative doc tracks the per-edition origin (ES2015 `EnqueueJob`/
> `PromiseJobs` + the WHATWG event loop). Same behavior, different vocabulary — those are
> **not** counted as conflicts. Below are only genuine gaps and genuine contradictions.

---

## A. MISSING in `ecmaSpecKnowledgeBase.ts` → flag for ADDITION

### A1. setTimeout 4 ms clamping / timer nesting level — **MISSING** (medium)
- **Authoritative**: "HTML timers" entry — negative timeout → 0; if nesting level > 5 and
  timeout < 4, timeout is set to **4 ms**; callback runs on the **timer task source**.
- **Live KB**: `taskQueue` lists `setTimeout` as a source and says "one task per iteration,"
  but there is **no mention** of the 4 ms clamp or nesting level anywhere.
- **Why it matters**: the visualizer animates timing; `setTimeout(fn, 0)` inside nested
  timers is really ≥ 4 ms. Without this, deep-nested-timer demos mis-order vs a real engine.
- **Suggested home**: `SPEC_TO_VISUALIZER_MAP.taskQueue` or a new `TIMERS` block.

### A2. Event-loop processing model: "task queue is a set / first **runnable** task" — **MISSING** (medium)
- **Authoritative**: HTML §8.1.7.3 — a task queue is a **set**; the loop grabs the **first
  runnable task** from an implementation-chosen queue (not a strict global FIFO). The
  **microtask checkpoint** *does* dequeue FIFO.
- **Live KB**: `taskQueue.behavior` = "One task runs to completion per event loop iteration"
  (correct) but implies a single FIFO queue and omits the set / first-runnable / multi-queue
  selection nuance and the reentrancy ("performing a microtask checkpoint") flag.
- **Why it matters**: explains why UAs can prioritize input tasks and why ordering is only
  guaranteed *within* a task source. Low-risk to add; improves correctness of explanations.

### A3. Top-Level Await **mechanism** (ES2022) — **MISSING DETAIL** (low/medium)
- **Authoritative**: "Top-Level Await" entry — `Evaluate()` returns a promise;
  `[[HasTLA]]` modules run via `ExecuteAsyncModule` → `AsyncBlockStart`; completion
  propagates to dependents via `GatherAvailableAncestors` / `[[TopLevelCapability]]`.
- **Live KB**: has the *outcome* only — `asyncFunction.topLevelAwait` = "makes module
  evaluation a Promise" and `MODULE_SEMANTICS … topLevelAwait: "module evaluation becomes
  async."` The dependency-propagation mechanism is absent.
- **Why it matters**: only needed if the visualizer simulates multi-module graphs; for
  single-snippet use the existing summary is adequate. Low priority.

### A4. Pre-ES2015 synchronous-only model — **MISSING** (informational only)
- **Authoritative**: editions 1–5.1 have no job/microtask model at all.
- **Live KB**: intentionally describes the modern spec; no version axis.
- **Recommendation**: **do not add** unless the visualizer adds a "legacy ES" mode. Noted
  for completeness, not flagged as a real gap.

---

## B. CONTRADICTIONS with the cited spec → flag as CONFLICTS

### B1. Event-loop queues attributed to ECMA-262 §9.5 — **CONFLICT (attribution)** (medium)
- **Live KB**:
  - `SPEC_TO_VISUALIZER_MAP.taskQueue.specConcept = "HostEnqueueTimeoutJob (§9.5.6)"`
  - `SPEC_TO_VISUALIZER_MAP.microtaskQueue.specConcept = "HostEnqueuePromiseJob (§9.5.5)"`
  - `JOBS.keyRules.TIMEOUT_JOBS_ARE_TASKS` ties timeout jobs to "the HTML macrotask queue."
- **Authoritative finding**: the **event loop, task queues, and the microtask queue are
  defined by the WHATWG HTML spec (§8.1.7)**, *not* ECMA-262 §9.5. ECMA-262 §9.5 defines
  *Jobs* and the **host hooks** (`HostEnqueuePromiseJob`, and in recent editions
  `HostEnqueueTimeoutJob`/`HostEnqueueGenericJob`) — it does **not** define "the microtask
  queue" or "the task queue" as runtime structures.
- **Severity**: medium. The *behavior* the KB describes is correct; the **sourcing/section
  attribution is wrong**, which matters because this file is the "spec citation" of record.
- **Suggested fix (for review)**: keep `HostEnqueuePromiseJob` as the ECMA-262 hook, but
  attribute the *queues and the drain rule* to WHATWG HTML §8.1.7.3, e.g. add a
  `hostSpec: "WHATWG HTML §8.1.7"` field alongside the `specConcept`.

### B2. `HostEnqueueTimeoutJob` framed as the definition of setTimeout semantics — **CONFLICT (minor)** (low)
- **Live KB**: `JOBS.jobTypes.TimeoutJob` = "Scheduled via HostEnqueueTimeoutJob … Corresponds
  to setTimeout"; `taskQueue.specConcept` cites only `HostEnqueueTimeoutJob (§9.5.6)`.
- **Authoritative**: `HostEnqueueTimeoutJob` is the ECMA-262 *host hook*; the actual
  setTimeout algorithm, timer task source, and 4 ms clamp are **HTML §8.6**. The KB conflates
  the hook with the host-defined timer behavior.
- **Severity**: low (related to B1/A1). Fix by pairing the hook with the HTML timers citation.

### B3. Promise section numbering inconsistent — **MINOR INCONSISTENCY** (low, internal)
- **Live KB**: promises are cited as **§26.6** in several places (`promiseSpec.spec`,
  `generatorState`/`promiseState` maps, `SPEC_SECTION_INDEX["Promise"] = §26.6`) but as
  **§27.2** in `performPromiseThen.spec = "§27.2.5.4.1"`.
- **Authoritative**: in current ECMA-262, Promises are **§27.2** (Control Abstraction is §27;
  §26 is Memory Management / Structured-data-adjacent depending on edition). The doc here used
  §27.2.4.x for the combinators (verified in the 2024 PDF).
- **Severity**: low; purely a citation cleanup. Pick one section scheme (recommend §27.2) and
  apply consistently.

### B4. `await` equivalence understates tick count for thenables — **MINOR** (low)
- **Live KB**: `asyncFunction.awaitEquivalent` = "await x is roughly Promise.resolve(x)
  .then(continuation)"; execution model step 3 = "Promise.resolve(expr) is called."
- **Authoritative**: correct for native promises in the modern single-tick `Await`; but
  awaiting a **thenable** still incurs the extra `PromiseResolveThenableJob` tick (the KB
  *does* note this under `promiseResolve.thenableAssimilation`, so it's inconsistent with its
  own `awaitEquivalent`). Not a spec contradiction, an internal inconsistency.
- **Severity**: low. Optionally cross-reference the two.

---

## C. Consistent / already well-covered (no action)
- Execution Context Stack ↔ Call Stack (§9.4): consistent.
- PromiseJobs are microtasks; run-to-completion; full microtask drain before next task:
  consistent (KB `JOBS.keyRules`, `microtaskQueue.behavior`).
- `performPromiseThen` algorithm, promise internal slots/states: consistent and detailed.
- Generators state machine + Start/Resume/Yield: consistent (cosmetic naming diff only).
- Async generators + for-await-of queueing: consistent.
- Promise.allSettled / any / AggregateError / withResolvers: present and correct.
- Thenable assimilation extra microtask tick: present (matches authoritative).
- Execution-order worked examples (basic micro-vs-macro, nested microtasks, await timing):
  match the authoritative ordering rules exactly.

---

## D. Recommended action order (for your review before any writes)
1. **B1** (attribution fix: queues → WHATWG HTML §8.1.7) — highest value; it's the spec-
   citation correctness this file exists to provide.
2. **A1** (4 ms clamp / nesting) — concrete behavioral gap the visualizer can observably get wrong.
3. **A2** (task-queue-as-set / first-runnable + reentrancy flag) — correctness of explanations.
4. **B2 / B3 / B4** — low-severity citation/consistency cleanups, batch together.
5. **A3** (TLA mechanism) — only if multi-module simulation is on the roadmap.
6. **A4** — skip unless a legacy-ES mode is planned.

_No changes applied to `client/src/lib/ecmaSpecKnowledgeBase.ts`. Awaiting your review._
