/**
 * buildGraphModel
 *
 * Converts a MemorySnapshotData (from the execution engine) into
 * a list of GraphNodes and GraphEdges suitable for the D3
 * force-directed graph renderer.
 *
 * Layout strategy (per the spec):
 *   Stack frames  →  left column (pinned, fx/fy fixed)
 *   Heap objects  →  right column (force-simulated)
 *   Edges         →  variable/property references, drawn as bezier curves
 */

import type { MemorySnapshotData, SerializedValue } from '@/lib/runtimeStore';

// ─── Visual constants ──────────────────────────────────────────────────────

export const FRAME_W        = 210;
export const FRAME_HEADER_H = 38;
export const FRAME_ROW_H    = 26;
export const FRAME_PAD      = 10;

export const HEAP_W         = 210;
export const HEAP_HEADER_H  = 38;
export const HEAP_ROW_H     = 22;
export const HEAP_PAD       = 10;

export const FRAME_GAP      = 16;   // vertical gap between stacked frames
export const HEAP_CLUSTER_R = 180;  // initial scatter radius for heap nodes

// ─── Types ─────────────────────────────────────────────────────────────────

export interface VarEntry  { name: string; val: SerializedValue; }
export interface PropEntry { key: string;  val: SerializedValue; }

/**
 * GraphNode is compatible with d3.SimulationNodeDatum.
 * We manually declare the D3 mutable fields (x, y, vx, vy, fx, fy, index)
 * so we don't need to import D3 here.
 */
export interface GraphNode {
  id:       string;
  nodeType: 'frame' | 'heap';
  label:    string;

  // Frame-only
  vars?:     VarEntry[];
  isGlobal?: boolean;
  isActive?: boolean;

  // Heap-only
  heapType?: 'object' | 'array' | 'function';
  props?:    PropEntry[];

  // Computed visual dimensions
  width:  number;
  height: number;

  // D3 SimulationNodeDatum fields
  x?:     number;
  y?:     number;
  vx?:    number;
  vy?:    number;
  fx?:    number | null;
  fy?:    number | null;
  index?: number;
}

/**
 * GraphEdge is compatible with d3.SimulationLinkDatum<GraphNode>.
 */
export interface GraphEdge {
  id:        string;
  source:    string | GraphNode;  // string initially; D3 replaces with object after link.links()
  target:    string | GraphNode;
  rowIndex:  number;              // which row in the source node the edge starts from
  rowType:   'var' | 'prop';
  label:     string;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Keys to skip for function objects ────────────────────────────────────

const FN_SKIP_KEYS = new Set(['params', 'async', 'length', 'name', 'prototype']);

// ─── Node height calculators ───────────────────────────────────────────────

export function frameHeight(varCount: number): number {
  const rows = Math.min(Math.max(1, varCount), 15); // cap at 15 rows
  return FRAME_HEADER_H + rows * FRAME_ROW_H + FRAME_PAD;
}

export function heapHeight(propCount: number): number {
  const rows = Math.min(Math.max(1, propCount), 15); // cap at 15 rows
  return HEAP_HEADER_H + rows * HEAP_ROW_H + HEAP_PAD;
}

// ─── Main builder ──────────────────────────────────────────────────────────

export function buildGraphModel(snapshot: MemorySnapshotData): GraphModel {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const heapIds = new Set(snapshot.heapObjects.map(o => o.id));

  // ── 1. Build HEAP object nodes ──────────────────────────────────────────
  for (const obj of snapshot.heapObjects) {
    const rawProps = Object.entries(obj.properties);
    const filteredProps = obj.type === 'function'
      ? rawProps.filter(([k]) => !FN_SKIP_KEYS.has(k))
      : rawProps;

    const props: PropEntry[] = filteredProps.slice(0, 15).map(([key, val]) => ({ key, val }));

    nodes.push({
      id:       obj.id,
      nodeType: 'heap',
      label:    obj.label || (obj.type === 'array' ? '[ ]' : obj.type === 'function' ? 'ƒ( )' : '{ }'),
      heapType: obj.type,
      props,
      width:    HEAP_W,
      height:   heapHeight(props.length),
    });

    // heap → heap edges (nested references)
    props.forEach(({ key, val }, propIndex) => {
      if (val?.heapId && heapIds.has(val.heapId) && val.heapId !== obj.id) {
        edges.push({
          id:       `${obj.id}:prop:${key}:${val.heapId}`,
          source:   obj.id,
          target:   val.heapId,
          rowIndex: propIndex,
          rowType:  'prop',
          label:    key,
        });
      }
    });
  }

  // ── 2. Build FRAME nodes ────────────────────────────────────────────────

  // Collect all frames: global first, then call-stack frames
  const allFrameSpecs: Array<{
    id:       string;
    label:    string;
    isGlobal: boolean;
    isActive: boolean;
    vars:     VarEntry[];
  }> = [];

  const globalVars: VarEntry[] = Object.entries(snapshot.globalVars)
    .map(([name, val]) => ({ name, val }));

  allFrameSpecs.push({
    id:       'frame:global',
    label:    'Global',
    isGlobal: true,
    isActive: snapshot.frames.length === 0,
    vars:     globalVars,
  });

  snapshot.frames.forEach((frame, i) => {
    const vars: VarEntry[] = Object.entries(frame.variables)
      .map(([name, val]) => ({ name, val }));
    allFrameSpecs.push({
      id:       `frame:${frame.name}:${i}`,
      label:    `${frame.name}( )`,
      isGlobal: false,
      isActive: i === snapshot.frames.length - 1,
      vars,
    });
  });

  // Pin frames vertically on the left; compute fy based on stacking
  // (actual x/fx/fy values are set in D3MemoryGraph once container dims are known)
  allFrameSpecs.forEach(spec => {
    nodes.push({
      id:       spec.id,
      nodeType: 'frame',
      label:    spec.label,
      isGlobal: spec.isGlobal,
      isActive: spec.isActive,
      vars:     spec.vars,
      width:    FRAME_W,
      height:   frameHeight(spec.vars.length),
    });

    // frame → heap edges (variable references)
    spec.vars.forEach(({ name, val }, varIndex) => {
      if (val?.heapId && heapIds.has(val.heapId)) {
        edges.push({
          id:       `${spec.id}:var:${name}:${val.heapId}`,
          source:   spec.id,
          target:   val.heapId,
          rowIndex: varIndex,
          rowType:  'var',
          label:    name,
        });
      }
    });
  });

  return { nodes, edges };
}
