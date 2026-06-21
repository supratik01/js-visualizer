import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRuntimeStore, type SerializedValue, type MemoryHeapObject } from '@/lib/runtimeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Braces, ChevronRight, Globe, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function didValueChange(
  varName: string,
  scopeVars: Record<string, SerializedValue> | undefined,
  prevScopeVars: Record<string, SerializedValue> | undefined,
): boolean {
  if (!prevScopeVars) return !!scopeVars?.[varName];
  if (!scopeVars) return false;
  const cur = scopeVars[varName];
  const prev = prevScopeVars[varName];
  if (!prev) return true;
  if (!cur) return false;
  return JSON.stringify(cur) !== JSON.stringify(prev);
}

function getValueColor(type: string): string {
  switch (type) {
    case 'string': return 'text-amber-400';
    case 'number': return 'text-emerald-400';
    case 'boolean': return 'text-purple-400';
    case 'null':
    case 'undefined': return 'text-muted-foreground';
    case 'function': return 'text-blue-400';
    case 'symbol': return 'text-pink-400';
    default: return 'text-sky-400';
  }
}

function formatDisplayValue(val: SerializedValue): string {
  if (val.type === 'string') return `"${val.value}"`;
  if (val.type === 'null') return 'null';
  if (val.type === 'undefined') return 'undefined';
  if (val.type === 'boolean') return String(val.value);
  if (val.type === 'number') return String(val.value);
  if (val.type === 'symbol') return String(val.value);
  if (val.type === 'function') return val.value || 'ƒ()';
  return val.value || '{...}';
}

function VariableRow({
  name,
  value,
  changed,
  heapObjects,
  depth = 0,
}: {
  name: string;
  value: SerializedValue;
  changed: boolean;
  heapObjects: MemoryHeapObject[];
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExpandable = !!value.heapId;
  const heapObj = isExpandable ? heapObjects.find(o => o.id === value.heapId) : null;

  return (
    <div style={{ paddingLeft: depth > 0 ? `${depth * 12}px` : undefined }}>
      <motion.div
        data-var-changed={changed ? 'true' : undefined}
        className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded text-xs font-mono ${
          changed ? 'bg-yellow-500/15' : ''
        }`}
        animate={changed ? { backgroundColor: ['rgba(234,179,8,0.2)', 'rgba(234,179,8,0)'] } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        {isExpandable && depth < 3 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <span className="text-cyan-400 truncate flex-shrink-0">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className={`${getValueColor(value.type)} truncate`} title={formatDisplayValue(value)}>
          {formatDisplayValue(value)}
        </span>
        {changed && (
          <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
        )}
      </motion.div>

      <AnimatePresence>
        {expanded && heapObj && depth < 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {Object.entries(heapObj.properties).map(([propName, propVal]) => (
              <VariableRow
                key={propName}
                name={propName}
                value={propVal as SerializedValue}
                changed={false}
                heapObjects={heapObjects}
                depth={depth + 1}
              />
            ))}
            {Object.keys(heapObj.properties).length === 0 && (
              <div className="text-[10px] text-muted-foreground italic pl-8 py-0.5">empty</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScopeSection({
  title,
  icon,
  variables,
  previousVariables,
  heapObjects,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  variables: Record<string, SerializedValue>;
  previousVariables?: Record<string, SerializedValue>;
  heapObjects: MemoryHeapObject[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const entries = Object.entries(variables);
  if (entries.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left px-1 py-1 rounded hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        {icon}
        <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{entries.length}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden ml-1"
          >
            {entries.map(([name, value]) => (
              <VariableRow
                key={name}
                name={name}
                value={value}
                changed={didValueChange(name, variables, previousVariables)}
                heapObjects={heapObjects}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VariableStatePanel() {
  const { currentMemorySnapshotData, previousMemorySnapshotData } = useRuntimeStore();

  const data = currentMemorySnapshotData;
  const prev = previousMemorySnapshotData;

  const scrollRef = useRef<HTMLDivElement>(null);

  // When variables overflow the panel, keep the variable that just changed in
  // view so the user always sees the current step's effect.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const id = requestAnimationFrame(() => {
      const el = container.querySelector<HTMLElement>('[data-var-changed="true"]');
      if (!el) return;
      const c = container.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      const margin = 12;
      let delta = 0;
      if (e.top < c.top + margin) delta = e.top - c.top - margin;
      else if (e.bottom > c.bottom - margin) delta = e.bottom - c.bottom + margin;
      if (delta !== 0) {
        container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [currentMemorySnapshotData]);

  const totalVars = data
    ? Object.keys(data.globalVars).length + data.frames.reduce((sum, f) => sum + Object.keys(f.variables).length, 0)
    : 0;

  return (
    <Card className="bg-card/95 border-border/50 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Braces className="w-4 h-4 text-sky-400" />
          Variables
          {data && totalVars > 0 && (
            <Badge variant="outline" className="ml-auto border-sky-500/50 text-sky-400 text-[10px]">
              {totalVars} vars
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent ref={scrollRef} className="px-4 pb-3 flex-1 overflow-y-auto min-h-0">
        {!data ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-6">
            <Braces className="w-10 h-10 opacity-30" />
            <span className="text-xs text-center leading-relaxed">
              Run code to see<br />variable state
            </span>
          </div>
        ) : (
          <div>
            {/* Global scope */}
            <ScopeSection
              title="Global"
              icon={<Globe className="w-3 h-3 text-emerald-500" />}
              variables={data.globalVars}
              previousVariables={prev?.globalVars}
              heapObjects={data.heapObjects}
            />

            {/* Function scopes (in call stack order, reversed so top-of-stack is first) */}
            {[...data.frames].reverse().map((frame, i) => (
              <ScopeSection
                key={`${frame.name}-${frame.line}-${i}`}
                title={`${frame.name}()`}
                icon={<Layers className="w-3 h-3 text-blue-500" />}
                variables={frame.variables}
                previousVariables={prev?.frames.find(f => f.name === frame.name)?.variables}
                heapObjects={data.heapObjects}
              />
            ))}

            {Object.keys(data.globalVars).length === 0 && data.frames.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4 italic">
                No variables declared yet
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
