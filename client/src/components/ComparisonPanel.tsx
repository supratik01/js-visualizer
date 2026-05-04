import { useRuntimeStore, type ExecutionStep } from '@/lib/runtimeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, Play, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { parseAndSimulate } from '@/lib/executionEngine';

export function ComparisonPanel() {
  const { 
    comparisonMode,
    code,
    comparisonCode,
    setComparisonCode,
    executionSteps,
    comparisonSteps,
    setComparisonSteps,
    currentStepIndex
  } = useRuntimeStore();

  const [comparisonGenerated, setComparisonGenerated] = useState(false);

  const handleGenerateComparison = useCallback(() => {
    if (comparisonCode.trim()) {
      const steps = parseAndSimulate(comparisonCode);
      setComparisonSteps(steps);
      setComparisonGenerated(true);
    }
  }, [comparisonCode, setComparisonSteps]);

  useEffect(() => {
    setComparisonGenerated(false);
  }, [comparisonCode]);

  if (!comparisonMode) return null;

  // Analyze differences between execution steps
  const analyzeSteps = (original: ExecutionStep[], comparison: ExecutionStep[]) => {
    const differences: { type: string; description: string; originalStep?: number; comparisonStep?: number }[] = [];
    
    // Count different types of operations
    const countOps = (steps: ExecutionStep[]) => ({
      microtasks: steps.filter(s => s.type === 'add-microtask').length,
      macrotasks: steps.filter(s => s.type === 'add-task').length,
      stackOps: steps.filter(s => s.type === 'push-stack' || s.type === 'pop-stack').length,
      consoleLogs: steps.filter(s => s.type === 'console').length,
      webAPICalls: steps.filter(s => s.type === 'add-webapi').length,
    });

    const originalOps = countOps(original);
    const comparisonOps = countOps(comparison);

    if (originalOps.microtasks !== comparisonOps.microtasks) {
      differences.push({
        type: 'microtasks',
        description: `Microtasks: ${originalOps.microtasks} vs ${comparisonOps.microtasks}`,
      });
    }
    if (originalOps.macrotasks !== comparisonOps.macrotasks) {
      differences.push({
        type: 'macrotasks',
        description: `Macrotasks: ${originalOps.macrotasks} vs ${comparisonOps.macrotasks}`,
      });
    }
    if (originalOps.consoleLogs !== comparisonOps.consoleLogs) {
      differences.push({
        type: 'console',
        description: `Console logs: ${originalOps.consoleLogs} vs ${comparisonOps.consoleLogs}`,
      });
    }
    if (original.length !== comparison.length) {
      differences.push({
        type: 'steps',
        description: `Total steps: ${original.length} vs ${comparison.length}`,
      });
    }

    // Check console output order
    const getConsoleOutputs = (steps: ExecutionStep[]) => 
      steps.filter(s => s.type === 'console').map(s => s.data?.value || '');
    
    const originalOutputs = getConsoleOutputs(original);
    const comparisonOutputs = getConsoleOutputs(comparison);
    
    const outputMatches = originalOutputs.length === comparisonOutputs.length &&
      originalOutputs.every((val, i) => val === comparisonOutputs[i]);

    return { differences, originalOps, comparisonOps, outputMatches, originalOutputs, comparisonOutputs };
  };

  const analysis = comparisonGenerated ? analyzeSteps(executionSteps, comparisonSteps) : null;

  return (
    <Card className="bg-zinc-900/95 border-zinc-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
          <GitCompare className="w-4 h-4 text-blue-400" />
          Code Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Comparison Code Input */}
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Compare with:</div>
          <Textarea
            value={comparisonCode}
            onChange={(e) => setComparisonCode(e.target.value)}
            placeholder="Paste alternative code here..."
            className="bg-zinc-800 border-zinc-700 text-white text-xs font-mono min-h-[100px] resize-none"
          />
          <Button
            size="sm"
            onClick={handleGenerateComparison}
            disabled={!comparisonCode.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-3 h-3 mr-1" />
            Generate Comparison
          </Button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-3 pt-2 border-t border-zinc-700/50">
            {/* Output Comparison */}
            <div className="flex items-center gap-2">
              {analysis.outputMatches ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Output matches!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400">Output differs</span>
                </>
              )}
            </div>

            {/* Console Output Side by Side */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500">Original Output</div>
                <ScrollArea className="h-20 bg-zinc-800/50 rounded p-2">
                  {analysis.originalOutputs.map((output, i) => (
                    <div key={i} className="text-xs font-mono text-zinc-300">
                      {output}
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500">Comparison Output</div>
                <ScrollArea className="h-20 bg-zinc-800/50 rounded p-2">
                  {analysis.comparisonOutputs.map((output, i) => (
                    <div 
                      key={i} 
                      className={`text-xs font-mono ${
                        output !== analysis.originalOutputs[i] ? 'text-amber-400' : 'text-zinc-300'
                      }`}
                    >
                      {output}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            {/* Differences */}
            {analysis.differences.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500">Differences</div>
                {analysis.differences.map((diff, i) => (
                  <Badge 
                    key={i}
                    variant="outline" 
                    className="mr-1 border-amber-500/30 text-amber-400 text-[10px]"
                  >
                    {diff.description}
                  </Badge>
                ))}
              </div>
            )}

            {/* Metrics Comparison */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="text-zinc-500 mb-1">Original</div>
                <div>Microtasks: {analysis.originalOps.microtasks}</div>
                <div>Macrotasks: {analysis.originalOps.macrotasks}</div>
                <div>Steps: {executionSteps.length}</div>
              </div>
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="text-zinc-500 mb-1">Comparison</div>
                <div>Microtasks: {analysis.comparisonOps.microtasks}</div>
                <div>Macrotasks: {analysis.comparisonOps.macrotasks}</div>
                <div>Steps: {comparisonSteps.length}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
