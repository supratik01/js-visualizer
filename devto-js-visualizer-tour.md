---
title: Why Do Promises Run Before setTimeout? (Explained Visually)
description: Understand why Promise callbacks always execute before setTimeout(0) by learning how JavaScript's Event Loop, Microtask Queue, and Task Queue really work.
published: true
tags: javascript, webdev, beginners, programming
cover_image: https://www.jsvisualizer.bytefront.dev/og-image.png
canonical_url: https://www.jsvisualizer.bytefront.dev/blogs/why-promises-run-before-settimeout
---

# Why Do Promises Run Before `setTimeout()`? (Explained Visually)

Almost every JavaScript developer has seen this:

```js
console.log("Start");

setTimeout(() => {
  console.log("setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");
```

**Output**

```text
Start
End
Promise
setTimeout
```

At first glance, this seems strange.

`setTimeout(..., 0)` looks like it should execute immediately. So why does the Promise callback run first?

The answer lies in **JavaScript's Event Loop**.

👉 [Run this in JS Visualizer — watch the queues in real time](https://www.jsvisualizer.bytefront.dev/?code=console.log(%22Start%22)%3B%0A%0AsetTimeout(()%20%3D%3E%20%7B%0A%20%20console.log(%22setTimeout%22)%3B%0A%7D%2C%200)%3B%0A%0APromise.resolve().then(()%20%3D%3E%20%7B%0A%20%20console.log(%22Promise%22)%3B%0A%7D)%3B%0A%0Aconsole.log(%22End%22)%3B)

---

# Step 1: JavaScript Executes Synchronous Code First

Everything in the current script executes on the **Call Stack**.

```js
console.log("Start");
```

prints immediately.

When JavaScript encounters:

```js
setTimeout(() => {
  console.log("setTimeout");
}, 0);
```

it **does not execute the callback**.

Instead, it hands the callback to the browser (or Node.js) timer system and continues executing the current script.

Next:

```js
Promise.resolve().then(() => {
  console.log("Promise");
});
```

The Promise is already resolved, so its `.then()` callback is immediately scheduled in the **Microtask Queue**.

Finally:

```js
console.log("End");
```

prints.

Current output:

```text
Start
End
```

---

# Step 2: The Call Stack Becomes Empty

At this point:

```
Microtask Queue
---------------
Promise callback

Task Queue (Macrotask Queue)
----------------------------
setTimeout callback
```

---

# Step 3: The Event Loop Rule

The Event Loop always follows this order:

1. Execute one Task (current script).
2. Empty the **entire Microtask Queue**.
3. Optionally allow rendering.
4. Execute the next Task (Macrotask).

Because Promise callbacks are **Microtasks**, they execute before timer callbacks.

Output now becomes:

```text
Start
End
Promise
```

---

# Step 4: Finally, `setTimeout` Runs

After the Microtask Queue is empty, the Event Loop processes the next Task:

```text
setTimeout
```

Final output:

```text
Start
End
Promise
setTimeout
```

---

# Common Misconception

❌ **Promises have higher priority than setTimeout.**

This is an oversimplification.

✅ The real reason is:

> The Event Loop **must completely drain the Microtask Queue before executing the next Task (Macrotask).**

---

# Why Doesn't `setTimeout(0)` Run Immediately?

`setTimeout(fn, 0)` means:

> Execute **after at least** 0 milliseconds.

It does **not** mean "execute instantly."

Even after the timer expires, its callback waits until:

- The current script finishes.
- The Call Stack becomes empty.
- Every pending Microtask has completed.

---

# Visual Timeline

```
Current Script
│
├── console.log("Start")
├── setTimeout(...)  ─────► Browser Timer
├── Promise.then() ───────► Microtask Queue
└── console.log("End")

Call Stack Empty
        │
        ▼
Drain ALL Microtasks
        │
        ▼
Promise callback

        ▼
Run Next Task
        │
        ▼
setTimeout callback
```

---

# Example 2

```js
console.log(1);

setTimeout(() => console.log(2), 0);

Promise.resolve()
  .then(() => console.log(3))
  .then(() => console.log(4));

console.log(5);
```

**Output**

```text
1
5
3
4
2
```

### Why?

```
Synchronous → 1, 5
Microtasks  → 3, 4
Tasks       → 2
```

The second `.then()` is also a Microtask, so it executes before `setTimeout`.

👉 [Run Example 2 in JS Visualizer](https://www.jsvisualizer.bytefront.dev/?code=console.log(1)%3B%0A%0AsetTimeout(()%20%3D%3E%20console.log(2)%2C%200)%3B%0A%0APromise.resolve()%0A%20%20.then(()%20%3D%3E%20console.log(3))%0A%20%20.then(()%20%3D%3E%20console.log(4))%3B%0A%0Aconsole.log(5)%3B)

---

# Example 3

```js
console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise 1");

  Promise.resolve().then(() => {
    console.log("Promise 2");
  });
});

console.log("End");
```

**Output**

```text
Start
End
Promise 1
Promise 2
Timeout
```

While executing `Promise 1`, another Microtask is scheduled. The Event Loop continues draining Microtasks until none remain.

👉 [Run Example 3 in JS Visualizer](https://www.jsvisualizer.bytefront.dev/?code=console.log(%22Start%22)%3B%0A%0AsetTimeout(()%20%3D%3E%20%7B%0A%20%20console.log(%22Timeout%22)%3B%0A%7D%2C%200)%3B%0A%0APromise.resolve().then(()%20%3D%3E%20%7B%0A%20%20console.log(%22Promise%201%22)%3B%0A%0A%20%20Promise.resolve().then(()%20%3D%3E%20%7B%0A%20%20%20%20console.log(%22Promise%202%22)%3B%0A%20%20%7D)%3B%0A%7D)%3B%0A%0Aconsole.log(%22End%22)%3B)

---

# Microtask Starvation

```js
function loop() {
  Promise.resolve().then(loop);
}

loop();
```

Because every Microtask schedules another Microtask:

- `setTimeout` never executes.
- Rendering may be blocked.
- The application appears frozen.

This is called **Microtask Starvation**.

👉 [Run Microtask Starvation in JS Visualizer](https://www.jsvisualizer.bytefront.dev/?code=let%20count%20%3D%200%3B%0A%0Afunction%20loop()%20%7B%0A%20%20if%20(count%2B%2B%20%3C%205)%20%7B%0A%20%20%20%20console.log(%22microtask%22%2C%20count)%3B%0A%20%20%20%20Promise.resolve().then(loop)%3B%0A%20%20%7D%0A%7D%0A%0AsetTimeout(()%20%3D%3E%20console.log(%22setTimeout%20(waited)%22)%2C%200)%3B%0Aloop()%3B)

> Note: The starvation example uses a counter limit so it doesn't actually freeze your browser — but you'll see all microtasks drain before the setTimeout fires.

---

# Mental Model

```
Current Script
      ↓
Drain ALL Microtasks
      ↓
Browser may Render
      ↓
Run ONE Task
      ↓
Repeat
```

---

# Key Takeaways

- `setTimeout(..., 0)` schedules a **Task (Macrotask)** after **at least** the specified delay.
- Promise callbacks (`then`, `catch`, `finally`) are **Microtasks**.
- The Event Loop always drains the **entire Microtask Queue** before processing the next Task.
- This is why Promises execute before `setTimeout()`.
- Microtasks can enqueue more Microtasks, and they all finish before the next Task.

---

Want to see all of this animate live? **[Open JS Visualizer — free, no signup](https://www.jsvisualizer.bytefront.dev/)** and step through any example above.

Related reads:
- [JavaScript Event Loop Explained — A Visual, Step-by-Step Guide](https://www.jsvisualizer.bytefront.dev/blogs/javascript-event-loop-explained)
- [Microtask vs Macrotask in JavaScript: The Complete Guide](https://www.jsvisualizer.bytefront.dev/blogs/microtask-vs-macrotask-javascript)
