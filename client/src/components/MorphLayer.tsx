import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';

/**
 * MorphLayer — cross-panel "task flight" animations.
 *
 * The event loop's core action is moving a queued callback onto the call stack.
 * This overlay makes that visible: when a task/microtask (or its Web API entry)
 * lands in the Call Stack, a ghost card flies from where the item used to sit
 * into the new frame's position.
 *
 * It lives in a fixed, full-viewport overlay above every panel so the flying
 * card is never clipped by a panel's own `overflow` (which is why a plain
 * `layoutId` shared-element transition can't do this here).
 *
 * Linkage is by `morphId` — a shared id the execution engine threads through the
 * Web API entry, the queue item, and the resulting stack frame.
 */

type PanelKind = 'webapi' | 'task' | 'micro' | 'stack';

interface Box { x: number; y: number; w: number; h: number }

interface Flight {
  id: string;
  source: PanelKind;
  label: string;
  from: Box;
  to: Box;
}

// Accent colour by where the work came from (matches each panel's theme).
const sourceColor: Record<PanelKind, string> = {
  task: '#ec4899',   // pink — macrotask queue
  micro: '#22d3ee',  // cyan — microtask queue
  webapi: '#f59e0b', // amber — Web APIs
  stack: '#f97316',  // orange — call stack
};

function shorten(s: string): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > 26 ? t.slice(0, 26) + '…' : t;
}

// Forward progress through the runtime: Web API → a queue → the call stack.
// A flight is only spawned when an item moves to a higher-ranked panel.
const rank: Record<PanelKind, number> = { webapi: 0, task: 1, micro: 1, stack: 2 };

export function MorphLayer() {
  const callStack = useRuntimeStore((s) => s.callStack);
  const taskQueue = useRuntimeStore((s) => s.taskQueue);
  const microtaskQueue = useRuntimeStore((s) => s.microtaskQueue);
  const webAPIs = useRuntimeStore((s) => s.webAPIs);

  const [flights, setFlights] = useState<Flight[]>([]);

  // morphId -> last rect captured while the element was present (kept after unmount).
  const lastRects = useRef<Map<string, { box: Box; panel: PanelKind }>>(new Map());
  const seq = useRef(0);

  useEffect(() => {
    // 1. Where does each morphId live right now (per the store)? When an id is in
    //    more than one panel, the highest-ranked one is its true current location.
    const curLoc = new Map<string, PanelKind>();
    const place = (mid: string | undefined, panel: PanelKind) => {
      if (!mid) return;
      const cur = curLoc.get(mid);
      if (!cur || rank[panel] > rank[cur]) curLoc.set(mid, panel);
    };
    for (const it of webAPIs) place(it.morphId, 'webapi');
    for (const it of taskQueue) place(it.morphId, 'task');
    for (const it of microtaskQueue) place(it.morphId, 'micro');
    for (const it of callStack) place(it.morphId, 'stack');

    // 2. Measure on-screen rects, keeping the highest-ranked panel per id and
    //    ignoring elements still mid exit-animation (no longer in the store).
    const curRects = new Map<string, { box: Box; panel: PanelKind }>();
    document.querySelectorAll<HTMLElement>('[data-morph-id]').forEach((el) => {
      const mid = el.getAttribute('data-morph-id');
      const panel = el.getAttribute('data-morph-panel') as PanelKind | null;
      if (!mid || !panel || curLoc.get(mid) !== panel) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const existing = curRects.get(mid);
      if (existing && rank[existing.panel] >= rank[panel]) return;
      curRects.set(mid, { box: { x: r.left, y: r.top, w: r.width, h: r.height }, panel });
    });

    // 3. Any morphId that moved forward (Web API → queue → call stack) → fly it.
    const spawned: Flight[] = [];
    curLoc.forEach((panel, mid) => {
      const dst = curRects.get(mid);
      const src = lastRects.current.get(mid);
      if (!dst || !src) return;
      if (rank[panel] <= rank[src.panel]) return; // only forward moves
      const label =
        panel === 'stack' ? callStack.find((f) => f.morphId === mid)?.name
        : panel === 'task' ? taskQueue.find((t) => t.morphId === mid)?.name
        : microtaskQueue.find((t) => t.morphId === mid)?.name;
      spawned.push({
        id: `flight-${seq.current++}`,
        source: src.panel,
        label: shorten(label ?? ''),
        from: src.box,
        to: dst.box,
      });
    });
    if (spawned.length) setFlights((f) => [...f, ...spawned]);

    // 4. Remember rects (keep stale ones we didn't re-measure for use as sources).
    curRects.forEach((v, mid) => lastRects.current.set(mid, v));
  }, [callStack, taskQueue, microtaskQueue, webAPIs]);

  const removeFlight = (id: string) =>
    setFlights((f) => f.filter((x) => x.id !== id));

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      <AnimatePresence>
        {flights.map((flight) => (
          <motion.div
            key={flight.id}
            initial={{
              x: flight.from.x,
              y: flight.from.y,
              width: flight.from.w,
              height: flight.from.h,
              opacity: 0,
            }}
            animate={{
              x: flight.to.x,
              y: flight.to.y,
              width: flight.to.w,
              height: flight.to.h,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.6, times: [0, 0.18, 0.7, 1] },
            }}
            onAnimationComplete={() => removeFlight(flight.id)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              borderLeft: `3px solid ${sourceColor[flight.source]}`,
              boxShadow: `0 10px 30px -8px ${sourceColor[flight.source]}66`,
            }}
            className="rounded-md bg-[hsl(var(--app-panel-item))] border border-zinc-500/60 flex items-center px-3 overflow-hidden"
          >
            <span className="font-mono text-xs text-foreground truncate">
              {flight.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
