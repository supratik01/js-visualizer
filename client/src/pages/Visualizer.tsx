import { useCallback, useRef, useEffect } from "react";
import { ControlBar } from "@/components/ControlBar";
import { CodeEditor } from "@/components/CodeEditor";
import { CallStack } from "@/components/CallStack";
import { WebAPIs } from "@/components/WebAPIs";
import { TaskQueue } from "@/components/TaskQueue";
import { MicrotaskQueue } from "@/components/MicrotaskQueue";
import { EventLoop } from "@/components/EventLoop";
import { Console } from "@/components/Console";
import { PerformancePanel } from "@/components/PerformancePanel";
import { ComparisonPanel } from "@/components/ComparisonPanel";
import { MemoryVisualization } from "@/components/memory/MemoryVisualization";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useRuntimeStore, type ExecutionStep } from "@/lib/runtimeStore";
import { parseAndSimulate } from "@/lib/executionEngine";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { FeedbackButton } from "@/components/FeedbackButton";
import { slugify } from "@/lib/utils";

export function Visualizer() {
  const {
    code,
    executionState,
    speed,
    executionSteps,
    currentStepIndex,
    setExecutionState,
    setEventLoopPhase,
    setCurrentLine,
    pushToCallStack,
    popFromCallStack,
    addWebAPI,
    removeWebAPI,
    addToTaskQueue,
    removeFromTaskQueue,
    addToMicrotaskQueue,
    removeFromMicrotaskQueue,
    addConsoleEntry,
    setExecutionSteps,
    nextStep,
    reset,
    breakpoints,
    isBreakpointAtLine,
    showPerformancePanel,
    updatePerformanceMetrics,
    setCurrentMemorySnapshotData,
    setCurrentExplanation,
    comparisonMode,
    comparisonCode,
    setComparisonSteps,
    showMemoryPanel,
    showExplanationPanel,
    setCode,
    importState,
    unlockMemoryFeature,
  } = useRuntimeStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const executionStartRef = useRef<number>(0);

  // Load code from URL params on mount:
  //   ?example=event-loop-classic  → load named example by title slug
  //   ?share=<base64>              → load arbitrary code + breakpoints (from Share button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const share = params.get('share');
    if (share) {
      try {
        const json = decodeURIComponent(atob(share));
        importState(json);
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}
      return;
    }

    const exampleSlug = params.get('example');
    if (exampleSlug) {
      const { customExamples } = useRuntimeStore.getState();
      const match = customExamples.find(ex => slugify(ex.title) === exampleSlug);
      if (match) {
        setCode(match.code);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // ?memory=1 — unlocks the Memory Visualizer panel (A/B / beta access)
    if (params.get('memory') === '1') {
      unlockMemoryFeature();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const executeStep = useCallback(
    (step: ExecutionStep) => {
      const prevState = useRuntimeStore.getState();
      
      switch (step.type) {
        case "highlight-line":
          setCurrentLine(step.data.line);
          if (isBreakpointAtLine(step.data.line) && executionState === 'running') {
            setExecutionState('breakpoint');
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          break;
        case "push-stack":
          pushToCallStack(step.data);
          updatePerformanceMetrics({
            currentCallStackDepth: prevState.callStack.length + 1,
            maxCallStackDepth: Math.max(prevState.performanceMetrics.maxCallStackDepth, prevState.callStack.length + 1),
          });
          break;
        case "pop-stack":
          popFromCallStack();
          updatePerformanceMetrics({
            currentCallStackDepth: Math.max(0, prevState.callStack.length - 1),
          });
          break;
        case "add-webapi":
          addWebAPI(step.data);
          updatePerformanceMetrics({
            webAPICalls: prevState.performanceMetrics.webAPICalls + 1,
            asyncOperations: prevState.performanceMetrics.asyncOperations + 1,
          });
          break;
        case "remove-webapi":
          removeWebAPI(step.data.id);
          break;
        case "add-task":
          addToTaskQueue(step.data);
          break;
        case "remove-task":
          removeFromTaskQueue(step.data?.id);
          updatePerformanceMetrics({
            macrotasksProcessed: prevState.performanceMetrics.macrotasksProcessed + 1,
          });
          break;
        case "add-microtask":
          addToMicrotaskQueue(step.data);
          updatePerformanceMetrics({
            promisesCreated: prevState.performanceMetrics.promisesCreated + 1,
          });
          break;
        case "remove-microtask":
          removeFromMicrotaskQueue(step.data?.id);
          updatePerformanceMetrics({
            microtasksProcessed: prevState.performanceMetrics.microtasksProcessed + 1,
            promisesResolved: prevState.performanceMetrics.promisesResolved + 1,
          });
          break;
        case "console":
          addConsoleEntry(step.data);
          break;
        case "event-loop-phase":
          setEventLoopPhase(step.data.phase);
          break;
        case "memory-snapshot":
          setCurrentMemorySnapshotData(step.data);
          break;
        case "explanation":
          setCurrentExplanation(step.data);
          break;
      }

      updatePerformanceMetrics({
        totalSteps: prevState.performanceMetrics.totalSteps + 1,
      });
    },
    [
      setCurrentLine,
      setEventLoopPhase,
      setExecutionState,
      pushToCallStack,
      popFromCallStack,
      addWebAPI,
      removeWebAPI,
      addToTaskQueue,
      removeFromTaskQueue,
      addToMicrotaskQueue,
      removeFromMicrotaskQueue,
      addConsoleEntry,
      isBreakpointAtLine,
      updatePerformanceMetrics,
      setCurrentMemorySnapshotData,
      setCurrentExplanation,
      executionState,
    ],
  );

  const processNextStep = useCallback(() => {
    const state = useRuntimeStore.getState();
    const { executionSteps, currentStepIndex } = state;

    if (currentStepIndex + 1 >= executionSteps.length) {
      setExecutionState("completed");
      setEventLoopPhase("idle");
      updatePerformanceMetrics({
        executionEndTime: Date.now(),
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    nextStep();
    const step = executionSteps[currentStepIndex + 1];
    if (step) {
      executeStep(step);
    }
  }, [executeStep, nextStep, setExecutionState, setEventLoopPhase, updatePerformanceMetrics]);

  const handleRun = useCallback(() => {
    if (executionState === "running") {
      setExecutionState("paused");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (executionState === "idle") {
      const steps = parseAndSimulate(code);
      setExecutionSteps(steps);
      setEventLoopPhase("executing");
      executionStartRef.current = Date.now();
      updatePerformanceMetrics({
        executionStartTime: Date.now(),
        executionEndTime: undefined,
      });
      
      if (comparisonMode && comparisonCode) {
        const compSteps = parseAndSimulate(comparisonCode);
        setComparisonSteps(compSteps);
      }
    }

    setExecutionState("running");

    intervalRef.current = setInterval(() => {
      processNextStep();
    }, speed);
  }, [
    code,
    executionState,
    speed,
    setExecutionState,
    setEventLoopPhase,
    setExecutionSteps,
    processNextStep,
    updatePerformanceMetrics,
    comparisonMode,
    comparisonCode,
    setComparisonSteps,
  ]);

  const handleStep = useCallback(() => {
    if (executionState === "idle") {
      const steps = parseAndSimulate(code);
      setExecutionSteps(steps);
      setExecutionState("paused");
      setEventLoopPhase("executing");
      executionStartRef.current = Date.now();
      updatePerformanceMetrics({
        executionStartTime: Date.now(),
      });
    }

    processNextStep();
  }, [
    code,
    executionState,
    setExecutionSteps,
    setExecutionState,
    setEventLoopPhase,
    processNextStep,
    updatePerformanceMetrics,
  ]);

  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    reset();
  }, [reset]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (executionState === "running" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        processNextStep();
      }, speed);
    }
  }, [speed, executionState, processNextStep]);

  const hasRightPanels = showPerformancePanel || comparisonMode;

  return (
    <div
      className="flex flex-col h-screen bg-background overflow-hidden"
      data-testid="visualizer-container"
    >
      <OnboardingDialog />
      <FeedbackButton />

      {/* Skip-to-content link — visible only when keyboard-focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <ControlBar
        onRun={handleRun}
        onStep={handleStep}
        onReset={handleReset}
      />

      {/* Live region announcing execution state changes to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="execution-state-announcer"
      >
        {executionState === 'running' && 'Code execution is running.'}
        {executionState === 'paused' && 'Code execution is paused.'}
        {executionState === 'completed' && 'Code execution completed.'}
        {executionState === 'breakpoint' && `Stopped at breakpoint on line ${useRuntimeStore.getState().currentLine}.`}
        {executionState === 'idle' && 'Ready. Press Run to start.'}
      </div>

      <main
        id="main-content"
        role="main"
        aria-label="JavaScript visualizer workspace"
        className="flex-1 min-h-0 flex flex-col"
      >
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Main content panel */}
        <ResizablePanel defaultSize={showMemoryPanel ? 65 : 100} minSize={38}>
          <div className="h-full flex flex-col lg:flex-row p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6 overflow-auto">
            <div className={`w-full ${hasRightPanels ? 'lg:w-[35%]' : 'lg:w-[42%]'} flex flex-col gap-3 sm:gap-4 lg:flex-shrink-0`}>
              <div className="h-[250px] sm:h-[300px] lg:flex-1 lg:min-h-0">
                <CodeEditor />
              </div>
              <div className="h-[120px] sm:h-[140px] lg:h-[150px]">
                <Console />
              </div>
              {showExplanationPanel && (
                <div className="h-[120px] sm:h-[140px] lg:h-[150px]">
                  <ExplanationPanel />
                </div>
              )}
            </div>

            <div className={`flex-1 flex flex-col gap-3 sm:gap-4 min-w-0 ${hasRightPanels ? 'lg:w-[40%]' : ''}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="h-[160px] sm:h-[180px] lg:h-[220px]">
                  <CallStack />
                </div>
                <div className="h-[160px] sm:h-[180px] lg:h-[220px]">
                  <WebAPIs />
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 min-h-0">
                <div className="w-full sm:w-[120px] lg:w-[140px] flex-shrink-0 flex justify-center sm:flex-col sm:justify-center h-[100px] sm:h-auto">
                  <EventLoop />
                </div>
                <div className="flex-1 grid grid-cols-1 gap-3 sm:gap-4 min-w-0">
                  <div className="sm:flex-1 sm:min-h-0">
                    <TaskQueue />
                  </div>
                  <div className="sm:flex-1 sm:min-h-0">
                    <MicrotaskQueue />
                  </div>
                </div>
              </div>
            </div>

            {hasRightPanels && (
              <div className="w-full lg:w-[25%] flex flex-col gap-3 sm:gap-4 lg:flex-shrink-0 max-h-full overflow-y-auto">
                {showPerformancePanel && (
                  <div className="flex-shrink-0">
                    <PerformancePanel />
                  </div>
                )}
                {comparisonMode && (
                  <div className="flex-shrink-0">
                    <ComparisonPanel />
                  </div>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Memory visualization — right side panel */}
        {showMemoryPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={22} maxSize={55}>
              <MemoryVisualization />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      </main>
    </div>
  );
}
