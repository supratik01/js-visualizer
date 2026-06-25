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

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-6">
      {title && (
        <div className="text-xs text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 border-b-0 rounded-t-lg px-4 py-2">
          {title}
        </div>
      )}
      <pre className={`bg-zinc-900 border border-zinc-800 ${title ? 'rounded-b-lg' : 'rounded-lg'} p-4 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed`}>
        <code>{children}</code>
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
    title: 'Why Do Promises Run Before setTimeout?',
    metaTitle: 'Why Do Promises Run Before setTimeout? — Explained Visually (2026)',
    metaDescription: 'Why does a Promise.then() callback run before setTimeout(fn, 0) in JavaScript? Learn the microtask vs macrotask priority rule that decides the order — with runnable examples.',
    publishedAt: '2026-06-25',
    readingTime: '6 min read',
    tags: ['JavaScript', 'Promises', 'setTimeout', 'Event Loop'],
    excerpt: 'setTimeout(fn, 0) looks like it should run immediately — yet a Promise callback registered later still beats it. Here is the one rule that explains why.',
    content: (
      <>
        <p>
          It's one of the most common JavaScript interview questions, and one of the most confusing things to
          see for the first time: you register a <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">setTimeout(fn, 0)</code>{' '}
          <em>before</em> a <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">Promise.then()</code>,
          yet the Promise callback runs first. Why?
        </p>

        <CodeBlock title="the-question.js">{`setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve().then(() => console.log('promise'));`}</CodeBlock>

        <p>Output:</p>
        <CodeBlock>{`promise
setTimeout`}</CodeBlock>

        <Callout type="tip">
          <TryItLink
            code={`setTimeout(() => console.log('setTimeout'), 0);\nPromise.resolve().then(() => console.log('promise'));`}
            label="Run it yourself in JS Visualizer"
          />
        </Callout>

        <h2 id="the-answer" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          The One-Sentence Answer
        </h2>

        <p>
          Promise callbacks are <strong className="text-cyan-400">microtasks</strong>, and the event loop drains
          the <em>entire</em> microtask queue before it runs the next <strong className="text-red-400">macrotask</strong>{' '}
          — and <code className="text-zinc-400">setTimeout</code> callbacks are macrotasks. So even a 0&nbsp;ms timer
          has to wait until every pending Promise callback has finished.
        </p>

        <h2 id="what-0ms-means" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          What setTimeout(fn, 0) Actually Means
        </h2>

        <p>
          The <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded text-sm">0</code> is not "run now."
          It's a <em>minimum delay</em>. When the timer (handled by a Web API) elapses, the callback is placed in
          the macrotask queue — where it waits for two things:
        </p>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span> All currently-running synchronous code to finish.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span> The entire microtask queue to drain.</li>
        </ol>

        <p>
          Only then can a macrotask run. (Browsers also clamp nested timers to a minimum of ~4&nbsp;ms, but the
          queue priority is the real reason here.)
        </p>

        <h2 id="step-by-step" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Step by Step
        </h2>

        <ol className="my-4 space-y-2 text-sm text-zinc-300">
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">1.</span> <code className="text-zinc-400">setTimeout</code> hands its callback to the Web API timer (0&nbsp;ms).</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">2.</span> <code className="text-zinc-400">Promise.resolve().then()</code> queues its callback as a microtask.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">3.</span> Synchronous code ends → the call stack is empty.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">4.</span> Event loop drains microtasks → <code className="text-zinc-400">promise</code> prints.</li>
          <li className="flex gap-3"><span className="text-emerald-400 font-mono font-bold flex-shrink-0">5.</span> Microtask queue empty → take one macrotask → <code className="text-zinc-400">setTimeout</code> prints.</li>
        </ol>

        <Callout type="warning">
          This means a flood of Promise callbacks can delay your timers. If timing matters, don't assume{' '}
          <code className="text-amber-400">setTimeout(fn, 0)</code> gives you a precise or immediate slot.
        </Callout>

        <h2 id="related" className="text-xl font-bold text-zinc-100 mt-12 mb-4">
          Go Deeper
        </h2>

        <p>
          This is really one instance of a bigger topic — the difference between microtasks and macrotasks.
          For the full picture (including how <code className="text-zinc-400">async/await</code> and{' '}
          <code className="text-zinc-400">queueMicrotask</code> fit in), read{' '}
          <a href="/blogs/microtask-vs-macrotask-javascript" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">Microtask vs Macrotask in JavaScript</a>{' '}
          and the full{' '}
          <a href="/blogs/javascript-event-loop-explained" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">JavaScript Event Loop guide</a>.
        </p>

        <div className="my-8 flex justify-center">
          <TryItLink label="See it animate in JS Visualizer" />
        </div>
      </>
    ),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
