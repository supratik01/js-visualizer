import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, Globe, ListOrdered, Zap, RefreshCw, CircleDot, StepForward, Play, BookOpen } from 'lucide-react';

const STORAGE_KEY = 'js-viz-onboarded';

const panels = [
  {
    icon: Layers,
    label: 'Call Stack',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    desc: 'Tracks which functions are currently executing, in order.',
  },
  {
    icon: Globe,
    label: 'Web APIs',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    desc: 'Where async ops live (setTimeout, fetch) while they wait.',
  },
  {
    icon: ListOrdered,
    label: 'Task Queue',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    desc: 'Macrotask callbacks (setTimeout) waiting to run next.',
  },
  {
    icon: Zap,
    label: 'Microtask Queue',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    desc: 'Promise callbacks — always flushed before the next task.',
  },
  {
    icon: RefreshCw,
    label: 'Event Loop',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    desc: 'The orchestrator: picks the next task when the stack is empty.',
  },
  {
    icon: BookOpen,
    label: 'Explanation',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    desc: 'Spec-linked step explanations. Enable via View → Step Explanations.',
  },
];

const tips = [
  { icon: Play,        text: 'Pick an example from the Examples menu to load ready-made code.' },
  { icon: Play,        text: 'Hit Run to animate execution, or Step to advance one action at a time.' },
  { icon: CircleDot,   text: 'Click the editor gutter (left margin) to set breakpoints.' },
  { icon: StepForward, text: 'Use the speed slider to slow down or speed up playback.' },
];

export function OnboardingDialog() {
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY));

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent
        className="max-w-2xl w-[95vw] bg-zinc-950 border-zinc-800 p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-zinc-800/70">
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="" className="w-9 h-9 object-contain" aria-hidden="true" />
            <div>
              <DialogTitle className="text-base font-bold tracking-wide leading-none">
                <span style={{ color: '#E2B135' }}>JS</span>
                <span className="ml-1.5 text-zinc-100">VISUALIZER</span>
              </DialogTitle>
              <p className="text-[10px] tracking-widest text-zinc-500 uppercase mt-1">See Code. Understand Memory.</p>
            </div>
          </div>
          <DialogDescription className="text-sm text-zinc-400 leading-relaxed max-w-lg">
            Watch your JavaScript execute step by step — see exactly how code flows through the runtime, when async callbacks fire, and why the output order is what it is.
          </DialogDescription>
        </div>

        <div className="px-7 py-5 space-y-6">
          {/* Panels grid */}
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">What you're looking at</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {panels.map(({ icon: Icon, label, color, bg, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                  className={`rounded-lg border p-3 ${bg} flex flex-col gap-1.5`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} aria-hidden="true" />
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick start</h3>
            <ol className="space-y-2">
              {tips.map(({ text }, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-400">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold flex items-center justify-center mt-0.5" aria-hidden="true">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          {/* CTA */}
          <div className="flex justify-end pt-1 pb-1">
            <Button
              onClick={dismiss}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6"
            >
              Start Exploring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
