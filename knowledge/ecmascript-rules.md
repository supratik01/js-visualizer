# ECMAScript Runtime Rules — JS Visualizer Knowledge Base

> **Purpose.** Behavioral rules that govern how JavaScript *executes at runtime*,
> extracted from the ECMA-262 specification PDFs (and the WHATWG HTML spec for the
> host event-loop layer) for use by the JS Visualizer engine.
>
> **Scope (per product decision).** Only the ~6 editions that introduce or change
> runtime-scheduling behavior are processed, deltas only: ES2015 (6th), ES2017
> (8th), ES2018 (9th), ES2020 (11th), ES2021 (12th), ES2024 (15th). Editions 1–5.1
> are summarized in one entry (pure synchronous run-to-completion; no jobs,
> promises, generators, or async). The macrotask / Web-API / event-loop layer is
> **not defined in ECMA-262** and is sourced from the WHATWG HTML spec.
>
> **Grounding.** Each entry notes whether its rule text was verified against spec
> text actually read in this session. Items that could not be retrieved verbatim
> are flagged `⚠️ UNVERIFIED` and must be confirmed before the engine relies on them.

---

## Pre-ES2015 (Editions 1–5.1, 1997–2011) — Synchronous Run-to-Completion
**Spec section**: N/A (no job/queue model exists in these editions)
**Visualizer component(s) affected**: Call Stack | Event Loop
**Rule**: Through ES5.1 the language is defined as a single synchronous
run-to-completion model: there is one execution context stack, code runs to
completion, and there is no specified notion of a job queue, microtask, promise,
generator, or asynchronous resumption. Any asynchronency (e.g. timers) is entirely
host-provided and not described by ECMA-262. For the visualizer, code from this era
exercises only the Call Stack; the Microtask Queue, Macrotask Queue, and Web API
panels stay empty unless host APIs (setTimeout) are used.
**Edge cases**: None spec-defined.
**Verification**: ✅ Confirmed by absence — these editions predate the Jobs model
introduced in ES2015 §8.4 (read this session).

---

## Jobs and Job Queues (the microtask foundation) — ES2015
**Spec section**: §8.4 — Jobs and Job Queues (EnqueueJob §8.4.1, NextJob §8.4.2)
**Visualizer component(s) affected**: Microtask Queue | Event Loop | Call Stack
**Rule**: A *Job* is an abstract operation that runs only **when there is no
running execution context and the execution context stack is empty**. A *PendingJob*
is a queued request to run a Job. Once a Job starts it **always executes to
completion**, and **no other Job may be initiated until the current one completes**
(run-to-completion). Job Queues are **FIFO**. Every implementation has at least two:
`ScriptJobs` (evaluate Script/Module source) and `PromiseJobs` (responses to promise
settlement). `EnqueueJob` adds a PendingJob to the **back** of the named queue;
`NextJob` (run when the stack is empty) removes the PendingJob at the **front**,
creates a fresh execution context, pushes it, and performs the Job. For the
visualizer, **`PromiseJobs` entries are exactly the "microtask queue."**
**Edge cases**:
- The spec does **not** define the order in which multiple Job Queues are serviced,
  nor what happens when all queues are empty — both are **implementation/host-defined**.
  (This is where the HTML event loop fills in — see HTML entries below.)
- An implementation may interleave FIFO evaluation across different Job Queues.
- Jobs use `NextJob` instead of `Return`/`ReturnIfAbrupt`.
**Conflicts with prior ES version**: Net-new in ES2015; no prior model existed.
**Verification**: ✅ Verbatim from §8.4 (ES2015 6th edition PDF, pp. 95–97).

---

## PromiseJobs: reaction & resolve-thenable jobs — ES2015
**Spec section**: §25.4.1.3 (CreateResolvingFunctions), §25.4.2 (PromiseReactionJob,
PromiseResolveThenableJob), §25.4.1.8 (TriggerPromiseReactions)
**Visualizer component(s) affected**: Microtask Queue | Call Stack
**Rule**: When a promise settles, its stored `PromiseReaction` records are not run
synchronously. `TriggerPromiseReactions` enqueues one `PromiseReactionJob` per
reaction onto the `PromiseJobs` queue (via `EnqueueJob`). Each `PromiseReactionJob`,
when later run as a microtask, applies the reaction's `[[Handler]]` to the settled
value and resolves/rejects the derived promise. `.then(onFulfilled, onRejected)`
registers reactions; if the promise is already settled, the corresponding job is
enqueued immediately (still deferred to the microtask phase, never synchronous).
`PromiseResolveThenableJob` handles resolving a promise with a thenable, also via a
microtask. The **Promise executor itself runs synchronously** during `new Promise`.
**Edge cases**:
- Resolving a promise with another thenable costs an **extra microtask tick**
  (`PromiseResolveThenableJob`) before the chained handler runs.
- A handler that is not callable produces "Identity"/"Thrower" passthrough behavior.
**Conflicts with prior ES version**: Net-new in ES2015.
**Verification**: ✅ Verbatim from §25.4 (ES2015 6th edition PDF, pp. 503–504);
job-enqueue mechanism cross-checked against §8.4.

---

## Generator suspension & resumption — ES2015
**Spec section**: §25.3.2 (Generator instance slots), §25.3.3 (GeneratorStart,
GeneratorResume, GeneratorResumeAbrupt, GeneratorYield)
**Visualizer component(s) affected**: Call Stack
**Rule**: A generator instance has a `[[GeneratorState]]` that is one of
`undefined`, `"suspendedStart"`, `"suspendedYield"`, `"executing"`, or
`"completed"`, plus a `[[GeneratorContext]]` (its saved execution context).
`GeneratorResume` (called by `.next(v)`): suspends the *caller's* running context,
sets state to `"executing"`, **pushes the generator's `[[GeneratorContext]]` onto
the execution context stack**, and resumes evaluation from where it last yielded,
passing `v` as the result of the suspending operation. `GeneratorYield` suspends the
generator context, **removes it from the stack**, restores the caller as running,
sets state to `"suspendedYield"`, and returns an iter-result `{value, done:false}`.
On completion the context is removed, state becomes `"completed"`, and the context is
never resumed again. **Generators are purely Call-Stack mechanics — they do not
enqueue jobs/microtasks.**
**Edge cases**:
- Resuming a `"completed"` generator returns `{value: undefined, done: true}`.
- Resuming an `"executing"` generator throws `TypeError` (GeneratorValidate).
- `.return()`/`.throw()` resume via `GeneratorResumeAbrupt` (return/throw completion).
**Conflicts with prior ES version**: Net-new in ES2015.
**Verification**: ✅ Verbatim from §25.3.3 (ES2015 6th edition PDF, pp. 500–501).

---

## HTML event loop: tasks, microtasks & the processing model — WHATWG HTML
**Spec section**: WHATWG HTML §8.1.7 — Event loops (processing model §8.1.7.3;
microtasks §8.1.7.x)
**Visualizer component(s) affected**: Event Loop | Macrotask Queue | Microtask Queue
**Rule**: ECMA-262 leaves "which queue runs next / what happens when queues are
empty" host-defined; the HTML event loop supplies it. An event loop has **one or more
task queues** and a single **microtask queue** (the microtask queue is explicitly
**not** a task queue). A *task queue* is a **set** of tasks, not a FIFO queue.
**Processing model (§8.1.7.3), run continually:** (1) if there is a task queue with at
least one **runnable** task, choose one such queue in an implementation-defined manner,
set `oldestTask` to the **first runnable task** in it and **remove** it; (2) set it as
the currently running task and **perform its steps**; (3) set currently running task
back to null; (4) **perform a microtask checkpoint**; (5) (window loops) optionally
update the rendering; repeat. **Microtask checkpoint algorithm:** set "performing a
microtask checkpoint" to true (reentrancy guard); **while the microtask queue is not
empty**, **dequeue** the oldest microtask (FIFO here), set it as currently running, and
run it — so the queue is **fully drained**, including microtasks queued *during* the
checkpoint. ECMA-262 `PromiseJobs` map onto HTML **microtasks**; timer/event callbacks
map onto **tasks (macrotasks)**. This is the precise reason a `Promise.then` callback
runs before a `setTimeout(…,0)` callback: the entire microtask queue is drained after
each single macrotask.
**Edge cases**:
- Task selection grabs the **first runnable task** from a chosen queue (a *set*), **not**
  a strict global FIFO — UAs may prioritize queues (e.g. input over others). Ordering is
  only guaranteed *within* a single task source. The **microtask checkpoint**, by
  contrast, dequeues **FIFO**.
- A microtask that queues another microtask is still processed in the **same** checkpoint
  (the `while not empty` loop) — source of microtask "starvation".
- Only **one** task (macrotask) is taken per loop turn; microtasks are fully drained each turn.
- A "runnable" task requires its document to be null or fully active.
- A microtask that spins the event loop can be moved to a regular task queue (only case
  where a microtask's source/document are consulted).
**Conflicts with prior ES version**: N/A (host spec, not versioned with ECMA-262).
**Verification**: ✅ **Verbatim from the local WHATWG HTML spec** (`whatwg-html-spec.html`):
§8.1.7.3 processing model ("Let `oldestTask` … be the first runnable task in `taskQueue`,
and remove it … Perform `oldestTask`'s steps … Perform a microtask checkpoint") and the
microtask-checkpoint algorithm ("While the event loop's microtask queue is not empty: Let
`oldestMicrotask` be the result of dequeuing … Run `oldestMicrotask`"); task-queue-as-set
and "microtask queue is not a task queue" confirmed in §8.1.7.

---

## HTML timers: setTimeout / setInterval scheduling & clamping — WHATWG HTML
**Spec section**: WHATWG HTML §8.6 — Timers (setTimeout/setInterval steps)
**Visualizer component(s) affected**: Web API | Macrotask Queue
**Rule**: `setTimeout`/`setInterval` do not run their callback inline. The timer
initialization steps schedule a `completionStep` that **queues a global task on the
timer task source** when the delay elapses — i.e. the callback runs as a **task
(macrotask)**, never a microtask. A negative `timeout` is set to `0`. There is a
**nesting level**: if nesting level > 5 and `timeout` < 4, `timeout` is set to **4ms**
(the "4ms clamp"). The nesting level covers both nested `setTimeout` calls and
repeating `setInterval` timers.
**Edge cases**:
- `setTimeout(fn, 0)` at nesting depth ≤ 5 is honored as 0 (still a macrotask, so it
  waits behind the whole microtask queue); at depth > 5 it is clamped to ≥ 4ms.
- The delay is a **minimum**, not a guarantee — the task still waits for the stack to
  clear and the current microtask checkpoint to finish.
**Conflicts with prior ES version**: N/A (host spec).
**Verification**: ✅ Confirmed against fetched HTML timers section this session
("queues a global task on the timer task source"; "If timeout is less than 0, then
set timeout to 0"; "If nesting level is greater than 5, and timeout is less than 4,
then set timeout to 4").

---
## async/await: suspension via microtask continuation — ES2017
**Spec section**: §25.5.5.2 (AsyncFunctionStart), §25.5.5.3 (AsyncFunctionAwait),
§25.5.5.4 (AsyncFunction Awaited Fulfilled/Rejected); AwaitExpression §14.6/§14.7
**Visualizer component(s) affected**: Call Stack | Microtask Queue
**Rule**: An async function returns a promise (`promiseCapability.[[Promise]]`) and
runs synchronously up to its first `await`. `await expr` invokes
`AsyncFunctionAwait(value)`, which: (1) wraps `value` via `NewPromiseCapability` +
`Resolve(value)` — so even awaiting a **non-promise** goes through promise
resolution; (2) attaches `onFulfilled`/`onRejected` continuation functions (each
carrying `[[AsyncContext]]` = the async function's execution context) via
`PerformPromiseThen` — i.e. the continuation is scheduled as a **PromiseJob /
microtask**; (3) **removes the async function's execution context from the execution
context stack** (the function suspends and control returns to its caller). When the
awaited promise fulfills, the awaited-fulfilled job runs (as a microtask), **pushes
the saved `[[AsyncContext]]` back onto the stack**, and resumes evaluation right after
the `await`. So: *everything after an `await` runs as a microtask*, and the async
function's stack frame leaves and re-enters the Call Stack around each await.
**Edge cases**:
- `await` on an already-resolved value or native promise still defers the
  continuation to the microtask phase (never synchronous) — minimum one tick.
- In ES2017 the await path also allocates a `throwawayCapability` and goes through
  `PerformPromiseThen`, costing extra microtask ticks vs. the later optimization
  (see Conflicts).
- The async function's promise resolves when the body returns (step 3.g of
  AsyncFunctionStart); a thrown error rejects it.
**Conflicts with prior ES version**: Net-new in ES2017. **Later change — ✅ VERIFIED
(ES2019, 10th edition, §6.2.3.1 `Await`, p. 44):** the "faster async functions" change
reduced the microtask-tick count for `await`. ES2017 `AsyncFunctionAwait` wrapped the
value with `NewPromiseCapability` + `Resolve`, created a **`throwawayCapability`**
(`[[PromiseIsHandled]]` = true), and called `PerformPromiseThen(…, onFulfilled,
onRejected, throwawayCapability)` (4 args). ES2019 replaces this with a dedicated
`Await(value)` operation whose steps are: `2. Let promise be ? PromiseResolve(%Promise%,
«value»)` (returns a native promise directly instead of always allocating a wrapper) and
`9. Perform ! PerformPromiseThen(promise, onFulfilled, onRejected)` — **no
`throwawayCapability`** (3 args). `throwawayCapability` does **not** appear anywhere in
the ES2019 PDF. Net effect: awaiting a **native promise** drops from ~3 ticks to **1
tick**; the *observable ordering* (continuation is a microtask) is unchanged.
**Verification**: ✅ Verbatim — ES2017 `AsyncFunctionAwait` §25.5.5.3 (8th edition PDF
pp. 789–790; AwaitExpression p. 435) **and** ES2019 `Await` §6.2.3.1 (10th edition PDF
p. 44; `throwawayCapability` confirmed absent across the whole 10th-edition PDF).

---
## Async generators & for-await-of — ES2018
**Spec section**: §25.5 (AsyncGeneratorStart, AsyncGeneratorResume,
AsyncGeneratorResumeNext, AsyncGeneratorYield), Async-from-Sync Iterator
**Visualizer component(s) affected**: Call Stack | Microtask Queue
**Rule**: Async generators combine generator stack mechanics with promise
scheduling. State lives in `[[AsyncGeneratorState]]`
(`suspendedStart`/`suspendedYield`/`executing`/`completed`/`awaiting-return`) and a
`[[AsyncGeneratorQueue]]` of pending requests. `AsyncGeneratorResume` suspends the
caller, sets state `"executing"`, **pushes the generator's
`[[AsyncGeneratorContext]]` onto the execution context stack**, and resumes — exactly
like a sync generator for the Call-Stack view. But results are delivered through
promises: `AsyncGeneratorResolve`/`Reject` settle the request's promise, and
continuations are scheduled via `PerformPromiseThen` (**microtasks**). `for await
(x of asyncIterable)` calls `.next()` and awaits each result, so each iteration is a
microtask-deferred step. `Async-from-Sync Iterator` wraps a sync iterator so each
value is wrapped in a resolved promise.
**Edge cases**:
- A `yield` in an async generator awaits the yielded value before producing it.
- Multiple pending `.next()` calls are queued (`[[AsyncGeneratorQueue]]`) and served
  in order.
**Conflicts with prior ES version**: Builds on ES2015 generators + ES2017 async; net-new in ES2018.
**Verification**: ✅ Verbatim from §25.5 AsyncGeneratorResume (ES2018 9th edition
PDF, p. 710); Async-from-Sync confirmed present (pp. 695–698).

---

## Promise.allSettled — ES2020
**Spec section**: §27.2.4 (Promise.allSettled, PerformPromiseAllSettled)
**Visualizer component(s) affected**: Microtask Queue
**Rule**: `Promise.allSettled(iterable)` returns a new promise that fulfills (never
rejects from a member) with an array of per-promise snapshot objects
(`{status:"fulfilled",value}` or `{status:"rejected",reason}`) **only after all input
promises have settled**. It resolves each iterable element to a promise and attaches
resolve/reject element closures; each settlement is delivered via a **microtask**
reaction, and the outer promise resolves on a later microtask once the remaining
count hits zero. For the visualizer: N inputs ⇒ N reaction microtasks plus the final
resolution microtask.
**Edge cases**: Empty iterable ⇒ fulfills with `[]` on a microtask. A rejected member
does **not** reject the aggregate.
**Conflicts with prior ES version**: Net-new in ES2020. (Note: **top-level await is
NOT in ES2020** — see correction entry below.)
**Verification**: ✅ Confirmed against §27.2.4 allSettled text (ES2020 11th edition
PDF, p. 773).

---

## Promise.any & AggregateError — ES2021
**Spec section**: §27.2.4.3 (Promise.any, PerformPromiseAny); AggregateError §20.5.7
**Visualizer component(s) affected**: Microtask Queue
**Rule**: `Promise.any(iterable)` returns a promise that **fulfills with the first
input to fulfill**; if **all** inputs reject, it rejects with an `AggregateError`
whose `.errors` holds every rejection reason. Like the other combinators, each input
settlement is processed as a **microtask** reaction; the aggregate's fulfillment
fires on the first fulfilling member's microtask, and the all-rejected path resolves
once the remaining count hits zero.
**Edge cases**: Empty iterable ⇒ rejects with an `AggregateError` (no inputs can
fulfill). First fulfillment wins; later settlements are ignored.
**Conflicts with prior ES version**: Net-new in ES2021. Complements
`Promise.all` (first reject wins) / `race` (first settle wins) / `allSettled` (all settle).
**Verification**: ✅ Confirmed §27.2.4.3 Promise.any / PerformPromiseAny present
(ES2021 12th edition PDF, pp. 771–772); AggregateError present (pp. 504–510).

---

## Promise.withResolvers — ES2024
**Spec section**: §27.2.4.8 — Promise.withResolvers ( )
**Visualizer component(s) affected**: Microtask Queue (indirect)
**Rule**: `Promise.withResolvers()` creates a new promise and returns
`{ promise, resolve, reject }` — the same capability that the Promise executor
exposes, but hoisted out so `resolve`/`reject` can be called later from other scopes.
It is pure ergonomics: it changes *no* scheduling semantics. When `resolve`/`reject`
is eventually called, settlement and reaction scheduling behave exactly like any
other promise (reactions run as **microtasks**).
**Edge cases**: None scheduling-relevant; behaves as `new Promise((res,rej)=>…)` with
the functions captured.
**Conflicts with prior ES version**: Net-new in ES2024; no behavioral change to the
event loop.
**Verification**: ✅ Confirmed §27.2.4.8 Promise.withResolvers present (ES2024 15th
edition PDF, p. 715).

---

## Top-Level Await (async module evaluation) — ES2022
**Spec section**: §16.2.1.5 (Evaluate, ExecuteAsyncModule, AsyncModuleExecution
Fulfilled/Rejected, GatherAvailableAncestors); §27.7.5.1 (AsyncBlockStart)
**Visualizer component(s) affected**: Microtask Queue | Event Loop | Call Stack
**Rule**: Top-level `await` makes **module evaluation itself asynchronous**. A Cyclic
Module Record carries `[[HasTLA]]` and a `[[TopLevelCapability]]` promise; `Evaluate()`
**returns a promise** that settles when the module graph finishes. During evaluation,
for each module in dependency order: if `[[HasTLA]]` is true the body runs via
`ExecuteAsyncModule`, which uses **`AsyncBlockStart(capability, ECMAScriptCode,
moduleContext)`** — the same async-function machinery as ES2017 `await`, but driving a
*module* execution context. So a top-level `await` suspends module evaluation exactly
like an `await` inside an async function: the module context is removed from the stack
and its continuation is scheduled as a **microtask**. When an async module finishes,
`AsyncModuleExecutionFulfilled` resolves its `[[TopLevelCapability]]` and uses
`GatherAvailableAncestors` to unblock dependent modules whose pending-async count hits
zero; a thrown error triggers `AsyncModuleExecutionRejected`. Synchronous modules
(`[[HasTLA]]` false) still run via `ExecuteModule` and resolve their capability inline.
**Edge cases**:
- A module with TLA delays evaluation of every module that depends on it until its
  promise settles (dependency-ordered, microtask-driven).
- Errors in an async module reject dependents via the async rejection path, not a
  synchronous throw.
- `AsyncBlockStart` here is the ES2022 rename/refactor of ES2017 `AsyncFunctionStart`,
  now taking an explicit `asyncContext` argument (works for both functions and modules).
**Conflicts with prior ES version**: Net-new in ES2022. Resolves the earlier scoping
error (top-level await is **not** in ES2020). Reuses ES2017 await semantics at module scope.
**Verification**: ✅ Verbatim from §16.2.1.5 ExecuteAsyncModule / AsyncModuleExecution
Fulfilled (ES2022 13th edition PDF, pp. 411, 414–417) and §27.7.5.1 AsyncBlockStart
(p. 764); ES2020 absence re-confirmed.

---

# VISUALIZER COVERAGE REPORT

## Rules captured, by source
| Source | Rules | Verification |
|---|---|---|
| Pre-ES2015 (1st–5.1) | 1 (synchronous model) | ✅ by absence |
| ES2015 (6th) | 3 (Jobs/Job Queues, PromiseJobs, Generators) | ✅ verbatim |
| ES2017 (8th) | 1 (async/await suspension) | ✅ verbatim |
| ES2018 (9th) | 1 (async generators / for-await) | ✅ verbatim |
| ES2019 (10th) | 0 new (clarifies ES2017 await tick-count) | ✅ verbatim (§6.2.3.1) |
| ES2020 (11th) | 1 (Promise.allSettled) | ✅ confirmed |
| ES2021 (12th) | 1 (Promise.any / AggregateError) | ✅ confirmed |
| ES2022 (13th) | 1 (top-level await / async module eval) | ✅ verbatim |
| ES2024 (15th) | 1 (Promise.withResolvers) | ✅ confirmed |
| WHATWG HTML | 2 (event-loop model, timers) | ✅ both verbatim |
| **Total** | **12 rules** | |

## Components most affected
- **Microtask Queue**: every promise/async rule (ES2015 PromiseJobs → ES2024
  withResolvers) plus the HTML microtask checkpoint. This is the densest area and the
  core of the visualizer's correctness.
- **Call Stack**: execution-context push/pop for generators (ES2015), async function
  suspend/resume (ES2017), async generators (ES2018).
- **Macrotask Queue + Web API**: sourced **only** from the WHATWG HTML timers entry —
  ECMA-262 contributes nothing here.
- **Event Loop**: the *orchestration* (one macrotask → full microtask drain → repeat)
  is HTML-defined; ECMA-262 only guarantees per-queue FIFO + run-to-completion.

## Spec behaviors the visualizer cannot source from the provided files (gaps)
1. **Macrotask queue, Web APIs, event-loop processing model, rendering** — not in
   ECMA-262 at all (sourced from the WHATWG HTML spec). ✅ **CLOSED** — processing
   model (§8.1.7.3) and microtask-checkpoint algorithm now verified verbatim from the
   local `whatwg-html-spec.html`. (Remaining Web-API surface beyond timers — `fetch`,
   DOM events — is defined across other specs and not extracted here.)
2. ~~**Top-Level Await (ES2022)**~~ — ✅ **CLOSED.** 13th edition added to scope and
   the rule captured verbatim (see "Top-Level Await" entry above).
3. ~~**`await` tick-count optimization**~~ — ✅ **CLOSED.** Verified in ES2019 (10th
   edition) §6.2.3.1 `Await` (p. 44): `throwawayCapability` removed, `PromiseResolve`
   used; await on a native promise drops ~3 ticks → 1 tick. Observable ordering
   unchanged. See the ES2017 entry's "Conflicts with prior ES version" note.

## Version-aware branching the engine may need
- **Pre-ES2015 vs ES2015+**: no microtask queue at all before ES2015 — but in practice
  the visualizer can treat all input as ES2015+ unless emulating legacy precisely.
- **`await` tick count**: ES2017 (extra wrapper promise / throwaway capability) vs the
  later single-tick await. If the visualizer shows exact microtask counts for `await`
  on native promises, it needs a version toggle; if it only shows ordering, no branch
  needed.
- **Combinators present**: `allSettled` (ES2020), `any`/`AggregateError` (ES2021),
  `withResolvers` (ES2024) — gate availability by target ES version if the visualizer
  validates feature support, but their *scheduling* (reactions = microtasks) is uniform.
