export interface CodeExample {
  title: string;
  description: string;
  code: string;
  category: string;
}

export const categoryLabels: Record<string, string> = {
  sync: "Synchronous",
  callstack: "Call Stack",
  promises: "Promises",
  microtasks: "Microtasks",
  timers: "Timers",
  eventloop: "Event Loop",
  async: "Async/Await",
  advanced: "Advanced Patterns",
  combinators: "Promise Combinators",
  errors: "Error Handling",
  webplatform: "Web APIs",
  hoisting: "Hoisting & TDZ",
  scope: "Scope & Closures",
  this: "This Binding",
  coercion: "Type Coercion",
  collections: "Map & Set",
  classes: "Classes",
  operators: "Operators",
  destructuring: "Destructuring",
  builtins: "Built-ins",
  generators: "Generators",
  inheritance: "Inheritance",
  metaprogramming: "Metaprogramming",
  binary: "Binary Data",
  showcase: "★ Full Feature Tour",
};

export const codeExamples: CodeExample[] = [
  // ─── SHOWCASE ─────────────────────────────────────────────────────────────
  {
    title: "Complete JS Runtime Tour",
    description: "Classes, closures, generators, Map/Set, error handling, async/await, Promise.all, and the event loop — all in one program",
    category: "showcase",
    code: `// ── 1. Classes · Private Fields · Method Chaining ──────────
class Stack {
  #items = [];
  push(v)    { this.#items.push(v); return this; }
  pop()      { return this.#items.pop(); }
  peek()     { return this.#items.at(-1); }
  get size() { return this.#items.length; }
}
const stack = new Stack();
stack.push("a").push("b").push("c");
console.log("Stack peek:", stack.peek(), "| size:", stack.size);

// ── 2. Closures · Destructuring ─────────────────────────────
function makeCounter(start = 0) {
  let n = start;
  return { inc: () => ++n, dec: () => --n, val: () => n };
}
const { inc, val } = makeCounter(10);
console.log("Counter:", inc(), inc(), "| val:", val());

// ── 3. Generator · Spread · Array Destructuring ─────────────
function* range(a, b) { for (let i = a; i <= b; i++) yield i; }
const nums = [...range(1, 5)];
const [first, , third, ...rest] = nums;
console.log("first:", first, "third:", third, "rest:", rest);

// ── 4. Map · Set · for...of ─────────────────────────────────
const scores = new Map([["Alice", 95], ["Bob", 87], ["Carol", 92]]);
const unique = new Set([...nums, 2, 3, 3]);
console.log("Unique count:", unique.size);
for (const [name, score] of scores) console.log(\` \${name}: \${score}\`);

// ── 5. Error Handling · Optional Chaining · Nullish ─────────
function divide(a, b) {
  if (b === 0) throw new RangeError("Division by zero");
  return a / b;
}
try {
  console.log("10 / 2 =", divide(10, 2));
  divide(10, 0);
} catch (e) {
  console.log("Caught:", e.message);
} finally {
  console.log("Finally ran");
}
const user = { profile: { name: "Alice" } };
console.log("User:", user?.profile?.name ?? "anonymous");

// ── 6. Event Loop: sync → microtasks → macrotasks ───────────
console.log("[sync]  script start");

setTimeout(() => console.log("[macro] setTimeout"), 0);
queueMicrotask(() => console.log("[micro] queueMicrotask"));

async function fetchData() {
  console.log("[async] start");
  const [a, b] = await Promise.all([
    Promise.resolve("data-A"),
    Promise.resolve("data-B"),
  ]);
  console.log("[async] resolved:", a, b);
  try {
    await Promise.reject(new Error("network error"));
  } catch (err) {
    console.log("[async] caught:", err.message);
  }
  return "complete";
}

fetchData().then(r => console.log("[then] ", r));
Promise.resolve().then(() => console.log("[micro] Promise.resolve"));

console.log("[sync]  script end");`,
  },

  // ─── SYNCHRONOUS ──────────────────────────────────────────────────────────
  {
    title: "Variables & Expressions",
    description: "Basic variable declarations and arithmetic",
    category: "sync",
    code: `let a = 10;
let b = 20;
let sum = a + b;
console.log("Sum:", sum);

const message = "Hello";
console.log(message + " World!");`
  },
  {
    title: "Control Flow",
    description: "If/else and ternary operators",
    category: "sync",
    code: `let x = 15;

if (x > 10) {
  console.log("x is greater than 10");
} else {
  console.log("x is 10 or less");
}

let result = x > 20 ? "big" : "small";
console.log("Result:", result);`
  },
  {
    title: "For Loop",
    description: "Basic loop iteration",
    category: "sync",
    code: `console.log("Starting loop");

for (let i = 0; i < 3; i++) {
  console.log("Iteration:", i);
}

console.log("Loop complete");`
  },
  {
    title: "Array Methods",
    description: "forEach with callbacks",
    category: "sync",
    code: `const numbers = [1, 2, 3];

console.log("Using forEach:");
numbers.forEach((n, i) => {
  console.log("Item", i, "=", n);
});

console.log("Done!");`
  },

  {
    title: "Function Calls",
    description: "Nested function execution and call stack",
    category: "callstack",
    code: `function greet(name) {
  console.log("Hello,", name);
  return name;
}

function main() {
  console.log("Start");
  greet("World");
  console.log("End");
}

main();`
  },
  {
    title: "Nested Functions",
    description: "Deep call stack visualization",
    category: "callstack",
    code: `function a() {
  console.log("In function a");
  b();
  console.log("Back in a");
}

function b() {
  console.log("In function b");
  c();
  console.log("Back in b");
}

function c() {
  console.log("In function c");
}

a();`
  },

  {
    title: "Promise Basics",
    description: "Promise.resolve and .then()",
    category: "promises",
    code: `console.log("Script start");

Promise.resolve("Hello")
  .then((value) => {
    console.log("Promise resolved:", value);
  });

console.log("Script end");`
  },
  {
    title: "Promise Chain",
    description: "Chained .then() with value propagation",
    category: "promises",
    code: `Promise.resolve(1)
  .then((value) => {
    console.log("First then:", value);
    return value + 1;
  })
  .then((value) => {
    console.log("Second then:", value);
    return value + 1;
  })
  .then((value) => {
    console.log("Third then:", value);
  });

console.log("Sync code after promise chain");`
  },
  {
    title: "Multiple Promises",
    description: "Parallel promise execution order",
    category: "promises",
    code: `Promise.resolve()
  .then(() => {
    console.log("A");
    return "B";
  })
  .then((val) => {
    console.log(val);
  });

Promise.resolve()
  .then(() => console.log("C"));

console.log("D");`
  },
  {
    title: "Promise.catch",
    description: "Error handling in promises",
    category: "promises",
    code: `console.log("Start");

Promise.reject("Something went wrong")
  .catch((error) => {
    console.log("Caught error:", error);
  });

Promise.resolve("Success")
  .then((value) => console.log(value));

console.log("End");`
  },
  {
    title: "new Promise (sync resolve)",
    description: "Promise constructor with immediate resolve",
    category: "promises",
    code: `console.log("Before promise");

const myPromise = new Promise((resolve, reject) => {
  console.log("Inside executor (sync)");
  resolve("Done!");
});

myPromise.then((value) => {
  console.log("Resolved:", value);
});

console.log("After promise setup");`
  },
  {
    title: "new Promise (async resolve)",
    description: "Promise resolved inside setTimeout",
    category: "promises",
    code: `console.log("Start");

const delayedPromise = new Promise((resolve, reject) => {
  console.log("Setting up delayed resolve");
  setTimeout(() => {
    console.log("Resolving now!");
    resolve("Async value");
  }, 100);
});

delayedPromise.then((v) => console.log("Got:", v));

console.log("End");`
  },
  {
    title: "Promise rejection",
    description: "Using reject with catch and finally",
    category: "promises",
    code: `console.log("Start");

new Promise((resolve, reject) => {
  console.log("Checking condition...");
  reject("Something went wrong");
}).catch((error) => {
  console.log("Caught:", error);
}).finally(() => {
  console.log("Cleanup in finally");
});

console.log("End");`
  },

  {
    title: "queueMicrotask",
    description: "Native microtask API",
    category: "microtasks",
    code: `console.log("1 - Sync");

queueMicrotask(() => {
  console.log("2 - Microtask");
});

queueMicrotask(() => {
  console.log("3 - Microtask");
});

console.log("4 - Sync");`
  },
  {
    title: "Nested Microtasks",
    description: "Microtasks within microtasks",
    category: "microtasks",
    code: `queueMicrotask(() => {
  console.log("Microtask 1");
  queueMicrotask(() => {
    console.log("Nested Microtask");
  });
});

queueMicrotask(() => {
  console.log("Microtask 2");
});

console.log("Sync");`
  },

  {
    title: "setTimeout Basics",
    description: "Task queue demonstration",
    category: "timers",
    code: `console.log("Start");

setTimeout(() => {
  console.log("Timeout 1");
}, 0);

setTimeout(() => {
  console.log("Timeout 2");
}, 0);

console.log("End");`
  },
  {
    title: "Mixed Timer Delays",
    description: "setTimeout with different delays",
    category: "timers",
    code: `console.log("Start");

setTimeout(() => console.log("Fast - 0ms"), 0);
setTimeout(() => console.log("Slow - 100ms"), 100);
setTimeout(() => console.log("Medium - 50ms"), 50);

console.log("End");`
  },

  {
    title: "Microtask Priority",
    description: "Microtasks always run before tasks",
    category: "eventloop",
    code: `console.log("Script start");

setTimeout(() => {
  console.log("setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("Script end");

// Output: Script start, Script end, Promise, setTimeout`
  },
  {
    title: "Complete Event Loop",
    description: "All async patterns together",
    category: "eventloop",
    code: `console.log("1 - Sync");

setTimeout(() => {
  console.log("2 - Task 1");
  Promise.resolve().then(() => {
    console.log("3 - Microtask in Task");
  });
}, 0);

Promise.resolve().then(() => {
  console.log("4 - Microtask 1");
  setTimeout(() => {
    console.log("5 - Task in Microtask");
  }, 0);
});

queueMicrotask(() => {
  console.log("6 - QueueMicrotask");
});

console.log("7 - Sync End");`
  },

  {
    title: "Async/Await Basics",
    description: "Async function execution flow",
    category: "async",
    code: `async function fetchData() {
  console.log("1 - Start fetch");
  await Promise.resolve();
  console.log("2 - After await");
  return "data";
}

console.log("3 - Before call");
fetchData();
console.log("4 - After call");`
  },
  {
    title: "Multiple Awaits",
    description: "Sequential await statements",
    category: "async",
    code: `async function process() {
  console.log("Start");
  
  await Promise.resolve();
  console.log("After first await");
  
  await Promise.resolve();
  console.log("After second await");
  
  console.log("Done");
}

process();
console.log("Sync after call");`
  },
  {
    title: "Async Stack Trace",
    description: "Nested async function calls",
    category: "async",
    code: `async function level3() {
  console.log("Level 3 executing");
  await Promise.resolve();
  console.log("Level 3 resumed");
}

async function level2() {
  console.log("Level 2 calling level3");
  await level3();
  console.log("Level 2 resumed");
}

async function level1() {
  console.log("Level 1 calling level2");
  await level2();
  console.log("Level 1 resumed");
}

level1().then(() => {
  console.log("All done!");
});

console.log("Started async chain");`
  },

  {
    title: "Event Loop Classic",
    description: "The famous interview question",
    category: "advanced",
    code: `console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

Promise.resolve().then(() => {
  setTimeout(() => console.log("4"), 0);
});

Promise.resolve().then(() => console.log("5"));

setTimeout(() => console.log("6"), 0);

console.log("7");`
  },
  {
    title: "Loop with Closures",
    description: "Classic let vs var in setTimeout loops",
    category: "advanced",
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log("i =", i);
  }, 0);
}

console.log("Loop done");`
  },
  {
    title: "Mixed Async Pattern",
    description: "Real-world async flow",
    category: "advanced",
    code: `async function main() {
  console.log("Start");

  setTimeout(() => console.log("Timeout"), 0);

  await Promise.resolve();

  Promise.resolve().then(() => console.log("Micro"));

  console.log("End");
}

main();
console.log("After main");`
  },
  {
    title: "Nested setTimeout",
    description: "setTimeout inside setTimeout",
    category: "advanced",
    code: `console.log("Start");

setTimeout(() => {
  console.log("Outer timeout");
  
  setTimeout(() => {
    console.log("Inner timeout");
  }, 0);
  
  console.log("After inner setup");
}, 0);

console.log("End");`
  },
  {
    title: "Promise inside setTimeout",
    description: "Microtasks created in macrotask",
    category: "advanced",
    code: `console.log("1 - Sync");

setTimeout(() => {
  console.log("2 - Timeout start");
  
  Promise.resolve().then(() => {
    console.log("3 - Promise in timeout");
  });
  
  console.log("4 - Timeout end");
}, 0);

console.log("5 - Sync end");`
  },
  {
    title: "setTimeout in Promise",
    description: "Macrotask scheduled from microtask",
    category: "advanced",
    code: `console.log("1 - Start");

Promise.resolve().then(() => {
  console.log("2 - Promise");
  
  setTimeout(() => {
    console.log("3 - Timeout from Promise");
  }, 0);
  
  console.log("4 - After timeout setup");
});

setTimeout(() => {
  console.log("5 - Regular timeout");
}, 0);

console.log("6 - End");`
  },
  {
    title: "Deep Nesting",
    description: "Multiple levels of async nesting",
    category: "advanced",
    code: `console.log("Start");

setTimeout(() => {
  console.log("Timeout 1");
  
  Promise.resolve().then(() => {
    console.log("Promise in Timeout 1");
    
    queueMicrotask(() => {
      console.log("Microtask nested");
    });
  });
  
  setTimeout(() => {
    console.log("Timeout 2 (nested)");
  }, 0);
}, 0);

Promise.resolve().then(() => {
  console.log("Initial Promise");
});

console.log("End");`
  },
  {
    title: "Multiple Chained Callbacks",
    description: "Complex callback chains",
    category: "advanced",
    code: `console.log("1");

setTimeout(() => {
  console.log("2 - First timeout");
  setTimeout(() => {
    console.log("5 - Nested timeout A");
  }, 0);
}, 0);

setTimeout(() => {
  console.log("3 - Second timeout");
  setTimeout(() => {
    console.log("6 - Nested timeout B");
  }, 0);
}, 0);

Promise.resolve()
  .then(() => console.log("4 - Promise"))
  .then(() => console.log("Promise chain"));

console.log("End");`
  },

  {
    title: "Promise.all",
    description: "Wait for all promises to resolve",
    category: "combinators",
    code: `console.log("Starting Promise.all");

Promise.all([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3)
]).then((values) => {
  console.log("All resolved:", values);
});

console.log("After Promise.all setup");`
  },
  {
    title: "Promise.race",
    description: "First promise to settle wins",
    category: "combinators",
    code: `console.log("Starting Promise.race");

Promise.race([
  Promise.resolve("First"),
  Promise.resolve("Second"),
  Promise.resolve("Third")
]).then((winner) => {
  console.log("Winner:", winner);
});

console.log("After Promise.race setup");`
  },
  {
    title: "Promise.allSettled",
    description: "Wait for all promises to settle",
    category: "combinators",
    code: `console.log("Starting Promise.allSettled");

Promise.allSettled([
  Promise.resolve("Success"),
  Promise.reject("Error"),
  Promise.resolve("Another success")
]).then((results) => {
  console.log("All settled");
});

console.log("After Promise.allSettled");`
  },
  {
    title: "Promise.any",
    description: "First promise to fulfill wins",
    category: "combinators",
    code: `console.log("Starting Promise.any");

Promise.any([
  Promise.reject("Fail 1"),
  Promise.resolve("Success!"),
  Promise.reject("Fail 2")
]).then((winner) => {
  console.log("First to succeed:", winner);
});

console.log("After Promise.any");`
  },

  {
    title: "try/catch/finally",
    description: "Synchronous error handling",
    category: "errors",
    code: `console.log("Start");

try {
  console.log("In try block");
  throw new Error("Oops!");
  console.log("After throw");
} catch (e) {
  console.log("Caught error");
} finally {
  console.log("Finally runs");
}

console.log("End");`
  },
  {
    title: "Promise + catch",
    description: "Error handling in promise chain",
    category: "errors",
    code: `Promise.resolve()
  .then(() => {
    console.log("Step 1");
    throw new Error("Step 1 failed");
  })
  .then(() => {
    console.log("Step 2 (skipped)");
  })
  .catch((err) => {
    console.log("Caught in chain");
  })
  .finally(() => {
    console.log("Chain complete");
  });

console.log("After chain setup");`
  },
  {
    title: "Nested try/catch",
    description: "Error propagation through functions",
    category: "errors",
    code: `function outer() {
  console.log("Outer start");
  try {
    inner();
  } catch (e) {
    console.log("Outer caught error");
  }
  console.log("Outer end");
}

function inner() {
  console.log("Inner start");
  throw new Error("Inner error");
}

outer();`
  },

  {
    title: "fetch() Lifecycle",
    description: "Network request with response handling",
    category: "webplatform",
    code: `console.log("Starting fetch");

fetch('/api/data')
  .then(response => {
    console.log("Got response");
  });

console.log("Fetch initiated");`
  },
  {
    title: "requestAnimationFrame",
    description: "Animation timing callback",
    category: "webplatform",
    code: `console.log("Scheduling animation");

requestAnimationFrame(() => {
  console.log("Animation frame fired");
});

console.log("Animation scheduled");`
  },
  {
    title: "Mixed Web APIs",
    description: "Priority order of different async APIs",
    category: "webplatform",
    code: `console.log("1 - Start");

setTimeout(() => {
  console.log("5 - setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("3 - Promise");
});

requestAnimationFrame(() => {
  console.log("6 - rAF");
});

queueMicrotask(() => {
  console.log("4 - queueMicrotask");
});

console.log("2 - End sync");`
  },

  {
    title: "Promise Chain Tracing",
    description: "Value flow through promise chains",
    category: "advanced",
    code: `function step1() {
  console.log("Step 1");
  return Promise.resolve("data1");
}

function step2(data) {
  console.log("Step 2 received:", data);
  return Promise.resolve("data2");
}

function step3(data) {
  console.log("Step 3 received:", data);
  return Promise.resolve("final");
}

step1()
  .then(step2)
  .then(step3)
  .then(result => {
    console.log("Final result:", result);
  });

console.log("Chain started");`
  },
  {
    title: "Task vs Microtask Ratio",
    description: "Compare macrotask and microtask processing",
    category: "advanced",
    code: `console.log("Creating mixed task queue...");

setTimeout(() => console.log("Macro 1"), 0);
setTimeout(() => console.log("Macro 2"), 0);
setTimeout(() => console.log("Macro 3"), 0);

Promise.resolve().then(() => console.log("Micro 1"));
Promise.resolve().then(() => console.log("Micro 2"));
Promise.resolve().then(() => console.log("Micro 3"));

queueMicrotask(() => console.log("Micro 4"));

console.log("All scheduled");`
  },
  {
    title: "Recursive Functions",
    description: "Call stack depth visualization",
    category: "callstack",
    code: `function countdown(n) {
  console.log("Count:", n);
  if (n <= 0) {
    console.log("Done!");
    return;
  }
  countdown(n - 1);
}

countdown(4);`
  },
  {
    title: "Switch Statement",
    description: "Multi-branch control flow",
    category: "sync",
    code: `const day = "Tuesday";

switch (day) {
  case "Monday":
    console.log("Start of the week");
    break;
  case "Tuesday":
    console.log("Second day");
    break;
  case "Friday":
    console.log("Almost weekend");
    break;
  default:
    console.log("Other day");
}

console.log("Schedule checked");`
  },
  {
    title: "While Loop",
    description: "Conditional loop execution",
    category: "sync",
    code: `let count = 0;

while (count < 4) {
  console.log("Count is:", count);
  count++;
}

console.log("Final count:", count);`
  },
  {
    title: "Template Literals",
    description: "String interpolation and expressions",
    category: "sync",
    code: `const name = "JavaScript";
const year = 2024;

console.log(\`Hello from \${name}!\`);
console.log(\`Year: \${year}, Next: \${year + 1}\`);

const items = [1, 2, 3];
console.log(\`Items: \${items.length}\`);`
  },

  // === HOISTING & TDZ ===
  {
    title: "var Hoisting",
    description: "var declarations are hoisted to the top with value undefined",
    category: "hoisting",
    code: `console.log("x before:", x);
var x = 10;
console.log("x after:", x);

console.log("y before:", y);
var y = 20;
console.log("y after:", y);`
  },
  {
    title: "Function Hoisting",
    description: "Function declarations are fully hoisted and available before their definition",
    category: "hoisting",
    code: `console.log("Result:", add(3, 4));

function add(a, b) {
  return a + b;
}

console.log("Again:", add(10, 20));`
  },
  {
    title: "let/const TDZ",
    description: "let and const are in the Temporal Dead Zone until declared",
    category: "hoisting",
    code: `var a = 1;
console.log("var a:", a);

let b = 2;
console.log("let b:", b);

const c = 3;
console.log("const c:", c);`
  },

  // === SCOPE & CLOSURES ===
  {
    title: "Closure Basics",
    description: "Functions capture variables from their enclosing scope",
    category: "scope",
    code: `function createCounter() {
  let count = 0;
  return function() {
    count = count + 1;
    return count;
  };
}

const counter = createCounter();
console.log(counter());
console.log(counter());
console.log(counter());`
  },
  {
    title: "Block Scope with let",
    description: "let is block-scoped, var is function-scoped",
    category: "scope",
    code: `var x = "global";
let y = "global";

if (true) {
  var x = "block";
  let y = "block";
  console.log("Inside - var x:", x);
  console.log("Inside - let y:", y);
}

console.log("Outside - var x:", x);
console.log("Outside - let y:", y);`
  },
  {
    title: "Loop Closure (let vs var)",
    description: "let in for-loop creates a new binding per iteration",
    category: "scope",
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log("let i:", i), 0);
}

for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log("var j:", j), 0);
}`
  },

  // === THIS BINDING ===
  {
    title: "This in Methods",
    description: "this refers to the object that calls the method",
    category: "this",
    code: `const person = {
  name: "Alice",
  greet: function() {
    console.log("Hello, I am " + this.name);
  }
};

person.greet();

const greetFn = person.greet;
greetFn();`
  },
  {
    title: "Arrow vs Regular Functions",
    description: "Arrow functions inherit this from enclosing scope",
    category: "this",
    code: `const obj = {
  name: "Bob",
  regular: function() {
    console.log("Regular this:", this.name);
  },
  arrow: () => {
    console.log("Arrow this:", typeof this);
  }
};

obj.regular();
obj.arrow();`
  },
  {
    title: "Constructor this",
    description: "new keyword creates a fresh this object",
    category: "this",
    code: `function Person(name, age) {
  this.name = name;
  this.age = age;
  console.log("Created:", this.name);
}

const p1 = new Person("Alice", 30);
const p2 = new Person("Bob", 25);
console.log(p1.name, p1.age);
console.log(p2.name, p2.age);`
  },
  {
    title: "call, apply, bind",
    description: "Explicitly set this with call/apply/bind",
    category: "this",
    code: `function greet(greeting) {
  console.log(greeting + ", " + this.name);
}

const alice = { name: "Alice" };
const bob = { name: "Bob" };

greet.call(alice, "Hello");
greet.apply(bob, ["Hi"]);

const greetAlice = greet.bind(alice);
greetAlice("Hey");`
  },

  // === TYPE COERCION ===
  {
    title: "Loose vs Strict Equality",
    description: "== coerces types, === does not",
    category: "coercion",
    code: `console.log("1 == '1':", 1 == "1");
console.log("1 === '1':", 1 === "1");

console.log("0 == false:", 0 == false);
console.log("0 === false:", 0 === false);

console.log("null == undefined:", null == undefined);
console.log("null === undefined:", null === undefined);

console.log("'' == 0:", "" == 0);
console.log("'' === 0:", "" === 0);`
  },
  {
    title: "String Concatenation",
    description: "The + operator with strings causes implicit coercion",
    category: "coercion",
    code: `console.log(1 + "2");
console.log("3" + 4);
console.log(1 + 2 + "3");
console.log("1" + 2 + 3);

console.log(true + 1);
console.log(false + "hello");
console.log(null + 1);`
  },
  {
    title: "Truthy and Falsy",
    description: "Values that coerce to true or false in boolean context",
    category: "coercion",
    code: `const values = [0, "", null, undefined, false, "hello", 1, [], {}];

for (const val of values) {
  if (val) {
    console.log(val, "is truthy");
  } else {
    console.log(val, "is falsy");
  }
}`
  },

  // === MAP & SET ===
  {
    title: "Map Basics",
    description: "Map stores key-value pairs with any type of key",
    category: "collections",
    code: `const map = new Map();
map.set("name", "Alice");
map.set("age", 30);
map.set(1, "one");

console.log("name:", map.get("name"));
console.log("age:", map.get("age"));
console.log("has 1:", map.has(1));
console.log("size:", map.size);

map.delete("age");
console.log("after delete, size:", map.size);`
  },
  {
    title: "Set Basics",
    description: "Set stores unique values only",
    category: "collections",
    code: `const set = new Set();
set.add(1);
set.add(2);
set.add(3);
set.add(2);
set.add(1);

console.log("size:", set.size);
console.log("has 2:", set.has(2));
console.log("has 5:", set.has(5));

set.delete(2);
console.log("after delete, size:", set.size);
console.log("has 2 now:", set.has(2));`
  },

  // === CLASSES ===
  {
    title: "Class Constructor",
    description: "Classes with constructor, methods, and properties",
    category: "classes",
    code: `class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }

  speak() {
    console.log(this.name + " says " + this.sound);
  }
}

const dog = new Animal("Dog", "Woof");
const cat = new Animal("Cat", "Meow");
dog.speak();
cat.speak();`
  },
  {
    title: "Break & Continue",
    description: "Loop control flow with break and continue statements",
    category: "sync",
    code: `console.log("=== Break ===");
for (let i = 0; i < 5; i++) {
  if (i === 3) break;
  console.log("i:", i);
}

console.log("=== Continue ===");
for (let j = 0; j < 5; j++) {
  if (j === 2) continue;
  console.log("j:", j);
}`
  },
  {
    title: "Switch Statement",
    description: "Switch with cases and fallthrough behavior",
    category: "sync",
    code: `const day = "Tuesday";

switch (day) {
  case "Monday":
    console.log("Start of the week");
    break;
  case "Tuesday":
    console.log("Second day");
    break;
  case "Friday":
    console.log("Almost weekend!");
    break;
  default:
    console.log("Regular day");
}`
  },
  {
    title: "Destructuring Parameters",
    description: "Functions with destructured object and array params",
    category: "advanced",
    code: `function greet({ name, age }) {
  console.log("Name:", name);
  console.log("Age:", age);
}

greet({ name: "Alice", age: 30 });

function sum([a, b, c]) {
  console.log("Sum:", a + b + c);
}

sum([10, 20, 30]);`
  },
  {
    title: "Default Parameters",
    description: "Functions with default parameter values",
    category: "advanced",
    code: `function greet(name = "World", greeting = "Hello") {
  console.log(greeting + ", " + name + "!");
}

greet();
greet("Alice");
greet("Bob", "Hi");`
  },

  // ===== NEW: Operators =====
  {
    title: "instanceof & in",
    description: "Type checking with instanceof and property checking with in",
    category: "operators",
    code: `class Animal {
  constructor(name) {
    this.name = name;
  }
}

const dog = new Animal("Rex");
console.log(dog instanceof Animal);

const obj = { x: 1, y: 2, z: 3 };
console.log("x" in obj);
console.log("w" in obj);

const arr = [10, 20, 30];
console.log(1 in arr);`
  },
  {
    title: "Nullish Coalescing & Optional Chaining",
    description: "Safe property access and default values for null/undefined",
    category: "operators",
    code: `const user = {
  name: "Alice",
  address: {
    city: "NYC"
  }
};

console.log(user?.address?.city);
console.log(user?.phone?.number);

const val = null;
console.log(val ?? "default");
console.log(0 ?? "default");
console.log("" ?? "default");`
  },
  {
    title: "Logical Assignment",
    description: "Logical assignment operators: &&=, ||=, ??=",
    category: "operators",
    code: `let a = 1;
let b = 0;
let c = null;

a &&= 100;
console.log("a &&= 100:", a);

b ||= 42;
console.log("b ||= 42:", b);

c ??= "filled";
console.log("c ??= filled:", c);

let d = "existing";
d ??= "new";
console.log("d ??= new:", d);`
  },
  {
    title: "Const Immutability",
    description: "Attempting to reassign a const variable throws a TypeError",
    category: "operators",
    code: `const PI = 3.14159;
console.log("PI:", PI);

const name = "Alice";
console.log("Name:", name);

// This will throw a TypeError:
name = "Bob";`
  },

  // ===== NEW: Destructuring =====
  {
    title: "Object Destructuring",
    description: "Renaming, defaults, rest, and nested destructuring",
    category: "destructuring",
    code: `const person = {
  name: "Alice",
  age: 30,
  city: "NYC",
  country: "US"
};

const { name: fullName, age, job = "Developer", ...rest } = person;
console.log("Name:", fullName);
console.log("Age:", age);
console.log("Job:", job);
console.log("Rest:", rest);`
  },
  {
    title: "Array Destructuring",
    description: "Defaults, holes, rest, and variable swap",
    category: "destructuring",
    code: `const colors = ["red", "green", "blue", "yellow"];
const [first, , third, ...remaining] = colors;
console.log("First:", first);
console.log("Third:", third);
console.log("Rest:", remaining);

// Swap variables
let a = 1, b = 2;
console.log("Before:", a, b);
[a, b] = [b, a];
console.log("After:", a, b);

// Defaults
const [x = 10, y = 20] = [5];
console.log("x:", x, "y:", y);`
  },
  {
    title: "For...of with Destructuring",
    description: "Iterate Map entries with destructured [key, value]",
    category: "destructuring",
    code: `const scores = new Map([
  ["Alice", 95],
  ["Bob", 87],
  ["Charlie", 92]
]);

for (const [name, score] of scores) {
  console.log(name + ": " + score);
}

const users = [
  { name: "Alice", role: "admin" },
  { name: "Bob", role: "user" }
];

for (const { name, role } of users) {
  console.log(name + " is " + role);
}`
  },

  // ===== NEW: Inheritance =====
  {
    title: "Class Inheritance",
    description: "Extends and super for class hierarchies",
    category: "inheritance",
    code: `class Shape {
  constructor(color) {
    this.color = color;
  }
  describe() {
    return this.color + " shape";
  }
}

class Circle extends Shape {
  constructor(color, radius) {
    super(color);
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius * this.radius;
  }
  describe() {
    return this.color + " circle (r=" + this.radius + ")";
  }
}

const c = new Circle("red", 5);
console.log(c.describe());
console.log("Area:", c.area().toFixed(2));
console.log(c instanceof Circle);
console.log(c instanceof Shape);`
  },
  {
    title: "Static Methods & Properties",
    description: "Class-level methods that don't require instantiation",
    category: "inheritance",
    code: `class Counter {
  static count = 0;

  static increment() {
    Counter.count++;
    return Counter.count;
  }

  static reset() {
    Counter.count = 0;
  }
}

console.log(Counter.increment());
console.log(Counter.increment());
console.log(Counter.increment());
console.log("Total:", Counter.count);
Counter.reset();
console.log("After reset:", Counter.count);`
  },
  {
    title: "Getters & Setters",
    description: "Computed properties with get/set accessors",
    category: "inheritance",
    code: `const person = {
  _firstName: "John",
  _lastName: "Doe",
  get fullName() {
    return this._firstName + " " + this._lastName;
  },
  set fullName(name) {
    const parts = name.split(" ");
    this._firstName = parts[0];
    this._lastName = parts[1];
  }
};

console.log(person.fullName);
person.fullName = "Jane Smith";
console.log(person.fullName);
console.log(person._firstName);`
  },

  // ===== NEW: Built-ins =====
  {
    title: "Math Methods",
    description: "Mathematical constants and functions",
    category: "builtins",
    code: `console.log("PI:", Math.PI);
console.log("E:", Math.E);

console.log("floor(4.7):", Math.floor(4.7));
console.log("ceil(4.2):", Math.ceil(4.2));
console.log("round(4.5):", Math.round(4.5));
console.log("trunc(4.9):", Math.trunc(4.9));
console.log("sign(-5):", Math.sign(-5));
console.log("abs(-10):", Math.abs(-10));
console.log("max(1,5,3):", Math.max(1, 5, 3));
console.log("sqrt(16):", Math.sqrt(16));
console.log("cbrt(27):", Math.cbrt(27));
console.log("hypot(3,4):", Math.hypot(3, 4));`
  },
  {
    title: "Number Methods",
    description: "Number type checking and constants",
    category: "builtins",
    code: `console.log(Number.isInteger(4));
console.log(Number.isInteger(4.5));
console.log(Number.isFinite(Infinity));
console.log(Number.isNaN(NaN));
console.log(Number.isNaN(42));

console.log("MAX_SAFE:", Number.MAX_SAFE_INTEGER);
console.log("EPSILON:", Number.EPSILON);

const pi = 3.14159;
console.log("toFixed(2):", pi.toFixed(2));
console.log("toString(2):", (10).toString(2));`
  },
  {
    title: "Object Methods",
    description: "Object.entries, fromEntries, and other utilities",
    category: "builtins",
    code: `const obj = { a: 1, b: 2, c: 3 };

const entries = Object.entries(obj);
console.log("Entries:", entries);

const doubled = entries.map(([k, v]) => [k, v * 2]);
const result = Object.fromEntries(doubled);
console.log("Doubled:", result);

console.log("Keys:", Object.keys(obj));
console.log("Values:", Object.values(obj));

console.log(Object.is(NaN, NaN));
console.log(Object.is(0, -0));`
  },
  {
    title: "Array.from & at()",
    description: "Creating arrays and accessing with negative indices",
    category: "builtins",
    code: `const arr = [10, 20, 30, 40, 50];

console.log("at(0):", arr.at(0));
console.log("at(-1):", arr.at(-1));
console.log("at(-2):", arr.at(-2));

const chars = Array.from("hello");
console.log("From string:", chars);

const nums = Array.from({ length: 5 }, (_, i) => i * 2);
console.log("Generated:", nums);

const sorted = [3, 1, 4, 1, 5].toSorted((a, b) => a - b);
console.log("Sorted:", sorted);`
  },
  {
    title: "Date Basics",
    description: "Creating and working with dates",
    category: "builtins",
    code: `const now = new Date();
console.log("Year:", now.getFullYear());
console.log("Month:", now.getMonth());
console.log("Date:", now.getDate());

const birthday = new Date(2000, 0, 15);
console.log("Birthday:", birthday.toDateString());

console.log("Timestamp:", Date.now());`
  },
  {
    title: "RegExp Basics",
    description: "Regular expression testing and matching",
    category: "builtins",
    code: `const emailPattern = /^[a-z]+@[a-z]+\\.[a-z]+$/;
console.log(emailPattern.test("hello@world.com"));
console.log(emailPattern.test("invalid"));

const text = "Hello World Hello";
const result = text.match(/Hello/g);
console.log("Matches:", result);

const re = new RegExp("\\\\d+", "g");
console.log(re.test("abc123"));

console.log("JS".search(/S/));`
  },

  // ===== NEW: Generators =====
  {
    title: "Basic Generator",
    description: "Generator functions with yield and .next()",
    category: "generators",
    code: `function* count() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = count();
console.log(gen.next());
console.log(gen.next());
console.log(gen.next());
console.log(gen.next());`
  },
  {
    title: "Generator with Loop",
    description: "Using yield inside a loop for sequences",
    category: "generators",
    code: `function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

for (const n of range(1, 5)) {
  console.log(n);
}`
  },
  {
    title: "Fibonacci Generator",
    description: "Infinite sequence with generator and early break",
    category: "generators",
    code: `function* fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    const next = a + b;
    a = b;
    b = next;
  }
}

const fib = fibonacci();
for (let i = 0; i < 10; i++) {
  console.log(fib.next().value);
}`
  },

  // ===== NEW: Spread & Rest =====
  {
    title: "Spread in Function Calls",
    description: "Spreading arrays into function arguments",
    category: "advanced",
    code: `function sum(a, b, c) {
  return a + b + c;
}

const nums = [10, 20, 30];
console.log("Sum:", sum(...nums));

const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("Combined:", combined);

console.log("Max:", Math.max(...combined));`
  },
  {
    title: "delete Operator",
    description: "Removing properties from objects",
    category: "operators",
    code: `const obj = { a: 1, b: 2, c: 3 };
console.log("Before:", obj);
console.log("Keys:", Object.keys(obj));

delete obj.b;
console.log("After delete b:", obj);
console.log("Keys:", Object.keys(obj));

console.log("b" in obj);`
  },
  {
    title: "Labeled break/continue",
    description: "Control flow with labeled loops",
    category: "sync",
    code: `let found = false;
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    console.log("i=" + i, "j=" + j);
    if (i === 1 && j === 1) {
      found = true;
      break outer;
    }
  }
}
console.log("Found:", found);

let sum = 0;
loop: for (let i = 0; i < 5; i++) {
  if (i === 2) continue loop;
  sum += i;
  console.log("i=" + i, "sum=" + sum);
}`
  },
  {
    title: "Error Chaining (.cause)",
    description: "ES2022 error cause for debugging chains",
    category: "errors",
    code: `function fetchData() {
  throw new Error("Network timeout");
}

function loadUser() {
  try {
    fetchData();
  } catch (err) {
    throw new Error("Failed to load user", { cause: err });
  }
}

try {
  loadUser();
} catch (err) {
  console.log("Error:", err.message);
  console.log("Cause:", err.cause);
}

const typeErr = new TypeError("Invalid input");
console.log("Type:", typeErr.name);
const refErr = new ReferenceError("x is not defined");
console.log("Ref:", refErr.name);`
  },
  {
    title: "Promise.withResolvers",
    description: "External promise control (ES2024)",
    category: "promises",
    code: `const { promise, resolve, reject } = Promise.withResolvers();

console.log("Promise created");

// Resolve externally
resolve("Hello from withResolvers!");

promise.then(val => {
  console.log("Resolved:", val);
});

// Promise.resolve / reject
const p1 = Promise.resolve(42);
p1.then(v => console.log("Resolved value:", v));

const p2 = Promise.reject("Oops!");
p2.catch(e => console.log("Caught:", e));`
  },
  {
    title: "WeakMap Basics",
    description: "Object keys only, no iteration",
    category: "collections",
    code: `const wm = new WeakMap();
const user = { name: "Alice" };
const settings = { theme: "dark" };

wm.set(user, { role: "admin" });
wm.set(settings, "config-v2");

console.log("Has user:", wm.has(user));
console.log("User data:", wm.get(user));

wm.delete(user);
console.log("After delete:", wm.has(user));

// WeakMaps cannot be iterated
// No .keys(), .values(), .forEach(), or .size
console.log("WeakMap:", wm);`
  },
  {
    title: "WeakSet for Tracking",
    description: "Track visited objects without leaking memory",
    category: "collections",
    code: `const visited = new WeakSet();
const obj1 = { id: 1 };
const obj2 = { id: 2 };
const obj3 = { id: 3 };

function visit(obj) {
  if (visited.has(obj)) {
    console.log("Already visited:", obj.id);
    return;
  }
  visited.add(obj);
  console.log("First visit:", obj.id);
}

visit(obj1);
visit(obj2);
visit(obj1);
visit(obj3);
visit(obj2);`
  },
  {
    title: "Set Operations (ES2025)",
    description: "Union, intersection, difference, and more",
    category: "collections",
    code: `const frontend = new Set(["JS", "TS", "HTML", "CSS"]);
const backend = new Set(["JS", "TS", "Python", "Go"]);

console.log("Union:", frontend.union(backend));
console.log("Shared:", frontend.intersection(backend));
console.log("Only FE:", frontend.difference(backend));
console.log("Symmetric:", frontend.symmetricDifference(backend));

const web = new Set(["JS", "HTML"]);
console.log("Subset?", web.isSubsetOf(frontend));
console.log("Superset?", frontend.isSupersetOf(web));
console.log("Disjoint?", frontend.isDisjointFrom(new Set(["Rust", "C++"])));`
  },
  {
    title: "Object.groupBy",
    description: "Group array elements by a key function",
    category: "builtins",
    code: `const people = [
  { name: "Alice", dept: "eng" },
  { name: "Bob", dept: "sales" },
  { name: "Carol", dept: "eng" },
  { name: "Dave", dept: "sales" },
  { name: "Eve", dept: "eng" }
];

const byDept = Object.groupBy(people, p => p.dept);
console.log("Engineering:", byDept.eng.length, "people");
console.log("Sales:", byDept.sales.length, "people");

const nums = [1, 2, 3, 4, 5, 6];
const parity = Object.groupBy(nums, n => n % 2 === 0 ? "even" : "odd");
console.log("Even:", parity.even);
console.log("Odd:", parity.odd);`
  },
  {
    title: "Map.groupBy",
    description: "Group with Map result for non-string keys",
    category: "collections",
    code: `const items = [
  { name: "Widget", qty: 1 },
  { name: "Gadget", qty: 5 },
  { name: "Gizmo", qty: 1 },
  { name: "Doohickey", qty: 5 }
];

const grouped = Map.groupBy(items, item => item.qty);
console.log("Qty 1:", grouped.get(1));
console.log("Qty 5:", grouped.get(5));`
  },
  {
    title: "Iterator Helpers",
    description: "Chainable generator methods (ES2025)",
    category: "generators",
    code: `function* naturals() {
  let i = 1;
  while (true) yield i++;
}

// Chain filter, map, take — all lazy-style
const result = naturals()
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .take(5)
  .toArray();
console.log("Even squares:", result);

// Reduce
const sum = naturals().take(10).reduce((a, b) => a + b, 0);
console.log("Sum 1-10:", sum);

// Drop first 5, take next 5
const chunk = naturals().drop(5).take(5).toArray();
console.log("6-10:", chunk);`
  },
  {
    title: "Private Fields (#)",
    description: "ES2022 private class fields and methods",
    category: "classes",
    code: `class BankAccount {
  #balance = 0;
  #owner;

  constructor(owner, initial) {
    this.#owner = owner;
    this.#balance = initial;
  }

  #validate(amount) {
    return amount > 0 && amount <= this.#balance;
  }

  withdraw(amount) {
    if (this.#validate(amount)) {
      this.#balance -= amount;
      console.log(this.#owner, "withdrew", amount);
    } else {
      console.log("Invalid withdrawal:", amount);
    }
  }

  getBalance() {
    return this.#balance;
  }
}

const acct = new BankAccount("Alice", 100);
acct.withdraw(30);
console.log("Balance:", acct.getBalance());
acct.withdraw(200);
console.log("Balance:", acct.getBalance());`
  },
  {
    title: "Static Initialization Blocks",
    description: "ES2022 complex static setup",
    category: "classes",
    code: `class AppConfig {
  static env;
  static apiUrl;
  static maxRetries;

  static {
    AppConfig.env = "production";
    AppConfig.apiUrl = "https://api.example.com";
    AppConfig.maxRetries = 3;
    console.log("Config initialized for", AppConfig.env);
  }
}

console.log("API:", AppConfig.apiUrl);
console.log("Retries:", AppConfig.maxRetries);

class Registry {
  static items = [];
  static {
    Registry.items.push("default");
    Registry.items.push("builtin");
  }
}
console.log("Registry:", Registry.items);`
  },
  {
    title: "Async Generator",
    description: "async function* with for-await-of",
    category: "async",
    code: `async function* countdown(n) {
  while (n > 0) {
    yield n;
    n--;
  }
}

async function main() {
  const values = [];
  for await (const num of countdown(5)) {
    values.push(num);
  }
  console.log("Countdown:", values);
}

main();`
  },
  {
    title: "AggregateError",
    description: "Multiple errors from Promise.any rejection",
    category: "errors",
    code: `const errors = [
  new Error("Connection refused"),
  new TypeError("Invalid URL"),
  new RangeError("Timeout exceeded")
];

const agg = new AggregateError(errors, "All requests failed");
console.log("Name:", agg.name);
console.log("Message:", agg.message);
console.log("Error count:", agg.errors.length);

// Each individual error
for (const err of agg.errors) {
  console.log("-", err.name + ":", err.message);
}`
  },
  {
    title: "Proxy Basics",
    description: "Intercept get/set with handler traps",
    category: "metaprogramming",
    code: `const handler = {
  get(target, prop) {
    console.log("Reading:", prop);
    return prop in target ? target[prop] : "default";
  },
  set(target, prop, value) {
    console.log("Writing:", prop, "=", value);
    target[prop] = value;
    return true;
  }
};

const data = { name: "Alice" };
const proxy = new Proxy(data, handler);

console.log(proxy.name);
console.log(proxy.missing);
proxy.age = 30;
console.log(proxy.age);`
  },
  {
    title: "Proxy Validation",
    description: "Type checking with set trap",
    category: "metaprogramming",
    code: `const validator = {
  set(target, prop, value) {
    if (prop === "age") {
      if (typeof value !== "number" || value < 0) {
        console.log("Invalid age:", value);
        return false;
      }
    }
    target[prop] = value;
    console.log("Set", prop, "to", value);
    return true;
  }
};

const person = new Proxy({}, validator);
person.name = "Bob";
person.age = 25;
person.age = -5;
person.age = 30;
console.log("Final:", person.name, person.age);`
  },
  {
    title: "Reflect API",
    description: "Reflect.get, set, has, ownKeys, deleteProperty",
    category: "metaprogramming",
    code: `const obj = { x: 10, y: 20, z: 30 };

console.log("Get x:", Reflect.get(obj, "x"));
console.log("Has y:", Reflect.has(obj, "y"));

Reflect.set(obj, "w", 40);
console.log("Keys:", Reflect.ownKeys(obj));

Reflect.deleteProperty(obj, "z");
console.log("After delete:", Reflect.ownKeys(obj));
console.log("Has z:", Reflect.has(obj, "z"));`
  },
  {
    title: "Custom Iterable",
    description: "Class with [Symbol.iterator] for for...of",
    category: "generators",
    code: `class Fibonacci {
  constructor(limit) {
    this.limit = limit;
  }
  *[Symbol.iterator]() {
    let a = 0, b = 1;
    for (let i = 0; i < this.limit; i++) {
      yield a;
      const temp = a;
      a = b;
      b = temp + b;
    }
  }
}

const fib = new Fibonacci(8);
const values = [];
for (const n of fib) {
  values.push(n);
}
console.log("Fibonacci:", values);

// Object with Symbol.iterator
const countdown = {
  [Symbol.iterator]() {
    let n = 5;
    return {
      next() {
        return n > 0
          ? { value: n--, done: false }
          : { done: true };
      }
    };
  }
};
const nums = [];
for (const n of countdown) nums.push(n);
console.log("Countdown:", nums);`
  },
  {
    title: "BigInt Basics",
    description: "BigInt arithmetic, comparisons, and type checking",
    category: "builtins",
    code: `// BigInt literals use the 'n' suffix
const big1 = 100n;
const big2 = 200n;

// Arithmetic operations
const sum = big1 + big2;
console.log("Sum:", sum);

const product = big1 * big2;
console.log("Product:", product);

const diff = big2 - big1;
console.log("Difference:", diff);

const div = big2 / big1;
console.log("Division:", div);

const power = 2n ** 10n;
console.log("2^10:", power);

// typeof returns 'bigint'
console.log("typeof 42n:", typeof 42n);

// BigInt() constructor
const fromNum = BigInt(42);
console.log("From number:", fromNum);

// Comparisons work between BigInt and Number
console.log("1n === 1:", 1n === 1);
console.log("1n == 1:", 1n == 1);
console.log("2n > 1:", 2n > 1);

// String conversion
console.log("String:", String(42n));`
  },
  {
    title: "BigInt vs Number",
    description: "Mixed operations throw TypeError — explicit conversion required",
    category: "builtins",
    code: `// BigInt and Number cannot be mixed in arithmetic
const big = 10n;
const num = 5;

// This will throw TypeError
try {
  const result = big + num;
  console.log(result);
} catch (e) {
  console.log("Error:", e.message);
}

// Solution: explicit conversion
const sum1 = big + BigInt(num);
console.log("BigInt + BigInt(num):", sum1);

const sum2 = Number(big) + num;
console.log("Number(big) + num:", sum2);

// Negation works fine
const neg = -big;
console.log("Negation:", neg);

// Boolean conversion
console.log("Boolean(0n):", Boolean(0n));
console.log("Boolean(1n):", Boolean(1n));`
  },
  {
    title: "TypedArray Basics",
    description: "Uint8Array creation, indexing, and array methods",
    category: "binary",
    code: `// Create a Uint8Array of 5 elements
const arr = new Uint8Array(5);
console.log("Empty:", arr);

// Set values by index
arr[0] = 10;
arr[1] = 20;
arr[2] = 30;
arr[3] = 40;
arr[4] = 50;
console.log("Filled:", arr);
console.log("Length:", arr.length);

// Create from an array literal
const f32 = new Float32Array([1.5, 2.5, 3.5]);
console.log("Float32:", f32);

// Array-like methods work on TypedArrays
const doubled = arr.map(x => x * 2);
console.log("Doubled:", doubled);

const big = arr.filter(x => x > 25);
console.log("Filtered:", big);

const sum = arr.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

// Slice returns a new TypedArray
const mid = arr.slice(1, 4);
console.log("Slice(1,4):", mid);

// Search
console.log("indexOf 30:", arr.indexOf(30));
console.log("includes 99:", arr.includes(99));`
  },
  {
    title: "ArrayBuffer & DataView",
    description: "Low-level binary data reading and writing",
    category: "binary",
    code: `// ArrayBuffer: fixed-length raw binary buffer
const buffer = new ArrayBuffer(8);
console.log("Buffer:", buffer);
console.log("Bytes:", buffer.byteLength);

// DataView: read/write at byte level
const view = new DataView(buffer);

// Write individual bytes
view.setUint8(0, 255);
view.setUint8(1, 128);
view.setUint8(2, 64);
console.log("Byte 0:", view.getUint8(0));
console.log("Byte 1:", view.getUint8(1));

// Int8 interprets as signed (-128 to 127)
console.log("Int8 at 1:", view.getInt8(1));

// Write a 16-bit integer (2 bytes)
view.setInt16(4, 1000);
console.log("Int16 at 4:", view.getInt16(4));

// Create TypedArray from buffer
const u8 = new Uint8Array(buffer);
console.log("As Uint8Array:", u8);`
  },
  {
    title: "Number Formatting",
    description: "Intl.NumberFormat for currency, percent, and compact notation",
    category: "builtins",
    code: `// Currency formatting (US Dollars)
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});
console.log("USD:", usd.format(1234.56));

// Euro formatting (German locale)
const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});
console.log("EUR:", eur.format(1234.56));

// Compact notation (1.5M, 2K, etc.)
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact"
});
console.log("1.5M:", compact.format(1500000));
console.log("2.3K:", compact.format(2300));

// Percentage
const pct = new Intl.NumberFormat("en-US", {
  style: "percent"
});
console.log("75%:", pct.format(0.75));
console.log("120%:", pct.format(1.2));`
  },
  {
    title: "Date Formatting",
    description: "Intl.DateTimeFormat for locale-aware date display",
    category: "builtins",
    code: `const date = new Date(2024, 5, 15);

// US English format
const usFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric"
});
console.log("US:", usFormat.format(date));

// German format
const deFormat = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "long",
  day: "numeric"
});
console.log("DE:", deFormat.format(date));

// Japanese format
const jpFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric"
});
console.log("JP:", jpFormat.format(date));

// Intl.Collator for string comparison
const collator = new Intl.Collator("en");
const words = ["banana", "apple", "cherry"];
const sorted = words.slice().sort((a, b) =>
  collator.compare(a, b)
);
console.log("Sorted:", sorted);`
  },
];
