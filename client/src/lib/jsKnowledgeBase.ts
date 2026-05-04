/**
 * JavaScript Execution Model Knowledge Base
 * 
 * Based on authoritative MDN Web Docs documentation:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model
 * - https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
 * 
 * This knowledge base captures the complete semantic model of JavaScript
 * for accurate visualization and simulation.
 */

// ============================================================================
// SECTION 1: EXECUTION MODEL FUNDAMENTALS
// ============================================================================

/**
 * JavaScript Agent Execution Model (per ECMAScript/MDN)
 * 
 * Each agent maintains:
 * 1. HEAP: Unstructured memory region for objects
 * 2. JOB QUEUE (Event Loop): Enables async programming, FIFO order
 * 3. CALL STACK: LIFO stack of execution contexts
 */
export interface AgentModel {
  heap: Map<string, any>;
  jobQueue: Job[];
  callStack: ExecutionContext[];
}

/**
 * Execution Context (Stack Frame) - MDN Definition
 * 
 * Tracks:
 * - Code evaluation state
 * - The function/module/script being executed
 * - Current realm
 * - Variable bindings (var, let, const, function, class)
 * - Private identifiers (#foo)
 * - `this` reference
 */
export interface ExecutionContext {
  id: string;
  type: 'global' | 'function' | 'eval' | 'module';
  name: string;
  line: number;
  
  // Lexical Environment
  lexicalEnvironment: LexicalEnvironment;
  
  // Variable Environment (for var declarations)
  variableEnvironment: VariableEnvironment;
  
  // This binding
  thisBinding: any;
  
  // For async/generator functions
  generatorState?: 'suspended-start' | 'suspended-yield' | 'executing' | 'completed';
}

/**
 * Lexical Environment - captures closure scope chain
 */
export interface LexicalEnvironment {
  // Environment record holding bindings
  environmentRecord: Map<string, Binding>;
  
  // Outer environment reference (forms scope chain)
  outerEnvironment: LexicalEnvironment | null;
}

export interface VariableEnvironment extends LexicalEnvironment {
  // Specifically for var declarations (hoisted to function/global scope)
}

export interface Binding {
  name: string;
  value: any;
  kind: 'var' | 'let' | 'const' | 'function' | 'class' | 'parameter';
  initialized: boolean;
  // For let/const: TDZ (Temporal Dead Zone) tracking
  inTDZ: boolean;
}

// ============================================================================
// SECTION 2: JOB QUEUE AND EVENT LOOP
// ============================================================================

/**
 * Job Types in JavaScript (per MDN/HTML spec)
 * 
 * Jobs are split into two categories with different priorities:
 * 1. TASKS (Macrotasks): Lower priority, one per event loop iteration
 * 2. MICROTASKS: Higher priority, all drained before next task
 */
export type JobType = 'task' | 'microtask';

export interface Job {
  id: string;
  type: JobType;
  callback: () => void;
  source: JobSource;
  line: number;
  
  // For visualization
  callbackDescription: string;
}

/**
 * Job Sources - What creates jobs
 */
export type JobSource = 
  // Tasks (Macrotasks)
  | 'script'              // Initial script execution
  | 'setTimeout'          // Timer callbacks
  | 'setInterval'         // Interval callbacks
  | 'setImmediate'        // Node.js immediate (task in Node)
  | 'I/O'                 // I/O callbacks
  | 'UI-rendering'        // Browser rendering
  | 'requestAnimationFrame' // Animation frame callbacks
  | 'user-interaction'    // Click, keypress, etc.
  | 'MessageChannel'      // postMessage
  
  // Microtasks
  | 'Promise.then'        // Promise fulfillment/rejection handlers
  | 'Promise.catch'       // Promise rejection handlers
  | 'Promise.finally'     // Promise finally handlers
  | 'queueMicrotask'      // Explicit microtask
  | 'MutationObserver'    // DOM mutation callbacks
  | 'async-await';        // Await resume points

/**
 * Event Loop Processing Rules (per MDN/HTML spec)
 * 
 * The event loop algorithm:
 * 
 * 1. Execute the oldest TASK from the task queue
 *    - Run to completion (cannot be preempted)
 *    - May create new tasks and microtasks
 * 
 * 2. After task completes, process ALL MICROTASKS:
 *    - Drain the entire microtask queue
 *    - Microtasks can add more microtasks
 *    - All must complete before next task
 * 
 * 3. Browser may update rendering
 * 
 * 4. Repeat from step 1
 */
export const EVENT_LOOP_PHASES = [
  'idle',                    // Waiting for jobs
  'executing-task',          // Running a macrotask
  'checking-microtasks',     // Checking microtask queue
  'processing-microtasks',   // Draining microtask queue
  'rendering'                // Browser rendering (optional)
] as const;

export type EventLoopPhase = typeof EVENT_LOOP_PHASES[number];

/**
 * Critical Event Loop Rules:
 */
export const EVENT_LOOP_RULES = {
  // Run-to-completion: Each job runs entirely before next
  RUN_TO_COMPLETION: 'Each job/task runs completely before any other job is processed',
  
  // Microtask priority
  MICROTASK_PRIORITY: 'Microtasks have higher priority than tasks',
  
  // Microtask draining
  MICROTASK_DRAIN: 'The microtask queue is drained completely before the next task',
  
  // Microtask recursion
  MICROTASK_RECURSION: 'Microtasks can add more microtasks, all processed before next task',
  
  // Never blocking
  NEVER_BLOCKING: 'JavaScript execution is never blocking for I/O',
  
  // Single thread
  SINGLE_THREAD: 'Each agent is single-threaded; code cannot be preempted'
};

// ============================================================================
// SECTION 3: PROMISE EXECUTION SEMANTICS
// ============================================================================

/**
 * Promise States (per ECMAScript)
 */
export type PromiseState = 'pending' | 'fulfilled' | 'rejected';

/**
 * Promise Internal Slots
 */
export interface PromiseRecord {
  id: string;
  state: PromiseState;
  
  // Result value (for fulfilled)
  result?: any;
  
  // Rejection reason (for rejected)
  reason?: any;
  
  // Registered callbacks
  fulfillReactions: PromiseReaction[];
  rejectReactions: PromiseReaction[];
  
  // Is this from an async function?
  isAsyncFunctionPromise: boolean;
}

export interface PromiseReaction {
  id: string;
  capability: PromiseCapability;
  type: 'fulfill' | 'reject';
  handler: Function | null; // null means identity function
}

export interface PromiseCapability {
  promise: PromiseRecord;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

/**
 * Promise Resolution Rules (per MDN/ECMAScript)
 */
export const PROMISE_RULES = {
  // Callback timing
  ALWAYS_ASYNC: 'Promise callbacks are NEVER called synchronously, even for already-resolved promises',
  
  // Microtask scheduling
  MICROTASK_QUEUE: 'Promise then/catch/finally callbacks are scheduled as microtasks',
  
  // Resolution order for already-resolved
  IMMEDIATE_QUEUE: 'For already-resolved promises, callbacks are immediately queued as microtasks',
  
  // Chaining semantics
  THEN_RETURNS_NEW: 'then() always returns a NEW promise, different from the original',
  
  // Value unwrapping
  THENABLE_UNWRAP: 'If a then callback returns a promise, the chain waits for it',
  
  // Error propagation
  ERROR_PROPAGATION: 'Rejections propagate down the chain until caught by .catch()',
  
  // Multiple handlers
  MULTIPLE_HANDLERS: 'Multiple handlers can be attached; they execute in registration order',
  
  // Catch semantics
  CATCH_IS_THEN: 'catch(fn) is equivalent to then(null, fn)',
  
  // Finally semantics
  FINALLY_PASSTHROUGH: 'finally() passes through the result/error to the next handler'
};

/**
 * Promise.resolve() Semantics
 * 
 * - If value is a promise, returns the same promise
 * - If value is a thenable, adopts its state
 * - Otherwise, returns a new fulfilled promise with the value
 */
export function describePromiseResolve(value: any): string {
  if (value && typeof value.then === 'function') {
    return 'Returns thenable, will adopt its eventual state';
  }
  return `Returns immediately fulfilled promise with value: ${JSON.stringify(value)}`;
}

// ============================================================================
// SECTION 4: ASYNC/AWAIT SEMANTICS
// ============================================================================

/**
 * Async Function Execution Model (per MDN)
 * 
 * Key behaviors:
 * 1. Always returns a Promise
 * 2. Code before first await runs SYNCHRONOUSLY
 * 3. Each await suspends the function and yields control
 * 4. Resumption is scheduled as a microtask when awaited promise settles
 */
export const ASYNC_AWAIT_RULES = {
  // Return type
  ALWAYS_RETURNS_PROMISE: 'An async function ALWAYS returns a Promise',
  
  // Implicit wrapping
  IMPLICIT_PROMISE_WRAP: 'Return value is implicitly wrapped in Promise.resolve()',
  
  // Synchronous start
  SYNC_UNTIL_AWAIT: 'Code runs synchronously until first await',
  
  // Await behavior
  AWAIT_SUSPENDS: 'await suspends function, yields control to caller',
  
  // Resume timing
  RESUME_IS_MICROTASK: 'Resume after await is scheduled as a microtask',
  
  // Equivalent transformation
  EQUIVALENT_TO_THEN: 'Code after await is like being in a .then() callback'
};

/**
 * How await transforms code (per MDN example)
 * 
 * async function foo() { await 1; }
 * 
 * Is equivalent to:
 * 
 * function foo() { return Promise.resolve(1).then(() => undefined); }
 */
export interface AwaitTransformation {
  // The promise being awaited
  awaitedPromise: PromiseRecord;
  
  // The continuation (code after await)
  continuation: Function;
  
  // The async function's result promise
  resultPromise: PromiseRecord;
}

// ============================================================================
// SECTION 5: CLOSURE AND SCOPING RULES
// ============================================================================

/**
 * Lexical Scoping Rules (per MDN)
 * 
 * JavaScript uses lexical (static) scoping:
 * - Variable availability is determined by source code position
 * - Inner functions can access outer function variables
 * - Scope is determined at definition time, not call time
 */
export const SCOPING_RULES = {
  // Lexical scope
  LEXICAL_SCOPE: 'Variable scope is determined by code position, not runtime',
  
  // Scope chain
  SCOPE_CHAIN: 'Nested functions have access to all outer scopes',
  
  // Closure creation
  CLOSURE_CREATION: 'Functions remember their lexical environment at creation time',
  
  // Closure survival
  CLOSURE_SURVIVES: 'Closures can outlive their enclosing execution context',
  
  // var hoisting
  VAR_HOISTING: 'var declarations are hoisted to function/global scope',
  
  // let/const block scope
  LET_CONST_BLOCK: 'let and const are block-scoped',
  
  // TDZ
  TEMPORAL_DEAD_ZONE: 'let/const have TDZ from block start until declaration'
};

/**
 * Variable Declaration Behaviors
 */
export const DECLARATION_BEHAVIORS = {
  var: {
    hoisted: true,
    scope: 'function',
    canRedeclare: true,
    initialValue: undefined,
    hasTDZ: false
  },
  let: {
    hoisted: true, // but in TDZ
    scope: 'block',
    canRedeclare: false,
    initialValue: undefined,
    hasTDZ: true
  },
  const: {
    hoisted: true, // but in TDZ
    scope: 'block',
    canRedeclare: false,
    initialValue: 'must be initialized',
    hasTDZ: true
  },
  function: {
    hoisted: true,
    scope: 'function', // or block in strict mode
    canRedeclare: true,
    initialValue: 'function body',
    hasTDZ: false
  }
};

// ============================================================================
// SECTION 6: WEB API TIMING BEHAVIORS
// ============================================================================

/**
 * setTimeout/setInterval Behavior (per HTML spec via MDN)
 */
export const TIMER_BEHAVIORS = {
  // Minimum delay
  MIN_DELAY: 'Browsers enforce minimum ~4ms delay for nested timeouts',
  
  // Zero delay meaning
  ZERO_DELAY: 'setTimeout(fn, 0) means "run after current task and microtasks"',
  
  // Task queue
  TIMER_IS_TASK: 'Timer callbacks are scheduled as TASKS (macrotasks)',
  
  // Delay guarantee
  DELAY_MINIMUM: 'Delay is minimum time, not guaranteed exact time',
  
  // Order
  FIFO_SAME_DELAY: 'Timers with same delay fire in scheduling order'
};

/**
 * queueMicrotask Behavior (per MDN)
 */
export const QUEUE_MICROTASK_BEHAVIOR = {
  // Direct microtask
  DIRECT_QUEUE: 'Directly queues a microtask without Promise overhead',
  
  // No return value
  RETURNS_VOID: 'queueMicrotask returns undefined',
  
  // Exception handling
  EXCEPTIONS: 'Exceptions in queueMicrotask are reported normally, not as rejections',
  
  // Timing
  BEFORE_NEXT_TASK: 'Microtask runs before any tasks, after current code'
};

// ============================================================================
// SECTION 7: EXECUTION ORDER EXAMPLES
// ============================================================================

/**
 * Canonical execution order examples for verification
 */
export const EXECUTION_ORDER_EXAMPLES = {
  // Example 1: Basic microtask vs task
  basicMicrotaskVsTask: {
    code: `
      console.log("1");
      setTimeout(() => console.log("2"), 0);
      Promise.resolve().then(() => console.log("3"));
      console.log("4");
    `,
    expectedOutput: ["1", "4", "3", "2"],
    explanation: [
      "1: Synchronous",
      "4: Synchronous",
      "3: Microtask (Promise.then) - runs before task",
      "2: Task (setTimeout) - runs after microtasks"
    ]
  },
  
  // Example 2: Nested microtasks
  nestedMicrotasks: {
    code: `
      Promise.resolve().then(() => {
        console.log("1");
        Promise.resolve().then(() => console.log("2"));
      });
      Promise.resolve().then(() => console.log("3"));
      console.log("4");
    `,
    expectedOutput: ["4", "1", "3", "2"],
    explanation: [
      "4: Synchronous",
      "1: First microtask",
      "3: Second microtask (registered before 2)",
      "2: Nested microtask (added during processing, still before tasks)"
    ]
  },
  
  // Example 3: Promise chaining
  promiseChaining: {
    code: `
      Promise.resolve()
        .then(() => console.log("1"))
        .then(() => console.log("2"))
        .then(() => console.log("3"));
      console.log("4");
    `,
    expectedOutput: ["4", "1", "2", "3"],
    explanation: [
      "4: Synchronous",
      "1: First then callback",
      "2: Second then callback (scheduled after 1 completes)",
      "3: Third then callback (scheduled after 2 completes)"
    ]
  },
  
  // Example 4: async/await
  asyncAwait: {
    code: `
      async function foo() {
        console.log("1");
        await Promise.resolve();
        console.log("2");
      }
      console.log("3");
      foo();
      console.log("4");
    `,
    expectedOutput: ["3", "1", "4", "2"],
    explanation: [
      "3: Synchronous",
      "1: Sync part of async function (before await)",
      "4: Synchronous (after foo() returns its promise)",
      "2: After await (scheduled as microtask)"
    ]
  },
  
  // Example 5: Mixed everything
  mixedComplex: {
    code: `
      console.log("1");
      setTimeout(() => console.log("2"), 0);
      Promise.resolve().then(() => {
        console.log("3");
        setTimeout(() => console.log("4"), 0);
        Promise.resolve().then(() => console.log("5"));
      });
      setTimeout(() => console.log("6"), 0);
      console.log("7");
    `,
    expectedOutput: ["1", "7", "3", "5", "2", "6", "4"],
    explanation: [
      "1: Synchronous",
      "7: Synchronous",
      "3: First microtask",
      "5: Nested microtask (all microtasks before any tasks)",
      "2: First setTimeout (scheduled before 6)",
      "6: Second setTimeout",
      "4: Third setTimeout (scheduled during microtask processing)"
    ]
  },
  
  // Example 6: queueMicrotask
  queueMicrotaskExample: {
    code: `
      console.log("1");
      queueMicrotask(() => console.log("2"));
      Promise.resolve().then(() => console.log("3"));
      queueMicrotask(() => console.log("4"));
      console.log("5");
    `,
    expectedOutput: ["1", "5", "2", "3", "4"],
    explanation: [
      "1: Synchronous",
      "5: Synchronous",
      "2: First microtask (queueMicrotask)",
      "3: Second microtask (Promise.then)",
      "4: Third microtask (queueMicrotask) - order is FIFO"
    ]
  }
};

// ============================================================================
// SECTION 8: VISUALIZATION HELPERS
// ============================================================================

/**
 * Determine which queue an operation belongs to
 */
export function classifyOperation(source: string): JobType {
  const microtaskSources = [
    'Promise.then',
    'Promise.catch',
    'Promise.finally',
    'queueMicrotask',
    'MutationObserver',
    'async-await'
  ];
  
  return microtaskSources.includes(source) ? 'microtask' : 'task';
}

/**
 * Get human-readable description of event loop phase
 */
export function describeEventLoopPhase(phase: EventLoopPhase): string {
  const descriptions: Record<EventLoopPhase, string> = {
    'idle': 'Waiting for tasks',
    'executing-task': 'Executing current task',
    'checking-microtasks': 'Checking microtask queue',
    'processing-microtasks': 'Processing microtasks (draining queue)',
    'rendering': 'Browser rendering (if needed)'
  };
  return descriptions[phase];
}

/**
 * Describe why an operation is async
 */
export function describeAsyncBehavior(operation: string): string {
  const behaviors: Record<string, string> = {
    'setTimeout': 'Callback queued as TASK after delay elapses',
    'setInterval': 'Callback queued as TASK repeatedly',
    'Promise.then': 'Callback queued as MICROTASK when promise fulfills',
    'Promise.catch': 'Callback queued as MICROTASK when promise rejects',
    'Promise.finally': 'Callback queued as MICROTASK when promise settles',
    'Promise.resolve().then': 'Callback queued as MICROTASK immediately',
    'await': 'Continuation queued as MICROTASK when awaited promise settles',
    'queueMicrotask': 'Callback queued as MICROTASK immediately'
  };
  return behaviors[operation] || 'Async operation';
}

export default {
  EVENT_LOOP_RULES,
  PROMISE_RULES,
  ASYNC_AWAIT_RULES,
  SCOPING_RULES,
  TIMER_BEHAVIORS,
  QUEUE_MICROTASK_BEHAVIOR,
  EXECUTION_ORDER_EXAMPLES,
  classifyOperation,
  describeEventLoopPhase,
  describeAsyncBehavior
};
