import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion vocabulary (Disney principle #9 — Timing).
 *
 * Every visualization panel pulls its transitions from here so the whole app
 * moves with one consistent physical character: items have weight, they settle
 * with a touch of overshoot, and structural shifts glide instead of snapping.
 */

export const spring = {
  /**
   * Snappy spring with a hint of overshoot — used when an item enters a data
   * structure (call-stack push, queue enqueue). The overshoot gives the item
   * weight and "appeal" as it lands (principles #6 slow-in/out, #10 exaggeration).
   */
  pop: { type: 'spring', stiffness: 520, damping: 30, mass: 0.8 } as Transition,

  /** Softer spring for smaller / secondary movements (console lines, badges). */
  soft: { type: 'spring', stiffness: 360, damping: 28 } as Transition,

  /** Used for `layout` shifts when neighbours reflow after a dequeue (#5 follow-through). */
  layout: { type: 'spring', stiffness: 420, damping: 34 } as Transition,
};

/**
 * Call-stack frame: pushes up from the bottom and "lands" with a squash that
 * springs back to rest (principles #1 squash/stretch, #2 anticipation). On pop
 * it compresses and lifts away.
 */
export const stackFrameVariants: Variants = {
  initial: { opacity: 0, y: 24, scaleY: 0.7 },
  animate: { opacity: 1, y: 0, scaleY: 1 },
  exit: { opacity: 0, y: -16, scaleY: 0.7 },
};

/**
 * Queue item (task / microtask): slides in from the right where new work
 * arrives, and on dequeue shrinks and lifts away — as if picked up by the
 * event loop rather than just vanishing.
 */
export const queueItemVariants: Variants = {
  initial: { opacity: 0, x: 40, scale: 0.85 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.6, y: -28 },
};
