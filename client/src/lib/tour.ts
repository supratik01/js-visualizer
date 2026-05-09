import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    stagePadding: 6,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done ✓',
    steps: [
      {
        element: '[data-tour="code-editor"]',
        popover: {
          title: '✏️ Code Editor',
          description: 'Write or paste any JavaScript here. Click the line numbers on the left to set breakpoints — execution will pause there automatically.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-testid="dropdown-examples"]',
        popover: {
          title: '📚 Built-in Examples',
          description: 'Pick from 80+ ready-made examples covering async/await, Promises, closures, generators, classes, and more. Great for learning without writing code first.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-testid="button-run"]',
        popover: {
          title: '▶️ Run / Pause',
          description: 'Click Run to animate the full execution automatically. Click again to pause mid-execution at any point.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-testid="button-step"]',
        popover: {
          title: '⏭️ Step',
          description: 'Advance one action at a time. Perfect for carefully tracing what happens at each line of your code.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-testid="slider-speed"]',
        popover: {
          title: '⚡ Speed Control',
          description: 'Drag left to slow down the animation, right to speed it up. Slow is great for understanding complex async behaviour.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-tour="call-stack"]',
        popover: {
          title: '📋 Call Stack',
          description: 'Shows which functions are currently executing. Functions are pushed in when called and popped out when they return.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="web-apis"]',
        popover: {
          title: '🌐 Web APIs',
          description: 'Where async operations (setTimeout, fetch, events) live while they wait. JavaScript hands them off here and keeps running synchronous code.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tour="event-loop"]',
        popover: {
          title: '🔄 Event Loop',
          description: 'The orchestrator. When the call stack is empty, it picks the next job — microtasks are always flushed first, then one macrotask at a time.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="task-queue"]',
        popover: {
          title: '📥 Task Queue',
          description: 'Macrotask callbacks from setTimeout, setInterval, and DOM events wait here. The event loop picks one per tick.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '[data-tour="microtask-queue"]',
        popover: {
          title: '⚡ Microtask Queue',
          description: 'Promise .then() callbacks and queueMicrotask() land here. These are always flushed completely before the next macrotask runs — this is why Promises resolve before setTimeout.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '[data-tour="console"]',
        popover: {
          title: '🖥️ Console',
          description: 'Your console.log() output appears here in real time as each step executes.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="view-menu"]',
        popover: {
          title: '👁️ View Menu',
          description: 'Toggle optional panels — enable Step Explanations for spec-linked notes on each action, Performance Metrics, or Comparison Mode to run two snippets side by side.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  });

  driverObj.drive();
}
