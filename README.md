# JS Visualizer

**See your JavaScript execute — step by step.**

JS Visualizer is a free, interactive JavaScript runtime visualizer. Paste any code, hit Run, and watch it flow through the call stack, Web APIs, microtask queue, task queue, and event loop — one operation at a time.

**[→ Open JS Visualizer (free, no signup)](https://www.jsvisualizer.bytefront.dev/)**

![JS Visualizer screenshot](https://www.jsvisualizer.bytefront.dev/og-image.png)

---

## Why it exists

The JavaScript event loop is notoriously hard to learn from text alone. You read the explanation, you think you get it, and then you hit a real async bug and stare at the console for an hour.

JS Visualizer makes the invisible visible. Instead of imagining the call stack, you watch it. Instead of reasoning about when a Promise callback fires, you see it fly into the microtask queue and drain before the next `setTimeout`.

---

## What you can see

| Panel | What it shows |
|---|---|
| **Call Stack** | Every function push and pop, in order |
| **Web APIs** | `setTimeout`, `fetch`, and other async ops while they wait |
| **Task Queue** | Macrotask callbacks queued and waiting |
| **Microtask Queue** | Promise `.then`/`.catch`, `queueMicrotask` — always drains before the task queue |
| **Event Loop** | The current phase: executing, draining microtasks, idle |
| **Console** | `console.log` output, synced with the execution step |
| **Variable State** | Live variable values as each line executes |
| **Memory Graph** | Force-directed heap graph — objects, closures, references |
| **Step Explanations** | Spec-linked plain-English explanation for each operation |
| **Performance Panel** | Stack depth, task counts, async operation metrics |

---

## Features

- **Step-through or continuous playback** with adjustable speed (50ms–2000ms)
- **Breakpoints** — click the editor gutter to pause at any line
- **80+ built-in examples** covering everything from `for` loops to async generators
- **Import / export** — save and share your own examples
- **Shareable links** — `?share=<base64>` encodes code + breakpoints in the URL
- **Side-by-side comparison mode** — run two snippets simultaneously
- **Dark and light themes**
- **No signup, no install** — runs entirely in the browser

---

## Built-in example categories

The 80+ examples are grouped into 20+ categories:

`Sync` · `Call Stack` · `Promises` · `Microtasks` · `Timers` · `Event Loop` · `Async/Await` · `Errors` · `Hoisting & TDZ` · `Scope & Closures` · `This Binding` · `Type Coercion` · `Map & Set` · `Classes` · `Operators` · `Destructuring` · `Generators` · `Inheritance` · `Metaprogramming` · `Binary Data` · `Built-ins` · `Collections`

Start with **"Complete JS Runtime Tour"** for a guided walkthrough of every panel.

---

## Perfect for learning

- Why `Promise.then()` always runs before `setTimeout(fn, 0)`
- What actually happens when you `await` something
- How closures capture variables from outer scopes
- Why `this` loses its binding in callbacks
- How the event loop drains microtasks between macrotasks
- What hoisting looks like at the variable level

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18 · TypeScript · Tailwind CSS · shadcn/ui |
| Editor | Monaco Editor (same as VS Code) |
| JS Parser | Acorn |
| State | Zustand |
| Animation | Framer Motion |
| Build | Vite |
| Routing | Wouter |

---

## Local development

```bash
npm install
npm run dev        # dev server on port 5000
```

```bash
npm run build      # production build → dist/
npm run check      # TypeScript type check
```

---

## Related articles

- [JavaScript Event Loop Explained — A Visual, Step-by-Step Guide](https://www.jsvisualizer.bytefront.dev/blogs/javascript-event-loop-explained)
- [Microtask vs Macrotask in JavaScript: The Complete Guide](https://www.jsvisualizer.bytefront.dev/blogs/microtask-vs-macrotask-javascript)
- [Why Do Promises Run Before setTimeout?](https://www.jsvisualizer.bytefront.dev/blogs/why-promises-run-before-settimeout)

---

## Alternatives comparison

| Tool | Call Stack | Queues | Event Loop | Memory Graph | Variable State | Examples |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **JS Visualizer** | ✅ | ✅ | ✅ | ✅ | ✅ | 80+ |
| [Loupe](http://latentflip.com/loupe/) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| [Python Tutor JS](https://pythontutor.com/javascript.html) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| [jsv9000](https://www.jsv9000.app/) | ✅ | ✅ | ✅ | ❌ | ❌ | limited |

---

## License

MIT
