import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { ListOrdered, Timer, Play, ArrowRight } from 'lucide-react';

export function TaskQueue() {
  const { taskQueue, eventLoopPhase } = useRuntimeStore();
  const isProcessing = eventLoopPhase === 'processing-task';

  return (
    <section
      className="relative h-full"
      aria-label={`Task queue (macrotasks) — ${taskQueue.length} ${taskQueue.length === 1 ? 'task' : 'tasks'}`}
    >
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'var(--panel-taskqueue-gradient)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel))] rounded-lg p-4 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {taskQueue.length === 0 ? (
              <div
                className="h-full border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-600"
              >
                <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span className="text-xs">Queue Empty</span>
                <span className="text-[10px] text-zinc-700">Macrotasks (setTimeout, events)</span>
              </div>
            ) : (
              <div className="flex gap-2 items-start h-full overflow-x-auto pb-1">
                <AnimatePresence mode="popLayout">
                  {taskQueue.map((task, index) => {
                    const isFirst = index === 0;
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className={`flex-shrink-0 bg-[hsl(var(--app-panel-item))] rounded-md px-3 py-2.5 font-mono text-sm text-foreground border ${
                          isFirst && isProcessing 
                            ? 'border-pink-500/50 ring-1 ring-pink-500/30' 
                            : isFirst 
                              ? 'border-pink-500/30' 
                              : 'border-zinc-600'
                        } min-w-[120px] max-w-[180px]`}
                        data-testid={`task-item-${index}`}
                        title={task.detail || `Macrotask from ${task.source || 'setTimeout'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            <Timer className="w-3 h-3" />
                            {task.source || 'macro'}
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
                                <ArrowRight className="w-3 h-3 text-pink-400" />
                              </motion.span>
                            )}
                          </div>
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
        style={{ background: 'var(--panel-taskqueue-gradient)' }}
      >
        <ListOrdered className="w-4 h-4" />
        Task Queue
        {taskQueue.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{taskQueue.length}</span>
        )}
      </div>
      <span className="sr-only" data-testid="taskqueue-count">{taskQueue.length} tasks</span>
    </section>
  );
}
