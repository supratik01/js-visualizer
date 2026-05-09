import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { Layers, Code, Zap, Globe, ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';

const typeConfig: Record<string, { icon: typeof Layers; color: string; label: string }> = {
  'function': { icon: Code, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'fn' },
  'callback': { icon: Zap, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'cb' },
  'promise': { icon: Layers, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'promise' },
  'global': { icon: Globe, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'global' }
};

export function CallStack() {
  const { callStack, currentLine } = useRuntimeStore();
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());

  const toggleFrame = (frameId: string) => {
    const newExpanded = new Set(expandedFrames);
    if (newExpanded.has(frameId)) {
      newExpanded.delete(frameId);
    } else {
      newExpanded.add(frameId);
    }
    setExpandedFrames(newExpanded);
  };

  return (
    <div data-tour="call-stack" className="relative h-full">
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'var(--panel-callstack-gradient)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel))] rounded-lg p-4 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {callStack.length === 0 ? (
              <div 
                className="h-full border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-600"
              >
                <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                  <rect x="4" y="4" width="16" height="4" rx="1" />
                  <rect x="4" y="10" width="16" height="4" rx="1" />
                  <rect x="4" y="16" width="16" height="4" rx="1" />
                </svg>
                <span className="text-xs">Empty Stack</span>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 h-full overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {callStack.map((frame, index) => {
                    const config = typeConfig[frame.type] || typeConfig['function'];
                    const Icon = config.icon;
                    const isTop = index === callStack.length - 1;
                    const hasAsyncTrace = false;
                    const isExpanded = expandedFrames.has(frame.id);
                    
                    return (
                      <motion.div
                        key={frame.id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className={`bg-[hsl(var(--app-panel-item))] rounded-md px-3 py-2.5 font-mono text-sm text-foreground border ${
                          isTop ? 'border-orange-500/50 ring-1 ring-orange-500/30' : 'border-zinc-600'
                        }`}
                        data-testid={`callstack-frame-${frame.id}`}
                        title={frame.sourceInfo || ''}
                      >
                        <div 
                          className={`flex items-center justify-between gap-2 ${hasAsyncTrace ? 'cursor-pointer' : ''}`}
                          onClick={() => hasAsyncTrace && toggleFrame(frame.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {hasAsyncTrace && (
                              <ChevronDown 
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              />
                            )}
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>
                              <Icon className="w-3 h-3" />
                              {frame.isAsync ? 'async' : config.label}
                            </span>
                            <span className="truncate font-semibold">{frame.name}</span>
                            {frame.executionPhase === 'resumed' && (
                              <span className="px-1 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-400">
                                resumed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {frame.line > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                                L{frame.line}
                              </span>
                            )}
                            {isTop && (
                              <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium"
                              >
                                running
                              </motion.span>
                            )}
                          </div>
                        </div>
                        
                        {/* Variables Display */}
                        {frame.variables && Object.keys(frame.variables).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-700/50">
                            <div className="text-[9px] text-zinc-500 mb-1">Variables:</div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(frame.variables).slice(0, 4).map(([name, value]) => (
                                <span key={name} className="text-[9px] px-1 py-0.5 rounded bg-zinc-700/50 text-zinc-300">
                                  <span className="text-cyan-400">{name}</span>
                                  <span className="text-zinc-500">: </span>
                                  <span className="text-emerald-400">{String(value).slice(0, 20)}</span>
                                </span>
                              ))}
                              {Object.keys(frame.variables).length > 4 && (
                                <span className="text-[9px] text-zinc-500">
                                  +{Object.keys(frame.variables).length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Async Stack Trace */}
                        {hasAsyncTrace && isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 pt-2 border-t border-zinc-700/50"
                          >
                            <div className="text-[9px] text-zinc-500 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              Async Stack Trace
                            </div>
                            <div className="pl-2 border-l border-dashed border-zinc-600 space-y-1">
                              {frame.asyncStackTrace?.map((asyncFrame, i) => (
                                <div key={asyncFrame.id} className="text-[9px] text-zinc-400 flex items-center gap-1">
                                  <span className="text-zinc-600">└─</span>
                                  <span className={`px-1 py-0.5 rounded text-[8px] ${
                                    asyncFrame.type === 'setTimeout' ? 'bg-amber-500/20 text-amber-400' :
                                    asyncFrame.type.startsWith('Promise') ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-cyan-500/20 text-cyan-400'
                                  }`}>
                                    {asyncFrame.type}
                                  </span>
                                  <span className="truncate">{asyncFrame.name}</span>
                                  {asyncFrame.line > 0 && (
                                    <span className="text-zinc-600">:{asyncFrame.line}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                        
                        {frame.sourceInfo && (
                          <div className="mt-1 text-[9px] text-zinc-500 truncate">
                            {frame.sourceInfo}
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
        style={{ background: 'var(--panel-callstack-gradient)' }}
      >
        <Layers className="w-4 h-4" />
        Call Stack
        {callStack.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{callStack.length}</span>
        )}
      </div>
      <span className="sr-only" data-testid="callstack-count">{callStack.length} frames</span>
    </div>
  );
}
