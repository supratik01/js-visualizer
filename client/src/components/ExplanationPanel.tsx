import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore, type ExplanationData } from '@/lib/runtimeStore';
import { BookOpen, Zap, Layers, Clock, GitBranch, Lock, ArrowRight, AlertTriangle, Code2, XCircle } from 'lucide-react';

const categoryConfig: Record<ExplanationData['category'], { icon: typeof BookOpen; color: string; gradient: string; bg: string; label: string }> = {
  hoisting: {
    icon: ArrowRight,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    label: 'Hoisting',
  },
  scope: {
    icon: Layers,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
    label: 'Scope',
  },
  async: {
    icon: Clock,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
    label: 'Async',
  },
  'type-coercion': {
    icon: Zap,
    color: 'text-orange-400',
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-500/10 border-orange-500/20',
    label: 'Type Coercion',
  },
  'event-loop': {
    icon: GitBranch,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'Event Loop',
  },
  promise: {
    icon: Clock,
    color: 'text-pink-400',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/10 border-pink-500/20',
    label: 'Promise',
  },
  closure: {
    icon: Lock,
    color: 'text-indigo-400',
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    label: 'Closure',
  },
  this: {
    icon: Code2,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    label: 'This Binding',
  },
  execution: {
    icon: Zap,
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10 border-green-500/20',
    label: 'Execution',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-500/10 border-red-500/20',
    label: 'Error',
  },
};

export function ExplanationPanel() {
  const { currentExplanation } = useRuntimeStore();

  return (
    <div className="relative h-full">
      <div
        className="h-full rounded-lg p-[2px]"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%)' }}
      >
        <div className="h-full bg-[hsl(var(--app-panel-deep))] rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30">
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            {currentExplanation && (
              <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${categoryConfig[currentExplanation.category]?.bg || 'bg-zinc-800/50'} ${categoryConfig[currentExplanation.category]?.color || 'text-zinc-400'}`}>
                {categoryConfig[currentExplanation.category]?.label || currentExplanation.category}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <AnimatePresence mode="wait">
              {!currentExplanation ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3"
                >
                  <BookOpen className="w-10 h-10 opacity-30" />
                  <span className="text-xs text-center leading-relaxed">
                    Step through code to see<br />spec-powered explanations
                  </span>
                </motion.div>
              ) : (
                <ExplanationContent key={currentExplanation.title} explanation={currentExplanation} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div
        className="absolute -top-3 left-4 px-3 py-1 rounded-md text-xs font-medium text-white"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%)' }}
      >
        Explanation
      </div>
    </div>
  );
}

function ExplanationContent({ explanation }: { explanation: ExplanationData }) {
  const config = categoryConfig[explanation.category] || categoryConfig.execution;
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-2.5"
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-md ${config.bg} border flex-shrink-0 mt-0.5`}>
          <IconComponent className={`w-3.5 h-3.5 ${config.color}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-200 leading-snug">
            {explanation.title}
          </h3>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed pl-0.5">
        {explanation.description}
      </p>

      {explanation.specRef && (
        <div className="flex items-center gap-1.5 pt-1">
          <BookOpen className="w-3 h-3 text-zinc-600" />
          {explanation.specUrl ? (
            <a
              href={explanation.specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-amber-400 transition-colors"
            >
              {explanation.specRef}
            </a>
          ) : (
            <span className="text-[10px] text-zinc-500">
              {explanation.specRef}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
