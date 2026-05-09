import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { Zap, ArrowRight } from 'lucide-react';

export function MicrotaskQueue() {
  const { microtaskQueue, eventLoopPhase } = useRuntimeStore();
  const isProcessing = eventLoopPhase === 'processing-microtask';

  // Determine task source type from callback name or source field
  const getTaskType = (task: { callback?: string; name: string; source?: string }): { label: string; color: string } => {
    // Prefer the source field if available
    if (task.source) {
      if (task.source.includes('Promise')) {
        return { label: 'Promise', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      }
      if (task.source.includes('queueMicrotask')) {
        return { label: 'queueMicrotask', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
      }
      if (task.source.includes('async')) {
        return { label: 'async/await', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      }
    }
    // Fall back to callback-based detection
    const callback = task.callback || '';
    if (callback.includes('Promise') || callback.includes('then') || callback.includes('catch')) {
      return { label: 'Promise', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
    if (callback.includes('queueMicrotask')) {
      return { label: 'queueMicrotask', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    }
    if (callback.includes('MutationObserver')) {
      return { label: 'Observer', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
    return { label: 'Microtask', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
  };

  return (
    <div data-tour="microtask-queue" className="relative h-full">
      <div 
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'var(--panel-microtask-gradient)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel))] rounded-lg p-4 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {microtaskQueue.length === 0 ? (
              <div 
                className="h-full border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-600"
              >
                <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span className="text-xs">Queue Empty</span>
                <span className="text-[10px] text-zinc-700">Promise callbacks, queueMicrotask</span>
              </div>
            ) : (
              <div className="flex gap-2 items-start h-full overflow-x-auto pb-1">
                <AnimatePresence mode="popLayout">
                  {microtaskQueue.map((task, index) => {
                    const isFirst = index === 0;
                    const taskType = getTaskType(task);
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className={`flex-shrink-0 bg-[hsl(var(--app-panel-item))] rounded-md px-3 py-2.5 font-mono text-sm text-foreground border ${
                          isFirst && isProcessing 
                            ? 'border-cyan-500/50 ring-1 ring-cyan-500/30' 
                            : isFirst 
                              ? 'border-cyan-500/30' 
                              : 'border-zinc-600'
                        } min-w-[120px] max-w-[180px]`}
                        data-testid={`microtask-item-${index}`}
                        title={task.detail || `Microtask from ${task.source || 'unknown'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${taskType.color}`}>
                            <Zap className="w-3 h-3" />
                            {taskType.label}
                          </span>
                          <span className="text-[10px] text-zinc-500">#{index + 1}</span>
                        </div>
                        <div className="text-xs truncate text-foreground font-medium mb-1">
                          {task.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {task.callback}
                        </div>
                        {task.line > 0 && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-700/50 text-zinc-500">
                              Line {task.line}
                            </span>
                            {isFirst && (
                              <motion.span
                                animate={{ x: [0, 3, 0] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                <ArrowRight className="w-3 h-3 text-cyan-400" />
                              </motion.span>
                            )}
                          </div>
                        )}
                        {isFirst && isProcessing && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-1.5 text-[9px] text-cyan-400 flex items-center gap-1"
                          >
                            <motion.span
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              ● Processing...
                            </motion.span>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
      <div 
        className="panel-label absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-md text-sm font-medium text-white whitespace-nowrap flex items-center gap-2"
        style={{ background: 'var(--panel-microtask-gradient)' }}
      >
        <Zap className="w-4 h-4" />
        Microtask Queue
        {microtaskQueue.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{microtaskQueue.length}</span>
        )}
      </div>
      <span className="sr-only" data-testid="microtaskqueue-count">{microtaskQueue.length} tasks</span>
    </div>
  );
}
