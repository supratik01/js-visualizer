import { useRuntimeStore } from '@/lib/runtimeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, Clock, Layers, Zap, Timer, 
  ArrowRightLeft, Database, GitBranch 
} from 'lucide-react';

export function PerformancePanel() {
  const { performanceMetrics, showPerformancePanel, executionState } = useRuntimeStore();

  if (!showPerformancePanel) return null;

  const {
    executionStartTime,
    executionEndTime,
    totalSteps,
    microtasksProcessed,
    macrotasksProcessed,
    maxCallStackDepth,
    currentCallStackDepth,
    webAPICalls,
    promisesCreated,
    promisesResolved,
    asyncOperations,
  } = performanceMetrics;

  const executionDuration = executionEndTime 
    ? executionEndTime - executionStartTime 
    : executionStartTime > 0 
      ? Date.now() - executionStartTime 
      : 0;

  const totalTasks = microtasksProcessed + macrotasksProcessed;
  const microtaskRatio = totalTasks > 0 ? (microtasksProcessed / totalTasks) * 100 : 0;

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    sublabel,
    color = 'text-cyan-400' 
  }: { 
    icon: any; 
    label: string; 
    value: string | number; 
    sublabel?: string;
    color?: string;
  }) => (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50">
      <div className={`p-1.5 rounded-md bg-zinc-700/50 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="font-mono text-sm text-white truncate">{value}</div>
        {sublabel && (
          <div className="text-[10px] text-zinc-500">{sublabel}</div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="bg-zinc-900/95 border-zinc-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
          <Activity className="w-4 h-4 text-emerald-400" />
          Performance Metrics
          {executionState === 'running' && (
            <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400 animate-pulse">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-4">
        {/* Execution Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1">
              <Timer className="w-3 h-3" /> Execution Time
            </span>
            <span className="font-mono text-white">{executionDuration}ms</span>
          </div>
        </div>

        {/* Task Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Task Distribution</span>
            <span className="font-mono text-zinc-300">
              {microtasksProcessed} micro / {macrotasksProcessed} macro
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden bg-zinc-800">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
              style={{ width: `${microtaskRatio}%` }}
            />
            <div 
              className="absolute inset-y-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${100 - microtaskRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-purple-400">Microtasks</span>
            <span className="text-amber-400">Macrotasks</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard 
            icon={Layers} 
            label="Call Stack Depth" 
            value={`${currentCallStackDepth} / ${maxCallStackDepth}`}
            sublabel="current / max"
            color="text-blue-400"
          />
          <MetricCard 
            icon={Zap} 
            label="Total Steps" 
            value={totalSteps}
            color="text-yellow-400"
          />
          <MetricCard 
            icon={ArrowRightLeft} 
            label="Web API Calls" 
            value={webAPICalls}
            color="text-cyan-400"
          />
          <MetricCard 
            icon={GitBranch} 
            label="Async Operations" 
            value={asyncOperations}
            color="text-pink-400"
          />
          <MetricCard 
            icon={Database} 
            label="Promises" 
            value={`${promisesResolved}/${promisesCreated}`}
            sublabel="resolved / created"
            color="text-emerald-400"
          />
          <MetricCard 
            icon={Clock} 
            label="Execution" 
            value={executionState}
            color="text-orange-400"
          />
        </div>

        {/* Call Stack Depth Indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Stack Depth</span>
            <span className="text-zinc-300">{currentCallStackDepth}</span>
          </div>
          <Progress 
            value={maxCallStackDepth > 0 ? (currentCallStackDepth / maxCallStackDepth) * 100 : 0} 
            className="h-1.5 bg-zinc-800"
          />
        </div>
      </CardContent>
    </Card>
  );
}
