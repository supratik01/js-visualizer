# JS Visualizer

An interactive JavaScript execution visualizer that lets you watch code flow through the runtime — step by step.

**Live demo:** https://www.jsvisualizer.bytefront.dev/

## What it does

Paste any JavaScript and see:
- **Call Stack** — which functions are currently executing
- **Web APIs** — where async operations (setTimeout, fetch) live while they wait
- **Task Queue** — macrotask callbacks waiting to run
- **Microtask Queue** — Promise callbacks, always flushed before the next task
- **Event Loop** — the orchestrator that ties it all together
- **Explanation panel** — spec-linked explanations for each execution step

80+ built-in examples covering sync, async/await, Promises, generators, closures, classes, metaprogramming, and more.

## Features

- Step-by-step or continuous playback with adjustable speed
- Breakpoints (click the editor gutter)
- Performance metrics panel
- Side-by-side comparison mode
- Dark / light theme
- Shareable links (`?share=`) and direct example links (`?example=<slug>`)
- Export / import configuration

## Tech stack

React 18 · TypeScript · Vite · Zustand · Monaco Editor · Framer Motion · Tailwind CSS · shadcn/ui · Acorn (JS parser)

## Local development

```bash
npm install
npm run dev        # starts dev server on :5000
```

## Deployment (Vercel)

The app is a pure client-side SPA. `vercel.json` is pre-configured:

```bash
vercel deploy
```

Or connect the GitHub repo in the Vercel dashboard — it will pick up `vercel.json` automatically.
