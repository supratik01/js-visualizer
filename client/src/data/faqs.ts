/**
 * Canonical FAQ content for JS Visualizer.
 *
 * This is the single source of truth for the visible /faq page. The same Q&As
 * are also mirrored as static FAQPage JSON-LD in `client/index.html` (so crawlers
 * get the structured data in the initial HTML response without executing JS).
 * If you edit a question or answer here, update the matching entry in index.html
 * to keep the rich-snippet markup in sync.
 */
export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    question: 'What is the JavaScript event loop?',
    answer:
      'The JavaScript event loop is the runtime mechanism that orchestrates execution between the call stack, Web APIs, microtask queue, and macrotask queue. It runs synchronous code, drains microtasks (Promise.then, queueMicrotask), then picks up one macrotask at a time. JS Visualizer animates this entire dance so you can see exactly what runs when.',
  },
  {
    question: 'How does JS Visualizer help me learn async/await?',
    answer:
      'JS Visualizer steps through async functions and shows you when execution suspends, when the resulting Promise resolves, when the resume callback enters the microtask queue, and when the await expression continues. You see the difference between Promise.then chaining, queueMicrotask, and setTimeout in real time.',
  },
  {
    question: 'What is the difference between microtasks and macrotasks in JavaScript?',
    answer:
      'Microtasks (Promise.then callbacks, queueMicrotask) run immediately after the current synchronous task finishes — the engine drains the entire microtask queue before any macrotask. Macrotasks (setTimeout, setInterval, I/O events) run one per event-loop tick. JS Visualizer separates the two queues visually so the ordering is unmistakable.',
  },
  {
    question: 'Is JS Visualizer free to use?',
    answer:
      'Yes — JS Visualizer is completely free, runs entirely in your browser, and requires no signup. There is no paid tier.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. JS Visualizer runs entirely in your browser — no installation, account, or backend required. Just open the page and start stepping through code.',
  },
  {
    question: 'Can I visualize my own JavaScript code?',
    answer:
      'Yes. Paste any JavaScript snippet into the Monaco editor and click RUN. The visualizer steps through it, animating the call stack, queues, and memory graph as your code executes.',
  },
  {
    question: 'What is the call stack in JavaScript?',
    answer:
      "The call stack is the data structure the JavaScript engine uses to track which function is currently running. When a function is called it's pushed onto the stack; when it returns it's popped off. Because JavaScript is single-threaded, only the function on top of the stack runs at any moment. JS Visualizer animates each push and pop so you can watch the stack grow and shrink as your code executes.",
  },
  {
    question: 'Why do Promise callbacks run before setTimeout?',
    answer:
      'Promise .then callbacks are microtasks, and the event loop drains the entire microtask queue after each task before it picks up the next macrotask like setTimeout. So even a setTimeout(fn, 0) callback waits until all pending Promise callbacks have run. JS Visualizer shows this by flying microtasks into the call stack before any timer callback, making the ordering obvious.',
  },
  {
    question: 'Can I step through JavaScript code line by line?',
    answer:
      'Yes. JS Visualizer is an interactive step-through debugger: use Step to advance one operation at a time, set breakpoints, and control playback speed while you watch the call stack, Web APIs, task queue, microtask queue, variable state, and memory graph update live.',
  },
];
