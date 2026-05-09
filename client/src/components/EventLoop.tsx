import { motion } from 'framer-motion';
import { useRuntimeStore, type EventLoopPhase } from '@/lib/runtimeStore';
import { RefreshCw, CheckCircle, Zap, Timer, Play, Pause, Info } from 'lucide-react';

interface PhaseInfo {
  label: string;
  description: string;
  detail: string;  // MDN-based explanation
  icon: typeof RefreshCw;
  color: string;
  bgColor: string;
}

const phaseConfig: Record<EventLoopPhase, PhaseInfo> = {
  'idle': { 
    label: 'Idle', 
    description: 'Waiting for tasks...', 
    detail: 'Job queue empty, waiting for new tasks or microtasks',
    icon: Pause,
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10'
  },
  'checking-callstack': { 
    label: 'Check Stack', 
    description: 'Is call stack empty?', 
    detail: 'Per MDN: Each job runs to completion before next job',
    icon: CheckCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10'
  },
  'processing-microtask': { 
    label: 'Microtasks', 
    description: 'Processing microtask queue', 
    detail: 'Draining ALL microtasks before any macrotask (Promise.then, queueMicrotask)',
    icon: Zap,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10'
  },
  'processing-task': { 
    label: 'Task Queue', 
    description: 'Processing macrotask', 
    detail: 'Running ONE task from queue (setTimeout, events)',
    icon: Timer,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10'
  },
  'executing': { 
    label: 'Executing', 
    description: 'Running code...', 
    detail: 'Run-to-completion: cannot be preempted',
    icon: Play,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  }
};

export function EventLoop() {
  const { eventLoopPhase, executionState, callStack, microtaskQueue, taskQueue } = useRuntimeStore();
  const isActive = executionState === 'running' || executionState === 'paused';
  const config = phaseConfig[eventLoopPhase];
  const PhaseIcon = config.icon;

  return (
    <section
      data-tour="event-loop"
      className="relative h-full w-full sm:w-auto"
      aria-label={`Event loop — ${config.label}: ${config.description}`}
    >
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'var(--panel-eventloop-gradient)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel))] rounded-lg flex flex-row sm:flex-col items-center justify-center p-3 gap-3 sm:gap-2">
          {/* Main Loop Animation — decorative; phase status is announced via the panel label */}
          <div className="relative" aria-hidden="true">
            <motion.div
              animate={isActive ? { rotate: 360 } : { rotate: 0 }}
              transition={isActive ? {
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              } : {}}
              className="relative"
              data-rotating={isActive ? 'true' : undefined}
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 ${
                isActive ? 'border-cyan-500/70' : 'border-zinc-600/50'
              } flex items-center justify-center transition-colors`}>
                <RefreshCw className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} aria-hidden="true" />
              </div>
              {isActive && (
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          </div>

          {/* Phase Info */}
          <div className="flex flex-col items-center gap-1.5">
            <motion.div 
              key={eventLoopPhase}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor}`}
              title={config.detail}
            >
              <PhaseIcon className={`w-3 h-3 ${config.color}`} />
              <span className={`text-xs font-semibold ${config.color}`}>
                {config.label}
              </span>
              <Info className="w-2.5 h-2.5 text-zinc-500 opacity-60 hover:opacity-100 cursor-help" />
            </motion.div>
            <motion.span
              key={`desc-${eventLoopPhase}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-zinc-500 text-center leading-tight max-w-[100px]"
            >
              {config.description}
            </motion.span>
            <motion.span
              key={`detail-${eventLoopPhase}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 0.7, height: 'auto' }}
              className="text-[8px] text-zinc-600 text-center leading-tight max-w-[110px] italic"
            >
              {config.detail}
            </motion.span>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-row sm:flex-col gap-1.5 text-[9px]">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              callStack.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-700/30 text-zinc-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${callStack.length > 0 ? 'bg-orange-400' : 'bg-zinc-600'}`} />
              Stack: {callStack.length}
            </div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              microtaskQueue.length > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-700/30 text-zinc-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${microtaskQueue.length > 0 ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
              Micro: {microtaskQueue.length}
            </div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              taskQueue.length > 0 ? 'bg-pink-500/20 text-pink-400' : 'bg-zinc-700/30 text-zinc-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${taskQueue.length > 0 ? 'bg-pink-400' : 'bg-zinc-600'}`} />
              Tasks: {taskQueue.length}
            </div>
          </div>
        </div>
      </div>
      <div 
        className="panel-label absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap flex items-center gap-1.5"
        style={{ background: 'var(--panel-eventloop-gradient)' }}
      >
        <RefreshCw className="w-3 h-3" />
        Event Loop
      </div>
      
      <div className="hidden sm:block absolute top-1/2 -right-4 w-4 h-0.5 bg-zinc-600" aria-hidden="true" />
    </section>
  );
}
