import * as acorn from 'acorn';
import type { ExecutionStep, StackFrame, WebAPIItem, QueueItem, ExplanationData } from './runtimeStore';

const generateId = () => Math.random().toString(36).substr(2, 9);
let timerCounter = 1;

type PromiseState = 'pending' | 'resolved' | 'rejected';

interface PromiseInfo {
  id: string;
  state: PromiseState;
  value: any;
  error: any;
  thenCallbacks: ChainedCallback[];
  catchCallbacks: ChainedCallback[];
  finallyCallbacks: ChainedCallback[];
  onResolve: Array<(value: any) => void>;
  onReject: Array<(error: any) => void>;
}

interface ChainedCallback {
  id: string;
  body: any;
  line: number;
  callbackStr: string;
  params: string[];
  nextPromiseId?: string;
}

interface PendingMicrotask {
  id: string;
  body: any;
  line: number;
  callbackStr: string;
  params: string[];
  args: any[];
  promiseId?: string;
  isFinallyPassThrough?: boolean;
  finallyValue?: any;
  finallyIsRejection?: boolean;
  isAsyncResume?: boolean;
  asyncFuncName?: string;
  remainingStatements?: any[];
  assignTo?: string;
  asyncPromiseId?: string;
  closureVars?: Map<string, any>;
  // Async resume that originated from `await X` inside `try { ... } catch(e) { ... } finally { ... }`.
  // When set, the resume routes a rejection through the catch handler instead of throwing past it.
  awaitTryContext?: {
    catchParam?: string;
    catchBody?: any[];
    finallyBody?: any[];
    statementsAfterTry: any[];
    restOfTry: any[];
  };
  awaitWasRejection?: boolean;
}

interface PendingMacrotask {
  id: string;
  body: any;
  line: number;
  callbackStr: string;
  params: string[];
  args: any[];
  delay: number;
  webApiId: string;
  closureVars: Map<string, any>;
  apiName: string;
  fetchPromiseId?: string;
  fetchResponse?: any;
}

interface ExecutionContext {
  steps: ExecutionStep[];
  variables: Map<string, any>;
  functions: Map<string, any>;
  promises: Map<string, PromiseInfo>;
  pendingMicrotasks: PendingMicrotask[];
  pendingMacrotasks: PendingMacrotask[];
  returnValue: any;
  hasReturned: boolean;
  thrownError: any;
  hasThrown: boolean;
  awaitSuspended: boolean;
  hasBreak: boolean;
  hasContinue: boolean;
  breakLabel: string | null;
  continueLabel: string | null;
  currentAsyncFuncName?: string;
  currentAsyncPromiseId?: string;
  stepLimit: number;
  callStackFrames: Array<{name: string, line: number, localVarNames: Set<string>}>;
  heapIdMap: Map<any, string>;
  heapIdCounter: number;
  // Phase 1B: TDZ tracking for let/const
  tdzBindings: Set<string>;
  // Const binding tracking
  constBindings: Set<string>;
  // Phase 1C: this binding
  thisBinding: any;
  // Phase 1D: scope stack for proper var/let/const scoping
  scopeStack: Array<{ bindings: Map<string, any>; kind: 'global' | 'function' | 'block' }>;
  // Label for the current loop (set by LabeledStatement wrapping a loop)
  _currentLoopLabel: string | null;
}

function getOrCreateHeapId(obj: any, ctx: ExecutionContext): string {
  if (ctx.heapIdMap.has(obj)) return ctx.heapIdMap.get(obj)!;
  const id = `heap_${ctx.heapIdCounter++}`;
  ctx.heapIdMap.set(obj, id);
  return id;
}

function serializeValue(val: any, ctx: ExecutionContext): any {
  if (val === null) return { type: 'null', value: null };
  if (val === undefined) return { type: 'undefined', value: undefined };
  if (typeof val === 'number') return { type: 'number', value: val };
  if (typeof val === 'boolean') return { type: 'boolean', value: val };
  if (typeof val === 'string') return { type: 'string', value: val };
  if (typeof val === 'symbol') return { type: 'symbol', value: 'Symbol()' };

  if (typeof val === 'object' || typeof val === 'function') {
    if (val.__isResolve || val.__isReject) return { type: 'function', value: '\u0192', heapId: null };

    if (val.type === 'FunctionDeclaration' || val.type === 'FunctionExpression' || val.type === 'ArrowFunctionExpression') {
      const heapId = getOrCreateHeapId(val, ctx);
      const params = (val.params || []).map((p: any) => {
        if (p.type === 'Identifier') return p.name;
        if (p.type === 'RestElement') return '...' + (p.argument?.name || '');
        if (p.type === 'AssignmentPattern') return p.left?.name || '?';
        return '?';
      });
      return { type: 'function', value: `\u0192 ${val.id?.name || ''}(${params.join(', ')})`, heapId };
    }

    if (Array.isArray(val)) {
      const heapId = getOrCreateHeapId(val, ctx);
      return { type: 'array', value: `Array(${val.length})`, heapId };
    }

    // Handle special wrapper types with better labels for memory viz
    const heapId = getOrCreateHeapId(val, ctx);
    if (val.__type === 'Map') return { type: 'object', value: `Map(${val.__mapSize ?? 0})`, heapId };
    if (val.__type === 'Set') return { type: 'object', value: `Set(${val.__setSize ?? 0})`, heapId };
    if (val.__type === 'Date') return { type: 'object', value: `Date`, heapId };
    if (val.__type === 'RegExp') return { type: 'object', value: `RegExp`, heapId };
    if (val.__type === 'WeakMap') return { type: 'object', value: `WeakMap`, heapId };
    if (val.__type === 'WeakSet') return { type: 'object', value: `WeakSet`, heapId };
    if (val.__type === 'Symbol') return { type: 'symbol', value: `Symbol(${val.description || ''})` };
    if (val.__type === 'BigInt') return { type: 'number', value: `${val.__value}n` };
    if (val.__type === 'Generator') return { type: 'object', value: `Generator`, heapId };
    if (val.__type === 'AsyncGenerator') return { type: 'object', value: `AsyncGenerator`, heapId };
    if (val.__type === 'TypedArray') return { type: 'object', value: `${val.__arrayType}(${val.__length})`, heapId };
    if (val.__type === 'ArrayBuffer') return { type: 'object', value: `ArrayBuffer(${val.__byteLength})`, heapId };
    if (val.__type === 'Proxy') return { type: 'object', value: `Proxy`, heapId };
    if (val.__promiseId) return { type: 'object', value: `Promise`, heapId };
    if (val.__isFetchResponse) return { type: 'object', value: `Response`, heapId };
    // Class instances: check for __className
    if (val.__className) return { type: 'object', value: `${val.__className}`, heapId };
    // Error objects
    if (val.type === 'Error' || (val.name && typeof val.message === 'string' && (val.name.endsWith('Error') || val.name === 'Error'))) {
      return { type: 'object', value: `${val.name || 'Error'}`, heapId };
    }

    return { type: 'object', value: `{...}`, heapId };
  }

  return { type: typeof val, value: String(val) };
}

function buildHeapObject(obj: any, heapId: string, ctx: ExecutionContext): any {
  if (obj.type === 'FunctionDeclaration' || obj.type === 'FunctionExpression' || obj.type === 'ArrowFunctionExpression') {
    const params = (obj.params || []).map((p: any) => {
      if (p.type === 'Identifier') return p.name;
      if (p.type === 'RestElement') return '...' + (p.argument?.name || '');
      if (p.type === 'AssignmentPattern') return p.left?.name || '?';
      return '?';
    });
    return {
      id: heapId,
      type: 'function',
      label: obj.id?.name || 'anonymous',
      properties: { params: params.join(', '), async: !!obj.async },
    };
  }

  if (Array.isArray(obj)) {
    const entries: Record<string, any> = {};
    for (let i = 0; i < Math.min(obj.length, 20); i++) {
      entries[String(i)] = serializeValue(obj[i], ctx);
    }
    if (obj.length > 20) entries['...'] = { type: 'string', value: `${obj.length - 20} more` };
    return { id: heapId, type: 'array', label: `Array(${obj.length})`, properties: entries };
  }

  // ── Special wrapper types ──────────────────────────────────────────────
  if (obj.__type === 'Map') {
    const entries: Record<string, any> = {};
    const mapEntries = (obj.__entries as Array<[any, any]>) || [];
    for (let i = 0; i < Math.min(mapEntries.length, 20); i++) {
      const [k, v] = mapEntries[i];
      entries[formatValue(k)] = serializeValue(v, ctx);
    }
    return { id: heapId, type: 'object', label: `Map(${obj.__mapSize ?? mapEntries.length})`, properties: entries };
  }

  if (obj.__type === 'Set') {
    const entries: Record<string, any> = {};
    const setValues = (obj.__values as any[]) || [];
    for (let i = 0; i < Math.min(setValues.length, 20); i++) {
      entries[String(i)] = serializeValue(setValues[i], ctx);
    }
    return { id: heapId, type: 'array', label: `Set(${obj.__setSize ?? setValues.length})`, properties: entries };
  }

  if (obj.__type === 'Date') {
    const d = obj.__date;
    return { id: heapId, type: 'object', label: 'Date', properties: { value: { type: 'string', value: d ? String(d) : 'Invalid Date' } } };
  }

  if (obj.__type === 'RegExp') {
    return { id: heapId, type: 'object', label: 'RegExp', properties: { pattern: { type: 'string', value: `/${obj.__pattern}/${obj.__flags || ''}` } } };
  }

  if (obj.__type === 'Generator' || obj.__type === 'AsyncGenerator') {
    return { id: heapId, type: 'object', label: obj.__type, properties: { state: { type: 'string', value: obj.__state || 'suspended' } } };
  }

  if (obj.__type === 'TypedArray') {
    const entries: Record<string, any> = {};
    const data = (obj.__data as number[]) || [];
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      entries[String(i)] = { type: 'number', value: data[i] };
    }
    return { id: heapId, type: 'array', label: `${obj.__arrayType}(${obj.__length})`, properties: entries };
  }

  if (obj.__type === 'ArrayBuffer') {
    return { id: heapId, type: 'object', label: 'ArrayBuffer', properties: { byteLength: { type: 'number', value: obj.__byteLength } } };
  }

  if (obj.__type === 'WeakMap') {
    return { id: heapId, type: 'object', label: 'WeakMap', properties: {} };
  }

  if (obj.__type === 'WeakSet') {
    return { id: heapId, type: 'object', label: 'WeakSet', properties: {} };
  }

  if (obj.__type === 'Proxy') {
    const entries: Record<string, any> = {};
    if (obj.__target) entries['[[Target]]'] = serializeValue(obj.__target, ctx);
    entries['[[Revoked]]'] = { type: 'boolean', value: !!obj.__revoked };
    return { id: heapId, type: 'object', label: 'Proxy', properties: entries };
  }

  if (obj.__promiseId) {
    const promise = ctx.promises.get(obj.__promiseId);
    const entries: Record<string, any> = {};
    entries['[[State]]'] = { type: 'string', value: promise?.state || 'pending' };
    if (promise?.state === 'resolved') entries['[[Value]]'] = serializeValue(promise.value, ctx);
    if (promise?.state === 'rejected') entries['[[Reason]]'] = serializeValue(promise.error, ctx);
    return { id: heapId, type: 'object', label: 'Promise', properties: entries };
  }

  // Error objects
  if (obj.type === 'Error' || (obj.name && typeof obj.message === 'string' && (String(obj.name).endsWith('Error') || obj.name === 'Error'))) {
    const entries: Record<string, any> = {};
    entries['message'] = { type: 'string', value: obj.message };
    if (obj.cause !== undefined) entries['cause'] = serializeValue(obj.cause, ctx);
    return { id: heapId, type: 'object', label: obj.name || 'Error', properties: entries };
  }

  // ── AST-internal keys to skip for plain objects ────────────────────────
  const AST_SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'body', 'params', 'id', 'sourceType',
    'computed', 'optional', 'raw', 'regex', 'leadingComments', 'trailingComments', 'innerComments',
    'declarations', 'kind', 'expression', 'generator', 'async', 'method', 'shorthand', 'key', 'value']);

  // ── Generic objects (plain objects, class instances) ────────────────────
  const entries: Record<string, any> = {};
  const label = obj.__className || 'Object';
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('__')) continue;
    // Skip AST-internal properties only for non-class instances (plain objects that happen to have AST-like keys)
    if (!obj.__className && AST_SKIP_KEYS.has(k)) continue;
    if (count >= 30) { entries['...'] = { type: 'string', value: 'more properties' }; break; }
    entries[k] = serializeValue(v, ctx);
    count++;
  }
  return { id: heapId, type: 'object', label, properties: entries };
}

function emitMemorySnapshot(ctx: ExecutionContext, line: number) {
  if (ctx.steps.length > ctx.stepLimit) return;

  const frames: any[] = [];
  const heapObjects: any[] = [];
  const heapIdsCollected = new Set<string>();

  const allLocalNames = new Set<string>();
  for (const frame of ctx.callStackFrames) {
    for (const n of frame.localVarNames) allLocalNames.add(n);
  }

  const globalVars: Record<string, any> = {};
  for (const [name, value] of ctx.variables) {
    if (allLocalNames.has(name)) continue;
    const serialized = serializeValue(value, ctx);
    globalVars[name] = serialized;
    if (serialized.heapId && !heapIdsCollected.has(serialized.heapId)) {
      heapIdsCollected.add(serialized.heapId);
      heapObjects.push(buildHeapObject(value, serialized.heapId, ctx));
    }
  }

  for (const frame of ctx.callStackFrames) {
    const frameVars: Record<string, any> = {};
    for (const varName of frame.localVarNames) {
      if (!ctx.variables.has(varName)) continue;
      const value = ctx.variables.get(varName);
      const serialized = serializeValue(value, ctx);
      frameVars[varName] = serialized;
      if (serialized.heapId && !heapIdsCollected.has(serialized.heapId)) {
        heapIdsCollected.add(serialized.heapId);
        heapObjects.push(buildHeapObject(value, serialized.heapId, ctx));
      }
    }
    frames.push({ name: frame.name, line: frame.line, variables: frameVars });
  }

  // Build a reverse lookup: heapId → original object, for discovering nested references
  const heapIdToObj = new Map<string, any>();
  for (const [obj, hid] of ctx.heapIdMap) {
    heapIdToObj.set(hid, obj);
  }

  // Walk the heap graph breadth-first to discover nested references
  let i = 0;
  while (i < heapObjects.length) {
    const obj = heapObjects[i];
    if (obj.properties) {
      for (const val of Object.values(obj.properties)) {
        const v = val as any;
        if (v && v.heapId && !heapIdsCollected.has(v.heapId)) {
          heapIdsCollected.add(v.heapId);
          const originalObj = heapIdToObj.get(v.heapId);
          if (originalObj) {
            heapObjects.push(buildHeapObject(originalObj, v.heapId, ctx));
          }
        }
      }
    }
    i++;
  }

  ctx.steps.push({
    type: 'memory-snapshot',
    line,
    data: {
      globalVars,
      frames,
      heapObjects,
    },
  });
}

function emitExplanation(ctx: ExecutionContext, line: number, explanation: ExplanationData) {
  if (ctx.steps.length > ctx.stepLimit) return;
  ctx.steps.push({
    type: 'explanation',
    line,
    data: explanation,
  });
}

function getNodeLine(node: any): number {
  return node?.loc?.start?.line || 1;
}

function extractCallbackStr(node: any): string {
  if (!node) return 'callback';
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    if (node.body?.type === 'BlockStatement') return '() => {...}';
    if (node.body?.type === 'CallExpression') {
      const c = node.body.callee;
      if (c?.type === 'MemberExpression') {
        return `() => ${c.object?.name || ''}.${c.property?.name || ''}(...)`;
      }
      if (c?.type === 'Identifier') return `() => ${c.name}(...)`;
    }
    return '() => ...';
  }
  if (node.type === 'Identifier') return node.name;
  return 'callback';
}

function formatValue(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (value instanceof RegExp) return value.toString();
  if (Array.isArray(value)) return '[' + value.map(v => formatValue(v)).join(', ') + ']';
  if (typeof value === 'object') {
    if (value.__promiseId) return 'Promise';
    if (value.__isResolve || value.__isReject) return 'function';
    if (value.__isFetchResponse) return 'Response';
    if (value.__type === 'Date' && value.__date) return (value.__date as Date).toString();
    if (value.__type === 'Symbol') return `Symbol(${value.description || ''})`;
    if (value.__type === 'Map') {
      const entries = (value.__entries as Array<[any, any]>) || [];
      return `Map(${entries.length}) {${entries.map(([k, v]) => `${formatValue(k)} => ${formatValue(v)}`).join(', ')}}`;
    }
    if (value.__type === 'Set') {
      const vals = (value.__values as any[]) || [];
      return `Set(${vals.length}) {${vals.map(v => formatValue(v)).join(', ')}}`;
    }
    if (value.__type === 'Generator') return '[Generator]';
    if (value.__type === 'AsyncGenerator') return '[AsyncGenerator]';
    if (value.__type === 'WeakMap') return 'WeakMap {<items unknown>}';
    if (value.__type === 'WeakSet') return 'WeakSet {<items unknown>}';
    if (value.__type === 'Proxy') return `Proxy {${formatValue(value.__target)}}`;
    if (value.__type === 'BigInt') return `${value.__value}n`;
    if (value.__type === 'TypedArray') return `${value.__arrayType}(${value.__length}) [${(value.__data as number[]).join(', ')}]`;
    if (value.__type === 'ArrayBuffer') return `ArrayBuffer { byteLength: ${value.__byteLength} }`;
    if (value.__type === 'DataView') return `DataView { byteLength: ${value.__buffer?.__byteLength || 0}, byteOffset: ${value.__byteOffset || 0} }`;
    if (value.__type === 'Intl.NumberFormat') return `Intl.NumberFormat [${value.__locale}]`;
    if (value.__type === 'Intl.DateTimeFormat') return `Intl.DateTimeFormat [${value.__locale}]`;
    if (value.__type === 'Intl.Collator') return `Intl.Collator [${value.__locale}]`;
    if (value.type === 'Error' && (value.name === 'Error' || value.name === 'TypeError' || value.name === 'RangeError' || value.name === 'SyntaxError' || value.name === 'ReferenceError' || value.name === 'URIError' || value.name === 'EvalError' || value.name === 'AggregateError')) {
      const base = `${value.name || 'Error'}: ${value.message}`;
      if (value.name === 'AggregateError' && value.errors) return `${base} (${value.errors.length} errors)`;
      return value.cause !== undefined ? `${base} [cause: ${formatValue(value.cause)}]` : base;
    }
    if (value.type === 'ArrowFunctionExpression' || value.type === 'FunctionExpression' || value.type === 'FunctionDeclaration') return 'function';
    if (value.type === 'ClassDeclaration') return `class ${value.id?.name || 'anonymous'}`;
    try {
      // Filter out internal __ properties for display
      const displayObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (!k.startsWith('__')) displayObj[k] = v;
      }
      return JSON.stringify(displayObj);
    } catch { return '[Object]'; }
  }
  return String(value);
}

function resolveCallbackNode(node: any, ctx: ExecutionContext): any {
  if (!node) return node;
  if (node.type === 'Identifier') {
    const resolved = ctx.functions.get(node.name) || ctx.variables.get(node.name);
    if (resolved && (resolved.type === 'ArrowFunctionExpression' || resolved.type === 'FunctionExpression' || resolved.type === 'FunctionDeclaration')) {
      return resolved;
    }
  }
  return node;
}

function getCallbackParams(node: any): string[] {
  if (!node) return [];
  if (node.params) {
    return node.params.map((p: any) => {
      if (p.type === 'Identifier') return p.name;
      if (p.type === 'AssignmentPattern') return p.left?.name || 'param';
      if (p.type === 'RestElement') return p.argument?.name || 'rest';
      return 'param';
    });
  }
  return [];
}

function getCallbackBody(node: any): any {
  if (!node) return null;
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
    return node.body;
  }
  return null;
}

function createPromise(ctx: ExecutionContext, state: PromiseState = 'pending', value?: any, error?: any): string {
  const id = generateId();
  ctx.promises.set(id, {
    id, state, value, error,
    thenCallbacks: [], catchCallbacks: [], finallyCallbacks: [],
    onResolve: [], onReject: [],
  });
  return id;
}

function resolvePromise(ctx: ExecutionContext, promiseId: string, value: any): void {
  const promise = ctx.promises.get(promiseId);
  if (!promise || promise.state !== 'pending') return;

  if (value && typeof value === 'object' && value.__promiseId) {
    const inner = ctx.promises.get(value.__promiseId);
    if (inner) {
      if (inner.state === 'resolved') {
        resolvePromise(ctx, promiseId, inner.value);
        return;
      } else if (inner.state === 'rejected') {
        rejectPromise(ctx, promiseId, inner.error);
        return;
      } else {
        inner.onResolve.push((v) => resolvePromise(ctx, promiseId, v));
        inner.onReject.push((e) => rejectPromise(ctx, promiseId, e));
        return;
      }
    }
  }

  promise.state = 'resolved';
  promise.value = value;

  for (const cb of promise.thenCallbacks) {
    scheduleMicrotask(ctx, {
      id: cb.id, body: cb.body, line: cb.line,
      callbackStr: cb.callbackStr, params: cb.params,
      args: [value], promiseId: cb.nextPromiseId,
    });
  }

  for (const cb of promise.catchCallbacks) {
    if (cb.nextPromiseId) {
      resolvePromise(ctx, cb.nextPromiseId, value);
    }
  }

  for (const cb of promise.finallyCallbacks) {
    scheduleMicrotask(ctx, {
      id: cb.id, body: cb.body, line: cb.line,
      callbackStr: cb.callbackStr, params: [], args: [],
      promiseId: cb.nextPromiseId,
      isFinallyPassThrough: true, finallyValue: value, finallyIsRejection: false,
    });
  }

  for (const handler of promise.onResolve) handler(value);
}

function rejectPromise(ctx: ExecutionContext, promiseId: string, error: any): void {
  const promise = ctx.promises.get(promiseId);
  if (!promise || promise.state !== 'pending') return;

  promise.state = 'rejected';
  promise.error = error;

  for (const cb of promise.thenCallbacks) {
    if (cb.nextPromiseId) {
      rejectPromise(ctx, cb.nextPromiseId, error);
    }
  }

  for (const cb of promise.catchCallbacks) {
    scheduleMicrotask(ctx, {
      id: cb.id, body: cb.body, line: cb.line,
      callbackStr: cb.callbackStr, params: cb.params,
      args: [error], promiseId: cb.nextPromiseId,
    });
  }

  for (const cb of promise.finallyCallbacks) {
    scheduleMicrotask(ctx, {
      id: cb.id, body: cb.body, line: cb.line,
      callbackStr: cb.callbackStr, params: [], args: [],
      promiseId: cb.nextPromiseId,
      isFinallyPassThrough: true, finallyValue: error, finallyIsRejection: true,
    });
  }

  for (const handler of promise.onReject) handler(error);
}

function scheduleMicrotask(ctx: ExecutionContext, task: PendingMicrotask): void {
  const name = task.isAsyncResume ? `${task.asyncFuncName} (resume)` :
    task.isFinallyPassThrough ? 'Promise.finally' : 'Promise.then';
  ctx.steps.push({
    type: 'add-microtask', line: task.line,
    data: { id: task.id, name, callback: task.callbackStr, line: task.line } as QueueItem,
  });
  ctx.pendingMicrotasks.push(task);
}

function registerThenCallback(ctx: ExecutionContext, promiseId: string, callback: any, line: number): string {
  const promise = ctx.promises.get(promiseId);
  const nextPromiseId = createPromise(ctx);
  const callbackId = generateId();
  callback = resolveCallbackNode(callback, ctx);
  const params = getCallbackParams(callback);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);

  const chainedCb: ChainedCallback = {
    id: callbackId, body, line, callbackStr, params, nextPromiseId,
  };

  if (promise) {
    if (promise.state === 'resolved') {
      scheduleMicrotask(ctx, {
        id: callbackId, body, line, callbackStr, params,
        args: [promise.value], promiseId: nextPromiseId,
      });
    } else if (promise.state === 'rejected') {
      rejectPromise(ctx, nextPromiseId, promise.error);
    } else {
      promise.thenCallbacks.push(chainedCb);
    }
  }
  return nextPromiseId;
}

function registerCatchCallback(ctx: ExecutionContext, promiseId: string, callback: any, line: number): string {
  const promise = ctx.promises.get(promiseId);
  const nextPromiseId = createPromise(ctx);
  const callbackId = generateId();
  callback = resolveCallbackNode(callback, ctx);
  const params = getCallbackParams(callback);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);

  const chainedCb: ChainedCallback = {
    id: callbackId, body, line, callbackStr, params, nextPromiseId,
  };

  if (promise) {
    if (promise.state === 'rejected') {
      scheduleMicrotask(ctx, {
        id: callbackId, body, line, callbackStr, params,
        args: [promise.error], promiseId: nextPromiseId,
      });
    } else if (promise.state === 'resolved') {
      resolvePromise(ctx, nextPromiseId, promise.value);
    } else {
      promise.catchCallbacks.push(chainedCb);
    }
  }
  return nextPromiseId;
}

function registerFinallyCallback(ctx: ExecutionContext, promiseId: string, callback: any, line: number): string {
  const promise = ctx.promises.get(promiseId);
  const nextPromiseId = createPromise(ctx);
  const callbackId = generateId();
  callback = resolveCallbackNode(callback, ctx);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);

  const chainedCb: ChainedCallback = {
    id: callbackId, body, line, callbackStr, params: [], nextPromiseId,
  };

  if (promise) {
    if (promise.state !== 'pending') {
      const isRejection = promise.state === 'rejected';
      const passValue = isRejection ? promise.error : promise.value;
      scheduleMicrotask(ctx, {
        id: callbackId, body, line, callbackStr, params: [], args: [],
        promiseId: nextPromiseId,
        isFinallyPassThrough: true, finallyValue: passValue, finallyIsRejection: isRejection,
      });
    } else {
      promise.finallyCallbacks.push(chainedCb);
    }
  }
  return nextPromiseId;
}

// Universal destructuring pattern binder — used for variable declarations, assignments, for...of, parameters
function bindPattern(pattern: any, value: any, ctx: ExecutionContext, currentFrame?: any): void {
  if (!pattern) return;

  if (pattern.type === 'Identifier') {
    ctx.variables.set(pattern.name, value);
    if (currentFrame) currentFrame.localVarNames.add(pattern.name);
    return;
  }

  if (pattern.type === 'AssignmentPattern') {
    // Default value: pattern = default
    const val = (value === undefined) ? evaluateExpression(pattern.right, ctx) : value;
    bindPattern(pattern.left, val, ctx, currentFrame);
    return;
  }

  if (pattern.type === 'ObjectPattern') {
    const obj = (typeof value === 'object' && value !== null) ? value : {};
    const usedKeys = new Set<string>();
    for (const prop of pattern.properties || []) {
      if (prop.type === 'RestElement') {
        // Rest element: collect remaining properties
        const rest: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          if (!usedKeys.has(key)) rest[key] = obj[key];
        }
        bindPattern(prop.argument, rest, ctx, currentFrame);
      } else {
        const key = prop.computed ? evaluateExpression(prop.key, ctx)
          : (prop.key?.name ?? prop.key?.value);
        usedKeys.add(String(key));
        const val = obj[key];
        // prop.value is the target pattern (could be Identifier, AssignmentPattern, nested ObjectPattern/ArrayPattern)
        bindPattern(prop.value || prop.key, val, ctx, currentFrame);
      }
    }
    return;
  }

  if (pattern.type === 'ArrayPattern') {
    const arr = Array.isArray(value) ? value : (typeof value === 'string' ? value.split('') : []);
    for (let i = 0; i < (pattern.elements || []).length; i++) {
      const el = pattern.elements[i];
      if (!el) continue; // hole: [a, , c]
      if (el.type === 'RestElement') {
        bindPattern(el.argument, arr.slice(i), ctx, currentFrame);
        break;
      }
      bindPattern(el, arr[i], ctx, currentFrame);
    }
    return;
  }

  // MemberExpression in assignment destructuring: ({x: obj.prop} = val)
  if (pattern.type === 'MemberExpression') {
    const obj = evaluateExpression(pattern.object, ctx);
    const prop = pattern.computed ? evaluateExpression(pattern.property, ctx) : pattern.property.name;
    if (typeof obj === 'object' && obj !== null) obj[prop] = value;
    return;
  }
}

// Collect all identifier names from a destructuring pattern
function collectPatternNames(pattern: any): string[] {
  if (!pattern) return [];
  if (pattern.type === 'Identifier') return [pattern.name];
  if (pattern.type === 'AssignmentPattern') return collectPatternNames(pattern.left);
  if (pattern.type === 'RestElement') return collectPatternNames(pattern.argument);
  if (pattern.type === 'ObjectPattern') {
    const names: string[] = [];
    for (const prop of pattern.properties || []) {
      if (prop.type === 'RestElement') names.push(...collectPatternNames(prop.argument));
      else names.push(...collectPatternNames(prop.value || prop.key));
    }
    return names;
  }
  if (pattern.type === 'ArrayPattern') {
    const names: string[] = [];
    for (const el of pattern.elements || []) {
      if (el) names.push(...collectPatternNames(el));
    }
    return names;
  }
  return [];
}

// Spread an iterable-like value into the provided sink, matching real JS [...x] semantics
// for arrays, strings, simulated Set/Map/TypedArray, and Generators.
function spreadInto(sink: any[], value: any, ctx: ExecutionContext): void {
  if (Array.isArray(value)) { for (const v of value) sink.push(v); return; }
  if (typeof value === 'string') { for (const ch of value) sink.push(ch); return; }
  if (value && typeof value === 'object') {
    if (value.__type === 'Set') { for (const v of (value.__values || [])) sink.push(v); return; }
    if (value.__type === 'Map') { for (const e of (value.__entries || [])) sink.push(e); return; }
    if (value.__type === 'TypedArray') { for (const v of (value.__data || [])) sink.push(v); return; }
    if (value.__type === 'Generator' || value.__type === 'AsyncGenerator') {
      while (true) {
        const r = callGeneratorNext(value, undefined, ctx);
        if (r.done) break;
        sink.push(r.value);
      }
      return;
    }
  }
  // Fallback: push raw value (matches non-iterable behavior loosely; real JS would throw)
  sink.push(value);
}

// Evaluate function arguments with proper spread support
function evaluateArguments(argsNodes: any[], ctx: ExecutionContext): any[] {
  const args: any[] = [];
  for (const arg of argsNodes || []) {
    if (arg.type === 'SpreadElement') {
      const spread = evaluateExpression(arg.argument, ctx);
      spreadInto(args, spread, ctx);
    } else {
      args.push(evaluateExpression(arg, ctx));
    }
  }
  return args;
}

// Generator .next() — runs generator until next yield or return
// Uses a pre-collection approach: on first call, collect all yield values by executing the body
function callGeneratorNext(gen: any, inputValue: any, ctx: ExecutionContext): { value: any; done: boolean } {
  if (!gen || gen.__type !== 'Generator') return { value: undefined, done: true };
  if (gen.__state === 'completed') return { value: undefined, done: true };

  // On first call (suspended-start), pre-collect all yield values
  if (gen.__state === 'suspended-start') {
    gen.__yieldValues = [];
    gen.__returnValue = undefined;
    gen.__yieldIndex = 0;

    const funcNode = gen.__funcNode;
    const savedVars = gen.__savedVars || new Map(ctx.variables);

    // Save context
    const prevVars = new Map(ctx.variables);
    for (const [k, v] of savedVars) ctx.variables.set(k, v);

    // Save and set this binding for generator body (e.g., class methods using this)
    const savedThisBinding = ctx.thisBinding;
    if (gen.__thisValue !== undefined) ctx.thisBinding = gen.__thisValue;

    // Suppress step generation during pre-collection phase
    // (collection runs the body to find yield values — we don't want those intermediate steps)
    const savedSteps = ctx.steps;
    const savedStepLimit = ctx.stepLimit;
    const savedHasReturned = ctx.hasReturned;
    const savedConstBindings = new Set(ctx.constBindings);
    ctx.steps = []; // temporary dummy array — discarded after collection
    ctx.stepLimit = 100000; // high limit so collection doesn't bail out early

    // Collect yields by executing the body with a special yield collector
    collectYields(funcNode.body, ctx, gen.__yieldValues, gen);

    // Restore steps and context
    ctx.steps = savedSteps;
    ctx.stepLimit = savedStepLimit;
    ctx.hasReturned = savedHasReturned;
    ctx.constBindings = savedConstBindings;
    ctx.thisBinding = savedThisBinding;
    for (const [k, v] of prevVars) ctx.variables.set(k, v);

    gen.__state = 'suspended-yield';
  }

  // Return next yield value
  if (gen.__yieldIndex < gen.__yieldValues.length) {
    const value = gen.__yieldValues[gen.__yieldIndex];
    gen.__yieldIndex++;
    return { value, done: false };
  }

  gen.__state = 'completed';
  return { value: gen.__returnValue, done: true };
}

// Collect all yield values from a generator function body by executing it
function collectYields(body: any, ctx: ExecutionContext, yieldValues: any[], gen: any): void {
  if (!body) return;
  const stmts = body.type === 'BlockStatement' ? body.body : [body];

  for (const stmt of stmts) {
    if (ctx.hasReturned || ctx.hasBreak) break;
    collectYieldsFromNode(stmt, ctx, yieldValues, gen);
  }
}

function collectYieldsFromNode(node: any, ctx: ExecutionContext, yieldValues: any[], gen: any): void {
  if (!node || ctx.hasReturned) return;

  // Check for yield expressions embedded in different statement types
  if (node.type === 'ExpressionStatement') {
    const expr = node.expression;
    if (expr?.type === 'YieldExpression') {
      const val = expr.argument ? evaluateExpression(expr.argument, ctx) : undefined;
      if (expr.delegate) {
        // yield* iterable
        if (Array.isArray(val)) { for (const v of val) yieldValues.push(v); }
        else if (val?.__type === 'Generator') {
          while (true) {
            const result = callGeneratorNext(val, undefined, ctx);
            if (result.done) break;
            yieldValues.push(result.value);
          }
        }
      } else {
        yieldValues.push(val);
      }
      return;
    }
    // Handle other expressions (e.g., assignments that might not have yield)
    processNode(node, ctx);
    return;
  }

  if (node.type === 'VariableDeclaration') {
    const decl = node.declarations?.[0];
    if (decl?.init?.type === 'YieldExpression') {
      const val = decl.init.argument ? evaluateExpression(decl.init.argument, ctx) : undefined;
      yieldValues.push(val);
      // Bind variable name — the next .next() input would go here, but in our simplified model we skip that
      if (decl.id?.name) ctx.variables.set(decl.id.name, undefined);
      return;
    }
    processNode(node, ctx);
    return;
  }

  if (node.type === 'ReturnStatement') {
    if (node.argument?.type === 'YieldExpression') {
      const val = node.argument.argument ? evaluateExpression(node.argument.argument, ctx) : undefined;
      yieldValues.push(val);
    } else {
      gen.__returnValue = node.argument ? evaluateExpression(node.argument, ctx) : undefined;
    }
    ctx.hasReturned = true;
    return;
  }

  // For loops containing yields
  if (node.type === 'ForStatement') {
    if (node.init) processNode(node.init, ctx);
    let iterations = 0;
    while (iterations++ < 1000) {
      if (node.test) {
        const test = evaluateExpression(node.test, ctx);
        if (!test) break;
      }
      const blockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body) {
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.name) blockConsts.push(d.id.name);
            }
          }
          collectYieldsFromNode(s, ctx, yieldValues, gen);
          if (ctx.hasReturned || ctx.hasBreak) break;
        }
      } else {
        collectYieldsFromNode(node.body, ctx, yieldValues, gen);
      }
      if (ctx.hasReturned) return;
      if (ctx.hasBreak) { ctx.hasBreak = false; break; }
      if (ctx.hasContinue) ctx.hasContinue = false;
      if (node.update) evaluateExpression(node.update, ctx);
      // Clear block-scoped const bindings for next iteration
      for (const name of blockConsts) {
        ctx.constBindings.delete(name);
      }
    }
    return;
  }

  if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
    let iterations = 0;
    while (iterations++ < 1000) {
      if (node.type === 'WhileStatement') {
        const test = evaluateExpression(node.test, ctx);
        if (!test) break;
      }
      // Collect block-scoped const names to clean up after each iteration
      const blockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body) {
          // Track new const bindings added during this iteration
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.name) blockConsts.push(d.id.name);
            }
          }
          collectYieldsFromNode(s, ctx, yieldValues, gen);
          if (ctx.hasReturned || ctx.hasBreak) break;
        }
      } else {
        collectYieldsFromNode(node.body, ctx, yieldValues, gen);
      }
      if (ctx.hasReturned) return;
      if (ctx.hasBreak) { ctx.hasBreak = false; break; }
      if (ctx.hasContinue) ctx.hasContinue = false;
      if (node.type === 'DoWhileStatement') {
        const test = evaluateExpression(node.test, ctx);
        if (!test) break;
      }
      // Clear block-scoped const bindings for next iteration
      for (const name of blockConsts) {
        ctx.constBindings.delete(name);
      }
    }
    return;
  }

  if (node.type === 'IfStatement') {
    const test = evaluateExpression(node.test, ctx);
    if (test) {
      if (node.consequent.type === 'BlockStatement') {
        for (const s of node.consequent.body) {
          collectYieldsFromNode(s, ctx, yieldValues, gen);
          if (ctx.hasReturned) return;
        }
      } else {
        collectYieldsFromNode(node.consequent, ctx, yieldValues, gen);
      }
    } else if (node.alternate) {
      if (node.alternate.type === 'BlockStatement') {
        for (const s of node.alternate.body) {
          collectYieldsFromNode(s, ctx, yieldValues, gen);
          if (ctx.hasReturned) return;
        }
      } else {
        collectYieldsFromNode(node.alternate, ctx, yieldValues, gen);
      }
    }
    return;
  }

  if (node.type === 'BlockStatement') {
    for (const s of node.body) {
      collectYieldsFromNode(s, ctx, yieldValues, gen);
      if (ctx.hasReturned || ctx.hasBreak) return;
    }
    return;
  }

  // For...of containing yields
  if (node.type === 'ForOfStatement') {
    const iterable = evaluateExpression(node.right, ctx);
    let items: any[] = [];
    if (Array.isArray(iterable)) items = iterable;
    else if (typeof iterable === 'string') items = iterable.split('');
    else if (iterable?.__type === 'Map') items = iterable.__entries || [];
    else if (iterable?.__type === 'Set') items = iterable.__values || [];

    for (const item of items) {
      const varDecl = node.left;
      if (varDecl?.type === 'VariableDeclaration' && varDecl.declarations?.[0]) {
        const decl = varDecl.declarations[0];
        if (decl.id?.type === 'Identifier') ctx.variables.set(decl.id.name, item);
        else bindPattern(decl.id, item, ctx);
      }
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body) {
          collectYieldsFromNode(s, ctx, yieldValues, gen);
          if (ctx.hasReturned || ctx.hasBreak) break;
        }
      } else {
        collectYieldsFromNode(node.body, ctx, yieldValues, gen);
      }
      if (ctx.hasReturned) return;
      if (ctx.hasBreak) { ctx.hasBreak = false; break; }
      if (ctx.hasContinue) ctx.hasContinue = false;
    }
    return;
  }

  // Default: just process the node normally
  processNode(node, ctx);
}

// Global symbol registry for Symbol.for()
const globalSymbolRegistry = new Map<string, any>();

function evaluateExpression(node: any, ctx: ExecutionContext): any {
  if (!node) return undefined;
  if (ctx.steps.length > ctx.stepLimit) return undefined;

  switch (node.type) {
    case 'Literal':
      // BigInt literal support: acorn stores bigint as string in node.bigint
      if (node.bigint !== undefined) {
        return { __type: 'BigInt', __value: node.bigint };
      }
      return node.value;

    case 'Identifier': {
      if (node.name === 'undefined') return undefined;
      if (node.name === 'null') return null;
      if (node.name === 'true') return true;
      if (node.name === 'false') return false;
      if (node.name === 'NaN') return NaN;
      if (node.name === 'Infinity') return Infinity;
      if (node.name === 'globalThis') return ctx.thisBinding || {};
      // TDZ check: accessing let/const before declaration
      if (ctx.tdzBindings.has(node.name)) {
        const tdzLine = getNodeLine(node);
        emitExplanation(ctx, tdzLine, {
          title: `Temporal Dead Zone — '${node.name}'`,
          description: `Variables declared with let/const exist in a "Temporal Dead Zone" from the start of their scope until the declaration is reached. Accessing '${node.name}' here throws a ReferenceError because the declaration hasn't been executed yet.`,
          specRef: 'ECMAScript \u00a714.3.1 Let and Const Declarations',
          specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
          category: 'error',
        });
        ctx.steps.push({
          type: 'console', line: tdzLine,
          data: { type: 'error', value: `ReferenceError: Cannot access '${node.name}' before initialization (Temporal Dead Zone)` },
        });
        ctx.hasThrown = true;
        ctx.thrownError = { type: 'ReferenceError', message: `Cannot access '${node.name}' before initialization` };
        return undefined;
      }
      if (ctx.variables.has(node.name)) return ctx.variables.get(node.name);
      if (ctx.functions.has(node.name)) return ctx.functions.get(node.name);
      return undefined;
    }

    case 'TemplateLiteral': {
      let result = '';
      for (let i = 0; i < node.quasis.length; i++) {
        result += node.quasis[i].value.cooked || '';
        if (i < node.expressions.length) {
          const exprVal = evaluateExpression(node.expressions[i], ctx);
          // BigInt in template literal: `${42n}` → "42" (not "42n")
          if (typeof exprVal === 'object' && exprVal !== null && exprVal.__type === 'BigInt') {
            result += exprVal.__value;
          } else {
            result += formatValue(exprVal);
          }
        }
      }
      return result;
    }

    case 'BinaryExpression': {
      const left = evaluateExpression(node.left, ctx);
      const right = evaluateExpression(node.right, ctx);
      const binLine = getNodeLine(node);

      // Phase 3: Type coercion detection for + operator
      if (node.operator === '+' && typeof left !== typeof right) {
        if (typeof left === 'string' || typeof right === 'string') {
          const coerced = typeof left !== 'string' ? left : right;
          const coercedType = typeof coerced;
          emitExplanation(ctx, binLine, {
            title: 'String Concatenation — Implicit ToString',
            description: `The + operator with a string converts the other operand via ToString(). Here, ${coercedType} ${formatValue(coerced)} is coerced to string "${String(coerced)}". This is one of JS's most common implicit coercions.`,
            specRef: 'ECMAScript \u00a713.15.3 ApplyStringOrNumericBinaryOperator',
            specUrl: 'https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator',
            category: 'type-coercion',
          });
        }
      }

      // Phase 3: Type coercion detection for == operator
      if ((node.operator === '==' || node.operator === '!=') && typeof left !== typeof right) {
        const leftType = left === null ? 'null' : typeof left;
        const rightType = right === null ? 'null' : typeof right;
        if (leftType !== rightType) {
          let coercionDesc = `The ${node.operator} operator performs type coercion: ${leftType} ${formatValue(left)} ${node.operator} ${rightType} ${formatValue(right)}.`;
          if ((left === null && right === undefined) || (left === undefined && right === null)) {
            coercionDesc += ' By spec rule, null == undefined is true (and null != undefined is false).';
          } else if (leftType === 'string' && rightType === 'number') {
            coercionDesc += ` String "${left}" is coerced to number ${Number(left)} via ToNumber().`;
          } else if (leftType === 'number' && rightType === 'string') {
            coercionDesc += ` String "${right}" is coerced to number ${Number(right)} via ToNumber().`;
          } else if (leftType === 'boolean' || rightType === 'boolean') {
            coercionDesc += ' Boolean is coerced to number first (true\u21921, false\u21920), then compared.';
          }
          emitExplanation(ctx, binLine, {
            title: `Loose Equality (${node.operator}) — Type Coercion`,
            description: coercionDesc + ' Use === to avoid implicit coercion.',
            specRef: 'ECMAScript \u00a77.2.14 IsLooselyEqual',
            specUrl: 'https://tc39.es/ecma262/#sec-islooselyequal',
            category: 'type-coercion',
          });
        }
      }

      // BigInt arithmetic handling
      const leftIsBigInt = typeof left === 'object' && left !== null && left.__type === 'BigInt';
      const rightIsBigInt = typeof right === 'object' && right !== null && right.__type === 'BigInt';
      if (leftIsBigInt || rightIsBigInt) {
        // Both BigInt — perform operation using native BigInt
        if (leftIsBigInt && rightIsBigInt) {
          try {
            const l = BigInt(left.__value);
            const r = BigInt(right.__value);
            let result: bigint | boolean;
            switch (node.operator) {
              case '+': result = l + r; break;
              case '-': result = l - r; break;
              case '*': result = l * r; break;
              case '/': result = r === 0n ? (() => { throw new RangeError('Division by zero'); })() : l / r; break;
              case '%': result = r === 0n ? (() => { throw new RangeError('Division by zero'); })() : l % r; break;
              case '**': result = l ** r; break;
              case '&': result = l & r; break;
              case '|': result = l | r; break;
              case '^': result = l ^ r; break;
              case '<<': result = l << r; break;
              case '>>': result = l >> r; break;
              case '===': return left.__value === right.__value;
              case '!==': return left.__value !== right.__value;
              case '==': return left.__value === right.__value;
              case '!=': return left.__value !== right.__value;
              case '<': return l < r;
              case '>': return l > r;
              case '<=': return l <= r;
              case '>=': return l >= r;
              default: return undefined;
            }
            return { __type: 'BigInt', __value: String(result) };
          } catch (e: any) {
            const errorObj = { type: 'Error', name: 'RangeError', message: e.message || 'BigInt operation error' };
            ctx.thrownError = errorObj;
            ctx.hasThrown = true;
            return undefined;
          }
        }
        // Mixed: BigInt vs other type
        const otherVal = leftIsBigInt ? right : left;
        const otherType = typeof otherVal;
        // String + BigInt = string concatenation (allowed in JS)
        if (node.operator === '+' && (otherType === 'string' || (typeof otherVal === 'object' && otherVal !== null && !otherVal.__type))) {
          const bigStr = leftIsBigInt ? left.__value : right.__value;
          return leftIsBigInt ? String(bigStr) + String(otherVal ?? '') : String(otherVal ?? '') + String(bigStr);
        }
        // Comparison operators are allowed between BigInt and Number
        if (['===', '!==', '==', '!=', '<', '>', '<=', '>='].includes(node.operator)) {
          const leftNum = leftIsBigInt ? Number(BigInt(left.__value)) : left;
          const rightNum = rightIsBigInt ? Number(BigInt(right.__value)) : right;
          switch (node.operator) {
            case '===': return false; // Different types
            case '!==': return true;
            case '==': return leftNum == rightNum;
            case '!=': return leftNum != rightNum;
            case '<': return leftNum < rightNum;
            case '>': return leftNum > rightNum;
            case '<=': return leftNum <= rightNum;
            case '>=': return leftNum >= rightNum;
            default: return undefined;
          }
        }
        // All other mixed operations → TypeError
        emitExplanation(ctx, binLine, {
          title: 'TypeError: Cannot mix BigInt and Number',
          description: `BigInt and Number types cannot be mixed in arithmetic operations. Both operands must be the same type. Use BigInt() or Number() to convert.`,
          specRef: 'ECMAScript §6.1.6.2 The BigInt Type',
          specUrl: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type',
          category: 'runtime-error',
        });
        const errorObj = { type: 'Error', name: 'TypeError', message: 'Cannot mix BigInt and other types, use explicit conversions' };
        ctx.thrownError = errorObj;
        ctx.hasThrown = true;
        return undefined;
      }

      switch (node.operator) {
        case '+':
          if (typeof left === 'number' && typeof right === 'number') return left + right;
          return String(left ?? '') + String(right ?? '');
        case '-': return (Number(left) || 0) - (Number(right) || 0);
        case '*': return (Number(left) || 0) * (Number(right) || 0);
        case '/': return (Number(right) || 1) === 0 ? Infinity : (Number(left) || 0) / (Number(right) || 1);
        case '%': return (Number(left) || 0) % (Number(right) || 1);
        case '**': return Math.pow(Number(left) || 0, Number(right) || 0);
        case '===': return left === right;
        case '!==': return left !== right;
        case '==': return left == right;
        case '!=': return left != right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '&': return (left as number) & (right as number);
        case '|': return (left as number) | (right as number);
        case '^': return (left as number) ^ (right as number);
        case '<<': return (left as number) << (right as number);
        case '>>': return (left as number) >> (right as number);
        case '>>>': return (left as number) >>> (right as number);
        case 'instanceof': {
          // Check our simulated class system
          if (typeof right === 'object' && right !== null && right.type === 'ClassDeclaration') {
            const className = right.id?.name;
            if (typeof left === 'object' && left !== null) {
              // Check __classNode chain (supports extends)
              let classNode = left.__classNode;
              while (classNode) {
                if (classNode === right || classNode.id?.name === className) return true;
                classNode = classNode.__parentClass;
              }
              return left.__type === className;
            }
            return false;
          }
          // For built-in types
          if (right === Array || (typeof right === 'object' && right?.name === 'Array')) return Array.isArray(left);
          if (typeof right === 'function') {
            try { return left instanceof right; } catch { return false; }
          }
          // Check our internal __type markers
          if (typeof right === 'object' && right?.name) {
            return typeof left === 'object' && left !== null && left.__type === right.name;
          }
          return false;
        }
        case 'in': {
          if (typeof right === 'object' && right !== null) {
            // Proxy has trap
            if (right.__type === 'Proxy' && !right.__revoked) {
              const hasTrap = right.__handler?.has;
              if (hasTrap && typeof hasTrap === 'object' && (hasTrap.type === 'FunctionExpression' || hasTrap.type === 'ArrowFunctionExpression')) {
                return callFunction(hasTrap, [right.__target, left], 'Proxy.has', ctx, getNodeLine(node));
              }
              return left in right.__target;
            }
            if (Array.isArray(right)) return Number(left) >= 0 && Number(left) < right.length;
            return left in right;
          }
          return false;
        }
        default: return undefined;
      }
    }

    case 'UnaryExpression': {
      // Handle delete operator specially (needs MemberExpression, not evaluated arg)
      if (node.operator === 'delete') {
        if (node.argument.type === 'MemberExpression') {
          const obj = evaluateExpression(node.argument.object, ctx);
          const prop = node.argument.computed
            ? evaluateExpression(node.argument.property, ctx)
            : node.argument.property.name;
          if (typeof obj === 'object' && obj !== null) {
            // Proxy deleteProperty trap
            if (obj.__type === 'Proxy' && !obj.__revoked) {
              const delTrap = obj.__handler?.deleteProperty;
              if (delTrap && typeof delTrap === 'object' && (delTrap.type === 'FunctionExpression' || delTrap.type === 'ArrowFunctionExpression')) {
                return callFunction(delTrap, [obj.__target, prop], 'Proxy.deleteProperty', ctx, getNodeLine(node));
              }
              delete obj.__target[prop];
              return true;
            }
            delete obj[prop];
            return true;
          }
        }
        return true;
      }
      const arg = evaluateExpression(node.argument, ctx);
      switch (node.operator) {
        case '!': return !arg;
        case '-':
          if (typeof arg === 'object' && arg !== null && arg.__type === 'BigInt') {
            const negated = -BigInt(arg.__value);
            return { __type: 'BigInt', __value: String(negated) };
          }
          return -Number(arg);
        case '+':
          if (typeof arg === 'object' && arg !== null && arg.__type === 'BigInt') {
            // Unary + on BigInt throws TypeError in real JS
            const errorObj = { type: 'Error', name: 'TypeError', message: 'Cannot convert a BigInt value to a number' };
            ctx.thrownError = errorObj;
            ctx.hasThrown = true;
            return undefined;
          }
          return +Number(arg);
        case 'typeof': {
          if (arg === null) return 'object'; // typeof null === 'object' quirk
          if (typeof arg === 'object' && arg?.__type === 'Symbol') return 'symbol';
          if (typeof arg === 'object' && arg?.__type === 'BigInt') return 'bigint';
          if (typeof arg === 'object' && (arg?.type === 'FunctionDeclaration' || arg?.type === 'FunctionExpression' || arg?.type === 'ArrowFunctionExpression')) return 'function';
          return typeof arg;
        }
        case 'void': return undefined;
        case '~': return ~(Number(arg) || 0);
        default: return undefined;
      }
    }

    case 'LogicalExpression': {
      const left = evaluateExpression(node.left, ctx);
      switch (node.operator) {
        case '&&': return left ? evaluateExpression(node.right, ctx) : left;
        case '||': return left ? left : evaluateExpression(node.right, ctx);
        case '??': return left !== null && left !== undefined ? left : evaluateExpression(node.right, ctx);
        default: return left;
      }
    }

    case 'ConditionalExpression': {
      const test = evaluateExpression(node.test, ctx);
      return test ? evaluateExpression(node.consequent, ctx) : evaluateExpression(node.alternate, ctx);
    }

    case 'ArrayExpression': {
      const result: any[] = [];
      for (const el of node.elements || []) {
        if (!el) { result.push(undefined); continue; }
        if (el.type === 'SpreadElement') {
          const arr = evaluateExpression(el.argument, ctx);
          spreadInto(result, arr, ctx);
        } else {
          result.push(evaluateExpression(el, ctx));
        }
      }
      return result;
    }

    case 'ObjectExpression': {
      const obj: Record<string, any> = {};
      for (const prop of node.properties || []) {
        if (prop.type === 'SpreadElement') {
          const spreadObj = evaluateExpression(prop.argument, ctx);
          if (typeof spreadObj === 'object' && spreadObj !== null) Object.assign(obj, spreadObj);
        } else {
          let key = prop.computed
            ? evaluateExpression(prop.key, ctx)
            : (prop.key.name || prop.key.value);
          // Mangle Symbol keys for storage
          if (key && typeof key === 'object' && key.__type === 'Symbol') {
            key = `__symbol_${key.__wellKnown || key.description}`;
          }
          // Handle getters and setters
          if (prop.kind === 'get') {
            if (!obj.__getters) obj.__getters = {};
            obj.__getters[key] = prop.value;
          } else if (prop.kind === 'set') {
            if (!obj.__setters) obj.__setters = {};
            obj.__setters[key] = prop.value;
          } else if (prop.method) {
            // Method shorthand: { foo() {} }
            obj[key] = prop.value;
          } else {
            obj[key] = prop.shorthand
              ? (ctx.variables.get(key) ?? ctx.functions.get(key))
              : evaluateExpression(prop.value, ctx);
          }
        }
      }
      return obj;
    }

    case 'MemberExpression': {
      // Handle well-known global object constants BEFORE evaluating obj
      if (node.object?.type === 'Identifier' && !node.computed) {
        const objName = node.object.name;
        const propName = node.property?.name;
        // Math constants
        if (objName === 'Math') {
          switch (propName) {
            case 'PI': return Math.PI;
            case 'E': return Math.E;
            case 'LN2': return Math.LN2;
            case 'LN10': return Math.LN10;
            case 'LOG2E': return Math.LOG2E;
            case 'LOG10E': return Math.LOG10E;
            case 'SQRT2': return Math.SQRT2;
            case 'SQRT1_2': return Math.SQRT1_2;
          }
        }
        // Symbol well-known constants
        if (objName === 'Symbol') {
          const wellKnownSymbols: Record<string, string> = {
            iterator: 'Symbol.iterator', asyncIterator: 'Symbol.asyncIterator',
            toPrimitive: 'Symbol.toPrimitive', toStringTag: 'Symbol.toStringTag',
            hasInstance: 'Symbol.hasInstance', species: 'Symbol.species',
            isConcatSpreadable: 'Symbol.isConcatSpreadable', match: 'Symbol.match',
            replace: 'Symbol.replace', search: 'Symbol.search', split: 'Symbol.split',
          };
          if (propName && wellKnownSymbols[propName]) {
            return { __type: 'Symbol', description: wellKnownSymbols[propName], __wellKnown: propName };
          }
        }
        // Number constants
        if (objName === 'Number') {
          switch (propName) {
            case 'MAX_SAFE_INTEGER': return Number.MAX_SAFE_INTEGER;
            case 'MIN_SAFE_INTEGER': return Number.MIN_SAFE_INTEGER;
            case 'MAX_VALUE': return Number.MAX_VALUE;
            case 'MIN_VALUE': return Number.MIN_VALUE;
            case 'EPSILON': return Number.EPSILON;
            case 'POSITIVE_INFINITY': return Number.POSITIVE_INFINITY;
            case 'NEGATIVE_INFINITY': return Number.NEGATIVE_INFINITY;
            case 'NaN': return NaN;
          }
        }
      }
      const obj = evaluateExpression(node.object, ctx);
      // Optional chaining: obj?.prop returns undefined if obj is null/undefined
      if (node.optional && (obj === null || obj === undefined)) return undefined;
      // Private field access: this.#field → mangled key __private_#field
      let prop: any = node.property?.type === 'PrivateIdentifier'
        ? `__private_#${node.property.name}`
        : (node.computed ? evaluateExpression(node.property, ctx) : node.property.name);
      // Mangle Symbol keys for lookup
      if (prop && typeof prop === 'object' && prop.__type === 'Symbol') {
        prop = `__symbol_${prop.__wellKnown || prop.description}`;
      }
      if (obj && typeof obj === 'object' && (obj.__promiseId || obj.__isResolve || obj.__isReject)) {
        return undefined;
      }
      // Number instance properties
      if (typeof obj === 'number') {
        if (prop === 'toFixed') return (d: number) => obj.toFixed(d);
        if (prop === 'toString') return (r?: number) => obj.toString(r);
        if (prop === 'toPrecision') return (d: number) => obj.toPrecision(d);
        if (prop === 'toExponential') return (d?: number) => obj.toExponential(d);
      }
      if (typeof obj === 'string') {
        if (prop === 'length') return obj.length;
        if (typeof prop === 'number' || (typeof prop === 'string' && !isNaN(Number(prop)))) return obj[Number(prop)];
      }
      if (Array.isArray(obj)) {
        if (prop === 'length') return obj.length;
        if (typeof prop === 'number') return obj[prop];
      }
      // TypedArray property access
      if (typeof obj === 'object' && obj !== null && obj.__type === 'TypedArray') {
        if (prop === 'length') return obj.__length;
        if (prop === 'byteLength') {
          const bytesPerElement = obj.__arrayType.includes('8') ? 1 : obj.__arrayType.includes('16') ? 2 : obj.__arrayType.includes('32') || obj.__arrayType === 'Float32Array' ? 4 : 8;
          return obj.__length * bytesPerElement;
        }
        if (prop === 'BYTES_PER_ELEMENT') return obj.__arrayType.includes('8') ? 1 : obj.__arrayType.includes('16') ? 2 : obj.__arrayType.includes('32') || obj.__arrayType === 'Float32Array' ? 4 : 8;
        if (typeof prop === 'number' || (typeof prop === 'string' && !isNaN(Number(prop)))) {
          const idx = Number(prop);
          return idx >= 0 && idx < (obj.__data as number[]).length ? (obj.__data as number[])[idx] : undefined;
        }
      }
      // ArrayBuffer property access
      if (typeof obj === 'object' && obj !== null && obj.__type === 'ArrayBuffer') {
        if (prop === 'byteLength') return obj.__byteLength;
      }
      // DataView property access
      if (typeof obj === 'object' && obj !== null && obj.__type === 'DataView') {
        if (prop === 'byteLength') return obj.__buffer?.__byteLength || 0;
        if (prop === 'byteOffset') return obj.__byteOffset || 0;
        if (prop === 'buffer') return obj.__buffer;
      }
      if (typeof obj === 'object' && obj !== null) {
        // Proxy get trap
        if (obj.__type === 'Proxy' && !obj.__revoked) {
          const getTrap = obj.__handler?.get;
          if (getTrap && typeof getTrap === 'object' && (getTrap.type === 'FunctionExpression' || getTrap.type === 'ArrowFunctionExpression' || getTrap.type === 'FunctionDeclaration')) {
            return callFunction(getTrap, [obj.__target, String(prop), obj], 'Proxy.get', ctx, getNodeLine(node));
          }
          // No get trap, fall through to target
          return obj.__target?.[prop];
        }
        // Map/Set .size property
        if (prop === 'size' && (obj.__type === 'Map' || obj.__type === 'Set')) {
          return obj.__type === 'Map' ? obj.__mapSize : obj.__setSize;
        }
        // Date instance methods
        if (obj.__type === 'Date' && obj.__date) {
          const d = obj.__date as Date;
          switch (prop) {
            case 'getFullYear': return () => d.getFullYear();
            case 'getMonth': return () => d.getMonth();
            case 'getDate': return () => d.getDate();
            case 'getDay': return () => d.getDay();
            case 'getHours': return () => d.getHours();
            case 'getMinutes': return () => d.getMinutes();
            case 'getSeconds': return () => d.getSeconds();
            case 'getMilliseconds': return () => d.getMilliseconds();
            case 'getTime': return () => d.getTime();
            case 'toISOString': return () => d.toISOString();
            case 'toLocaleDateString': return () => d.toLocaleDateString();
            case 'toLocaleTimeString': return () => d.toLocaleTimeString();
            case 'toLocaleString': return () => d.toLocaleString();
            case 'toString': return () => d.toString();
            case 'toDateString': return () => d.toDateString();
            case 'toTimeString': return () => d.toTimeString();
            case 'valueOf': return () => d.valueOf();
            case 'setFullYear': return (y: number) => { d.setFullYear(y); return d.getTime(); };
            case 'setMonth': return (m: number) => { d.setMonth(m); return d.getTime(); };
            case 'setDate': return (day: number) => { d.setDate(day); return d.getTime(); };
          }
        }
        // RegExp instance properties
        if (obj instanceof RegExp) {
          switch (prop) {
            case 'source': return obj.source;
            case 'flags': return obj.flags;
            case 'global': return obj.global;
            case 'ignoreCase': return obj.ignoreCase;
            case 'multiline': return obj.multiline;
            case 'sticky': return obj.sticky;
            case 'unicode': return obj.unicode;
            case 'dotAll': return obj.dotAll;
            case 'lastIndex': return obj.lastIndex;
          }
        }
        // Symbol description
        if (obj.__type === 'Symbol' && prop === 'description') return obj.description;
        // Static class members
        if (obj.__statics && obj.__statics[prop] !== undefined) {
          return obj.__statics[prop];
        }
        // Getter support
        if (obj.__getters && obj.__getters[prop]) {
          return callFunction(obj.__getters[prop], [], `get ${prop}`, ctx, getNodeLine(node), obj);
        }
        // Setter marker (to detect in assignment)
        if (obj.__setters && obj.__setters[prop]) {
          return obj[prop]; // Return current value, setter handled in AssignmentExpression
        }
        return obj[prop];
      }
      // Boolean methods
      if (typeof obj === 'boolean') {
        if (prop === 'toString') return () => obj.toString();
        if (prop === 'valueOf') return () => obj.valueOf();
      }
      return undefined;
    }

    case 'CallExpression':
      return processCallExpression(node, ctx);

    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return node;

    case 'ClassExpression': {
      // Treat like ClassDeclaration but return the node as value
      const classNode = { ...node, type: 'ClassDeclaration' };
      if (node.superClass) {
        const parentName = node.superClass.name || node.superClass.id?.name;
        if (parentName) {
          const parentClass = ctx.functions.get(parentName) || ctx.variables.get(parentName);
          if (parentClass) classNode.__parentClass = parentClass;
        }
      }
      // Process static members
      const statics: Record<string, any> = {};
      if (node.body?.type === 'ClassBody') {
        for (const member of node.body.body || []) {
          if (member.static) {
            if (member.type === 'MethodDefinition' && member.key?.name && member.kind === 'method') {
              statics[member.key.name] = member.value;
            }
            if (member.type === 'PropertyDefinition' && member.key?.name) {
              statics[member.key.name] = member.value ? evaluateExpression(member.value, ctx) : undefined;
            }
          }
        }
      }
      if (Object.keys(statics).length > 0) classNode.__statics = statics;
      return classNode;
    }

    case 'AssignmentExpression': {
      // Handle destructuring assignment (ObjectPattern / ArrayPattern on LHS)
      if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') {
        const value = evaluateExpression(node.right, ctx);
        bindPattern(node.left, value, ctx);
        return value;
      }

      // Logical/nullish assignment operators — short-circuit BEFORE evaluating RHS
      if (node.operator === '&&=' || node.operator === '||=' || node.operator === '??=') {
        if (node.left.type === 'Identifier') {
          const name = node.left.name;
          if (ctx.constBindings.has(name)) {
            ctx.steps.push({ type: 'console', line: getNodeLine(node), data: { type: 'error', args: [`TypeError: Assignment to constant variable '${name}'.`] } });
            return ctx.variables.get(name);
          }
          const current = ctx.variables.get(name);
          if (node.operator === '&&=') { if (!current) return current; }
          else if (node.operator === '||=') { if (current) return current; }
          else if (node.operator === '??=') { if (current !== null && current !== undefined) return current; }
          const value = evaluateExpression(node.right, ctx);
          ctx.variables.set(name, value);
          return value;
        }
        return undefined;
      }

      let value = evaluateExpression(node.right, ctx);
      if (node.left.type === 'Identifier') {
        const name = node.left.name;
        // Const reassignment prevention
        if (ctx.constBindings.has(name)) {
          emitExplanation(ctx, getNodeLine(node), {
            title: 'TypeError: Assignment to Constant Variable',
            description: `Cannot reassign '${name}' because it was declared with const. const creates an immutable binding — the variable cannot be reassigned after initialization.`,
            specRef: 'ECMAScript §14.3.1 Let and Const Declarations',
            specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
            category: 'error',
          });
          ctx.steps.push({ type: 'console', line: getNodeLine(node), data: { type: 'error', args: [`TypeError: Assignment to constant variable '${name}'.`] } });
          return ctx.variables.get(name);
        }
        const current = ctx.variables.get(name);
        switch (node.operator) {
          case '=': break;
          case '+=': value = (typeof current === 'number' && typeof value === 'number') ? current + value : String(current ?? '') + String(value ?? ''); break;
          case '-=': value = (Number(current) || 0) - (Number(value) || 0); break;
          case '*=': value = (Number(current) || 0) * (Number(value) || 0); break;
          case '/=': value = (Number(current) || 0) / (Number(value) || 1); break;
          case '%=': value = (Number(current) || 0) % (Number(value) || 1); break;
          case '**=': value = Math.pow(Number(current) || 0, Number(value) || 0); break;
          case '&=': value = (Number(current) || 0) & (Number(value) || 0); break;
          case '|=': value = (Number(current) || 0) | (Number(value) || 0); break;
          case '^=': value = (Number(current) || 0) ^ (Number(value) || 0); break;
          case '<<=': value = (Number(current) || 0) << (Number(value) || 0); break;
          case '>>=': value = (Number(current) || 0) >> (Number(value) || 0); break;
          case '>>>=': value = (Number(current) || 0) >>> (Number(value) || 0); break;
          default: break;
        }
        ctx.variables.set(name, value);
      } else if (node.left.type === 'MemberExpression') {
        const obj = evaluateExpression(node.left.object, ctx);
        const prop = node.left.property?.type === 'PrivateIdentifier'
          ? `__private_#${node.left.property.name}`
          : (node.left.computed ? evaluateExpression(node.left.property, ctx) : node.left.property.name);
        if (typeof obj === 'object' && obj !== null) {
          // Proxy set trap
          if (obj.__type === 'Proxy' && !obj.__revoked) {
            const setTrap = obj.__handler?.set;
            if (setTrap && typeof setTrap === 'object' && (setTrap.type === 'FunctionExpression' || setTrap.type === 'ArrowFunctionExpression' || setTrap.type === 'FunctionDeclaration')) {
              callFunction(setTrap, [obj.__target, String(prop), value, obj], 'Proxy.set', ctx, getNodeLine(node));
            } else {
              obj.__target[prop] = value;
            }
          } else {
            // Read from __statics if the property is a static member
            const useStatics = obj.__statics && prop in obj.__statics;
            const current = useStatics ? obj.__statics[prop] : obj[prop];
            switch (node.operator) {
              case '=': break;
              case '+=': value = (typeof current === 'number' && typeof value === 'number') ? current + value : String(current ?? '') + String(value ?? ''); break;
              case '-=': value = (Number(current) || 0) - (Number(value) || 0); break;
              case '*=': value = (Number(current) || 0) * (Number(value) || 0); break;
              case '/=': value = (Number(current) || 0) / (Number(value) || 1); break;
              case '%=': value = (Number(current) || 0) % (Number(value) || 1); break;
              case '**=': value = Math.pow(Number(current) || 0, Number(value) || 0); break;
              default: break;
            }
            // Check for setter
            if (obj.__setters && obj.__setters[prop]) {
              callFunction(obj.__setters[prop], [value], `set ${prop}`, ctx, getNodeLine(node), obj);
            } else if (obj.__type === 'TypedArray' && (typeof prop === 'number' || (typeof prop === 'string' && !isNaN(Number(prop))))) {
              const idx = Number(prop);
              if (idx >= 0 && idx < (obj.__data as number[]).length) (obj.__data as number[])[idx] = Number(value);
            } else if (useStatics) {
              obj.__statics[prop] = value;
            } else {
              obj[prop] = value;
            }
          }
        }
      }
      return value;
    }

    case 'UpdateExpression': {
      if (node.argument.type === 'Identifier') {
        const name = node.argument.name;
        if (ctx.constBindings.has(name)) {
          ctx.steps.push({ type: 'console', line: getNodeLine(node), data: { type: 'error', args: [`TypeError: Assignment to constant variable '${name}'.`] } });
          return Number(ctx.variables.get(name)) || 0;
        }
        let current = Number(ctx.variables.get(name)) || 0;
        const newVal = node.operator === '++' ? current + 1 : current - 1;
        ctx.variables.set(name, newVal);
        return node.prefix ? newVal : current;
      } else if (node.argument.type === 'MemberExpression') {
        const obj = evaluateExpression(node.argument.object, ctx);
        const prop = node.argument.property?.type === 'PrivateIdentifier'
          ? `__private_#${node.argument.property.name}`
          : (node.argument.computed ? evaluateExpression(node.argument.property, ctx) : node.argument.property.name);
        if (typeof obj === 'object' && obj !== null) {
          // Read from __statics if the property is a static member
          const useStatics = obj.__statics && prop in obj.__statics;
          const current = Number(useStatics ? obj.__statics[prop] : obj[prop]) || 0;
          const newVal = node.operator === '++' ? current + 1 : current - 1;
          if (useStatics) {
            obj.__statics[prop] = newVal;
          } else {
            obj[prop] = newVal;
          }
          return node.prefix ? newVal : current;
        }
      }
      return 0;
    }

    case 'NewExpression':
      return processNewExpression(node, ctx);

    case 'AwaitExpression': {
      const val = evaluateExpression(node.argument, ctx);
      if (val && typeof val === 'object' && val.__promiseId) {
        const p = ctx.promises.get(val.__promiseId);
        if (p && p.state === 'resolved') return p.value;
      }
      return val;
    }

    case 'SequenceExpression': {
      let last: any;
      for (const expr of node.expressions) last = evaluateExpression(expr, ctx);
      return last;
    }

    case 'SpreadElement':
      return evaluateExpression(node.argument, ctx);

    case 'TaggedTemplateExpression':
      return evaluateExpression(node.quasi, ctx);

    case 'ThisExpression':
      return ctx.thisBinding;

    case 'ChainExpression':
      return evaluateExpression(node.expression, ctx);

    case 'YieldExpression':
      return undefined;

    default:
      return undefined;
  }
}

function processCallExpression(node: any, ctx: ExecutionContext): any {
  const callee = node.callee;
  const line = getNodeLine(node);

  // Handle super() call in constructors
  if (callee?.type === 'Super') {
    const parentClass = ctx.variables.get('__currentParentClass');
    if (parentClass && parentClass.type === 'ClassDeclaration') {
      const args = evaluateArguments(node.arguments, ctx);
      const thisObj = ctx.thisBinding;
      // Find parent constructor
      const pBody = parentClass.body;
      if (pBody?.type === 'ClassBody') {
        for (const member of pBody.body || []) {
          if (member.type === 'MethodDefinition' && member.kind === 'constructor' && member.value) {
            callFunction(member.value, args, `super`, ctx, line, thisObj);
            break;
          }
        }
      }
      return undefined;
    }
  }

  // Handle super.method() calls
  if (callee?.type === 'MemberExpression' && callee.object?.type === 'Super') {
    const parentClass = ctx.variables.get('__currentParentClass');
    if (parentClass && parentClass.type === 'ClassDeclaration') {
      const methodName = callee.property?.name;
      const args = evaluateArguments(node.arguments, ctx);
      const thisObj = ctx.thisBinding;
      // Search for method in parent class hierarchy
      let pc = parentClass;
      while (pc) {
        const pBody = pc.body;
        if (pBody?.type === 'ClassBody') {
          for (const member of pBody.body || []) {
            if (member.type === 'MethodDefinition' && member.kind === 'method' && member.key?.name === methodName && member.value) {
              return callFunction(member.value, args, `super.${methodName}`, ctx, line, thisObj);
            }
          }
        }
        pc = pc.__parentClass;
      }
    }
    return undefined;
  }

  if (callee?.type === 'MemberExpression') {
    const propName = callee.property?.type === 'PrivateIdentifier'
      ? `__private_#${callee.property.name}`
      : (callee.property?.name || callee.property?.value);
    const objNode = callee.object;

    if (propName === 'then' || propName === 'catch' || propName === 'finally') {
      const objValue = evaluateExpression(objNode, ctx);
      const promiseId = objValue?.__promiseId;
      if (promiseId) {
        const callback = node.arguments?.[0];
        ctx.steps.push({ type: 'highlight-line', line, data: { line } });
        // Emit explanation for promise chaining
        if (propName === 'then') {
          emitExplanation(ctx, line, {
            title: '.then() — Microtask Registration',
            description: 'The callback is registered to run when the promise resolves. It will be scheduled as a microtask. Microtasks run AFTER the current synchronous code but BEFORE the next macrotask (setTimeout, etc.).',
            specRef: 'ECMAScript \u00a727.2.5.4 Promise.prototype.then',
            specUrl: 'https://tc39.es/ecma262/#sec-promise.prototype.then',
            category: 'promise',
          });
        } else if (propName === 'catch') {
          emitExplanation(ctx, line, {
            title: '.catch() — Error Handler Registration',
            description: 'The callback is registered to run if the promise is rejected. Equivalent to .then(undefined, onRejected). If the promise is already rejected, the callback is scheduled as a microtask immediately.',
            specRef: 'ECMAScript \u00a727.2.5.1 Promise.prototype.catch',
            specUrl: 'https://tc39.es/ecma262/#sec-promise.prototype.catch',
            category: 'promise',
          });
        } else {
          emitExplanation(ctx, line, {
            title: '.finally() — Cleanup Handler',
            description: 'The callback runs regardless of whether the promise fulfilled or rejected. The resolved value or rejection reason passes through to the next handler in the chain.',
            specRef: 'ECMAScript \u00a727.2.5.3 Promise.prototype.finally',
            specUrl: 'https://tc39.es/ecma262/#sec-promise.prototype.finally',
            category: 'promise',
          });
        }
        let nextPromiseId: string;
        if (propName === 'then') {
          nextPromiseId = registerThenCallback(ctx, promiseId, callback, line);
        } else if (propName === 'catch') {
          nextPromiseId = registerCatchCallback(ctx, promiseId, callback, line);
        } else {
          nextPromiseId = registerFinallyCallback(ctx, promiseId, callback, line);
        }
        return { __promiseId: nextPromiseId };
      }
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'console') {
      if (['log', 'warn', 'error', 'info', 'debug'].includes(propName)) {
        const args = evaluateArguments(node.arguments, ctx);
        const formatted = args.map((a: any) => formatValue(a)).join(' ');
        ctx.steps.push({ type: 'highlight-line', line, data: { line } });
        ctx.steps.push({ type: 'console', line, data: { type: (propName === 'debug' ? 'log' : propName) as any, value: formatted } });
        return undefined;
      }
      if (propName === 'table' || propName === 'dir') {
        const args = evaluateArguments(node.arguments, ctx);
        const formatted = args.map((a: any) => formatValue(a)).join(' ');
        ctx.steps.push({ type: 'highlight-line', line, data: { line } });
        ctx.steps.push({ type: 'console', line, data: { type: 'log' as any, value: formatted } });
        return undefined;
      }
      if (propName === 'assert') {
        const args = evaluateArguments(node.arguments, ctx);
        if (!args[0]) {
          const msg = args.length > 1 ? args.slice(1).map((a: any) => formatValue(a)).join(' ') : 'Assertion failed';
          ctx.steps.push({ type: 'highlight-line', line, data: { line } });
          ctx.steps.push({ type: 'console', line, data: { type: 'error' as any, value: `Assertion failed: ${msg}` } });
        }
        return undefined;
      }
      // Silently handle other console methods
      if (['time', 'timeEnd', 'timeLog', 'count', 'countReset', 'group', 'groupEnd', 'groupCollapsed', 'clear', 'trace', 'profile', 'profileEnd'].includes(propName)) {
        return undefined;
      }
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'Promise') {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      if (propName === 'resolve') {
        const val = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
        if (val && typeof val === 'object' && val.__promiseId) return val;
        const promiseId = createPromise(ctx, 'resolved', val);
        return { __promiseId: promiseId };
      }
      if (propName === 'reject') {
        const err = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
        const promiseId = createPromise(ctx, 'rejected', undefined, err);
        return { __promiseId: promiseId };
      }
      if (propName === 'all' || propName === 'race' || propName === 'allSettled' || propName === 'any') {
        return processPromiseCombinator(propName, node.arguments?.[0], ctx, line);
      }
      if (propName === 'withResolvers') {
        const promiseId = createPromise(ctx);
        const resolveFunc = { __isResolve: true, promiseId };
        const rejectFunc = { __isReject: true, promiseId };
        emitExplanation(ctx, line, {
          title: 'Promise.withResolvers()',
          description: 'Returns an object with a new promise and its resolve/reject functions, allowing external control of the promise state without the executor callback pattern.',
          specRef: 'ECMAScript §27.2.4.8 Promise.withResolvers',
          specUrl: 'https://tc39.es/ecma262/#sec-promise.withResolvers',
          category: 'promise',
        });
        return { promise: { __promiseId: promiseId }, resolve: resolveFunc, reject: rejectFunc };
      }
      if (propName === 'try') {
        const callbackNode = node.arguments?.[0];
        if (callbackNode) {
          const cb = evaluateExpression(callbackNode, ctx);
          const extraArgs = node.arguments?.slice(1).map((a: any) => evaluateExpression(a, ctx)) || [];
          emitExplanation(ctx, line, {
            title: 'Promise.try()',
            description: 'Calls the callback synchronously and wraps its return value in a resolved promise, or wraps a thrown error in a rejected promise. Useful for starting a promise chain from a possibly-sync function.',
            specRef: 'ECMAScript §27.2.4.9 Promise.try',
            specUrl: 'https://tc39.es/ecma262/#sec-promise.try',
            category: 'promise',
          });
          try {
            let result: any;
            if (cb && typeof cb === 'object' && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression' || cb.type === 'FunctionDeclaration')) {
              result = callFunction(cb, extraArgs, 'Promise.try callback', ctx, line);
            } else {
              result = cb;
            }
            if (result && typeof result === 'object' && result.__promiseId) return result;
            const pId = createPromise(ctx, 'resolved', result);
            return { __promiseId: pId };
          } catch (e: any) {
            const pId = createPromise(ctx, 'rejected', undefined, e);
            return { __promiseId: pId };
          }
        }
        const pId = createPromise(ctx, 'resolved', undefined);
        return { __promiseId: pId };
      }
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'Math') {
      const args = evaluateArguments(node.arguments, ctx);
      switch (propName) {
        case 'floor': return Math.floor(args[0]);
        case 'ceil': return Math.ceil(args[0]);
        case 'round': return Math.round(args[0]);
        case 'random': return Math.random();
        case 'max': return Math.max(...args);
        case 'min': return Math.min(...args);
        case 'abs': return Math.abs(args[0]);
        case 'pow': return Math.pow(args[0], args[1]);
        case 'sqrt': return Math.sqrt(args[0]);
        case 'log': return Math.log(args[0]);
        case 'trunc': return Math.trunc(args[0]);
        case 'sign': return Math.sign(args[0]);
        case 'cbrt': return Math.cbrt(args[0]);
        case 'hypot': return Math.hypot(...args);
        case 'log2': return Math.log2(args[0]);
        case 'log10': return Math.log10(args[0]);
        case 'sin': return Math.sin(args[0]);
        case 'cos': return Math.cos(args[0]);
        case 'tan': return Math.tan(args[0]);
        case 'asin': return Math.asin(args[0]);
        case 'acos': return Math.acos(args[0]);
        case 'atan': return Math.atan(args[0]);
        case 'atan2': return Math.atan2(args[0], args[1]);
        case 'sinh': return Math.sinh(args[0]);
        case 'cosh': return Math.cosh(args[0]);
        case 'tanh': return Math.tanh(args[0]);
        case 'fround': return Math.fround(args[0]);
        case 'clz32': return Math.clz32(args[0]);
        case 'imul': return Math.imul(args[0], args[1]);
        case 'exp': return Math.exp(args[0]);
        case 'expm1': return Math.expm1(args[0]);
        case 'log1p': return Math.log1p(args[0]);
        default: return 0;
      }
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'JSON') {
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'stringify') { try { return JSON.stringify(args[0], args[1] as any, args[2]); } catch { return ''; } }
      if (propName === 'parse') { try { return JSON.parse(args[0]); } catch { return undefined; } }
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'Object') {
      // Object.groupBy — handle before evaluateArguments since 2nd arg is a callback
      if (propName === 'groupBy') {
        const iterableVal = evaluateExpression(node.arguments?.[0], ctx);
        const cbNode = node.arguments?.[1] ? resolveCallbackNode(node.arguments[1], ctx) : null;
        const items = Array.isArray(iterableVal) ? iterableVal : [];
        const result: Record<string, any[]> = {};
        for (let i = 0; i < items.length; i++) {
          let key: string;
          if (cbNode) key = String(executeCallback(cbNode, [items[i], i], ctx));
          else key = String(items[i]);
          if (!result[key]) result[key] = [];
          result[key].push(items[i]);
        }
        return result;
      }
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'keys') return typeof args[0] === 'object' && args[0] ? Object.keys(args[0]).filter(k => !k.startsWith('__')) : [];
      if (propName === 'values') return typeof args[0] === 'object' && args[0] ? Object.keys(args[0]).filter(k => !k.startsWith('__')).map(k => args[0][k]) : [];
      if (propName === 'entries') return typeof args[0] === 'object' && args[0] ? Object.keys(args[0]).filter(k => !k.startsWith('__')).map(k => [k, args[0][k]]) : [];
      if (propName === 'assign') return Object.assign({}, ...args);
      if (propName === 'freeze') return args[0];
      if (propName === 'fromEntries') {
        const result: Record<string, any> = {};
        if (Array.isArray(args[0])) {
          for (const entry of args[0]) {
            if (Array.isArray(entry) && entry.length >= 2) result[entry[0]] = entry[1];
          }
        }
        return result;
      }
      if (propName === 'is') return Object.is(args[0], args[1]);
      if (propName === 'hasOwn') return typeof args[0] === 'object' && args[0] !== null && Object.prototype.hasOwnProperty.call(args[0], args[1]);
      if (propName === 'create') {
        const obj: Record<string, any> = {};
        if (args[1] && typeof args[1] === 'object') {
          for (const [k, desc] of Object.entries(args[1])) {
            obj[k] = (desc as any)?.value;
          }
        }
        return obj;
      }
      if (propName === 'getPrototypeOf') return null;
      if (propName === 'getOwnPropertyNames') return typeof args[0] === 'object' && args[0] ? Object.keys(args[0]).filter(k => !k.startsWith('__')) : [];
      if (propName === 'defineProperty') {
        if (typeof args[0] === 'object' && args[0] !== null && args[2] && typeof args[2] === 'object') {
          if ('value' in args[2]) args[0][args[1]] = args[2].value;
        }
        return args[0];
      }
      if (propName === 'defineProperties') {
        if (typeof args[0] === 'object' && args[0] !== null && args[1] && typeof args[1] === 'object') {
          for (const [k, desc] of Object.entries(args[1])) {
            if ((desc as any)?.value !== undefined) args[0][k] = (desc as any).value;
          }
        }
        return args[0];
      }
      if (propName === 'getOwnPropertyDescriptor') {
        const obj = args[0]; const key = args[1];
        if (typeof obj === 'object' && obj !== null && key in obj) {
          return { value: obj[key], writable: true, enumerable: true, configurable: true };
        }
        return undefined;
      }
      if (propName === 'getOwnPropertyDescriptors') {
        const obj = args[0]; const result: Record<string, any> = {};
        if (typeof obj === 'object' && obj !== null) {
          for (const k of Object.keys(obj).filter(k => !k.startsWith('__'))) {
            result[k] = { value: obj[k], writable: true, enumerable: true, configurable: true };
          }
        }
        return result;
      }
      if (propName === 'isExtensible') return true;
      if (propName === 'isFrozen') return false;
      if (propName === 'isSealed') return false;
      if (propName === 'preventExtensions') return args[0];
      if (propName === 'seal') return args[0];
      if (propName === 'getOwnPropertySymbols') return [];
    }

    // Map.groupBy static method
    if (objNode?.type === 'Identifier' && objNode.name === 'Map' && propName === 'groupBy') {
      const iterableVal = evaluateExpression(node.arguments?.[0], ctx);
      const cbNode = node.arguments?.[1] ? resolveCallbackNode(node.arguments[1], ctx) : null;
      const items = Array.isArray(iterableVal) ? iterableVal : [];
      const entries: Array<[any, any[]]> = [];
      for (let i = 0; i < items.length; i++) {
        let key: any;
        if (cbNode) key = executeCallback(cbNode, [items[i], i], ctx);
        else key = items[i];
        const existing = entries.find(e => e[0] === key);
        if (existing) existing[1].push(items[i]);
        else entries.push([key, [items[i]]]);
      }
      return { __type: 'Map', __entries: entries, __mapSize: entries.length };
    }

    if (objNode?.type === 'Identifier' && objNode.name === 'Array') {
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'isArray') return Array.isArray(args[0]);
      if (propName === 'from') {
        try {
          const iterable = args[0];
          const mapFn = args[1];
          let arr: any[];
          if (typeof iterable === 'string') arr = iterable.split('');
          else if (iterable?.__type === 'Set') arr = [...(iterable.__values || [])];
          else if (iterable?.__type === 'Map') arr = [...(iterable.__entries || [])];
          else if (Array.isArray(iterable)) arr = [...iterable];
          else if (iterable && typeof iterable.length === 'number') arr = Array.from({ length: iterable.length }, (_, i) => iterable[i]);
          else arr = Array.from(iterable as any);
          if (mapFn && typeof mapFn === 'object' && (mapFn.type === 'ArrowFunctionExpression' || mapFn.type === 'FunctionExpression' || mapFn.type === 'FunctionDeclaration')) {
            return arr.map((item, i) => callFunction(mapFn, [item, i], 'Array.from callback', ctx, line));
          }
          return arr;
        } catch { return []; }
      }
      if (propName === 'of') return args;
    }

    // Number static methods
    if (objNode?.type === 'Identifier' && objNode.name === 'Number') {
      const args = evaluateArguments(node.arguments, ctx);
      switch (propName) {
        case 'isInteger': return Number.isInteger(args[0]);
        case 'isFinite': return Number.isFinite(args[0]);
        case 'isNaN': return Number.isNaN(args[0]);
        case 'isSafeInteger': return Number.isSafeInteger(args[0]);
        case 'parseInt': return parseInt(String(args[0]), args[1]);
        case 'parseFloat': return parseFloat(String(args[0]));
      }
    }

    // Date static methods
    if (objNode?.type === 'Identifier' && objNode.name === 'Date') {
      if (propName === 'now') return Date.now();
      if (propName === 'parse') {
        const args = evaluateArguments(node.arguments, ctx);
        return Date.parse(args[0]);
      }
      if (propName === 'UTC') {
        const args = evaluateArguments(node.arguments, ctx);
        return Date.UTC(...(args as [number, ...number[]]));
      }
    }

    // Symbol static methods
    if (objNode?.type === 'Identifier' && objNode.name === 'Symbol') {
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'for') {
        const key = String(args[0]);
        if (!globalSymbolRegistry.has(key)) {
          globalSymbolRegistry.set(key, { __type: 'Symbol', description: key, __symbolKey: key });
        }
        return globalSymbolRegistry.get(key);
      }
      if (propName === 'keyFor') {
        const sym = args[0];
        if (sym && sym.__type === 'Symbol' && sym.__symbolKey) return sym.__symbolKey;
        return undefined;
      }
    }

    // Reflect API
    if (objNode?.type === 'Identifier' && objNode.name === 'Reflect') {
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'get') {
        const target = args[0]; const key = args[1];
        return typeof target === 'object' && target !== null ? target[key] : undefined;
      }
      if (propName === 'set') {
        const target = args[0]; const key = args[1]; const val = args[2];
        if (typeof target === 'object' && target !== null) { target[key] = val; return true; }
        return false;
      }
      if (propName === 'has') return typeof args[0] === 'object' && args[0] !== null && args[1] in args[0];
      if (propName === 'deleteProperty') {
        if (typeof args[0] === 'object' && args[0] !== null) { delete args[0][args[1]]; return true; }
        return false;
      }
      if (propName === 'ownKeys') {
        return typeof args[0] === 'object' && args[0] !== null
          ? Object.keys(args[0]).filter(k => !k.startsWith('__')) : [];
      }
      if (propName === 'apply') {
        const fn = args[0]; const thisArg = args[1]; const fnArgs = args[2] || [];
        if (fn && typeof fn === 'object' && (fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression' || fn.type === 'FunctionDeclaration')) {
          return callFunction(fn, fnArgs, 'Reflect.apply', ctx, getNodeLine(node), thisArg);
        }
        return undefined;
      }
      if (propName === 'construct') return undefined; // Simplified
      if (propName === 'defineProperty') return true;
      if (propName === 'getOwnPropertyDescriptor') {
        const target = args[0]; const key = args[1];
        if (typeof target === 'object' && target !== null && key in target) {
          return { value: target[key], writable: true, enumerable: true, configurable: true };
        }
        return undefined;
      }
      if (propName === 'getPrototypeOf') return null;
      if (propName === 'setPrototypeOf') return true;
      if (propName === 'isExtensible') return true;
      if (propName === 'preventExtensions') return true;
    }

    // Proxy.revocable static method
    if (objNode?.type === 'Identifier' && objNode.name === 'Proxy' && propName === 'revocable') {
      const target = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : {};
      const handler = node.arguments?.[1] ? evaluateExpression(node.arguments[1], ctx) : {};
      const proxy = { __type: 'Proxy', __target: target, __handler: handler, __revoked: false };
      const revoke = { __type: 'RevokeFunction', __proxy: proxy };
      return { proxy, revoke };
    }

    // String static methods
    if (objNode?.type === 'Identifier' && objNode.name === 'String') {
      const args = evaluateArguments(node.arguments, ctx);
      if (propName === 'fromCharCode') return String.fromCharCode(...args);
      if (propName === 'fromCodePoint') return String.fromCodePoint(...args);
      if (propName === 'raw') {
        // Simplified: just handle the template strings array
        if (args[0] && Array.isArray(args[0]?.raw || args[0])) {
          return (args[0].raw || args[0]).join('');
        }
        return String(args[0]);
      }
    }

    const objValue = evaluateExpression(objNode, ctx);

    if (Array.isArray(objValue)) {
      return processArrayMethod(objValue, propName, node.arguments || [], ctx, line);
    }

    if (typeof objValue === 'string') {
      return processStringMethod(objValue, propName, node.arguments || [], ctx);
    }

    // Number instance method calls
    if (typeof objValue === 'number') {
      const methodArgs = evaluateArguments(node.arguments, ctx);
      if (propName === 'toFixed') return objValue.toFixed(methodArgs[0]);
      if (propName === 'toString') return objValue.toString(methodArgs[0]);
      if (propName === 'toPrecision') return objValue.toPrecision(methodArgs[0]);
      if (propName === 'toExponential') return objValue.toExponential(methodArgs[0]);
      if (propName === 'valueOf') return objValue;
    }

    if (typeof objValue === 'object' && objValue !== null) {
      // Phase 5B: Map method calls
      if (objValue.__type === 'Map') {
        const entries = objValue.__entries as Array<[any, any]>;
        const methodArgs = evaluateArguments(node.arguments, ctx);
        switch (propName) {
          case 'set': {
            const key = methodArgs[0];
            const val = methodArgs[1];
            const idx = entries.findIndex(e => e[0] === key);
            if (idx >= 0) entries[idx] = [key, val];
            else { entries.push([key, val]); objValue.__mapSize++; }
            return objValue; // Map.set returns the Map
          }
          case 'get': return entries.find(e => e[0] === methodArgs[0])?.[1];
          case 'has': return entries.some(e => e[0] === methodArgs[0]);
          case 'delete': {
            const idx = entries.findIndex(e => e[0] === methodArgs[0]);
            if (idx >= 0) { entries.splice(idx, 1); objValue.__mapSize--; return true; }
            return false;
          }
          case 'clear': entries.length = 0; objValue.__mapSize = 0; return undefined;
          case 'keys': return entries.map(e => e[0]);
          case 'values': return entries.map(e => e[1]);
          case 'entries': return entries.map(e => [...e]);
          case 'forEach': {
            const cb = methodArgs[0];
            if (cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression')) {
              for (const [k, v] of entries) {
                executeCallback(cb, [v, k, objValue], ctx);
              }
            }
            return undefined;
          }
          default: break;
        }
        if (propName === 'size') return objValue.__mapSize;
      }
      // Phase 5B: Set method calls
      if (objValue.__type === 'Set') {
        const values = objValue.__values as any[];
        const methodArgs = evaluateArguments(node.arguments, ctx);
        switch (propName) {
          case 'add': {
            if (!values.includes(methodArgs[0])) { values.push(methodArgs[0]); objValue.__setSize++; }
            return objValue;
          }
          case 'has': return values.includes(methodArgs[0]);
          case 'delete': {
            const idx = values.indexOf(methodArgs[0]);
            if (idx >= 0) { values.splice(idx, 1); objValue.__setSize--; return true; }
            return false;
          }
          case 'clear': values.length = 0; objValue.__setSize = 0; return undefined;
          case 'keys': case 'values': return [...values];
          case 'entries': return values.map(v => [v, v]);
          case 'forEach': {
            const cb = methodArgs[0];
            if (cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression')) {
              for (const v of values) {
                executeCallback(cb, [v, v, objValue], ctx);
              }
            }
            return undefined;
          }
          default: break;
        }
        if (propName === 'size') return objValue.__setSize;
        // ES2025 Set operations
        if (propName === 'union' || propName === 'intersection' || propName === 'difference' || propName === 'symmetricDifference' || propName === 'isSubsetOf' || propName === 'isSupersetOf' || propName === 'isDisjointFrom') {
          const otherArg = methodArgs[0];
          const otherValues: any[] = otherArg?.__type === 'Set' ? otherArg.__values : (Array.isArray(otherArg) ? otherArg : []);
          if (propName === 'union') {
            const combined = [...values];
            for (const v of otherValues) { if (!combined.includes(v)) combined.push(v); }
            return { __type: 'Set', __values: combined, __setSize: combined.length };
          }
          if (propName === 'intersection') {
            const shared = values.filter((v: any) => otherValues.includes(v));
            return { __type: 'Set', __values: shared, __setSize: shared.length };
          }
          if (propName === 'difference') {
            const diff = values.filter((v: any) => !otherValues.includes(v));
            return { __type: 'Set', __values: diff, __setSize: diff.length };
          }
          if (propName === 'symmetricDifference') {
            const symDiff = [
              ...values.filter((v: any) => !otherValues.includes(v)),
              ...otherValues.filter((v: any) => !values.includes(v)),
            ];
            return { __type: 'Set', __values: symDiff, __setSize: symDiff.length };
          }
          if (propName === 'isSubsetOf') return values.every((v: any) => otherValues.includes(v));
          if (propName === 'isSupersetOf') return otherValues.every((v: any) => values.includes(v));
          if (propName === 'isDisjointFrom') return !values.some((v: any) => otherValues.includes(v));
        }
      }

      // WeakMap method calls
      if (objValue?.__type === 'WeakMap') {
        const entries = objValue.__entries as Array<[any, any]>;
        const methodArgs = evaluateArguments(node.arguments, ctx);
        if (propName === 'set') {
          const key = methodArgs[0]; const val = methodArgs[1];
          const idx = entries.findIndex(e => e[0] === key);
          if (idx >= 0) entries[idx] = [key, val];
          else { entries.push([key, val]); objValue.__weakMapSize++; }
          return objValue;
        }
        if (propName === 'get') return entries.find(e => e[0] === methodArgs[0])?.[1];
        if (propName === 'has') return entries.some(e => e[0] === methodArgs[0]);
        if (propName === 'delete') {
          const idx = entries.findIndex(e => e[0] === methodArgs[0]);
          if (idx >= 0) { entries.splice(idx, 1); objValue.__weakMapSize--; return true; }
          return false;
        }
      }

      // WeakSet method calls
      if (objValue?.__type === 'WeakSet') {
        const wsValues = objValue.__values as any[];
        const methodArgs = evaluateArguments(node.arguments, ctx);
        if (propName === 'add') {
          if (!wsValues.includes(methodArgs[0])) { wsValues.push(methodArgs[0]); objValue.__weakSetSize++; }
          return objValue;
        }
        if (propName === 'has') return wsValues.includes(methodArgs[0]);
        if (propName === 'delete') {
          const idx = wsValues.indexOf(methodArgs[0]);
          if (idx >= 0) { wsValues.splice(idx, 1); objValue.__weakSetSize--; return true; }
          return false;
        }
      }

      // Intl.NumberFormat methods
      if (objValue?.__type === 'Intl.NumberFormat') {
        if (propName === 'format') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          const num = Number(methodArgs[0]);
          try {
            return new Intl.NumberFormat(objValue.__locale, objValue.__options).format(num);
          } catch { return String(num); }
        }
        if (propName === 'formatToParts') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          const num = Number(methodArgs[0]);
          try {
            return new Intl.NumberFormat(objValue.__locale, objValue.__options).formatToParts(num);
          } catch { return [{ type: 'integer', value: String(num) }]; }
        }
        if (propName === 'resolvedOptions') {
          try {
            return new Intl.NumberFormat(objValue.__locale, objValue.__options).resolvedOptions();
          } catch { return { locale: objValue.__locale }; }
        }
      }

      // Intl.DateTimeFormat methods
      if (objValue?.__type === 'Intl.DateTimeFormat') {
        if (propName === 'format') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          const dateVal = methodArgs[0];
          const date = dateVal?.__type === 'Date' && dateVal.__date ? dateVal.__date : new Date();
          try {
            return new Intl.DateTimeFormat(objValue.__locale, objValue.__options).format(date);
          } catch { return date.toString(); }
        }
        if (propName === 'resolvedOptions') {
          try {
            return new Intl.DateTimeFormat(objValue.__locale, objValue.__options).resolvedOptions();
          } catch { return { locale: objValue.__locale }; }
        }
      }

      // Intl.Collator methods
      if (objValue?.__type === 'Intl.Collator') {
        if (propName === 'compare') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          try {
            return new Intl.Collator(objValue.__locale, objValue.__options).compare(String(methodArgs[0]), String(methodArgs[1]));
          } catch { return String(methodArgs[0]).localeCompare(String(methodArgs[1])); }
        }
      }

      // TypedArray methods
      if (objValue?.__type === 'TypedArray') {
        const tData = objValue.__data as number[];
        const methodArgs = evaluateArguments(node.arguments, ctx);
        if (propName === 'length') return tData.length;
        if (propName === 'set') {
          const srcArr = Array.isArray(methodArgs[0]) ? methodArgs[0] : (methodArgs[0]?.__data || []);
          const offset = methodArgs[1] || 0;
          for (let i = 0; i < srcArr.length && (offset + i) < tData.length; i++) {
            tData[offset + i] = Number(srcArr[i]);
          }
          return undefined;
        }
        if (propName === 'subarray') {
          const begin = methodArgs[0] || 0;
          const end = methodArgs[1] !== undefined ? methodArgs[1] : tData.length;
          return { __type: 'TypedArray', __arrayType: objValue.__arrayType, __data: tData.slice(begin, end), __length: end - begin };
        }
        if (propName === 'slice') {
          const begin = methodArgs[0] || 0;
          const end = methodArgs[1] !== undefined ? methodArgs[1] : tData.length;
          return { __type: 'TypedArray', __arrayType: objValue.__arrayType, __data: tData.slice(begin, end), __length: Math.max(0, end - begin) };
        }
        if (propName === 'fill') {
          const val = Number(methodArgs[0] ?? 0);
          const start = methodArgs[1] || 0;
          const end = methodArgs[2] !== undefined ? methodArgs[2] : tData.length;
          for (let i = start; i < end && i < tData.length; i++) tData[i] = val;
          return objValue;
        }
        if (propName === 'indexOf') return tData.indexOf(Number(methodArgs[0]));
        if (propName === 'includes') return tData.includes(Number(methodArgs[0]));
        if (propName === 'find') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (cb) return tData.find((v, i) => executeCallback(cb, [v, i, tData], ctx));
          return undefined;
        }
        if (propName === 'findIndex') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (cb) return tData.findIndex((v, i) => executeCallback(cb, [v, i, tData], ctx));
          return -1;
        }
        if (propName === 'at') return methodArgs[0] < 0 ? tData[tData.length + methodArgs[0]] : tData[methodArgs[0]];
        if (propName === 'reverse') { tData.reverse(); return objValue; }
        if (propName === 'sort') {
          const cb = node.arguments?.[0] ? resolveCallbackNode(node.arguments[0], ctx) : null;
          if (cb) { tData.sort((a, b) => executeCallback(cb, [a, b], ctx)); }
          else { tData.sort((a, b) => a - b); }
          return objValue;
        }
        if (propName === 'join') return tData.join(methodArgs[0] !== undefined ? String(methodArgs[0]) : ',');
        if (propName === 'map') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          const mapped = cb ? tData.map((v, i) => executeCallback(cb, [v, i, tData], ctx)) : [...tData];
          return { __type: 'TypedArray', __arrayType: objValue.__arrayType, __data: mapped, __length: mapped.length };
        }
        if (propName === 'filter') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          const filtered = cb ? tData.filter((v, i) => executeCallback(cb, [v, i, tData], ctx)) : [...tData];
          return { __type: 'TypedArray', __arrayType: objValue.__arrayType, __data: filtered, __length: filtered.length };
        }
        if (propName === 'reduce') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (!cb) return undefined;
          let acc = methodArgs.length > 1 ? methodArgs[1] : tData[0];
          const startIdx = methodArgs.length > 1 ? 0 : 1;
          for (let i = startIdx; i < tData.length; i++) acc = executeCallback(cb, [acc, tData[i], i, tData], ctx);
          return acc;
        }
        if (propName === 'forEach') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (cb) tData.forEach((v, i) => executeCallback(cb, [v, i, tData], ctx));
          return undefined;
        }
        if (propName === 'every') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (cb) return tData.every((v, i) => executeCallback(cb, [v, i, tData], ctx));
          return true;
        }
        if (propName === 'some') {
          const cb = resolveCallbackNode(node.arguments?.[0], ctx);
          if (cb) return tData.some((v, i) => executeCallback(cb, [v, i, tData], ctx));
          return false;
        }
        if (propName === 'toString') return tData.join(',');
        if (propName === 'values') return tData;
        if (propName === 'keys') return Array.from({ length: tData.length }, (_, i) => i);
        if (propName === 'entries') return tData.map((v, i) => [i, v]);
        if (propName === 'copyWithin') {
          const target = methodArgs[0] || 0;
          const start = methodArgs[1] || 0;
          const end = methodArgs[2] !== undefined ? methodArgs[2] : tData.length;
          const copy = tData.slice(start, end);
          for (let i = 0; i < copy.length && (target + i) < tData.length; i++) tData[target + i] = copy[i];
          return objValue;
        }
        if (propName === 'byteLength') return tData.length * (objValue.__arrayType.includes('8') ? 1 : objValue.__arrayType.includes('16') ? 2 : objValue.__arrayType.includes('32') || objValue.__arrayType === 'Float32Array' ? 4 : 8);
        if (propName === 'buffer') return { __type: 'ArrayBuffer', __byteLength: tData.length, __data: [...tData] };
      }

      // DataView methods
      if (objValue?.__type === 'DataView') {
        const buf = objValue.__buffer;
        const bufData = buf?.__data as number[] || [];
        const baseOffset = objValue.__byteOffset || 0;
        const methodArgs = evaluateArguments(node.arguments, ctx);
        const offset = (methodArgs[0] || 0) + baseOffset;
        if (propName === 'getInt8') return offset < bufData.length ? ((bufData[offset] & 0xFF) > 127 ? (bufData[offset] & 0xFF) - 256 : bufData[offset] & 0xFF) : 0;
        if (propName === 'getUint8') return offset < bufData.length ? bufData[offset] & 0xFF : 0;
        if (propName === 'getInt16') return offset + 1 < bufData.length ? (bufData[offset] << 8) | bufData[offset + 1] : 0;
        if (propName === 'getUint16') return offset + 1 < bufData.length ? ((bufData[offset] << 8) | bufData[offset + 1]) & 0xFFFF : 0;
        if (propName === 'getInt32') return offset + 3 < bufData.length ? (bufData[offset] << 24) | (bufData[offset+1] << 16) | (bufData[offset+2] << 8) | bufData[offset+3] : 0;
        if (propName === 'getUint32') return offset + 3 < bufData.length ? ((bufData[offset] << 24) | (bufData[offset+1] << 16) | (bufData[offset+2] << 8) | bufData[offset+3]) >>> 0 : 0;
        if (propName === 'getFloat32' || propName === 'getFloat64') return 0; // Simplified
        if (propName === 'setInt8' || propName === 'setUint8') { if (offset < bufData.length) bufData[offset] = Number(methodArgs[1]) & 0xFF; return undefined; }
        if (propName === 'setInt16' || propName === 'setUint16') {
          const val = Number(methodArgs[1]);
          if (offset + 1 < bufData.length) { bufData[offset] = (val >> 8) & 0xFF; bufData[offset + 1] = val & 0xFF; }
          return undefined;
        }
        if (propName === 'setInt32' || propName === 'setUint32') {
          const val = Number(methodArgs[1]);
          if (offset + 3 < bufData.length) { bufData[offset] = (val >> 24) & 0xFF; bufData[offset+1] = (val >> 16) & 0xFF; bufData[offset+2] = (val >> 8) & 0xFF; bufData[offset+3] = val & 0xFF; }
          return undefined;
        }
        if (propName === 'byteLength') return buf?.__byteLength || 0;
        if (propName === 'byteOffset') return baseOffset;
        if (propName === 'buffer') return buf;
      }

      // Generator .next(), .return(), .throw() + Iterator Helpers
      if (objValue?.__type === 'Generator') {
        if (propName === 'next') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          return callGeneratorNext(objValue, methodArgs[0], ctx);
        }
        if (propName === 'return') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          objValue.__state = 'completed';
          return { value: methodArgs[0], done: true };
        }
        if (propName === 'throw') {
          objValue.__state = 'completed';
          return { value: undefined, done: true };
        }
        // Iterator Helpers (ES2025) — collect all values eagerly for visualization
        if (propName === 'map' || propName === 'filter' || propName === 'take' || propName === 'drop' || propName === 'toArray' || propName === 'forEach' || propName === 'reduce' || propName === 'find' || propName === 'some' || propName === 'every') {
          // Collect all values from the generator
          const allValues: any[] = [];
          for (let i = 0; i < 1000; i++) {
            const r = callGeneratorNext(objValue, undefined, ctx);
            if (r.done) break;
            allValues.push(r.value);
          }
          const cbNode = node.arguments?.[0] ? resolveCallbackNode(node.arguments[0], ctx) : null;
          if (propName === 'toArray') return allValues;
          if (propName === 'forEach') {
            if (cbNode) allValues.forEach((v, i) => executeCallback(cbNode, [v, i], ctx));
            return undefined;
          }
          if (propName === 'find') {
            if (cbNode) return allValues.find((v, i) => executeCallback(cbNode, [v, i], ctx));
            return undefined;
          }
          if (propName === 'some') {
            if (cbNode) return allValues.some((v, i) => executeCallback(cbNode, [v, i], ctx));
            return false;
          }
          if (propName === 'every') {
            if (cbNode) return allValues.every((v, i) => executeCallback(cbNode, [v, i], ctx));
            return true;
          }
          if (propName === 'reduce') {
            const initArg = node.arguments?.[1] ? evaluateExpression(node.arguments[1], ctx) : undefined;
            if (cbNode) {
              let acc = initArg !== undefined ? initArg : allValues[0];
              const startIdx = initArg !== undefined ? 0 : 1;
              for (let i = startIdx; i < allValues.length; i++) {
                acc = executeCallback(cbNode, [acc, allValues[i], i], ctx);
              }
              return acc;
            }
            return initArg;
          }
          // map, filter, take, drop — return new generators (simulated as eager arrays wrapped in generator)
          let resultValues: any[];
          if (propName === 'map') {
            resultValues = cbNode ? allValues.map((v, i) => executeCallback(cbNode, [v, i], ctx)) : allValues;
          } else if (propName === 'filter') {
            resultValues = cbNode ? allValues.filter((v, i) => executeCallback(cbNode, [v, i], ctx)) : allValues;
          } else if (propName === 'take') {
            const n = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : 0;
            resultValues = allValues.slice(0, n);
          } else if (propName === 'drop') {
            const n = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : 0;
            resultValues = allValues.slice(n);
          } else {
            resultValues = allValues;
          }
          // Return a new "generator-like" object with pre-collected values
          return {
            __type: 'Generator',
            __yieldValues: resultValues,
            __yieldIndex: 0,
            __state: resultValues.length > 0 ? 'suspended-yield' : 'completed',
            __funcNode: null,
            __savedVars: new Map(),
            toArray: () => resultValues,
            // Allow chaining by having these methods resolve on next call
          };
        }
      }

      // AsyncGenerator .next() — returns Promise wrapping {value, done}
      if (objValue?.__type === 'AsyncGenerator') {
        if (propName === 'next') {
          // First call: pre-collect all yield values (same as sync generators)
          if (objValue.__state === 'suspended-start') {
            objValue.__yieldValues = [];
            objValue.__returnValue = undefined;
            objValue.__yieldIndex = 0;
            const funcNode = objValue.__funcNode;
            const savedVars = objValue.__savedVars || new Map(ctx.variables);
            const prevVars = new Map(ctx.variables);
            for (const [k, v] of savedVars) ctx.variables.set(k, v);
            const savedSteps = ctx.steps;
            const savedStepLimit = ctx.stepLimit;
            const savedHasReturned = ctx.hasReturned;
            const savedConstBindings = new Set(ctx.constBindings);
            ctx.steps = [];
            ctx.stepLimit = 100000;
            collectYields(funcNode.body, ctx, objValue.__yieldValues, objValue);
            ctx.steps = savedSteps;
            ctx.stepLimit = savedStepLimit;
            ctx.hasReturned = savedHasReturned;
            ctx.constBindings = savedConstBindings;
            for (const [k, v] of prevVars) ctx.variables.set(k, v);
            objValue.__state = 'suspended-yield';
          }
          // Return next value wrapped in a resolved promise
          if (objValue.__yieldIndex < objValue.__yieldValues.length) {
            const val = objValue.__yieldValues[objValue.__yieldIndex++];
            const pId = createPromise(ctx, 'resolved', { value: val, done: false });
            return { __promiseId: pId, __asyncIterResult: { value: val, done: false } };
          }
          objValue.__state = 'completed';
          const pId = createPromise(ctx, 'resolved', { value: objValue.__returnValue, done: true });
          return { __promiseId: pId, __asyncIterResult: { value: objValue.__returnValue, done: true } };
        }
        if (propName === 'return') {
          objValue.__state = 'completed';
          const pId = createPromise(ctx, 'resolved', { value: undefined, done: true });
          return { __promiseId: pId, __asyncIterResult: { value: undefined, done: true } };
        }
      }

      if (objValue.__isFetchResponse) {
        if (propName === 'json') {
          const dataPromiseId = createPromise(ctx, 'resolved', objValue.__data || { data: 'simulated' });
          return { __promiseId: dataPromiseId };
        }
        if (propName === 'text') {
          const textPromiseId = createPromise(ctx, 'resolved', 'simulated response');
          return { __promiseId: textPromiseId };
        }
      }
      // RegExp instance methods
      if (objValue instanceof RegExp) {
        const methodArgs = evaluateArguments(node.arguments, ctx);
        if (propName === 'test') return objValue.test(String(methodArgs[0]));
        if (propName === 'exec') return objValue.exec(String(methodArgs[0]));
        if (propName === 'toString') return objValue.toString();
      }

      // Date instance method calls (when accessed directly, not via MemberExpression return)
      if (objValue?.__type === 'Date' && objValue.__date) {
        const d = objValue.__date as Date;
        const methodArgs = evaluateArguments(node.arguments, ctx);
        switch (propName) {
          case 'getFullYear': return d.getFullYear();
          case 'getMonth': return d.getMonth();
          case 'getDate': return d.getDate();
          case 'getDay': return d.getDay();
          case 'getHours': return d.getHours();
          case 'getMinutes': return d.getMinutes();
          case 'getSeconds': return d.getSeconds();
          case 'getMilliseconds': return d.getMilliseconds();
          case 'getTime': return d.getTime();
          case 'toISOString': return d.toISOString();
          case 'toLocaleDateString': return d.toLocaleDateString();
          case 'toLocaleTimeString': return d.toLocaleTimeString();
          case 'toLocaleString': return d.toLocaleString();
          case 'toString': return d.toString();
          case 'toDateString': return d.toDateString();
          case 'toTimeString': return d.toTimeString();
          case 'valueOf': return d.valueOf();
          case 'setFullYear': d.setFullYear(methodArgs[0]); return d.getTime();
          case 'setMonth': d.setMonth(methodArgs[0]); return d.getTime();
          case 'setDate': d.setDate(methodArgs[0]); return d.getTime();
          case 'setHours': d.setHours(methodArgs[0]); return d.getTime();
          case 'setMinutes': d.setMinutes(methodArgs[0]); return d.getTime();
          case 'setSeconds': d.setSeconds(methodArgs[0]); return d.getTime();
        }
      }

      // Generic object methods (hasOwnProperty, toString, valueOf, etc.)
      if (typeof objValue === 'object' && objValue !== null) {
        if (propName === 'hasOwnProperty') {
          const methodArgs = evaluateArguments(node.arguments, ctx);
          return Object.prototype.hasOwnProperty.call(objValue, methodArgs[0]);
        }
        if (propName === 'toString') return String(objValue);
        if (propName === 'valueOf') return objValue;
        if (propName === 'toJSON') {
          try { return JSON.parse(JSON.stringify(objValue)); } catch { return objValue; }
        }
      }

      // Handle .call(), .apply(), .bind() on functions
      if ((propName === 'call' || propName === 'apply' || propName === 'bind') &&
          typeof objValue === 'object' && objValue !== null &&
          (objValue.type === 'ArrowFunctionExpression' || objValue.type === 'FunctionExpression' || objValue.type === 'FunctionDeclaration')) {
        const rawArgs = evaluateArguments(node.arguments, ctx);
        if (propName === 'call') {
          const thisArg = rawArgs[0];
          const callArgs = rawArgs.slice(1);
          ctx.steps.push({ type: 'highlight-line', line, data: { line } });
          return callFunction(objValue, callArgs, objValue.id?.name || 'anonymous', ctx, line, thisArg);
        }
        if (propName === 'apply') {
          const thisArg = rawArgs[0];
          const callArgs = Array.isArray(rawArgs[1]) ? rawArgs[1] : [];
          ctx.steps.push({ type: 'highlight-line', line, data: { line } });
          return callFunction(objValue, callArgs, objValue.id?.name || 'anonymous', ctx, line, thisArg);
        }
        if (propName === 'bind') {
          // Return a copy of the function with bound this
          return { ...objValue, __boundThis: rawArgs[0] };
        }
      }

      // Look up method on the object itself, or in __statics for class static methods
      const method = objValue[propName] || (objValue.__statics && objValue.__statics[propName]);
      if (method && (method.type === 'ArrowFunctionExpression' || method.type === 'FunctionExpression' || method.type === 'FunctionDeclaration')) {
        const args = evaluateArguments(node.arguments, ctx);
        // For class methods, set the parent-class context so `super.method()` resolves correctly.
        // The home class is the class that originally defined this method (not necessarily the
        // class of the instance, since methods can be inherited or overridden).
        const homeClass = method.__homeClass;
        if (homeClass) {
          const savedHomeClass = ctx.variables.has('__currentMethodHomeClass') ? ctx.variables.get('__currentMethodHomeClass') : Symbol();
          const savedParentClass = ctx.variables.has('__currentParentClass') ? ctx.variables.get('__currentParentClass') : Symbol();
          ctx.variables.set('__currentMethodHomeClass', homeClass);
          if (homeClass.__parentClass) {
            ctx.variables.set('__currentParentClass', homeClass.__parentClass);
          } else {
            ctx.variables.delete('__currentParentClass');
          }
          try {
            return callFunction(method, args, propName, ctx, line, objValue);
          } finally {
            if (typeof savedHomeClass === 'symbol') ctx.variables.delete('__currentMethodHomeClass');
            else ctx.variables.set('__currentMethodHomeClass', savedHomeClass);
            if (typeof savedParentClass === 'symbol') ctx.variables.delete('__currentParentClass');
            else ctx.variables.set('__currentParentClass', savedParentClass);
          }
        }
        // Phase 1C: Pass the object as thisValue for method calls
        return callFunction(method, args, propName, ctx, line, objValue);
      }
    }

    return undefined;
  }

  if (callee?.type === 'Identifier') {
    const name = callee.name;

    if (name === 'setTimeout') return processSetTimeout(node, ctx, line);
    if (name === 'setInterval') return processSetInterval(node, ctx, line);
    if (name === 'clearTimeout' || name === 'clearInterval') return undefined;
    if (name === 'queueMicrotask') return processQueueMicrotask(node, ctx, line);
    if (name === 'requestAnimationFrame') return processRAF(node, ctx, line);
    if (name === 'requestIdleCallback') return processRIC(node, ctx, line);
    if (name === 'fetch') return processFetch(node, ctx, line);

    if (name === 'parseInt') {
      const args = evaluateArguments(node.arguments, ctx);
      return parseInt(String(args[0]), args[1]);
    }
    if (name === 'parseFloat') return parseFloat(String(evaluateExpression(node.arguments?.[0], ctx)));
    if (name === 'isNaN') return isNaN(evaluateExpression(node.arguments?.[0], ctx));
    if (name === 'isFinite') return isFinite(evaluateExpression(node.arguments?.[0], ctx));
    if (name === 'String') {
      const sv = evaluateExpression(node.arguments?.[0], ctx);
      if (typeof sv === 'object' && sv !== null && sv.__type === 'BigInt') return sv.__value;
      return String(sv ?? '');
    }
    if (name === 'Number') {
      const nv = evaluateExpression(node.arguments?.[0], ctx);
      if (typeof nv === 'object' && nv !== null && nv.__type === 'BigInt') return Number(BigInt(nv.__value));
      return Number(nv);
    }
    if (name === 'Boolean') {
      const bv = evaluateExpression(node.arguments?.[0], ctx);
      if (typeof bv === 'object' && bv !== null && bv.__type === 'BigInt') return bv.__value !== '0';
      return Boolean(bv);
    }
    if (name === 'Symbol') {
      const desc = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
      return { __type: 'Symbol', description: desc !== undefined ? String(desc) : undefined };
    }
    if (name === 'BigInt') {
      const val = evaluateExpression(node.arguments?.[0], ctx);
      // Convert from our BigInt wrapper, number, or string
      if (typeof val === 'object' && val !== null && val.__type === 'BigInt') return val;
      try {
        const bigVal = BigInt(typeof val === 'string' || typeof val === 'number' ? val : String(val));
        return { __type: 'BigInt', __value: String(bigVal) };
      } catch (e: any) {
        const errorObj = { type: 'Error', name: 'SyntaxError', message: `Cannot convert ${formatValue(val)} to a BigInt` };
        ctx.thrownError = errorObj;
        ctx.hasThrown = true;
        return undefined;
      }
    }
    // URI encoding/decoding functions
    if (name === 'encodeURIComponent') return encodeURIComponent(String(evaluateExpression(node.arguments?.[0], ctx)));
    if (name === 'decodeURIComponent') return decodeURIComponent(String(evaluateExpression(node.arguments?.[0], ctx)));
    if (name === 'encodeURI') return encodeURI(String(evaluateExpression(node.arguments?.[0], ctx)));
    if (name === 'decodeURI') return decodeURI(String(evaluateExpression(node.arguments?.[0], ctx)));
    // Base64 functions
    if (name === 'atob') { try { return atob(String(evaluateExpression(node.arguments?.[0], ctx))); } catch { return ''; } }
    if (name === 'btoa') { try { return btoa(String(evaluateExpression(node.arguments?.[0], ctx))); } catch { return ''; } }
    // structuredClone (simplified deep clone)
    if (name === 'structuredClone') {
      const val = evaluateExpression(node.arguments?.[0], ctx);
      try { return JSON.parse(JSON.stringify(val)); } catch { return val; }
    }
    // Array constructor call: Array(5) → [,,,,]
    if (name === 'Array') {
      const args = evaluateArguments(node.arguments, ctx);
      if (args.length === 1 && typeof args[0] === 'number') return new Array(args[0]);
      return args;
    }
    // Object constructor call
    if (name === 'Object') {
      const args = evaluateArguments(node.arguments, ctx);
      if (args[0] && typeof args[0] === 'object') return args[0];
      return {};
    }

    const funcDef = ctx.functions.get(name);
    if (funcDef) {
      const args = evaluateArguments(node.arguments, ctx);
      return callFunction(funcDef, args, name, ctx, line);
    }

    const varValue = ctx.variables.get(name);
    if (varValue && typeof varValue === 'object' && varValue !== null) {
      if (varValue.__isResolve) {
        const arg = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
        resolvePromise(ctx, varValue.promiseId, arg);
        return undefined;
      }
      if (varValue.__isReject) {
        const arg = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
        rejectPromise(ctx, varValue.promiseId, arg);
        return undefined;
      }
      if (varValue.type === 'ArrowFunctionExpression' || varValue.type === 'FunctionExpression' || varValue.type === 'FunctionDeclaration') {
        const args = evaluateArguments(node.arguments, ctx);
        return callFunction(varValue, args, name, ctx, line);
      }
    }
    return undefined;
  }

  if (callee?.type === 'ArrowFunctionExpression' || callee?.type === 'FunctionExpression') {
    const args = evaluateArguments(node.arguments, ctx);
    return callFunction(callee, args, callee.id?.name || 'anonymous', ctx, line);
  }

  const calleeValue = evaluateExpression(callee, ctx);
  if (calleeValue && typeof calleeValue === 'object') {
    if (calleeValue.__isResolve || calleeValue.__isReject) {
      const arg = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : undefined;
      if (calleeValue.__isResolve) resolvePromise(ctx, calleeValue.promiseId, arg);
      else rejectPromise(ctx, calleeValue.promiseId, arg);
      return undefined;
    }
    if (calleeValue.type === 'ArrowFunctionExpression' || calleeValue.type === 'FunctionExpression' || calleeValue.type === 'FunctionDeclaration') {
      const args = evaluateArguments(node.arguments, ctx);
      return callFunction(calleeValue, args, 'anonymous', ctx, line);
    }
  }

  return undefined;
}

function callFunction(funcNode: any, args: any[], name: string, ctx: ExecutionContext, line: number, thisValue?: any): any {
  // Generator function: return a generator object instead of executing
  if (funcNode.generator) {
    // Pre-bind parameters into saved vars for the generator
    const savedVars = new Map(ctx.variables);
    const params = getCallbackParams(funcNode);
    for (let i = 0; i < params.length; i++) {
      savedVars.set(params[i], args[i] !== undefined ? args[i] : undefined);
    }
    // Handle rest parameters
    const lastParam = funcNode.params?.[funcNode.params.length - 1];
    if (lastParam?.type === 'RestElement') {
      const restName = lastParam.argument?.name;
      if (restName) savedVars.set(restName, args.slice(params.length - 1));
    }
    ctx.steps.push({ type: 'highlight-line', line, data: { line } });
    // Async generator (async function*)
    if (funcNode.async) {
      emitExplanation(ctx, line, {
        title: `Async Generator: ${name}()`,
        description: 'An async generator function returns an AsyncGenerator object. Each .next() call returns a Promise that resolves to {value, done}. Use for-await-of to consume it.',
        specRef: 'ECMAScript §27.6 AsyncGenerator Objects',
        specUrl: 'https://tc39.es/ecma262/#sec-asyncgenerator-objects',
        category: 'execution',
      });
      return {
        __type: 'AsyncGenerator',
        __funcNode: funcNode,
        __state: 'suspended-start',
        __bodyIndex: 0,
        __savedVars: savedVars,
        __yieldAssignTo: null,
        __thisValue: thisValue,
      };
    }
    emitExplanation(ctx, line, {
      title: `Generator Function: ${name}()`,
      description: 'Calling a generator function does not execute its body. Instead, it returns a Generator object. The body runs incrementally each time .next() is called, pausing at each yield.',
      specRef: 'ECMAScript §27.3 Generator Objects',
      specUrl: 'https://tc39.es/ecma262/#sec-generator-objects',
      category: 'execution',
    });
    return {
      __type: 'Generator',
      __funcNode: funcNode,
      __state: 'suspended-start',
      __bodyIndex: 0,
      __savedVars: savedVars,
      __yieldAssignTo: null,
      __thisValue: thisValue,
    };
  }

  const isAsync = funcNode.async;
  const params = getCallbackParams(funcNode);

  let asyncPromiseId: string | undefined;
  if (isAsync) asyncPromiseId = createPromise(ctx);

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({
    type: 'push-stack', line,
    data: { id: generateId(), name: isAsync ? `${name} (async)` : name, line, type: 'function' as const } as StackFrame,
  });

  // Emit explanation for function call
  if (isAsync) {
    emitExplanation(ctx, line, {
      title: `Async Function Call: ${name}()`,
      description: `A new Execution Context is pushed onto the Call Stack. ${name}() is async, so it returns a Promise immediately. When it hits 'await', it suspends and the Call Stack continues with other work.`,
      specRef: 'ECMAScript \u00a715.8 Async Function Definitions',
      specUrl: 'https://tc39.es/ecma262/#sec-async-function-definitions',
      category: 'async',
    });
  } else if (funcNode.type === 'ArrowFunctionExpression') {
    emitExplanation(ctx, line, {
      title: `Arrow Function Call: ${name}()`,
      description: 'Arrow functions do not have their own "this" binding — they inherit "this" from the enclosing lexical scope. They also cannot be used as constructors.',
      specRef: 'ECMAScript \u00a715.3 Arrow Function Definitions',
      specUrl: 'https://tc39.es/ecma262/#sec-arrow-function-definitions',
      category: 'this',
    });
  } else {
    emitExplanation(ctx, line, {
      title: `Function Call: ${name}()`,
      description: 'A new Execution Context is created and pushed onto the Call Stack. Parameters are bound in a new scope, and the function body executes. When complete, the context is popped off the stack.',
      specRef: 'ECMAScript \u00a710.3 Execution Contexts',
      specUrl: 'https://tc39.es/ecma262/#sec-execution-contexts',
      category: 'execution',
    });
  }

  const savedVarKeys: string[] = [];
  const savedVarVals: any[] = [];
  const localVarNames = new Set<string>();

  for (let i = 0; i < (funcNode.params || []).length; i++) {
    const param = funcNode.params[i];
    if (!param) continue;

    if (param.type === 'Identifier') {
      const pName = param.name;
      savedVarKeys.push(pName);
      savedVarVals.push(ctx.variables.has(pName) ? ctx.variables.get(pName) : Symbol());
      ctx.variables.set(pName, args[i]);
      localVarNames.add(pName);
    } else if (param.type === 'RestElement' && param.argument?.type === 'Identifier') {
      const pName = param.argument.name;
      savedVarKeys.push(pName);
      savedVarVals.push(ctx.variables.has(pName) ? ctx.variables.get(pName) : Symbol());
      ctx.variables.set(pName, args.slice(i));
      localVarNames.add(pName);
    } else if (param.type === 'AssignmentPattern') {
      // Default parameter: function(x = 5)
      const pName = param.left?.name || `param${i}`;
      savedVarKeys.push(pName);
      savedVarVals.push(ctx.variables.has(pName) ? ctx.variables.get(pName) : Symbol());
      ctx.variables.set(pName, args[i] !== undefined ? args[i] : evaluateExpression(param.right, ctx));
      localVarNames.add(pName);
    } else if (param.type === 'ObjectPattern') {
      // Phase 5D: Destructured object parameter: function({ a, b })
      const argVal = args[i] && typeof args[i] === 'object' ? args[i] : {};
      for (const prop of param.properties || []) {
        if (prop.type === 'RestElement' && prop.argument?.type === 'Identifier') {
          const restName = prop.argument.name;
          const usedKeys = (param.properties || []).filter((p: any) => p.type !== 'RestElement').map((p: any) => p.key?.name || p.key?.value);
          const rest: Record<string, any> = {};
          for (const [k, v] of Object.entries(argVal)) {
            if (!usedKeys.includes(k)) rest[k] = v;
          }
          savedVarKeys.push(restName);
          savedVarVals.push(ctx.variables.has(restName) ? ctx.variables.get(restName) : Symbol());
          ctx.variables.set(restName, rest);
          localVarNames.add(restName);
        } else {
          const key = prop.key?.name || prop.key?.value;
          let varName: string;
          let defaultVal: any;
          if (prop.value?.type === 'AssignmentPattern') {
            varName = prop.value.left?.name || key;
            defaultVal = prop.value.right;
          } else {
            varName = prop.value?.name || key;
          }
          if (varName) {
            savedVarKeys.push(varName);
            savedVarVals.push(ctx.variables.has(varName) ? ctx.variables.get(varName) : Symbol());
            const val = argVal[key] !== undefined ? argVal[key] : (defaultVal ? evaluateExpression(defaultVal, ctx) : undefined);
            ctx.variables.set(varName, val);
            localVarNames.add(varName);
          }
        }
      }
    } else if (param.type === 'ArrayPattern') {
      // Phase 5D: Destructured array parameter: function([a, b])
      const argVal = Array.isArray(args[i]) ? args[i] : [];
      for (let j = 0; j < (param.elements || []).length; j++) {
        const el = param.elements[j];
        if (!el) continue;
        if (el.type === 'Identifier') {
          savedVarKeys.push(el.name);
          savedVarVals.push(ctx.variables.has(el.name) ? ctx.variables.get(el.name) : Symbol());
          ctx.variables.set(el.name, argVal[j]);
          localVarNames.add(el.name);
        } else if (el.type === 'RestElement' && el.argument?.type === 'Identifier') {
          savedVarKeys.push(el.argument.name);
          savedVarVals.push(ctx.variables.has(el.argument.name) ? ctx.variables.get(el.argument.name) : Symbol());
          ctx.variables.set(el.argument.name, argVal.slice(j));
          localVarNames.add(el.argument.name);
        } else if (el.type === 'AssignmentPattern' && el.left?.type === 'Identifier') {
          savedVarKeys.push(el.left.name);
          savedVarVals.push(ctx.variables.has(el.left.name) ? ctx.variables.get(el.left.name) : Symbol());
          ctx.variables.set(el.left.name, argVal[j] !== undefined ? argVal[j] : evaluateExpression(el.right, ctx));
          localVarNames.add(el.left.name);
        }
      }
    }
  }
  ctx.callStackFrames.push({ name: isAsync ? `${name} (async)` : name, line, localVarNames });
  emitMemorySnapshot(ctx, line);

  // Parameters shadow outer let/const bindings — remove from TDZ for the duration of the call
  const savedTdzBindings = new Set(ctx.tdzBindings);
  for (const pn of localVarNames) ctx.tdzBindings.delete(pn);

  const savedAsyncName = ctx.currentAsyncFuncName;
  const savedAsyncPromiseId = ctx.currentAsyncPromiseId;
  const savedHasReturned = ctx.hasReturned;
  const savedReturnValue = ctx.returnValue;
  const savedAwaitSuspended = ctx.awaitSuspended;
  const savedHasThrown = ctx.hasThrown;
  const savedThrownError = ctx.thrownError;
  const savedThisBinding = ctx.thisBinding;

  // Phase 1C: This binding — arrow functions inherit lexically, regular functions get explicit or globalThis
  if (funcNode.type !== 'ArrowFunctionExpression') {
    if (funcNode.__boundThis !== undefined) {
      ctx.thisBinding = funcNode.__boundThis; // .bind() result
    } else if (thisValue !== undefined) {
      ctx.thisBinding = thisValue; // method call or .call()/.apply()
    } else {
      ctx.thisBinding = { __type: 'globalThis' }; // regular function call
    }
  }
  // Arrow functions: keep current ctx.thisBinding (lexical this)

  ctx.hasReturned = false;
  ctx.returnValue = undefined;
  ctx.awaitSuspended = false;
  ctx.hasThrown = false;
  ctx.thrownError = undefined;
  if (isAsync) {
    ctx.currentAsyncFuncName = name;
    ctx.currentAsyncPromiseId = asyncPromiseId;
  }

  let result: any;
  const body = funcNode.body;
  if (body.type === 'BlockStatement') {
    processBody(body.body, ctx);
    result = ctx.returnValue;
  } else {
    result = evaluateExpression(body, ctx);
  }

  const wasSuspended = ctx.awaitSuspended;
  const didThrow = ctx.hasThrown;
  const thrownErr = ctx.thrownError;

  ctx.currentAsyncFuncName = savedAsyncName;
  ctx.currentAsyncPromiseId = savedAsyncPromiseId;
  ctx.hasReturned = savedHasReturned;
  ctx.returnValue = savedReturnValue;
  ctx.awaitSuspended = savedAwaitSuspended;
  ctx.thisBinding = savedThisBinding;
  ctx.tdzBindings = savedTdzBindings;

  for (let i = 0; i < savedVarKeys.length; i++) {
    if (typeof savedVarVals[i] === 'symbol') ctx.variables.delete(savedVarKeys[i]);
    else ctx.variables.set(savedVarKeys[i], savedVarVals[i]);
  }

  if (didThrow) {
    ctx.hasThrown = true;
    ctx.thrownError = thrownErr;
  } else {
    ctx.hasThrown = savedHasThrown;
    ctx.thrownError = savedThrownError;
  }

  if (!wasSuspended) {
    ctx.callStackFrames.pop();
    ctx.steps.push({ type: 'pop-stack', line, data: {} });
    if (isAsync && asyncPromiseId) {
      if (didThrow) {
        rejectPromise(ctx, asyncPromiseId, thrownErr);
        ctx.hasThrown = savedHasThrown;
        ctx.thrownError = savedThrownError;
      } else {
        resolvePromise(ctx, asyncPromiseId, result);
      }
    }
  }

  if (isAsync) return { __promiseId: asyncPromiseId };
  return result;
}

function processSetTimeout(node: any, ctx: ExecutionContext, line: number): number {
  let callback = resolveCallbackNode(node.arguments?.[0], ctx);
  const delayArg = node.arguments?.[1];
  const delay = delayArg ? (Number(evaluateExpression(delayArg, ctx)) || 0) : 0;
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);
  const params = getCallbackParams(callback);

  const webApiId = generateId();
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  emitExplanation(ctx, line, {
    title: `setTimeout(${delay}ms) — Web API`,
    description: `The callback is handed off to the Web APIs environment (browser). After ${delay}ms, the callback moves to the Task Queue (macrotask queue). It will only execute when the Call Stack is empty AND all microtasks have been drained.`,
    specRef: 'HTML Living Standard \u00a78.6 Timers',
    specUrl: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers',
    category: 'event-loop',
  });
  ctx.steps.push({
    type: 'add-webapi', line,
    data: { id: webApiId, name: `setTimeout(${delay}ms)`, type: 'setTimeout' as const, delay, remaining: delay, callback: callbackStr } as WebAPIItem,
  });
  ctx.steps.push({
    type: 'add-task', line,
    data: { id: taskId, name: 'setTimeout callback', callback: callbackStr, line } as QueueItem,
  });

  ctx.pendingMacrotasks.push({
    id: taskId, body, line: getNodeLine(callback) || line,
    callbackStr, params, args: [], delay, webApiId,
    closureVars: new Map(ctx.variables), apiName: `setTimeout(${delay}ms)`,
  });

  return timerCounter++;
}

function processSetInterval(node: any, ctx: ExecutionContext, line: number): number {
  let callback = resolveCallbackNode(node.arguments?.[0], ctx);
  const delayArg = node.arguments?.[1];
  const delay = delayArg ? (Number(evaluateExpression(delayArg, ctx)) || 0) : 0;
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);
  const params = getCallbackParams(callback);

  const webApiId = generateId();
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({
    type: 'add-webapi', line,
    data: { id: webApiId, name: `setInterval(${delay}ms)`, type: 'setInterval' as const, delay, remaining: delay, callback: callbackStr } as WebAPIItem,
  });
  ctx.steps.push({
    type: 'add-task', line,
    data: { id: taskId, name: 'setInterval callback', callback: callbackStr, line } as QueueItem,
  });

  ctx.pendingMacrotasks.push({
    id: taskId, body, line: getNodeLine(callback) || line,
    callbackStr, params, args: [], delay, webApiId,
    closureVars: new Map(ctx.variables), apiName: `setInterval(${delay}ms)`,
  });

  return timerCounter++;
}

function processQueueMicrotask(node: any, ctx: ExecutionContext, line: number): void {
  let callback = resolveCallbackNode(node.arguments?.[0], ctx);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);
  const params = getCallbackParams(callback);
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  emitExplanation(ctx, line, {
    title: 'queueMicrotask() — Direct Microtask',
    description: 'The callback is added directly to the Microtask Queue. It will run after the current synchronous code completes, before any macrotasks (setTimeout, etc). Unlike Promise.then, this doesn\'t involve promise resolution.',
    specRef: 'HTML Living Standard \u00a78.7 Microtask Queuing',
    specUrl: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#microtask-queuing',
    category: 'event-loop',
  });

  const task: PendingMicrotask = {
    id: taskId, body, line: getNodeLine(callback) || line,
    callbackStr, params, args: [],
    closureVars: new Map(ctx.variables),
  };

  ctx.steps.push({
    type: 'add-microtask', line,
    data: { id: taskId, name: 'queueMicrotask', callback: callbackStr, line } as QueueItem,
  });
  ctx.pendingMicrotasks.push(task);
}

function processRAF(node: any, ctx: ExecutionContext, line: number): number {
  let callback = resolveCallbackNode(node.arguments?.[0], ctx);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);
  const params = getCallbackParams(callback);

  const webApiId = generateId();
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({
    type: 'add-webapi', line,
    data: { id: webApiId, name: 'requestAnimationFrame', type: 'event' as const, delay: 16, remaining: 16, callback: callbackStr } as WebAPIItem,
  });
  ctx.steps.push({
    type: 'add-task', line,
    data: { id: taskId, name: 'rAF callback', callback: callbackStr, line } as QueueItem,
  });

  ctx.pendingMacrotasks.push({
    id: taskId, body, line: getNodeLine(callback) || line,
    callbackStr, params, args: [16.67], delay: 16, webApiId,
    closureVars: new Map(ctx.variables), apiName: 'requestAnimationFrame',
  });

  return timerCounter++;
}

function processRIC(node: any, ctx: ExecutionContext, line: number): number {
  let callback = resolveCallbackNode(node.arguments?.[0], ctx);
  const callbackStr = extractCallbackStr(callback);
  const body = getCallbackBody(callback);
  const params = getCallbackParams(callback);

  const webApiId = generateId();
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({
    type: 'add-webapi', line,
    data: { id: webApiId, name: 'requestIdleCallback', type: 'event' as const, delay: 50, remaining: 50, callback: callbackStr } as WebAPIItem,
  });
  ctx.steps.push({
    type: 'add-task', line,
    data: { id: taskId, name: 'rIC callback', callback: callbackStr, line } as QueueItem,
  });

  ctx.pendingMacrotasks.push({
    id: taskId, body, line: getNodeLine(callback) || line,
    callbackStr, params, args: [{ timeRemaining: () => 49, didTimeout: false }], delay: 50, webApiId,
    closureVars: new Map(ctx.variables), apiName: 'requestIdleCallback',
  });

  return timerCounter++;
}

function processFetch(node: any, ctx: ExecutionContext, line: number): any {
  const urlArg = node.arguments?.[0];
  const url = urlArg ? formatValue(evaluateExpression(urlArg, ctx)) : '/api/data';
  const promiseId = createPromise(ctx);
  const webApiId = generateId();
  const taskId = generateId();

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({
    type: 'add-webapi', line,
    data: { id: webApiId, name: `fetch(${url})`, type: 'fetch' as const, delay: 200, remaining: 200, callback: 'fetch response' } as WebAPIItem,
  });
  ctx.steps.push({
    type: 'add-task', line,
    data: { id: taskId, name: 'fetch response', callback: 'fetch callback', line } as QueueItem,
  });

  const responseObj = {
    __isFetchResponse: true, ok: true, status: 200, statusText: 'OK',
    __data: { data: 'simulated' },
  };

  ctx.pendingMacrotasks.push({
    id: taskId, body: null, line, callbackStr: 'fetch response',
    params: [], args: [], delay: 200, webApiId,
    closureVars: new Map(ctx.variables), apiName: `fetch(${url})`,
    fetchPromiseId: promiseId, fetchResponse: responseObj,
  });

  return { __promiseId: promiseId };
}

function processPromiseCombinator(type: string, arrNode: any, ctx: ExecutionContext, line: number): any {
  const resultPromiseId = createPromise(ctx);

  if (!arrNode || arrNode.type !== 'ArrayExpression') {
    if (type === 'all' || type === 'allSettled') resolvePromise(ctx, resultPromiseId, []);
    return { __promiseId: resultPromiseId };
  }

  const promiseIds: string[] = [];
  for (const el of arrNode.elements || []) {
    if (!el) continue;
    const val = evaluateExpression(el, ctx);
    if (val && typeof val === 'object' && val.__promiseId) {
      promiseIds.push(val.__promiseId);
    } else {
      promiseIds.push(createPromise(ctx, 'resolved', val));
    }
  }

  if (promiseIds.length === 0) {
    if (type === 'all' || type === 'allSettled') resolvePromise(ctx, resultPromiseId, []);
    return { __promiseId: resultPromiseId };
  }

  switch (type) {
    case 'all': {
      const results = new Array(promiseIds.length).fill(undefined);
      let resolvedCount = 0;
      let rejected = false;
      for (let i = 0; i < promiseIds.length; i++) {
        const p = ctx.promises.get(promiseIds[i]);
        if (!p) continue;
        const idx = i;
        const onRes = (value: any) => {
          if (rejected) return;
          results[idx] = value;
          resolvedCount++;
          if (resolvedCount === promiseIds.length) resolvePromise(ctx, resultPromiseId, results);
        };
        const onRej = (error: any) => {
          if (rejected) return;
          rejected = true;
          rejectPromise(ctx, resultPromiseId, error);
        };
        if (p.state === 'resolved') onRes(p.value);
        else if (p.state === 'rejected') onRej(p.error);
        else { p.onResolve.push(onRes); p.onReject.push(onRej); }
      }
      break;
    }
    case 'race': {
      let settled = false;
      for (const pId of promiseIds) {
        const p = ctx.promises.get(pId);
        if (!p) continue;
        const onRes = (value: any) => { if (!settled) { settled = true; resolvePromise(ctx, resultPromiseId, value); } };
        const onRej = (error: any) => { if (!settled) { settled = true; rejectPromise(ctx, resultPromiseId, error); } };
        if (p.state === 'resolved') { onRes(p.value); break; }
        if (p.state === 'rejected') { onRej(p.error); break; }
        p.onResolve.push(onRes); p.onReject.push(onRej);
      }
      break;
    }
    case 'any': {
      let resolved = false;
      const errors: any[] = new Array(promiseIds.length);
      let rejectedCount = 0;
      for (let i = 0; i < promiseIds.length; i++) {
        const p = ctx.promises.get(promiseIds[i]);
        if (!p) continue;
        const idx = i;
        const onRes = (value: any) => { if (!resolved) { resolved = true; resolvePromise(ctx, resultPromiseId, value); } };
        const onRej = (error: any) => {
          if (resolved) return;
          errors[idx] = error; rejectedCount++;
          if (rejectedCount === promiseIds.length) rejectPromise(ctx, resultPromiseId, { type: 'AggregateError', errors });
        };
        if (p.state === 'resolved') { onRes(p.value); break; }
        else if (p.state === 'rejected') { onRej(p.error); }
        else { p.onResolve.push(onRes); p.onReject.push(onRej); }
      }
      break;
    }
    case 'allSettled': {
      const results: any[] = new Array(promiseIds.length);
      let settledCount = 0;
      for (let i = 0; i < promiseIds.length; i++) {
        const p = ctx.promises.get(promiseIds[i]);
        if (!p) continue;
        const idx = i;
        const onRes = (value: any) => {
          results[idx] = { status: 'fulfilled', value }; settledCount++;
          if (settledCount === promiseIds.length) resolvePromise(ctx, resultPromiseId, results);
        };
        const onRej = (error: any) => {
          results[idx] = { status: 'rejected', reason: error }; settledCount++;
          if (settledCount === promiseIds.length) resolvePromise(ctx, resultPromiseId, results);
        };
        if (p.state === 'resolved') onRes(p.value);
        else if (p.state === 'rejected') onRej(p.error);
        else { p.onResolve.push(onRes); p.onReject.push(onRej); }
      }
      break;
    }
  }

  return { __promiseId: resultPromiseId };
}

function processNewExpression(node: any, ctx: ExecutionContext): any {
  const calleeName = node.callee?.name;
  const line = getNodeLine(node);

  if (calleeName === 'Promise') {
    const executor = node.arguments?.[0];
    const promiseId = createPromise(ctx);

    if (executor && (executor.type === 'ArrowFunctionExpression' || executor.type === 'FunctionExpression')) {
      const resolveParam = executor.params?.[0]?.name || 'resolve';
      const rejectParam = executor.params?.[1]?.name || 'reject';

      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      emitExplanation(ctx, line, {
        title: 'new Promise() — Promise Creation',
        description: 'A new Promise is created. The executor function runs SYNCHRONOUSLY and immediately. Inside, resolve() or reject() will transition the promise from "pending" to "fulfilled" or "rejected".',
        specRef: 'ECMAScript \u00a727.2.3 The Promise Constructor',
        specUrl: 'https://tc39.es/ecma262/#sec-promise-constructor',
        category: 'promise',
      });
      ctx.steps.push({
        type: 'push-stack', line,
        data: { id: generateId(), name: 'new Promise(executor)', line, type: 'promise' as const } as StackFrame,
      });

      const savedResolve = ctx.variables.has(resolveParam) ? ctx.variables.get(resolveParam) : Symbol();
      const savedReject = ctx.variables.has(rejectParam) ? ctx.variables.get(rejectParam) : Symbol();
      ctx.variables.set(resolveParam, { __isResolve: true, promiseId });
      ctx.variables.set(rejectParam, { __isReject: true, promiseId });

      if (executor.body.type === 'BlockStatement') {
        processBody(executor.body.body, ctx);
      } else {
        evaluateExpression(executor.body, ctx);
      }

      if (typeof savedResolve === 'symbol') ctx.variables.delete(resolveParam);
      else ctx.variables.set(resolveParam, savedResolve);
      if (typeof savedReject === 'symbol') ctx.variables.delete(rejectParam);
      else ctx.variables.set(rejectParam, savedReject);

      ctx.steps.push({ type: 'pop-stack', line, data: {} });
    }

    return { __promiseId: promiseId };
  }

  // AggregateError constructor
  if (calleeName === 'AggregateError') {
    const errors = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : [];
    const msg = node.arguments?.[1] ? evaluateExpression(node.arguments[1], ctx) : '';
    return { type: 'Error', name: 'AggregateError', message: formatValue(msg), errors: Array.isArray(errors) ? errors : [] };
  }

  if (calleeName === 'Error' || calleeName === 'TypeError' || calleeName === 'RangeError' || calleeName === 'SyntaxError' || calleeName === 'ReferenceError' || calleeName === 'URIError' || calleeName === 'EvalError') {
    const msg = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : '';
    const errorObj: Record<string, any> = { type: 'Error', message: formatValue(msg), name: calleeName };
    // Error.cause support (ES2022)
    const optionsArg = node.arguments?.[1] ? evaluateExpression(node.arguments[1], ctx) : undefined;
    if (optionsArg && typeof optionsArg === 'object' && optionsArg.cause !== undefined) {
      errorObj.cause = optionsArg.cause;
    }
    return errorObj;
  }

  // TypedArray constructors
  const typedArrayTypes = ['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array'];
  if (calleeName && typedArrayTypes.includes(calleeName)) {
    const arg0 = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : 0;
    let data: number[] = [];
    if (typeof arg0 === 'number') {
      data = new Array(arg0).fill(0);
    } else if (Array.isArray(arg0)) {
      data = arg0.map(Number);
    } else if (typeof arg0 === 'object' && arg0 !== null && arg0.__type === 'TypedArray') {
      data = [...(arg0.__data as number[])];
    } else if (typeof arg0 === 'object' && arg0 !== null && arg0.__type === 'ArrayBuffer') {
      data = new Array(arg0.__byteLength).fill(0);
    }
    emitExplanation(ctx, line, {
      title: `new ${calleeName}(${data.length}) — Typed Array`,
      description: `Creates a ${calleeName} with ${data.length} elements. TypedArrays are array-like views over raw binary data in an ArrayBuffer. Unlike regular arrays, all elements are the same numeric type and the length is fixed.`,
      specRef: 'ECMAScript §23.2 TypedArray Objects',
      specUrl: 'https://tc39.es/ecma262/#sec-typedarray-objects',
      category: 'execution',
    });
    return { __type: 'TypedArray', __arrayType: calleeName, __data: data, __length: data.length };
  }

  // ArrayBuffer constructor
  if (calleeName === 'ArrayBuffer') {
    const byteLength = node.arguments?.[0] ? Number(evaluateExpression(node.arguments[0], ctx)) : 0;
    emitExplanation(ctx, line, {
      title: `new ArrayBuffer(${byteLength}) — Raw Binary Buffer`,
      description: `Creates an ArrayBuffer of ${byteLength} bytes. ArrayBuffer represents a fixed-length raw binary data buffer. You cannot directly manipulate its contents — use a TypedArray or DataView to read/write.`,
      specRef: 'ECMAScript §25.1 ArrayBuffer Objects',
      specUrl: 'https://tc39.es/ecma262/#sec-arraybuffer-objects',
      category: 'execution',
    });
    return { __type: 'ArrayBuffer', __byteLength: byteLength, __data: new Array(byteLength).fill(0) };
  }

  // DataView constructor
  if (calleeName === 'DataView') {
    const buffer = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : null;
    const byteOffset = node.arguments?.[1] ? Number(evaluateExpression(node.arguments[1], ctx)) : 0;
    emitExplanation(ctx, line, {
      title: 'new DataView(buffer) — Binary Data Reader/Writer',
      description: `Creates a DataView for reading/writing individual bytes in an ArrayBuffer. Unlike TypedArrays, DataView lets you read different types at arbitrary byte offsets and control endianness.`,
      specRef: 'ECMAScript §25.3 DataView Objects',
      specUrl: 'https://tc39.es/ecma262/#sec-dataview-objects',
      category: 'execution',
    });
    return { __type: 'DataView', __buffer: buffer, __byteOffset: byteOffset };
  }

  // Intl constructors
  if (calleeName === 'Intl.NumberFormat' || (node.callee?.type === 'MemberExpression' && node.callee.object?.type === 'Identifier' && node.callee.object.name === 'Intl' && node.callee.property?.name === 'NumberFormat')) {
    const args = evaluateArguments(node.arguments, ctx);
    const locale = args[0] || 'en-US';
    const options = args[1] || {};
    return { __type: 'Intl.NumberFormat', __locale: locale, __options: options };
  }
  if (calleeName === 'Intl.DateTimeFormat' || (node.callee?.type === 'MemberExpression' && node.callee.object?.type === 'Identifier' && node.callee.object.name === 'Intl' && node.callee.property?.name === 'DateTimeFormat')) {
    const args = evaluateArguments(node.arguments, ctx);
    const locale = args[0] || 'en-US';
    const options = args[1] || {};
    return { __type: 'Intl.DateTimeFormat', __locale: locale, __options: options };
  }
  if (calleeName === 'Intl.Collator' || (node.callee?.type === 'MemberExpression' && node.callee.object?.type === 'Identifier' && node.callee.object.name === 'Intl' && node.callee.property?.name === 'Collator')) {
    const args = evaluateArguments(node.arguments, ctx);
    const locale = args[0] || 'en-US';
    const options = args[1] || {};
    return { __type: 'Intl.Collator', __locale: locale, __options: options };
  }

  // Proxy constructor
  if (calleeName === 'Proxy') {
    const target = node.arguments?.[0] ? evaluateExpression(node.arguments[0], ctx) : {};
    const handler = node.arguments?.[1] ? evaluateExpression(node.arguments[1], ctx) : {};
    return { __type: 'Proxy', __target: target, __handler: handler, __revoked: false };
  }

  const args = evaluateArguments(node.arguments, ctx);

  // Phase 1C + 5C: For user-defined constructors and classes, set this to a new object
  const funcDef = calleeName ? (ctx.functions.get(calleeName) || ctx.variables.get(calleeName)) : undefined;
  if (funcDef && typeof funcDef === 'object') {
    // Phase 5C: Class constructor
    if (funcDef.type === 'ClassDeclaration') {
      const newObj: Record<string, any> = { __type: calleeName, __className: calleeName, __classNode: funcDef };
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      emitExplanation(ctx, line, {
        title: `new ${calleeName}() — Class Instantiation`,
        description: `A new instance of ${calleeName} is created. The constructor method runs with "this" bound to the new object. Methods defined in the class body are available on the instance via the prototype chain.`,
        specRef: 'ECMAScript \u00a715.7 Class Definitions',
        specUrl: 'https://tc39.es/ecma262/#sec-class-definitions',
        category: 'execution',
      });
      // Collect the full class hierarchy (child → parent → grandparent → ...)
      const classChain: any[] = [];
      let currentClass: any = funcDef;
      while (currentClass) {
        classChain.push(currentClass);
        currentClass = currentClass.__parentClass || null;
      }

      // Apply methods/fields from parent to child (reverse order so child overrides parent)
      for (let ci = classChain.length - 1; ci >= 0; ci--) {
        const classNode = classChain[ci];
        const cBody = classNode.body;
        if (cBody?.type === 'ClassBody') {
          for (const member of cBody.body || []) {
            if (member.static) continue; // Skip static members
            // Get the key name — handle private identifiers and computed keys
            let keyName: string | undefined;
            if (member.key?.type === 'PrivateIdentifier') {
              keyName = `__private_#${member.key.name}`;
            } else if (member.computed) {
              const computedKey = evaluateExpression(member.key, ctx);
              if (computedKey && typeof computedKey === 'object' && computedKey.__type === 'Symbol') {
                keyName = `__symbol_${computedKey.__wellKnown || computedKey.description}`;
              } else {
                keyName = String(computedKey);
              }
            } else {
              keyName = member.key?.name;
            }
            if (member.type === 'MethodDefinition' && keyName) {
              // Tag method with its home class for super.method() resolution.
              // Shallow-copy AST so type/body/params/etc. remain accessible.
              const tagged = { ...member.value, __homeClass: classNode };
              if (member.kind === 'method') {
                newObj[keyName] = tagged;
              }
              if (member.kind === 'get') {
                if (!newObj.__getters) newObj.__getters = {};
                newObj.__getters[keyName] = tagged;
              }
              if (member.kind === 'set') {
                if (!newObj.__setters) newObj.__setters = {};
                newObj.__setters[keyName] = tagged;
              }
            }
            if (member.type === 'PropertyDefinition' && keyName && !member.static) {
              newObj[keyName] = member.value ? evaluateExpression(member.value, ctx) : undefined;
            }
          }
        }
      }

      // Find constructor in current class
      const classBody = funcDef.body;
      let constructorNode: any = null;
      if (classBody?.type === 'ClassBody') {
        for (const member of classBody.body || []) {
          if (member.type === 'MethodDefinition' && member.kind === 'constructor' && member.value) {
            constructorNode = member.value;
            break;
          }
        }
      }

      // Store parent class reference for super() calls
      const savedParentClass = ctx.variables.get('__currentParentClass');
      const savedCurrentClass = ctx.variables.get('__currentClassNode');
      if (funcDef.__parentClass) {
        ctx.variables.set('__currentParentClass', funcDef.__parentClass);
      }
      ctx.variables.set('__currentClassNode', funcDef);

      if (constructorNode) {
        callFunction(constructorNode, args, `${calleeName}.constructor`, ctx, line, newObj);
      } else if (funcDef.__parentClass) {
        // If no constructor defined and has parent, auto-call parent constructor
        let parentClass = funcDef.__parentClass;
        while (parentClass) {
          const pBody = parentClass.body;
          let found = false;
          if (pBody?.type === 'ClassBody') {
            for (const member of pBody.body || []) {
              if (member.type === 'MethodDefinition' && member.kind === 'constructor' && member.value) {
                callFunction(member.value, args, `${parentClass.id?.name || 'super'}.constructor`, ctx, line, newObj);
                found = true;
                break;
              }
            }
          }
          if (found) break;
          parentClass = parentClass.__parentClass;
        }
      }

      // Restore
      if (savedParentClass !== undefined) ctx.variables.set('__currentParentClass', savedParentClass);
      else ctx.variables.delete('__currentParentClass');
      if (savedCurrentClass !== undefined) ctx.variables.set('__currentClassNode', savedCurrentClass);
      else ctx.variables.delete('__currentClassNode');

      return newObj;
    }
    // Regular function constructor
    if (funcDef.type === 'FunctionDeclaration' || funcDef.type === 'FunctionExpression') {
      const newObj: Record<string, any> = { __type: calleeName, __className: calleeName };
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const result = callFunction(funcDef, args, calleeName || 'constructor', ctx, line, newObj);
      // If constructor returns an object, use that; otherwise use newObj
      if (result && typeof result === 'object' && !result.__promiseId) return result;
      return newObj;
    }
  }

  // Phase 5B: Map and Set support
  if (calleeName === 'Map') {
    const map: Record<string, any> = { __type: 'Map', __entries: [] as Array<[any, any]>, __mapSize: 0 };
    // Handle iterable argument for initial entries
    if (args[0] && Array.isArray(args[0])) {
      for (const entry of args[0]) {
        if (Array.isArray(entry) && entry.length >= 2) {
          (map.__entries as Array<[any, any]>).push([entry[0], entry[1]]);
          map.__mapSize++;
        }
      }
    }
    return map;
  }
  if (calleeName === 'Set') {
    const set: Record<string, any> = { __type: 'Set', __values: [] as any[], __setSize: 0 };
    if (args[0] && Array.isArray(args[0])) {
      for (const val of args[0]) {
        if (!(set.__values as any[]).includes(val)) {
          (set.__values as any[]).push(val);
          set.__setSize++;
        }
      }
    }
    return set;
  }

  // WeakMap constructor
  if (calleeName === 'WeakMap') {
    const wm: Record<string, any> = { __type: 'WeakMap', __entries: [] as Array<[any, any]>, __weakMapSize: 0 };
    if (args[0] && Array.isArray(args[0])) {
      for (const entry of args[0]) {
        if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === 'object' && entry[0] !== null) {
          (wm.__entries as Array<[any, any]>).push([entry[0], entry[1]]);
          wm.__weakMapSize++;
        }
      }
    }
    return wm;
  }
  // WeakSet constructor
  if (calleeName === 'WeakSet') {
    const ws: Record<string, any> = { __type: 'WeakSet', __values: [] as any[], __weakSetSize: 0 };
    if (args[0] && Array.isArray(args[0])) {
      for (const val of args[0]) {
        if (typeof val === 'object' && val !== null) {
          (ws.__values as any[]).push(val);
          ws.__weakSetSize++;
        }
      }
    }
    return ws;
  }

  // Date constructor
  if (calleeName === 'Date') {
    let d: Date;
    if (args.length === 0) d = new Date();
    else if (args.length === 1) d = new Date(args[0]);
    else d = new Date(args[0], args[1] || 0, args[2] ?? 1, args[3] || 0, args[4] || 0, args[5] || 0, args[6] || 0);
    return { __type: 'Date', __date: d };
  }

  // RegExp constructor
  if (calleeName === 'RegExp') {
    try {
      return new RegExp(args[0], args[1]);
    } catch {
      return new RegExp('');
    }
  }

  // Array constructor
  if (calleeName === 'Array') {
    if (args.length === 1 && typeof args[0] === 'number') return new Array(args[0]);
    return [...args];
  }

  if (calleeName === 'AbortController') {
    return { type: 'AbortController', signal: { aborted: false } };
  }
  if (calleeName === 'WebSocket') {
    ctx.steps.push({ type: 'console', line, data: { type: 'info', value: `WebSocket: Connection to ${args[0] || 'unknown'} (simulated)` } });
    return { type: 'WebSocket', url: args[0] };
  }
  if (calleeName === 'MutationObserver' || calleeName === 'IntersectionObserver' || calleeName === 'ResizeObserver') {
    ctx.steps.push({ type: 'console', line, data: { type: 'info', value: `${calleeName}: Created (simulated)` } });
    return { type: calleeName };
  }
  if (calleeName === 'MessageChannel') {
    ctx.steps.push({ type: 'console', line, data: { type: 'info', value: 'MessageChannel: Created (simulated)' } });
    return { type: 'MessageChannel', port1: {}, port2: {} };
  }

  return { type: calleeName || 'Object', args };
}

function processArrayMethod(arr: any[], method: string, argNodes: any[], ctx: ExecutionContext, _line: number): any {
  const evalCallback = (argNode: any) => {
    const cb = argNode ? evaluateExpression(argNode, ctx) : null;
    return cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression' || cb.type === 'FunctionDeclaration') ? cb : null;
  };

  switch (method) {
    case 'forEach': {
      const cb = evalCallback(argNodes[0]);
      if (cb) {
        for (let i = 0; i < arr.length && i < 100; i++) {
          executeCallback(cb, [arr[i], i, arr], ctx);
        }
      }
      return undefined;
    }
    case 'map': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.map((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return arr;
    }
    case 'filter': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.filter((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return arr;
    }
    case 'reduce': {
      const cb = evalCallback(argNodes[0]);
      const initial = argNodes[1] ? evaluateExpression(argNodes[1], ctx) : undefined;
      if (cb) return arr.reduce((acc, item, i) => executeCallback(cb, [acc, item, i, arr], ctx), initial);
      return initial;
    }
    case 'find': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.find((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return undefined;
    }
    case 'findIndex': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.findIndex((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return -1;
    }
    case 'some': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.some((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return false;
    }
    case 'every': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.every((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return true;
    }
    case 'flatMap': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.flatMap((item, i) => executeCallback(cb, [item, i, arr], ctx));
      return arr;
    }
    case 'push': { const a = argNodes.map(n => evaluateExpression(n, ctx)); arr.push(...a); return arr.length; }
    case 'pop': return arr.pop();
    case 'shift': return arr.shift();
    case 'unshift': { const a = argNodes.map(n => evaluateExpression(n, ctx)); return arr.unshift(...a); }
    case 'slice': { const a = argNodes.map(n => evaluateExpression(n, ctx)); return arr.slice(a[0], a[1]); }
    case 'splice': { const a = argNodes.map(n => evaluateExpression(n, ctx)); return arr.splice(a[0], a[1], ...a.slice(2)); }
    case 'concat': { const a = argNodes.map(n => evaluateExpression(n, ctx)); return arr.concat(...a); }
    case 'join': { const sep = argNodes[0] ? evaluateExpression(argNodes[0], ctx) : ','; return arr.join(sep); }
    case 'indexOf': return arr.indexOf(evaluateExpression(argNodes[0], ctx));
    case 'lastIndexOf': return arr.lastIndexOf(evaluateExpression(argNodes[0], ctx));
    case 'includes': return arr.includes(evaluateExpression(argNodes[0], ctx));
    case 'reverse': return [...arr].reverse();
    case 'sort': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return [...arr].sort((a, b) => executeCallback(cb, [a, b], ctx));
      return [...arr].sort();
    }
    case 'flat': return arr.flat(argNodes[0] ? evaluateExpression(argNodes[0], ctx) : 1);
    case 'fill': { const a = argNodes.map(n => evaluateExpression(n, ctx)); return arr.fill(a[0], a[1], a[2]); }
    case 'keys': return Array.from(arr.keys());
    case 'values': return Array.from(arr.values());
    case 'entries': return Array.from(arr.entries());
    case 'toString': return arr.toString();
    case 'at': { const idx = evaluateExpression(argNodes[0], ctx); return arr.at(idx); }
    case 'reduceRight': {
      const cb = evalCallback(argNodes[0]);
      const initial = argNodes[1] ? evaluateExpression(argNodes[1], ctx) : undefined;
      if (cb) return arr.reduceRight((acc: any, item: any, i: number) => executeCallback(cb, [acc, item, i, arr], ctx), initial);
      return initial;
    }
    case 'findLast': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.findLast((item: any, i: number) => executeCallback(cb, [item, i, arr], ctx));
      return undefined;
    }
    case 'findLastIndex': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return arr.findLastIndex((item: any, i: number) => executeCallback(cb, [item, i, arr], ctx));
      return -1;
    }
    case 'toReversed': return [...arr].reverse();
    case 'toSorted': {
      const cb = evalCallback(argNodes[0]);
      if (cb) return [...arr].sort((a, b) => executeCallback(cb, [a, b], ctx));
      return [...arr].sort();
    }
    case 'toSpliced': {
      const a = argNodes.map(n => evaluateExpression(n, ctx));
      const copy = [...arr];
      copy.splice(a[0], a[1], ...a.slice(2));
      return copy;
    }
    case 'with': {
      const a = argNodes.map(n => evaluateExpression(n, ctx));
      const copy = [...arr];
      const idx = a[0] < 0 ? copy.length + a[0] : a[0];
      copy[idx] = a[1];
      return copy;
    }
    case 'copyWithin': {
      const a = argNodes.map(n => evaluateExpression(n, ctx));
      return [...arr].copyWithin(a[0], a[1], a[2]);
    }
    case 'isArray': return Array.isArray(arr);
    case 'hasOwnProperty': return Object.prototype.hasOwnProperty.call(arr, evaluateExpression(argNodes[0], ctx));
    default: return undefined;
  }
}

function processStringMethod(str: string, method: string, argNodes: any[], ctx: ExecutionContext): any {
  const args = argNodes.map(a => evaluateExpression(a, ctx));
  switch (method) {
    case 'toUpperCase': return str.toUpperCase();
    case 'toLowerCase': return str.toLowerCase();
    case 'trim': return str.trim();
    case 'trimStart': return str.trimStart();
    case 'trimEnd': return str.trimEnd();
    case 'slice': return str.slice(args[0], args[1]);
    case 'substring': return str.substring(args[0], args[1]);
    case 'indexOf': return str.indexOf(args[0]);
    case 'lastIndexOf': return str.lastIndexOf(args[0]);
    case 'includes': return str.includes(args[0]);
    case 'startsWith': return str.startsWith(args[0]);
    case 'endsWith': return str.endsWith(args[0]);
    case 'replace': return str.replace(args[0], args[1]);
    case 'replaceAll': return str.replaceAll(args[0], args[1]);
    case 'split': return str.split(args[0]);
    case 'charAt': return str.charAt(args[0]);
    case 'charCodeAt': return str.charCodeAt(args[0]);
    case 'repeat': return str.repeat(args[0]);
    case 'padStart': return str.padStart(args[0], args[1]);
    case 'padEnd': return str.padEnd(args[0], args[1]);
    case 'concat': return str.concat(...args);
    case 'match': return str.match(args[0]);
    case 'matchAll': { try { return [...str.matchAll(args[0])]; } catch { return []; } }
    case 'search': return str.search(args[0]);
    case 'toString': return str;
    case 'valueOf': return str;
    case 'at': return str.at(args[0]);
    case 'codePointAt': return str.codePointAt(args[0]);
    case 'normalize': return str.normalize(args[0]);
    case 'localeCompare': return str.localeCompare(args[0]);
    case 'isWellFormed': return true;  // Simplified
    case 'toWellFormed': return str;   // Simplified
    default: return undefined;
  }
}

function containsAwait(node: any): boolean {
  if (!node) return false;
  // Don't descend into nested function/arrow bodies — their awaits belong to that scope.
  if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') return false;
  if (node.type === 'AwaitExpression') return true;
  if (node.type === 'ExpressionStatement') return containsAwait(node.expression);
  if (node.type === 'VariableDeclaration') return node.declarations.some((d: any) => containsAwait(d.init));
  if (node.type === 'ReturnStatement') return containsAwait(node.argument);
  if (node.type === 'AssignmentExpression') return containsAwait(node.right);
  if (node.type === 'CallExpression') {
    if (containsAwait(node.callee)) return true;
    return node.arguments?.some((a: any) => containsAwait(a)) || false;
  }
  if (node.type === 'MemberExpression') return containsAwait(node.object);
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') return containsAwait(node.left) || containsAwait(node.right);
  if (node.type === 'ConditionalExpression') return containsAwait(node.test) || containsAwait(node.consequent) || containsAwait(node.alternate);
  if (node.type === 'TemplateLiteral') return node.expressions?.some((e: any) => containsAwait(e)) || false;
  if (node.type === 'UnaryExpression') return containsAwait(node.argument);
  if (node.type === 'ArrayExpression') return node.elements?.some((e: any) => containsAwait(e)) || false;
  if (node.type === 'ObjectExpression') return node.properties?.some((p: any) => containsAwait(p.value)) || false;
  if (node.type === 'BlockStatement') return node.body?.some((s: any) => containsAwait(s)) || false;
  if (node.type === 'TryStatement') {
    return containsAwait(node.block) || containsAwait(node.handler?.body) || containsAwait(node.finalizer);
  }
  if (node.type === 'IfStatement') return containsAwait(node.test) || containsAwait(node.consequent) || containsAwait(node.alternate);
  if (node.type === 'ForStatement') return containsAwait(node.init) || containsAwait(node.test) || containsAwait(node.update) || containsAwait(node.body);
  if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') return containsAwait(node.test) || containsAwait(node.body);
  if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') return containsAwait(node.right) || containsAwait(node.body);
  if (node.type === 'SwitchStatement') {
    if (containsAwait(node.discriminant)) return true;
    return node.cases?.some((c: any) => (c.test && containsAwait(c.test)) || c.consequent?.some((s: any) => containsAwait(s))) || false;
  }
  if (node.type === 'SpreadElement') return containsAwait(node.argument);
  if (node.type === 'Property') return containsAwait(node.value);
  if (node.type === 'NewExpression') {
    if (containsAwait(node.callee)) return true;
    return node.arguments?.some((a: any) => containsAwait(a)) || false;
  }
  if (node.type === 'TaggedTemplateExpression') return containsAwait(node.tag) || containsAwait(node.quasi);
  if (node.type === 'YieldExpression') return containsAwait(node.argument);
  return false;
}

function extractAwaitTarget(node: any): any {
  if (!node) return null;
  if (node.type === 'AwaitExpression') return node.argument;
  return null;
}

function processStatementWithAwait(stmt: any, remainingStmts: any[], ctx: ExecutionContext, awaitTryContext?: PendingMicrotask['awaitTryContext']): void {
  const line = getNodeLine(stmt);
  let awaitedValue: any;
  let assignTo: string | undefined;
  let isReturn = false;

  // Recursive descent through statements that *contain* an await, but aren't themselves
  // an await position. We unwrap one level of try/catch, then the inner await is processed
  // with an awaitTryContext describing where to route a rejection.
  if (stmt.type === 'TryStatement') {
    const tryStmts = stmt.block?.body || [];
    const idx = tryStmts.findIndex((s: any) => containsAwait(s));
    if (idx >= 0) {
      // Process try-block statements before the await synchronously
      for (let j = 0; j < idx; j++) {
        processNode(tryStmts[j], ctx);
        if (ctx.awaitSuspended) return;
        if (ctx.hasThrown || ctx.hasReturned || ctx.hasBreak || ctx.hasContinue) {
          // Pre-await statement caused abrupt completion. Route through this try's
          // catch/finally as if the await were never reached.
          handleAbruptCompletionInTry(stmt, remainingStmts, ctx);
          return;
        }
      }
      const innerCtx: PendingMicrotask['awaitTryContext'] = {
        catchParam: stmt.handler?.param?.name,
        catchBody: stmt.handler?.body?.body,
        finallyBody: stmt.finalizer?.body,
        statementsAfterTry: remainingStmts,
        restOfTry: tryStmts.slice(idx + 1),
      };
      processStatementWithAwait(tryStmts[idx], [], ctx, innerCtx);
      return;
    }
    // No await actually in try block — process the try statement normally
    processNode(stmt, ctx);
    if (!ctx.awaitSuspended) processBody(remainingStmts, ctx);
    return;
  }

  if (stmt.type === 'ExpressionStatement') {
    const expr = stmt.expression;
    if (expr.type === 'AwaitExpression') {
      awaitedValue = evaluateExpression(expr.argument, ctx);
    } else if (expr.type === 'AssignmentExpression' && expr.right?.type === 'AwaitExpression') {
      assignTo = expr.left?.type === 'Identifier' ? expr.left.name : undefined;
      awaitedValue = evaluateExpression(expr.right.argument, ctx);
    } else {
      const awaitArg = findAwaitArgument(expr);
      if (awaitArg) awaitedValue = evaluateExpression(awaitArg, ctx);
      else awaitedValue = evaluateExpression(expr, ctx);
    }
  } else if (stmt.type === 'VariableDeclaration') {
    const decl = stmt.declarations[0];
    assignTo = decl.id?.type === 'Identifier' ? decl.id.name : undefined;
    if (decl.init?.type === 'AwaitExpression') {
      awaitedValue = evaluateExpression(decl.init.argument, ctx);
    } else {
      const awaitArg = findAwaitArgument(decl.init);
      if (awaitArg) awaitedValue = evaluateExpression(awaitArg, ctx);
      else awaitedValue = evaluateExpression(decl.init, ctx);
    }
  } else if (stmt.type === 'ReturnStatement') {
    isReturn = true;
    if (stmt.argument?.type === 'AwaitExpression') {
      awaitedValue = evaluateExpression(stmt.argument.argument, ctx);
    } else {
      const awaitArg = findAwaitArgument(stmt.argument);
      if (awaitArg) awaitedValue = evaluateExpression(awaitArg, ctx);
      else awaitedValue = evaluateExpression(stmt.argument, ctx);
    }
  } else {
    awaitedValue = undefined;
  }

  let awaitedPromiseId: string;
  if (awaitedValue && typeof awaitedValue === 'object' && awaitedValue.__promiseId) {
    awaitedPromiseId = awaitedValue.__promiseId;
  } else {
    awaitedPromiseId = createPromise(ctx, 'resolved', awaitedValue);
  }

  ctx.steps.push({ type: 'highlight-line', line, data: { line } });
  ctx.steps.push({ type: 'pop-stack', line, data: {} });
  ctx.awaitSuspended = true;

  const asyncFuncName = ctx.currentAsyncFuncName!;
  const asyncPromiseId = ctx.currentAsyncPromiseId!;
  const closureVars = new Map(ctx.variables);

  if (isReturn) {
    remainingStmts = [];
  }

  const scheduleContinuation = (value: any, isRejection: boolean) => {
    const continuationId = generateId();
    const continuation: PendingMicrotask = {
      id: continuationId, body: null, line,
      callbackStr: `${asyncFuncName} (after await)`,
      params: [], args: [value],
      isAsyncResume: true, asyncFuncName,
      remainingStatements: remainingStmts, assignTo: isReturn ? undefined : assignTo,
      asyncPromiseId, closureVars,
      awaitTryContext, awaitWasRejection: isRejection,
    };
    if (isReturn && !isRejection) {
      const returnContId = generateId();
      const returnCont: PendingMicrotask = {
        id: returnContId, body: null, line,
        callbackStr: `${asyncFuncName} (return)`,
        params: [], args: [value],
        isAsyncResume: true, asyncFuncName,
        remainingStatements: [],
        asyncPromiseId, closureVars: new Map(),
      };
      scheduleMicrotask(ctx, returnCont);
    } else {
      scheduleMicrotask(ctx, continuation);
    }
  };

  const awaitedPromise = ctx.promises.get(awaitedPromiseId);
  if (awaitedPromise) {
    if (awaitedPromise.state === 'resolved') {
      scheduleContinuation(awaitedPromise.value, false);
    } else if (awaitedPromise.state === 'rejected') {
      scheduleContinuation(awaitedPromise.error, true);
    } else {
      awaitedPromise.onResolve.push((value) => scheduleContinuation(value, false));
      awaitedPromise.onReject.push((error) => scheduleContinuation(error, true));
    }
  }
}

// When abrupt completion occurs in a try block before/around a (skipped) await,
// route through the try's catch/finally synchronously, then run the after-try statements.
function handleAbruptCompletionInTry(tryStmt: any, statementsAfterTry: any[], ctx: ExecutionContext): void {
  if (ctx.hasThrown && tryStmt.handler) {
    const error = ctx.thrownError;
    ctx.hasThrown = false;
    ctx.thrownError = undefined;
    const param = tryStmt.handler.param?.name;
    let savedHadCatch = false; let savedCatchVal: any;
    if (param) {
      savedHadCatch = ctx.variables.has(param);
      savedCatchVal = ctx.variables.get(param);
      ctx.variables.set(param, error);
    }
    processBody(tryStmt.handler.body.body, ctx);
    if (param) {
      if (savedHadCatch) ctx.variables.set(param, savedCatchVal);
      else ctx.variables.delete(param);
    }
  }
  if (tryStmt.finalizer) {
    processBody(tryStmt.finalizer.body, ctx);
  }
  if (!ctx.hasThrown && !ctx.hasReturned && !ctx.hasBreak && !ctx.hasContinue) {
    processBody(statementsAfterTry, ctx);
  }
}

function findAwaitArgument(node: any): any {
  if (!node) return null;
  if (node.type === 'AwaitExpression') return node.argument;
  if (node.type === 'CallExpression') {
    for (const arg of node.arguments || []) {
      const found = findAwaitArgument(arg);
      if (found) return found;
    }
    return findAwaitArgument(node.callee);
  }
  if (node.type === 'MemberExpression') return findAwaitArgument(node.object);
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    return findAwaitArgument(node.left) || findAwaitArgument(node.right);
  }
  return null;
}

function processBody(statements: any[], ctx: ExecutionContext): void {
  for (let i = 0; i < statements.length; i++) {
    if (ctx.hasReturned || ctx.hasThrown || ctx.awaitSuspended) break;
    if (ctx.steps.length > ctx.stepLimit) break;

    const stmt = statements[i];

    if (ctx.currentAsyncFuncName && containsAwait(stmt)) {
      processStatementWithAwait(stmt, statements.slice(i + 1), ctx);
      break;
    }

    processNode(stmt, ctx);
  }
}

function processNode(node: any, ctx: ExecutionContext): void {
  if (!node || ctx.hasReturned || ctx.hasThrown || ctx.awaitSuspended || ctx.hasBreak || ctx.hasContinue) return;
  if (ctx.steps.length > ctx.stepLimit) return;

  const line = getNodeLine(node);

  switch (node.type) {
    case 'ExpressionStatement':
      evaluateExpression(node.expression, ctx);
      if (node.expression.type === 'AssignmentExpression' || 
          node.expression.type === 'UpdateExpression') {
        emitMemorySnapshot(ctx, line);
      }
      break;

    case 'VariableDeclaration': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      // Emit explanation for variable declaration types
      if (node.kind === 'var') {
        emitExplanation(ctx, line, {
          title: 'var Declaration (Function-Scoped)',
          description: 'var is function-scoped and hoisted to the top of its scope. It is initialized as undefined during the creation phase, before any code executes.',
          specRef: 'ECMAScript \u00a714.3.2 Variable Statement',
          specUrl: 'https://tc39.es/ecma262/#sec-variable-statement',
          category: 'hoisting',
        });
      } else if (node.kind === 'let') {
        emitExplanation(ctx, line, {
          title: 'let Declaration (Block-Scoped)',
          description: 'let is block-scoped and subject to the Temporal Dead Zone (TDZ). It cannot be accessed before this declaration line. Unlike var, it is not initialized during hoisting.',
          specRef: 'ECMAScript \u00a714.3.1 Let and Const Declarations',
          specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
          category: 'scope',
        });
      } else if (node.kind === 'const') {
        emitExplanation(ctx, line, {
          title: 'const Declaration (Block-Scoped, Immutable Binding)',
          description: 'const creates a block-scoped, read-only binding. The variable cannot be reassigned, but if it holds an object, the object\'s properties can still be modified.',
          specRef: 'ECMAScript \u00a714.3.1 Let and Const Declarations',
          specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
          category: 'scope',
        });
      }
      const currentFrame = ctx.callStackFrames.length > 0 ? ctx.callStackFrames[ctx.callStackFrames.length - 1] : null;
      for (const decl of node.declarations) {
        const val = decl.init ? evaluateExpression(decl.init, ctx) : undefined;
        if (decl.id?.type === 'Identifier') {
          const name = decl.id.name;
          // Phase 1B: Remove from TDZ when let/const is actually declared
          ctx.tdzBindings.delete(name);
          ctx.variables.set(name, val);
          if (node.kind === 'const') ctx.constBindings.add(name);
          if (currentFrame) currentFrame.localVarNames.add(name);
        } else {
          // Use universal bindPattern for ObjectPattern, ArrayPattern, etc.
          bindPattern(decl.id, val, ctx, currentFrame);
          // Track const bindings from destructuring
          if (node.kind === 'const') {
            collectPatternNames(decl.id).forEach(n => ctx.constBindings.add(n));
          }
          // Remove TDZ for all names in the pattern
          collectPatternNames(decl.id).forEach(n => ctx.tdzBindings.delete(n));
        }
      }
      emitMemorySnapshot(ctx, line);
      break;
    }

    case 'FunctionDeclaration': {
      const name = node.id?.name;
      if (name) {
        ctx.functions.set(name, node);
        ctx.variables.set(name, node);
      }
      break;
    }

    case 'ReturnStatement':
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      ctx.returnValue = node.argument ? evaluateExpression(node.argument, ctx) : undefined;
      ctx.hasReturned = true;
      break;

    case 'ThrowStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      ctx.thrownError = node.argument ? evaluateExpression(node.argument, ctx) : { type: 'Error', message: 'Error' };
      ctx.hasThrown = true;
      break;
    }

    case 'IfStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const test = evaluateExpression(node.test, ctx);
      // Phase 3: Detect implicit ToBoolean coercion
      if (typeof test !== 'boolean' && node.test.type !== 'BinaryExpression' && node.test.type !== 'LogicalExpression' && node.test.type !== 'UnaryExpression') {
        const truthiness = test ? 'truthy' : 'falsy';
        const falsyList = 'false, 0, -0, 0n, "", null, undefined, NaN';
        emitExplanation(ctx, line, {
          title: `Implicit ToBoolean — ${truthiness}`,
          description: `The if-condition evaluates to ${formatValue(test)} (${typeof test}), which is ${truthiness}. In JS, the falsy values are: ${falsyList}. Everything else is truthy, including "0", [] and {}.`,
          specRef: 'ECMAScript \u00a77.1.2 ToBoolean',
          specUrl: 'https://tc39.es/ecma262/#sec-toboolean',
          category: 'type-coercion',
        });
      }
      if (test) {
        if (node.consequent.type === 'BlockStatement') processBody(node.consequent.body, ctx);
        else processNode(node.consequent, ctx);
      } else if (node.alternate) {
        if (node.alternate.type === 'BlockStatement') processBody(node.alternate.body, ctx);
        else processNode(node.alternate, ctx);
      }
      break;
    }

    case 'ForStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      if (node.init) {
        if (node.init.type === 'VariableDeclaration') processNode(node.init, ctx);
        else evaluateExpression(node.init, ctx);
      }
      // Save parent loop label — this loop's own label (if any) is set by LabeledStatement
      const forOwnLabel = ctx._currentLoopLabel;
      // Collect block-scoped const names from loop body
      const forBlockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body || []) {
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.type === 'Identifier') forBlockConsts.push(d.id.name);
              else if (d.id) { const names = collectPatternNames(d.id); for (const n of names) forBlockConsts.push(n); }
            }
          }
        }
      }
      let forIterations = 0;
      // Clear _currentLoopLabel so nested loops don't inherit our label
      ctx._currentLoopLabel = null;
      while (forIterations < 100) {
        if (ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) { if (ctx.breakLabel !== null) break; else break; }
        if (node.test) {
          const test = evaluateExpression(node.test, ctx);
          if (!test) break;
        }
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        // Clear block-scoped const bindings for this iteration
        for (const n of forBlockConsts) ctx.constBindings.delete(n);
        if (node.body.type === 'BlockStatement') processBody(node.body.body, ctx);
        else processNode(node.body, ctx);
        if (ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) break;
        // Handle labeled continue — if label targets an outer loop, propagate outward
        if (ctx.hasContinue && ctx.continueLabel !== null && ctx.continueLabel !== forOwnLabel) break;
        // Consume continue (unlabeled or targeting this loop's label)
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        if (node.update) evaluateExpression(node.update, ctx);
        forIterations++;
      }
      // Restore label
      ctx._currentLoopLabel = forOwnLabel;
      // Only consume break if it targets this loop (no label or matching label)
      if (ctx.hasBreak && (ctx.breakLabel === null || ctx.breakLabel === forOwnLabel)) {
        ctx.hasBreak = false;
        ctx.breakLabel = null;
      }
      break;
    }

    case 'WhileStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const whileOwnLabel = ctx._currentLoopLabel;
      // Collect block-scoped const names from loop body
      const whileBlockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body || []) {
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.type === 'Identifier') whileBlockConsts.push(d.id.name);
              else if (d.id) { const names = collectPatternNames(d.id); for (const n of names) whileBlockConsts.push(n); }
            }
          }
        }
      }
      let whileIterations = 0;
      ctx._currentLoopLabel = null;
      while (whileIterations < 100) {
        if (ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) break;
        const test = evaluateExpression(node.test, ctx);
        if (!test) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        // Clear block-scoped const bindings for this iteration
        for (const n of whileBlockConsts) ctx.constBindings.delete(n);
        if (node.body.type === 'BlockStatement') processBody(node.body.body, ctx);
        else processNode(node.body, ctx);
        // Handle labeled continue targeting outer loop (not this one)
        if (ctx.hasContinue && ctx.continueLabel !== null && ctx.continueLabel !== whileOwnLabel) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        whileIterations++;
      }
      ctx._currentLoopLabel = whileOwnLabel;
      if (ctx.hasBreak && (ctx.breakLabel === null || ctx.breakLabel === whileOwnLabel)) {
        ctx.hasBreak = false;
        ctx.breakLabel = null;
      }
      break;
    }

    case 'DoWhileStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const doOwnLabel = ctx._currentLoopLabel;
      const doBlockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body || []) {
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.type === 'Identifier') doBlockConsts.push(d.id.name);
              else if (d.id) { const names = collectPatternNames(d.id); for (const n of names) doBlockConsts.push(n); }
            }
          }
        }
      }
      let doIterations = 0;
      ctx._currentLoopLabel = null;
      do {
        if (ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        for (const n of doBlockConsts) ctx.constBindings.delete(n);
        if (node.body.type === 'BlockStatement') processBody(node.body.body, ctx);
        else processNode(node.body, ctx);
        doIterations++;
        if (ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) break;
        if (ctx.hasContinue && ctx.continueLabel !== null && ctx.continueLabel !== doOwnLabel) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        const test = evaluateExpression(node.test, ctx);
        if (!test) break;
      } while (doIterations < 100);
      ctx._currentLoopLabel = doOwnLabel;
      if (ctx.hasBreak && (ctx.breakLabel === null || ctx.breakLabel === doOwnLabel)) {
        ctx.hasBreak = false;
        ctx.breakLabel = null;
      }
      break;
    }

    case 'ForOfStatement':
    case 'ForInStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const iterable = evaluateExpression(node.right, ctx);

      // Determine the left-hand side pattern (simple name or destructuring)
      const leftDecl = node.left.type === 'VariableDeclaration' ? node.left.declarations[0] : null;
      const leftPattern = leftDecl ? leftDecl.id : (node.left.type === 'Identifier' ? node.left : node.left);
      const isSimpleVar = leftPattern?.type === 'Identifier';
      const varName = isSimpleVar ? leftPattern.name : undefined;

      // Build iterable items array with Map/Set/Generator support
      let items: any[] = [];
      if (node.type === 'ForInStatement') {
        // for...in: enumerate keys
        if (Array.isArray(iterable)) items = iterable.map((_, i) => String(i));
        else if (typeof iterable === 'string') items = iterable.split('').map((_, i) => String(i));
        else if (typeof iterable === 'object' && iterable !== null) {
          // Skip internal __type, __entries, etc. properties
          items = Object.keys(iterable).filter(k => !k.startsWith('__'));
        }
      } else {
        // for...of: iterate values
        if (Array.isArray(iterable)) items = iterable;
        else if (typeof iterable === 'string') items = iterable.split('');
        else if (typeof iterable === 'object' && iterable !== null) {
          if (iterable.__type === 'Map') items = (iterable.__entries || []).map((e: any) => e);
          else if (iterable.__type === 'Set') items = [...(iterable.__values || [])];
          else if (iterable.__type === 'Generator') {
            // Iterate generator by calling .next() repeatedly
            const genItems: any[] = [];
            for (let i = 0; i < 100; i++) {
              const result = callGeneratorNext(iterable, undefined, ctx);
              if (result.done) break;
              genItems.push(result.value);
            }
            items = genItems;
          } else if (iterable.__type === 'AsyncGenerator') {
            // for await...of with async generator — pre-collect values
            const asyncItems: any[] = [];
            if (iterable.__state === 'suspended-start') {
              iterable.__yieldValues = [];
              iterable.__returnValue = undefined;
              iterable.__yieldIndex = 0;
              const funcNode = iterable.__funcNode;
              const savedVarsAG = iterable.__savedVars || new Map(ctx.variables);
              const prevVarsAG = new Map(ctx.variables);
              for (const [k, v] of savedVarsAG) ctx.variables.set(k, v);
              const savedStepsAG = ctx.steps;
              const savedStepLimitAG = ctx.stepLimit;
              const savedHasReturnedAG = ctx.hasReturned;
              const savedConstBindingsAG = new Set(ctx.constBindings);
              ctx.steps = [];
              ctx.stepLimit = 100000;
              collectYields(funcNode.body, ctx, iterable.__yieldValues, iterable);
              ctx.steps = savedStepsAG;
              ctx.stepLimit = savedStepLimitAG;
              ctx.hasReturned = savedHasReturnedAG;
              ctx.constBindings = savedConstBindingsAG;
              for (const [k, v] of prevVarsAG) ctx.variables.set(k, v);
              iterable.__state = 'suspended-yield';
            }
            for (let i = iterable.__yieldIndex || 0; i < (iterable.__yieldValues || []).length; i++) {
              asyncItems.push(iterable.__yieldValues[i]);
            }
            items = asyncItems;
          } else if (iterable.__symbol_iterator || iterable['__symbol_Symbol.iterator']) {
            // Custom iterable via [Symbol.iterator]()
            const iteratorMethod = iterable.__symbol_iterator || iterable['__symbol_Symbol.iterator'];
            if (iteratorMethod && typeof iteratorMethod === 'object' && (iteratorMethod.type === 'FunctionExpression' || iteratorMethod.type === 'ArrowFunctionExpression' || iteratorMethod.type === 'FunctionDeclaration')) {
              const iterator = callFunction(iteratorMethod, [], '[Symbol.iterator]', ctx, getNodeLine(node), iterable);
              if (iterator && typeof iterator === 'object') {
                if (iterator.__type === 'Generator') {
                  // The iterator is a generator — use callGeneratorNext
                  for (let gi = 0; gi < 100; gi++) {
                    const r = callGeneratorNext(iterator, undefined, ctx);
                    if (r.done) break;
                    items.push(r.value);
                  }
                } else if (iterator.next && typeof iterator.next === 'object') {
                  // Manual iterator with .next() method
                  for (let gi = 0; gi < 100; gi++) {
                    const r = callFunction(iterator.next, [], 'iterator.next', ctx, getNodeLine(node), iterator);
                    if (r && r.done) break;
                    if (r) items.push(r.value);
                  }
                }
              }
            }
          } else {
            items = Object.values(iterable);
          }
        }
      }

      if (varName && node.left.type === 'VariableDeclaration') {
        const cf = ctx.callStackFrames.length > 0 ? ctx.callStackFrames[ctx.callStackFrames.length - 1] : null;
        if (cf) cf.localVarNames.add(varName);
      }
      const forOfOwnLabel = ctx._currentLoopLabel;
      // Collect block-scoped const names from loop body
      const forOfBlockConsts: string[] = [];
      if (node.body.type === 'BlockStatement') {
        for (const s of node.body.body || []) {
          if (s.type === 'VariableDeclaration' && s.kind === 'const') {
            for (const d of s.declarations || []) {
              if (d.id?.type === 'Identifier') forOfBlockConsts.push(d.id.name);
              else if (d.id) { const names = collectPatternNames(d.id); for (const n of names) forOfBlockConsts.push(n); }
            }
          }
        }
      }
      let forOfIterations = 0;
      ctx._currentLoopLabel = null;
      for (const item of items) {
        if (forOfIterations >= 100 || ctx.hasReturned || ctx.hasThrown) break;
        if (ctx.hasBreak) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        // Clear block-scoped const bindings for this iteration
        for (const n of forOfBlockConsts) ctx.constBindings.delete(n);
        // Bind iteration variable (simple or destructuring)
        if (isSimpleVar && varName) {
          ctx.variables.set(varName, item);
        } else if (leftPattern) {
          bindPattern(leftPattern, item, ctx);
        }
        if (node.body.type === 'BlockStatement') processBody(node.body.body, ctx);
        else processNode(node.body, ctx);
        // Handle labeled continue targeting outer loop (not this one)
        if (ctx.hasContinue && ctx.continueLabel !== null && ctx.continueLabel !== forOfOwnLabel) break;
        ctx.hasContinue = false;
        ctx.continueLabel = null;
        forOfIterations++;
      }
      ctx._currentLoopLabel = forOfOwnLabel;
      if (ctx.hasBreak && (ctx.breakLabel === null || ctx.breakLabel === forOfOwnLabel)) {
        ctx.hasBreak = false;
        ctx.breakLabel = null;
      }
      break;
    }

    case 'SwitchStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const discriminant = evaluateExpression(node.discriminant, ctx);
      let matched = false;
      let defaultCase: any = null;
      let defaultIndex = -1;
      const cases = node.cases || [];
      // Find default case location
      for (let i = 0; i < cases.length; i++) {
        if (!cases[i].test) { defaultCase = cases[i]; defaultIndex = i; }
      }
      // Find first matching case
      let startIndex = -1;
      for (let i = 0; i < cases.length; i++) {
        if (!cases[i].test) continue;
        const testVal = evaluateExpression(cases[i].test, ctx);
        if (testVal === discriminant) { startIndex = i; matched = true; break; }
      }
      if (!matched && defaultCase) { startIndex = defaultIndex; matched = true; }
      // Execute from matched case, falling through until break
      if (matched && startIndex >= 0) {
        for (let i = startIndex; i < cases.length; i++) {
          processBody(cases[i].consequent, ctx);
          if (ctx.hasBreak || ctx.hasReturned || ctx.hasThrown) break;
        }
      }
      ctx.hasBreak = false; // consume break
      break;
    }

    case 'TryStatement': {
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      const savedThrown = ctx.hasThrown;
      const savedError = ctx.thrownError;
      ctx.hasThrown = false;
      ctx.thrownError = undefined;

      processBody(node.block.body, ctx);

      if (ctx.hasThrown && node.handler) {
        const error = ctx.thrownError;
        ctx.hasThrown = false;
        ctx.thrownError = undefined;
        const catchParam = node.handler.param?.name;
        let savedCatch: any;
        let hadCatchVar = false;
        if (catchParam) {
          hadCatchVar = ctx.variables.has(catchParam);
          savedCatch = ctx.variables.get(catchParam);
          ctx.variables.set(catchParam, error);
        }
        processBody(node.handler.body.body, ctx);
        if (catchParam) {
          if (hadCatchVar) ctx.variables.set(catchParam, savedCatch);
          else ctx.variables.delete(catchParam);
        }
      }

      if (node.finalizer) {
        // Per spec: finally runs even when control flow leaves the try/catch via
        // return / break / continue / throw. Save abrupt completion state, clear it,
        // run the finalizer, then restore — unless finally itself causes a new abrupt completion.
        const thrownBeforeFinally = ctx.hasThrown;
        const errorBeforeFinally = ctx.thrownError;
        const returnedBeforeFinally = ctx.hasReturned;
        const returnValueBeforeFinally = ctx.returnValue;
        const breakBeforeFinally = ctx.hasBreak;
        const continueBeforeFinally = ctx.hasContinue;
        const breakLabelBeforeFinally = ctx.breakLabel;
        const continueLabelBeforeFinally = ctx.continueLabel;
        ctx.hasThrown = false;
        ctx.thrownError = undefined;
        ctx.hasReturned = false;
        ctx.returnValue = undefined;
        ctx.hasBreak = false;
        ctx.hasContinue = false;
        ctx.breakLabel = null;
        ctx.continueLabel = null;
        processBody(node.finalizer.body, ctx);
        // If finally completed normally, restore the previous abrupt completion (if any)
        if (!ctx.hasThrown && !ctx.hasReturned && !ctx.hasBreak && !ctx.hasContinue) {
          if (thrownBeforeFinally) { ctx.hasThrown = true; ctx.thrownError = errorBeforeFinally; }
          if (returnedBeforeFinally) { ctx.hasReturned = true; ctx.returnValue = returnValueBeforeFinally; }
          if (breakBeforeFinally) { ctx.hasBreak = true; ctx.breakLabel = breakLabelBeforeFinally; }
          if (continueBeforeFinally) { ctx.hasContinue = true; ctx.continueLabel = continueLabelBeforeFinally; }
        }
      }

      if (!ctx.hasThrown) {
        ctx.hasThrown = savedThrown;
        ctx.thrownError = savedError;
      }
      break;
    }

    case 'BlockStatement':
      processBody(node.body, ctx);
      break;

    case 'ClassDeclaration': {
      const className = node.id?.name;
      if (className) {
        // Process static members and store on the class node
        const statics: Record<string, any> = {};
        const classBody = node.body;
        if (classBody?.type === 'ClassBody') {
          for (const member of classBody.body || []) {
            if (member.static) {
              const sKeyName = member.key?.type === 'PrivateIdentifier'
                ? `__private_#${member.key.name}` : member.key?.name;
              if (member.type === 'MethodDefinition' && sKeyName) {
                if (member.kind === 'method') statics[sKeyName] = member.value;
                if (member.kind === 'get') {
                  if (!statics.__getters) statics.__getters = {};
                  statics.__getters[sKeyName] = member.value;
                }
                if (member.kind === 'set') {
                  if (!statics.__setters) statics.__setters = {};
                  statics.__setters[sKeyName] = member.value;
                }
              }
              if (member.type === 'PropertyDefinition' && sKeyName) {
                statics[sKeyName] = member.value ? evaluateExpression(member.value, ctx) : undefined;
              }
            }
            // Static Initialization Block (ES2022)
            if (member.type === 'StaticBlock') {
              // Will be executed after class is registered
              // Mark for deferred execution
              if (!node.__staticBlocks) node.__staticBlocks = [];
              node.__staticBlocks.push(member);
            }
          }
        }
        if (Object.keys(statics).length > 0) {
          node.__statics = statics;
        }
        // Resolve parent class if extends
        if (node.superClass) {
          const parentName = node.superClass.name || node.superClass.id?.name;
          if (parentName) {
            const parentClass = ctx.functions.get(parentName) || ctx.variables.get(parentName);
            if (parentClass) node.__parentClass = parentClass;
          }
        }
        ctx.functions.set(className, node);
        ctx.variables.set(className, node);
        // Execute static initialization blocks with 'this' = the class itself
        if (node.__staticBlocks) {
          const savedThis = ctx.thisBinding;
          ctx.thisBinding = node;
          for (const block of node.__staticBlocks) {
            if (block.body && Array.isArray(block.body)) {
              processBody(block.body, ctx);
            }
          }
          ctx.thisBinding = savedThis;
        }
      }
      break;
    }

    case 'EmptyStatement':
      break;

    case 'BreakStatement':
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      ctx.hasBreak = true;
      ctx.breakLabel = node.label?.name || null;
      break;

    case 'ContinueStatement':
      ctx.steps.push({ type: 'highlight-line', line, data: { line } });
      ctx.hasContinue = true;
      ctx.continueLabel = node.label?.name || null;
      break;

    case 'LabeledStatement': {
      const labelName = node.label?.name;
      const bodyType = node.body?.type;
      const isLoop = bodyType === 'ForStatement' || bodyType === 'WhileStatement' || bodyType === 'DoWhileStatement' || bodyType === 'ForOfStatement' || bodyType === 'ForInStatement';
      // Set current loop label so loops can recognize their own label for continue
      const savedLoopLabel = ctx._currentLoopLabel;
      if (isLoop) ctx._currentLoopLabel = labelName;
      processNode(node.body, ctx);
      ctx._currentLoopLabel = savedLoopLabel;
      // Consume break/continue if label matches
      if (ctx.hasBreak && ctx.breakLabel === labelName) {
        ctx.hasBreak = false;
        ctx.breakLabel = null;
      }
      if (ctx.hasContinue && ctx.continueLabel === labelName) {
        ctx.hasContinue = false;
        ctx.continueLabel = null;
      }
      break;
    }

    case 'ImportDeclaration':
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
      if (node.declaration) processNode(node.declaration, ctx);
      break;

    default:
      evaluateExpression(node, ctx);
      break;
  }
}

// Lightweight callback executor that handles ALL parameter types (including destructuring)
function executeCallback(funcNode: any, args: any[], ctx: ExecutionContext): any {
  const savedHasReturned = ctx.hasReturned;
  const savedReturnValue = ctx.returnValue;
  const savedHasThrown = ctx.hasThrown;
  const savedThrownError = ctx.thrownError;
  ctx.hasReturned = false;
  ctx.returnValue = undefined;
  ctx.hasThrown = false;
  ctx.thrownError = undefined;

  // Save/restore outer values for parameter names so the callback's params don't leak.
  // Also remove param names from TDZ (they shadow outer let/const bindings).
  const paramNames: string[] = [];
  for (const p of funcNode.params || []) paramNames.push(...collectPatternNames(p));
  const savedParamVals: Array<{ name: string; had: boolean; val: any }> = [];
  for (const name of paramNames) {
    savedParamVals.push({ name, had: ctx.variables.has(name), val: ctx.variables.get(name) });
  }
  const savedTdz = new Set(ctx.tdzBindings);
  for (const name of paramNames) ctx.tdzBindings.delete(name);

  // Bind params (including destructuring patterns)
  for (let i = 0; i < (funcNode.params || []).length; i++) {
    const param = funcNode.params[i];
    if (!param) continue;
    if (param.type === 'Identifier') {
      ctx.variables.set(param.name, args[i]);
    } else if (param.type === 'ArrayPattern' || param.type === 'ObjectPattern') {
      bindPattern(param, args[i], ctx);
    } else if (param.type === 'AssignmentPattern') {
      const name = param.left?.name;
      if (name) ctx.variables.set(name, args[i] !== undefined ? args[i] : evaluateExpression(param.right, ctx));
    } else if (param.type === 'RestElement' && param.argument?.name) {
      ctx.variables.set(param.argument.name, args.slice(i));
    }
  }

  // Execute body
  const body = funcNode.body;
  let result: any;
  if (!body) result = undefined;
  else if (body.type === 'BlockStatement') { processBody(body.body, ctx); result = ctx.returnValue; }
  else result = evaluateExpression(body, ctx);

  const ret = ctx.hasReturned ? ctx.returnValue : result;
  ctx.hasReturned = savedHasReturned;
  ctx.returnValue = savedReturnValue;
  ctx.hasThrown = savedHasThrown;
  ctx.thrownError = savedThrownError;

  // Restore outer parameter-name values and TDZ state
  for (const { name, had, val } of savedParamVals) {
    if (had) ctx.variables.set(name, val);
    else ctx.variables.delete(name);
  }
  ctx.tdzBindings = savedTdz;
  return ret;
}

function executeCallbackBody(body: any, ctx: ExecutionContext, params: string[], args: any[], closureVars?: Map<string, any>): any {
  const savedHasReturned = ctx.hasReturned;
  const savedReturnValue = ctx.returnValue;
  const savedHasThrown = ctx.hasThrown;
  const savedThrownError = ctx.thrownError;

  ctx.hasReturned = false;
  ctx.returnValue = undefined;
  ctx.hasThrown = false;
  ctx.thrownError = undefined;

  // Parameters shadow outer TDZ-tracked names while the callback runs.
  const savedTdz = new Set(ctx.tdzBindings);
  for (const name of params) if (name) ctx.tdzBindings.delete(name);

  if (closureVars) {
    for (const [k, v] of closureVars) ctx.variables.set(k, v);
  }

  for (let i = 0; i < params.length; i++) {
    if (params[i]) ctx.variables.set(params[i], args[i]);
  }

  let result: any;
  if (!body) {
    result = undefined;
  } else if (body.type === 'BlockStatement') {
    processBody(body.body, ctx);
    result = ctx.returnValue;
  } else {
    result = evaluateExpression(body, ctx);
  }

  const ret = ctx.hasReturned ? ctx.returnValue : result;
  const threw = ctx.hasThrown;
  const thrownErr = ctx.thrownError;

  ctx.hasReturned = savedHasReturned;
  ctx.returnValue = savedReturnValue;
  ctx.hasThrown = threw ? true : savedHasThrown;
  ctx.thrownError = threw ? thrownErr : savedThrownError;
  ctx.tdzBindings = savedTdz;

  return ret;
}

function processMicrotaskCallback(task: PendingMicrotask, ctx: ExecutionContext): void {
  const line = task.line;

  ctx.steps.push({ type: 'remove-microtask', data: { id: task.id } });
  ctx.steps.push({
    type: 'push-stack', line,
    data: { id: generateId(), name: task.callbackStr || 'microtask', line, type: 'callback' as const } as StackFrame,
  });

  if (task.isFinallyPassThrough) {
    if (task.body) executeCallbackBody(task.body, ctx, [], [], task.closureVars);
    ctx.steps.push({ type: 'pop-stack', line, data: {} });
    if (task.promiseId) {
      if (task.finallyIsRejection) rejectPromise(ctx, task.promiseId, task.finallyValue);
      else resolvePromise(ctx, task.promiseId, task.finallyValue);
    }
  } else {
    const savedThrown = ctx.hasThrown;
    const savedError = ctx.thrownError;
    ctx.hasThrown = false;
    ctx.thrownError = undefined;

    const returnValue = executeCallbackBody(task.body, ctx, task.params, task.args, task.closureVars);

    const threw = ctx.hasThrown;
    const thrownErr = ctx.thrownError;
    ctx.hasThrown = savedThrown;
    ctx.thrownError = savedError;

    ctx.steps.push({ type: 'pop-stack', line, data: {} });

    if (task.promiseId) {
      if (threw) rejectPromise(ctx, task.promiseId, thrownErr);
      else resolvePromise(ctx, task.promiseId, returnValue);
    }
  }
}

function processAsyncResumeMicrotask(task: PendingMicrotask, ctx: ExecutionContext): void {
  const line = task.line;

  ctx.steps.push({ type: 'remove-microtask', data: { id: task.id } });
  ctx.steps.push({
    type: 'push-stack', line,
    data: { id: generateId(), name: `${task.asyncFuncName} (resumed)`, line, type: 'callback' as const } as StackFrame,
  });

  if (task.closureVars) {
    for (const [k, v] of task.closureVars) ctx.variables.set(k, v);
  }

  const savedAsyncName = ctx.currentAsyncFuncName;
  const savedAsyncPromiseId = ctx.currentAsyncPromiseId;
  const savedHasReturned = ctx.hasReturned;
  const savedReturnValue = ctx.returnValue;
  const savedAwaitSuspended = ctx.awaitSuspended;
  const savedHasThrown = ctx.hasThrown;
  const savedThrownError = ctx.thrownError;

  ctx.currentAsyncFuncName = task.asyncFuncName;
  ctx.currentAsyncPromiseId = task.asyncPromiseId;
  ctx.hasReturned = false;
  ctx.returnValue = undefined;
  ctx.awaitSuspended = false;
  ctx.hasThrown = false;
  ctx.thrownError = undefined;

  const tc = task.awaitTryContext;
  if (tc) {
    // The await was inside a try{} block. Route based on whether it rejected.
    if (task.awaitWasRejection) {
      // Skip rest-of-try; treat the rejection as a thrown exception caught by the handler.
      const error = task.args[0];
      if (tc.catchBody) {
        let savedHad = false; let savedVal: any;
        if (tc.catchParam) {
          savedHad = ctx.variables.has(tc.catchParam);
          savedVal = ctx.variables.get(tc.catchParam);
          ctx.variables.set(tc.catchParam, error);
        }
        processBody(tc.catchBody, ctx);
        if (tc.catchParam) {
          if (savedHad) ctx.variables.set(tc.catchParam, savedVal);
          else ctx.variables.delete(tc.catchParam);
        }
      } else {
        // No catch handler — propagate the rejection
        ctx.hasThrown = true;
        ctx.thrownError = error;
      }
    } else {
      // Resolution path: assign awaited value, then run the rest of the try block.
      if (task.assignTo && task.args.length > 0) {
        ctx.variables.set(task.assignTo, task.args[0]);
      }
      if (tc.restOfTry && tc.restOfTry.length > 0) {
        processBody(tc.restOfTry, ctx);
      }
      // If the rest-of-try threw, run catch handler
      if (ctx.hasThrown && tc.catchBody) {
        const error = ctx.thrownError;
        ctx.hasThrown = false;
        ctx.thrownError = undefined;
        let savedHad = false; let savedVal: any;
        if (tc.catchParam) {
          savedHad = ctx.variables.has(tc.catchParam);
          savedVal = ctx.variables.get(tc.catchParam);
          ctx.variables.set(tc.catchParam, error);
        }
        processBody(tc.catchBody, ctx);
        if (tc.catchParam) {
          if (savedHad) ctx.variables.set(tc.catchParam, savedVal);
          else ctx.variables.delete(tc.catchParam);
        }
      }
    }
    // Run finally (preserves abrupt completion)
    if (tc.finallyBody) {
      const tBefore = ctx.hasThrown, eBefore = ctx.thrownError;
      const rBefore = ctx.hasReturned, vBefore = ctx.returnValue;
      ctx.hasThrown = false; ctx.thrownError = undefined;
      ctx.hasReturned = false; ctx.returnValue = undefined;
      processBody(tc.finallyBody, ctx);
      if (!ctx.hasThrown && !ctx.hasReturned) {
        if (tBefore) { ctx.hasThrown = true; ctx.thrownError = eBefore; }
        if (rBefore) { ctx.hasReturned = true; ctx.returnValue = vBefore; }
      }
    }
    // Continue with statements after the try block (unless we suspended again)
    if (!ctx.awaitSuspended && !ctx.hasReturned && !ctx.hasThrown && tc.statementsAfterTry?.length) {
      processBody(tc.statementsAfterTry, ctx);
    }
  } else {
    // Plain resume (no enclosing try). If the await rejected, treat as a thrown exception.
    if (task.awaitWasRejection) {
      ctx.hasThrown = true;
      ctx.thrownError = task.args[0];
    } else if (task.assignTo && task.args.length > 0) {
      ctx.variables.set(task.assignTo, task.args[0]);
    }
    if (!ctx.hasThrown && task.remainingStatements && task.remainingStatements.length > 0) {
      processBody(task.remainingStatements, ctx);
    }
  }

  const wasSuspended = ctx.awaitSuspended;
  const returnVal = ctx.returnValue;
  const didThrow = ctx.hasThrown;
  const thrownErr = ctx.thrownError;

  ctx.currentAsyncFuncName = savedAsyncName;
  ctx.currentAsyncPromiseId = savedAsyncPromiseId;
  ctx.hasReturned = savedHasReturned;
  ctx.returnValue = savedReturnValue;
  ctx.awaitSuspended = savedAwaitSuspended;
  ctx.hasThrown = savedHasThrown;
  ctx.thrownError = savedThrownError;

  if (!wasSuspended) {
    ctx.steps.push({ type: 'pop-stack', line, data: {} });
    if (task.asyncPromiseId) {
      if (didThrow) rejectPromise(ctx, task.asyncPromiseId, thrownErr);
      else resolvePromise(ctx, task.asyncPromiseId, returnVal);
    }
  }
}

function processMacrotaskCallback(task: PendingMacrotask, ctx: ExecutionContext): void {
  const line = task.line;

  ctx.steps.push({ type: 'remove-webapi', data: { id: task.webApiId } });
  ctx.steps.push({ type: 'remove-task', data: { id: task.id } });

  if (task.fetchPromiseId) {
    resolvePromise(ctx, task.fetchPromiseId, task.fetchResponse);
    return;
  }

  if (!task.body) return;

  ctx.steps.push({
    type: 'push-stack', line,
    data: { id: generateId(), name: task.callbackStr || task.apiName || 'task callback', line, type: 'callback' as const } as StackFrame,
  });

  executeCallbackBody(task.body, ctx, task.params, task.args, task.closureVars);

  ctx.steps.push({ type: 'pop-stack', line, data: {} });
}

function simulateEventLoop(ctx: ExecutionContext): void {
  let safetyCounter = 0;
  const maxIterations = 2000;

  while (safetyCounter < maxIterations && (ctx.pendingMicrotasks.length > 0 || ctx.pendingMacrotasks.length > 0)) {
    safetyCounter++;
    if (ctx.steps.length > ctx.stepLimit) break;

    // Drain all microtasks first (per spec: all microtasks before next macrotask)
    if (ctx.pendingMicrotasks.length > 0) {
      emitExplanation(ctx, 0, {
        title: 'Microtask Queue — Draining',
        description: 'The event loop drains ALL pending microtasks before moving to the next macrotask. This includes Promise callbacks, queueMicrotask, and async function resumptions. New microtasks added during draining are also processed in this cycle.',
        specRef: 'ECMAScript \u00a79.4 Jobs and Host Operations',
        specUrl: 'https://tc39.es/ecma262/#sec-jobs',
        category: 'event-loop',
      });
    }
    while (ctx.pendingMicrotasks.length > 0 && safetyCounter < maxIterations) {
      safetyCounter++;
      if (ctx.steps.length > ctx.stepLimit) break;
      ctx.steps.push({ type: 'event-loop-phase', data: { phase: 'processing-microtask' } });

      const task = ctx.pendingMicrotasks.shift()!;
      if (task.isAsyncResume) {
        processAsyncResumeMicrotask(task, ctx);
      } else {
        processMicrotaskCallback(task, ctx);
      }
    }

    if (ctx.pendingMacrotasks.length > 0) {
      ctx.steps.push({ type: 'event-loop-phase', data: { phase: 'processing-task' } });
      emitExplanation(ctx, 0, {
        title: 'Task Queue — Processing Macrotask',
        description: 'One macrotask is dequeued and executed. After it completes, the event loop will again drain ALL microtasks before picking up the next macrotask. This is why Promise callbacks always run before setTimeout callbacks at the same nesting level.',
        specRef: 'HTML Living Standard \u00a78.1.7 Event Loop Processing',
        specUrl: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model',
        category: 'event-loop',
      });
      ctx.pendingMacrotasks.sort((a, b) => a.delay - b.delay);
      const task = ctx.pendingMacrotasks.shift()!;
      processMacrotaskCallback(task, ctx);
    }
  }

  ctx.steps.push({ type: 'event-loop-phase', data: { phase: 'idle' } });
}

export function parseAndSimulate(code: string): ExecutionStep[] {
  let ast: any;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      locations: true,
    });
  } catch (e: any) {
    return [{
      type: 'console',
      data: { type: 'error', value: `Parse error: ${e.message}` },
      line: 1,
    }];
  }

  timerCounter = 1;

  const ctx: ExecutionContext = {
    steps: [],
    variables: new Map(),
    functions: new Map(),
    promises: new Map(),
    pendingMicrotasks: [],
    pendingMacrotasks: [],
    returnValue: undefined,
    hasReturned: false,
    thrownError: undefined,
    hasThrown: false,
    awaitSuspended: false,
    hasBreak: false,
    hasContinue: false,
    breakLabel: null,
    continueLabel: null,
    stepLimit: 5000,
    callStackFrames: [],
    heapIdMap: new Map(),
    heapIdCounter: 1,
    tdzBindings: new Set(),
    constBindings: new Set(),
    thisBinding: { __type: 'globalThis' },
    scopeStack: [{ bindings: new Map(), kind: 'global' }],
    _currentLoopLabel: null,
  };

  // === HOISTING PASS ===
  // Phase 1: Pre-scan for var declarations and function declarations (hoisted)
  // Also register let/const into TDZ
  let hasHoistedItems = false;
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      const name = node.id?.name;
      if (name) {
        ctx.functions.set(name, node);
        ctx.variables.set(name, node);
        if (!hasHoistedItems) {
          emitExplanation(ctx, 1, {
            title: 'Creation Phase — Hoisting',
            description: 'Before any code executes, the engine scans the entire scope. Function declarations are fully hoisted (available immediately). var declarations are hoisted but set to undefined. let/const enter the Temporal Dead Zone.',
            specRef: 'ECMAScript \u00a710.2.11 FunctionDeclarationInstantiation',
            specUrl: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
            category: 'hoisting',
          });
          hasHoistedItems = true;
        }
      }
    } else if (node.type === 'VariableDeclaration' && node.kind === 'var') {
      // Hoist var declarations to top with value undefined
      for (const decl of node.declarations) {
        if (decl.id?.type === 'Identifier') {
          ctx.variables.set(decl.id.name, undefined);
          if (!hasHoistedItems) {
            emitExplanation(ctx, 1, {
              title: 'Creation Phase — Hoisting',
              description: 'Before any code executes, the engine scans the entire scope. var declarations are hoisted to the top and initialized as undefined. Function declarations are fully hoisted.',
              specRef: 'ECMAScript \u00a710.2.11 FunctionDeclarationInstantiation',
              specUrl: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
              category: 'hoisting',
            });
            hasHoistedItems = true;
          }
        }
      }
    } else if (node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const')) {
      // Register let/const in Temporal Dead Zone
      for (const decl of node.declarations) {
        if (decl.id?.type === 'Identifier') {
          ctx.tdzBindings.add(decl.id.name);
        }
      }
    }
  }

  ctx.steps.push({
    type: 'push-stack', line: 1,
    data: { id: generateId(), name: 'Script', line: 1, type: 'global' as const } as StackFrame,
  });
  ctx.steps.push({ type: 'event-loop-phase', data: { phase: 'executing' } });
  emitMemorySnapshot(ctx, 1);

  processBody(ast.body, ctx);

  ctx.steps.push({ type: 'pop-stack', line: 1, data: {} });

  simulateEventLoop(ctx);

  return ctx.steps;
}
