import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { Clock, RefreshCw, Globe, Wifi, Timer, Play, Pause, Eye, Radio, MessageSquare, Database, Plug, Send, Cpu, Users } from 'lucide-react';

const apiTypeConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  'setTimeout': { icon: Timer, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Timer' },
  'setInterval': { icon: RefreshCw, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Interval' },
  'fetch': { icon: Globe, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Fetch' },
  'promise': { icon: Clock, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Promise' },
  'event': { icon: Wifi, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Event' },
  'requestAnimationFrame': { icon: Play, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'rAF' },
  'requestIdleCallback': { icon: Pause, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'rIC' },
  'MutationObserver': { icon: Eye, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Mutation' },
  'IntersectionObserver': { icon: Eye, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30', label: 'Intersect' },
  'ResizeObserver': { icon: Eye, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', label: 'Resize' },
  'MessageChannel': { icon: MessageSquare, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Message' },
  'XMLHttpRequest': { icon: Database, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'XHR' },
  'WebSocket': { icon: Plug, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', label: 'WebSocket' },
  'postMessage': { icon: Send, color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'postMsg' },
  'Worker': { icon: Cpu, color: 'bg-lime-500/20 text-lime-400 border-lime-500/30', label: 'Worker' },
  'SharedWorker': { icon: Users, color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30', label: 'Shared' }
};

export function WebAPIs() {
  const { webAPIs } = useRuntimeStore();

  return (
    <div data-tour="web-apis" className="relative h-full">
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'var(--panel-webapis-gradient)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel))] rounded-lg p-4 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {webAPIs.length === 0 ? (
              <div 
                className="h-full border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-600"
              >
                <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-xs">No Active APIs</span>
              </div>
            ) : (
              <div className="grid gap-2 h-full overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {webAPIs.map((api) => {
                    const config = apiTypeConfig[api.type] || apiTypeConfig['setTimeout'];
                    const Icon = config.icon;
                    const progress = api.delay > 0 ? ((api.delay - api.remaining) / api.delay) * 100 : 100;
                    const isAlmostDone = api.remaining <= 100;
                    
                    return (
                      <motion.div
                        key={api.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, x: 50 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[hsl(var(--app-panel-item))] rounded-md px-3 py-2.5 font-mono text-sm text-foreground border border-zinc-600 overflow-hidden"
                        data-testid={`webapi-item-${api.id}`}
                        title={api.statusDetail || `Will queue to ${api.targetQueue || 'task'} queue`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <span className="truncate text-zinc-300 text-xs">{api.name}</span>
                            {api.targetQueue && (
                              <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
                                api.targetQueue === 'task' 
                                  ? 'bg-pink-500/20 text-pink-400' 
                                  : 'bg-cyan-500/20 text-cyan-400'
                              }`}>
                                → {api.targetQueue}
                              </span>
                            )}
                          </div>
                          <motion.span 
                            animate={isAlmostDone ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.3, repeat: isAlmostDone ? Infinity : 0 }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isAlmostDone 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-zinc-700/50 text-zinc-400'
                            }`}
                          >
                            {api.remaining}ms
                          </motion.span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className={`h-full rounded-full ${
                                isAlmostDone ? 'bg-green-500' : 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
                              }`}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                          <span className="text-[9px] text-zinc-500 w-8 text-right">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="mt-1.5 text-[10px] text-zinc-500 truncate">
                          → {api.callback}
                        </div>
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
        style={{ background: 'var(--panel-webapis-gradient)' }}
      >
        <Globe className="w-4 h-4" />
        Web APIs
        {webAPIs.length > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{webAPIs.length}</span>
        )}
      </div>
      <span className="sr-only" data-testid="webapis-count">{webAPIs.length} active</span>
    </div>
  );
}
