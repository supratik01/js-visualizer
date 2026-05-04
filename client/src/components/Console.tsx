import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { Terminal, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function Console() {
  const { consoleOutput } = useRuntimeStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'info':
        return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-500/10';
      case 'warn':
        return 'text-amber-400 bg-amber-500/10';
      case 'info':
        return 'text-blue-400 bg-blue-500/10';
      default:
        return 'text-emerald-400';
    }
  };

  return (
    <section className="relative h-full" aria-label="Console output panel">
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel-deep))] rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            {consoleOutput.length > 0 && (
              <span
                className="ml-auto text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded"
                aria-label={`${consoleOutput.length} console entries`}
              >
                {consoleOutput.length}
              </span>
            )}
          </div>
          
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-base"
            data-testid="console-output"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions text"
            aria-label="Console output"
          >
            <AnimatePresence mode="popLayout">
              {consoleOutput.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                  <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 8l4 4-4 4" />
                    <line x1="13" y1="16" x2="17" y2="16" />
                  </svg>
                  <span className="text-xs">Output will appear here</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {consoleOutput.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded ${getEntryColor(entry.type)}`}
                      data-testid={`console-entry-${index}`}
                    >
                      {getEntryIcon(entry.type)}
                      <span className="break-all leading-relaxed font-medium">{entry.value}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <div
        className="panel-label absolute -top-3 left-4 px-3 py-1 rounded-md text-xs font-medium text-white"
        style={{ background: 'var(--panel-console-gradient)' }}
        aria-hidden="true"
      >
        Console
      </div>
    </section>
  );
}
