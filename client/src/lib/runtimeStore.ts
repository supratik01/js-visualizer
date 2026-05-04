import { create } from 'zustand';
import { codeExamples, categoryLabels } from './codeExamples';

export interface StackFrame {
  id: string;
  name: string;
  line: number;
  type: 'function' | 'callback' | 'promise' | 'global';
  sourceInfo?: string;
  variables?: Record<string, any>;
  isAsync?: boolean;
  executionPhase?: 'sync' | 'await-pending' | 'resumed';
  asyncStackTrace?: AsyncStackFrame[];
  parentFrameId?: string;
}

export interface AsyncStackFrame {
  id: string;
  name: string;
  line: number;
  type: 'setTimeout' | 'Promise.then' | 'Promise.catch' | 'queueMicrotask' | 'async-await' | 'event-listener';
  scheduledAt: number;
}

export interface MemoryAllocation {
  id: string;
  type: 'primitive' | 'object' | 'array' | 'function' | 'string' | 'map' | 'set' | 'weakmap' | 'weakset' | 'promise' | 'class-instance';
  name: string;
  value: any;
  size: number;
  location: 'stack' | 'heap';
  createdAtStep: number;
  createdAtLine: number;
  references: string[];
  referencedBy: string[];
  isGarbage: boolean;
  gcReason?: string;
}

export interface StackMemoryFrame {
  id: string;
  functionName: string;
  line: number;
  variables: StackVariable[];
  returnAddress?: number;
  size: number;
}

export interface StackVariable {
  name: string;
  value: any;
  type: string;
  size: number;
  heapRef?: string;
}

export interface HeapObject {
  id: string;
  type: string;
  properties: Record<string, any>;
  size: number;
  refCount: number;
  markedForGC: boolean;
  createdAt: number;
  lastAccessed: number;
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  stepIndex: number;
  stackSize: number;
  heapSize: number;
  stackFrames: StackMemoryFrame[];
  heapObjects: HeapObject[];
  totalAllocations: number;
  totalDeallocations: number;
}

export interface Breakpoint {
  id: string;
  line: number;
  enabled: boolean;
  condition?: string;
  hitCount?: number;
  logMessage?: string;
}

export interface PerformanceMetrics {
  executionStartTime: number;
  executionEndTime?: number;
  totalSteps: number;
  microtasksProcessed: number;
  macrotasksProcessed: number;
  maxCallStackDepth: number;
  currentCallStackDepth: number;
  webAPICalls: number;
  promisesCreated: number;
  promisesResolved: number;
  asyncOperations: number;
  syncExecutionTime: number;
  asyncExecutionTime: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  stepIndex: number;
  type: 'sync' | 'microtask' | 'macrotask' | 'webapi' | 'event-loop';
  name: string;
  duration?: number;
  details?: Record<string, any>;
  line?: number;
}

export interface WebAPIItem {
  id: string;
  name: string;
  type: 'setTimeout' | 'setInterval' | 'fetch' | 'promise' | 'event';
  delay: number;
  remaining: number;
  callback: string;
  targetQueue?: 'task' | 'microtask';
  createdAt?: number;
  statusDetail?: string;
}

export interface QueueItem {
  id: string;
  name: string;
  callback: string;
  line: number;
  source?: string;
  sourceType?: 'macrotask' | 'microtask';
  priority?: number;
  promiseState?: string;
  detail?: string;
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  value: string;
  timestamp: number;
}

export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'breakpoint';
export type EventLoopPhase = 'idle' | 'checking-callstack' | 'processing-microtask' | 'processing-task' | 'executing';

export interface RuntimeState {
  code: string;
  executionState: ExecutionState;
  eventLoopPhase: EventLoopPhase;
  currentLine: number;
  speed: number;
  callStack: StackFrame[];
  webAPIs: WebAPIItem[];
  taskQueue: QueueItem[];
  microtaskQueue: QueueItem[];
  consoleOutput: ConsoleEntry[];
  executionSteps: ExecutionStep[];
  currentStepIndex: number;
  
  breakpoints: Breakpoint[];
  performanceMetrics: PerformanceMetrics;
  timeline: TimelineEvent[];
  showPerformancePanel: boolean;
  comparisonMode: boolean;
  comparisonCode: string;
  comparisonSteps: ExecutionStep[];
  
  memorySnapshots: MemorySnapshot[];
  currentMemorySnapshot: MemorySnapshot | null;
  heapAllocations: MemoryAllocation[];
  showMemoryPanel: boolean;
  
  setCode: (code: string) => void;
  setSpeed: (speed: number) => void;
  setExecutionState: (state: ExecutionState) => void;
  setEventLoopPhase: (phase: EventLoopPhase) => void;
  setCurrentLine: (line: number) => void;
  pushToCallStack: (frame: StackFrame) => void;
  popFromCallStack: () => StackFrame | undefined;
  addWebAPI: (item: WebAPIItem) => void;
  removeWebAPI: (id: string) => void;
  updateWebAPI: (id: string, updates: Partial<WebAPIItem>) => void;
  addToTaskQueue: (item: QueueItem) => void;
  removeFromTaskQueue: (id?: string) => QueueItem | undefined;
  addToMicrotaskQueue: (item: QueueItem) => void;
  removeFromMicrotaskQueue: (id?: string) => QueueItem | undefined;
  addConsoleEntry: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void;
  setExecutionSteps: (steps: ExecutionStep[]) => void;
  nextStep: () => void;
  reset: () => void;
  
  addBreakpoint: (line: number, condition?: string) => void;
  removeBreakpoint: (id: string) => void;
  toggleBreakpoint: (line: number) => void;
  updateBreakpoint: (id: string, updates: Partial<Breakpoint>) => void;
  clearAllBreakpoints: () => void;
  isBreakpointAtLine: (line: number) => boolean;
  
  updatePerformanceMetrics: (updates: Partial<PerformanceMetrics>) => void;
  resetPerformanceMetrics: () => void;
  
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  clearTimeline: () => void;

  togglePerformancePanel: () => void;
  
  setComparisonMode: (enabled: boolean) => void;
  setComparisonCode: (code: string) => void;
  setComparisonSteps: (steps: ExecutionStep[]) => void;
  
  exportState: () => string;
  importState: (json: string) => boolean;
  generateShareableLink: () => string;
  
  addMemorySnapshot: (snapshot: MemorySnapshot) => void;
  setCurrentMemorySnapshot: (snapshot: MemorySnapshot | null) => void;
  addHeapAllocation: (allocation: MemoryAllocation) => void;
  updateHeapAllocation: (id: string, updates: Partial<MemoryAllocation>) => void;
  removeHeapAllocation: (id: string) => void;
  markAllocationForGC: (id: string, reason: string) => void;
  clearMemorySnapshots: () => void;
  toggleMemoryPanel: () => void;
  
  currentMemorySnapshotData: MemorySnapshotData | null;
  setCurrentMemorySnapshotData: (data: MemorySnapshotData | null) => void;

  currentExplanation: ExplanationData | null;
  setCurrentExplanation: (explanation: ExplanationData | null) => void;

  customExamples: CustomExample[];
  customCategoryLabels: Record<string, string>;
  updateCustomExample: (id: string, updates: Partial<Omit<CustomExample, 'id'>>) => void;
  addCustomExample: (example: CustomExample) => void;
  deleteCustomExample: (id: string) => void;
  updateCustomCategoryLabel: (category: string, label: string) => void;
  reorderCustomExamples: (examples: CustomExample[]) => void;
}

export interface MemoryFrame {
  name: string;
  line: number;
  variables: Record<string, SerializedValue>;
}

export interface SerializedValue {
  type: string;
  value: any;
  heapId?: string | null;
}

export interface MemoryHeapObject {
  id: string;
  type: 'object' | 'array' | 'function';
  label: string;
  properties: Record<string, SerializedValue>;
}

export interface MemorySnapshotData {
  globalVars: Record<string, SerializedValue>;
  frames: MemoryFrame[];
  heapObjects: MemoryHeapObject[];
}

export interface ExplanationData {
  title: string;
  description: string;
  specRef?: string;
  specUrl?: string;
  category: 'hoisting' | 'scope' | 'async' | 'type-coercion' | 'event-loop' | 'promise' | 'closure' | 'this' | 'execution' | 'error';
}

export interface CustomExample {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  visible: boolean;
}

export interface ExecutionStep {
  type: 'push-stack' | 'pop-stack' | 'add-webapi' | 'remove-webapi' | 'add-task' | 'remove-task' | 'add-microtask' | 'remove-microtask' | 'console' | 'highlight-line' | 'event-loop-phase' | 'update-variables' | 'breakpoint-hit' | 'memory-snapshot' | 'explanation';
  data: any;
  line?: number;
  timestamp?: number;
  stepType?: 'sync' | 'microtask' | 'macrotask';
}

const createInitialMetrics = (): PerformanceMetrics => ({
  executionStartTime: 0,
  executionEndTime: undefined,
  totalSteps: 0,
  microtasksProcessed: 0,
  macrotasksProcessed: 0,
  maxCallStackDepth: 0,
  currentCallStackDepth: 0,
  webAPICalls: 0,
  promisesCreated: 0,
  promisesResolved: 0,
  asyncOperations: 0,
  syncExecutionTime: 0,
  asyncExecutionTime: 0,
});

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  code: `Promise.resolve().then(() => console.log(1));

setTimeout(() => console.log(2), 0);

queueMicrotask(() => {
  console.log(3);
  queueMicrotask(() => console.log(4));
});

console.log(5);`,
  executionState: 'idle',
  eventLoopPhase: 'idle',
  currentLine: 0,
  speed: 1000,
  callStack: [],
  webAPIs: [],
  taskQueue: [],
  microtaskQueue: [],
  consoleOutput: [],
  executionSteps: [],
  currentStepIndex: -1,
  
  breakpoints: [],
  performanceMetrics: createInitialMetrics(),
  timeline: [],
  showPerformancePanel: false,
  comparisonMode: false,
  comparisonCode: '',
  comparisonSteps: [],
  
  memorySnapshots: [],
  currentMemorySnapshot: null,
  heapAllocations: [],
  showMemoryPanel: false,
  currentMemorySnapshotData: null,
  currentExplanation: null,

  customExamples: codeExamples.map((ex, i) => ({
    id: `ex-init-${i}`,
    title: ex.title,
    description: ex.description,
    code: ex.code,
    category: ex.category,
    visible: true,
  })),
  customCategoryLabels: { ...categoryLabels },

  setCode: (code) => set({ code }),
  setSpeed: (speed) => set({ speed }),
  setExecutionState: (executionState) => set({ executionState }),
  setEventLoopPhase: (eventLoopPhase) => set({ eventLoopPhase }),
  setCurrentLine: (currentLine) => set({ currentLine }),
  
  pushToCallStack: (frame) => set((state) => ({
    callStack: [...state.callStack, frame]
  })),
  
  popFromCallStack: () => {
    const state = get();
    if (state.callStack.length === 0) return undefined;
    const frame = state.callStack[state.callStack.length - 1];
    set({ callStack: state.callStack.slice(0, -1) });
    return frame;
  },
  
  addWebAPI: (item) => set((state) => ({
    webAPIs: [...state.webAPIs, item]
  })),
  
  removeWebAPI: (id) => set((state) => ({
    webAPIs: state.webAPIs.filter(api => api.id !== id)
  })),
  
  updateWebAPI: (id, updates) => set((state) => ({
    webAPIs: state.webAPIs.map(api => 
      api.id === id ? { ...api, ...updates } : api
    )
  })),
  
  addToTaskQueue: (item) => set((state) => ({
    taskQueue: [...state.taskQueue, item]
  })),
  
  removeFromTaskQueue: (id?: string) => {
    const state = get();
    if (state.taskQueue.length === 0) return undefined;
    if (id) {
      const item = state.taskQueue.find(t => t.id === id);
      if (item) {
        set({ taskQueue: state.taskQueue.filter(t => t.id !== id) });
        return item;
      }
    }
    const item = state.taskQueue[0];
    set({ taskQueue: state.taskQueue.slice(1) });
    return item;
  },
  
  addToMicrotaskQueue: (item) => set((state) => ({
    microtaskQueue: [...state.microtaskQueue, item]
  })),
  
  removeFromMicrotaskQueue: (id?: string) => {
    const state = get();
    if (state.microtaskQueue.length === 0) return undefined;
    if (id) {
      const item = state.microtaskQueue.find(t => t.id === id);
      if (item) {
        set({ microtaskQueue: state.microtaskQueue.filter(t => t.id !== id) });
        return item;
      }
    }
    const item = state.microtaskQueue[0];
    set({ microtaskQueue: state.microtaskQueue.slice(1) });
    return item;
  },
  
  addConsoleEntry: (entry) => set((state) => ({
    consoleOutput: [...state.consoleOutput, {
      ...entry,
      id: generateId(),
      timestamp: Date.now()
    }]
  })),
  
  setExecutionSteps: (executionSteps) => set({ executionSteps, currentStepIndex: -1 }),
  
  nextStep: () => set((state) => ({
    currentStepIndex: state.currentStepIndex + 1
  })),
  
  reset: () => set({
    executionState: 'idle',
    eventLoopPhase: 'idle',
    currentLine: 0,
    callStack: [],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    consoleOutput: [],
    executionSteps: [],
    currentStepIndex: -1,
    performanceMetrics: createInitialMetrics(),
    currentMemorySnapshotData: null,
    currentExplanation: null,
  }),
  
  addBreakpoint: (line: number, condition?: string) => set((state) => ({
    breakpoints: [...state.breakpoints, {
      id: generateId(),
      line,
      enabled: true,
      condition,
      hitCount: 0,
    }]
  })),
  
  removeBreakpoint: (id: string) => set((state) => ({
    breakpoints: state.breakpoints.filter(bp => bp.id !== id)
  })),
  
  toggleBreakpoint: (line: number) => {
    const state = get();
    const existing = state.breakpoints.find(bp => bp.line === line);
    if (existing) {
      set({ breakpoints: state.breakpoints.filter(bp => bp.line !== line) });
    } else {
      set({ breakpoints: [...state.breakpoints, {
        id: generateId(),
        line,
        enabled: true,
        hitCount: 0,
      }]});
    }
  },
  
  updateBreakpoint: (id: string, updates: Partial<Breakpoint>) => set((state) => ({
    breakpoints: state.breakpoints.map(bp => 
      bp.id === id ? { ...bp, ...updates } : bp
    )
  })),
  
  clearAllBreakpoints: () => set({ breakpoints: [] }),
  
  isBreakpointAtLine: (line: number) => {
    const state = get();
    return state.breakpoints.some(bp => bp.line === line && bp.enabled);
  },
  
  updatePerformanceMetrics: (updates: Partial<PerformanceMetrics>) => set((state) => ({
    performanceMetrics: { ...state.performanceMetrics, ...updates }
  })),
  
  resetPerformanceMetrics: () => set({ performanceMetrics: createInitialMetrics() }),
  
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => set((state) => ({
    timeline: [...state.timeline, {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
    }]
  })),
  
  clearTimeline: () => set({ timeline: [] }),

  togglePerformancePanel: () => set((state) => ({ 
    showPerformancePanel: !state.showPerformancePanel 
  })),
  
  setComparisonMode: (enabled: boolean) => set({ comparisonMode: enabled }),
  setComparisonCode: (code: string) => set({ comparisonCode: code }),
  setComparisonSteps: (steps: ExecutionStep[]) => set({ comparisonSteps: steps }),
  
  exportState: () => {
    const state = get();
    return JSON.stringify({
      code: state.code,
      breakpoints: state.breakpoints,
    });
  },

  importState: (json: string) => {
    try {
      const data = JSON.parse(json);
      set({
        code: data.code || get().code,
        breakpoints: data.breakpoints || [],
      });
      return true;
    } catch {
      return false;
    }
  },
  
  generateShareableLink: () => {
    const state = get();
    const encoded = btoa(encodeURIComponent(JSON.stringify({
      code: state.code,
      breakpoints: state.breakpoints.map(bp => ({ line: bp.line, condition: bp.condition })),
    })));
    return `${window.location.origin}${window.location.pathname}?share=${encoded}`;
  },
  
  addMemorySnapshot: (snapshot: MemorySnapshot) => set((state) => ({
    memorySnapshots: [...state.memorySnapshots, snapshot]
  })),
  
  setCurrentMemorySnapshot: (snapshot: MemorySnapshot | null) => set({ 
    currentMemorySnapshot: snapshot 
  }),
  
  addHeapAllocation: (allocation: MemoryAllocation) => set((state) => ({
    heapAllocations: [...state.heapAllocations, allocation]
  })),
  
  updateHeapAllocation: (id: string, updates: Partial<MemoryAllocation>) => set((state) => ({
    heapAllocations: state.heapAllocations.map(alloc => 
      alloc.id === id ? { ...alloc, ...updates } : alloc
    )
  })),
  
  removeHeapAllocation: (id: string) => set((state) => ({
    heapAllocations: state.heapAllocations.filter(alloc => alloc.id !== id)
  })),
  
  markAllocationForGC: (id: string, reason: string) => set((state) => ({
    heapAllocations: state.heapAllocations.map(alloc => 
      alloc.id === id ? { ...alloc, isGarbage: true, gcReason: reason } : alloc
    )
  })),
  
  clearMemorySnapshots: () => set({ 
    memorySnapshots: [], 
    currentMemorySnapshot: null,
    heapAllocations: [] 
  }),
  
  toggleMemoryPanel: () => set((state) => ({ 
    showMemoryPanel: !state.showMemoryPanel 
  })),
  
  setCurrentMemorySnapshotData: (data) => set({ currentMemorySnapshotData: data }),

  setCurrentExplanation: (explanation) => set({ currentExplanation: explanation }),

  updateCustomExample: (id, updates) => set((state) => ({
    customExamples: state.customExamples.map(ex =>
      ex.id === id ? { ...ex, ...updates } : ex
    ),
  })),

  addCustomExample: (example) => set((state) => ({
    customExamples: [...state.customExamples, example],
  })),

  deleteCustomExample: (id) => set((state) => ({
    customExamples: state.customExamples.filter(ex => ex.id !== id),
  })),

  updateCustomCategoryLabel: (category, label) => set((state) => ({
    customCategoryLabels: { ...state.customCategoryLabels, [category]: label },
  })),

  reorderCustomExamples: (examples) => set({ customExamples: examples }),
}));
