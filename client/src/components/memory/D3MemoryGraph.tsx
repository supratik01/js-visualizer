/**
 * D3MemoryGraph
 *
 * Force-directed graph renderer for JavaScript memory state.
 *
 * Rendering strategy (from the spec):
 *   - Stack frames   → SVG <g> nodes pinned to the LEFT (fx/fy fixed)
 *   - Heap objects   → SVG <g> nodes clustered to the RIGHT by forceX
 *   - Reference edges → bezier paths from the specific variable row → heap node center
 *   - Arrowheads     → SVG marker-end elements
 *   - Drag           → enabled on heap nodes only
 *   - Zoom / Pan     → D3 zoom applied to inner <g>
 *   - Transitions    → D3 transitions for enter / exit
 */

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as d3 from 'd3';
import type {
  GraphNode,
  GraphEdge,
} from './buildGraphModel';
import {
  FRAME_W, FRAME_HEADER_H, FRAME_ROW_H, FRAME_PAD,
  HEAP_W,  HEAP_HEADER_H,  HEAP_ROW_H,  HEAP_PAD,
} from './buildGraphModel';

// ─── Colours ────────────────────────────────────────────────────────────────

type Palette = typeof C_dark;

const C_dark = {
  frameAccent:  '#3b82f6',
  frameBg:      '#0a1628',
  frameHeader:  '#0f2456',
  frameText:    '#93c5fd',

  objAccent:    '#22c55e',
  objBg:        '#071510',
  objHeader:    '#0a2818',
  objText:      '#86efac',

  arrAccent:    '#a855f7',
  arrBg:        '#110826',
  arrHeader:    '#1c0840',
  arrText:      '#d8b4fe',

  fnAccent:     '#f97316',
  fnBg:         '#1a0a02',
  fnHeader:     '#2e1004',
  fnText:       '#fdba74',

  varRefEdge:   '#7c3aed',
  propRefEdge:  '#0ea5e9',

  valNum:       '#60a5fa',
  valStr:       '#34d399',
  valBool:      '#fbbf24',
  valNull:      '#9ca3af',
  valUndef:     '#6b7280',
  valRef:       '#a78bfa',
  valDefault:   '#e2e8f0',

  rowSep:       'rgba(255,255,255,0.06)',
  rowSepV:      'rgba(255,255,255,0.08)',
  heapSep:      'rgba(255,255,255,0.05)',
  heapSepV:     'rgba(255,255,255,0.07)',
  varName:      '#cbd5e1',
  propKey:      '#9ca3af',
  heapId:       '#374151',
  emptyText:    '#4b5563',
};

// Claude warm palette for light mode
const C_light = {
  frameAccent:  '#3b82f6',
  frameBg:      '#eef3ff',
  frameHeader:  '#dbeafe',
  frameText:    '#1d4ed8',

  objAccent:    '#16a34a',
  objBg:        '#f0fdf4',
  objHeader:    '#dcfce7',
  objText:      '#15803d',

  arrAccent:    '#9333ea',
  arrBg:        '#faf5ff',
  arrHeader:    '#f3e8ff',
  arrText:      '#7e22ce',

  fnAccent:     '#ea580c',
  fnBg:         '#fff7ed',
  fnHeader:     '#ffedd5',
  fnText:       '#c2410c',

  varRefEdge:   '#7c3aed',
  propRefEdge:  '#0284c7',

  valNum:       '#1d4ed8',
  valStr:       '#047857',
  valBool:      '#b45309',
  valNull:      '#6b7280',
  valUndef:     '#9ca3af',
  valRef:       '#7c3aed',
  valDefault:   '#374151',

  rowSep:       'rgba(0,0,0,0.07)',
  rowSepV:      'rgba(0,0,0,0.09)',
  heapSep:      'rgba(0,0,0,0.06)',
  heapSepV:     'rgba(0,0,0,0.08)',
  varName:      '#334155',
  propKey:      '#475569',
  heapId:       '#374151',
  emptyText:    '#6b7280',
};

function heapColors(type: string | undefined, label: string | undefined, C: Palette) {
  switch (type) {
    case 'array':    return { accent: C.arrAccent, bg: C.arrBg, header: C.arrHeader, text: C.arrText, badge: 'ARRAY' };
    case 'function': return { accent: C.fnAccent,  bg: C.fnBg,  header: C.fnHeader,  text: C.fnText,  badge: 'FUNC'  };
    default: {
      const l = (label || '').toLowerCase();
      let badge = 'OBJ';
      if (l.startsWith('map'))      badge = 'MAP';
      else if (l.startsWith('set')) badge = 'SET';
      else if (l === 'promise')     badge = 'PROMISE';
      else if (l === 'date')        badge = 'DATE';
      else if (l === 'regexp')      badge = 'REGEX';
      else if (l === 'proxy')       badge = 'PROXY';
      else if (l === 'error' || l === 'typeerror' || l === 'rangeerror' || l === 'syntaxerror' || l === 'referenceerror') badge = 'ERROR';
      else if (l === 'weakmap')     badge = 'WMAP';
      else if (l === 'weakset')     badge = 'WSET';
      else if (l.startsWith('generator') || l.startsWith('asyncgenerator')) badge = 'GEN';
      else if (l.includes('array') && l !== 'array') badge = 'TYPED';
      else if (l === 'arraybuffer') badge = 'BUF';
      else if (l !== 'object' && l !== '{...}' && l.length > 0 && l[0] === l[0].toUpperCase()) badge = l.toUpperCase().slice(0, 6);
      return { accent: C.objAccent, bg: C.objBg, header: C.objHeader, text: C.objText, badge };
    }
  }
}

function valColor(type: string, C: Palette): string {
  switch (type) {
    case 'number':    return C.valNum;
    case 'string':    return C.valStr;
    case 'boolean':   return C.valBool;
    case 'null':      return C.valNull;
    case 'undefined': return C.valUndef;
    default:          return C.valDefault;
  }
}

function fmtVal(val: any): string {
  if (!val) return 'undefined';
  switch (val.type) {
    case 'string': {
      const s = String(val.value ?? '');
      return s.length > 16 ? `"${s.slice(0, 16)}…"` : `"${s}"`;
    }
    case 'null':      return 'null';
    case 'undefined': return 'undefined';
    case 'function':  return String(val.value || 'ƒ()');
    default:          return String(val.value ?? val.type);
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Row Y helper ────────────────────────────────────────────────────────────

/**
 * Returns the screen-Y of the centre of a specific row inside a node.
 * `node.y` is the node's centre (D3 convention).
 */
function rowY(node: GraphNode, rowIndex: number): number {
  const headerH = node.nodeType === 'frame' ? FRAME_HEADER_H : HEAP_HEADER_H;
  const rowH    = node.nodeType === 'frame' ? FRAME_ROW_H    : HEAP_ROW_H;
  return (node.y ?? 0) - node.height / 2 + headerH + (rowIndex + 0.5) * rowH;
}

// ─── Render one node's SVG content ──────────────────────────────────────────

function renderNode(
  g: d3.Selection<SVGGElement, GraphNode, null, undefined>,
  d: GraphNode,
  C: Palette,
) {
  const hw = d.width  / 2;
  const hh = d.height / 2;

  if (d.nodeType === 'frame') {
    // ── Frame ─────────────────────────────────────────────────────────────
    const active = d.isActive ?? false;

    g.append('rect')
      .attr('x', -hw).attr('y', -hh)
      .attr('width', d.width).attr('height', d.height)
      .attr('rx', 8)
      .attr('fill', C.frameBg)
      .attr('stroke', active ? '#60a5fa' : C.frameAccent)
      .attr('stroke-width', active ? 2 : 1.5);

    // header background
    g.append('rect')
      .attr('x', -hw).attr('y', -hh)
      .attr('width', d.width).attr('height', FRAME_HEADER_H)
      .attr('rx', 8)
      .attr('fill', C.frameHeader);
    // cover bottom-rounded corners of header
    g.append('rect')
      .attr('x', -hw).attr('y', -hh + FRAME_HEADER_H - 8)
      .attr('width', d.width).attr('height', 8)
      .attr('fill', C.frameHeader);

    // FRAME badge
    g.append('rect')
      .attr('x', -hw + 8).attr('y', -hh + 11)
      .attr('width', 38).attr('height', 14).attr('rx', 3)
      .attr('fill', C.frameAccent);
    g.append('text')
      .attr('x', -hw + 27).attr('y', -hh + 19)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', 8).attr('font-weight', 700).attr('letter-spacing', 0.5)
      .attr('fill', '#fff')
      .text('FRAME');

    // frame title
    g.append('text')
      .attr('x', -hw + 52).attr('y', -hh + 19)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 12).attr('font-weight', 700).attr('font-family', 'monospace')
      .attr('fill', C.frameText)
      .text(truncate(d.label, 18));

    // active dot
    if (active) {
      g.append('circle')
        .attr('cx', hw - 12).attr('cy', -hh + 19)
        .attr('r', 4).attr('fill', '#22c55e');
    }

    // variable rows
    const vars = d.vars ?? [];
    if (vars.length === 0) {
      g.append('text')
        .attr('x', -hw + 12).attr('y', -hh + FRAME_HEADER_H + FRAME_ROW_H / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10).attr('font-style', 'italic').attr('fill', C.emptyText)
        .text('(no variables)');
    } else {
      vars.forEach((v, i) => {
        const ry = -hh + FRAME_HEADER_H + i * FRAME_ROW_H;

        if (i > 0) {
          g.append('line')
            .attr('x1', -hw).attr('y1', ry).attr('x2', hw).attr('y2', ry)
            .attr('stroke', C.rowSep).attr('stroke-width', 1);
        }

        // variable name
        g.append('text')
          .attr('x', -hw + 8).attr('y', ry + FRAME_ROW_H / 2)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 11).attr('font-family', 'monospace').attr('fill', C.varName)
          .text(truncate(v.name, 10));

        // divider
        g.append('line')
          .attr('x1', -hw + 88).attr('y1', ry).attr('x2', -hw + 88).attr('y2', ry + FRAME_ROW_H)
          .attr('stroke', C.rowSepV).attr('stroke-width', 1);

        if (v.val?.heapId) {
          g.append('text')
            .attr('x', hw - 44).attr('y', ry + FRAME_ROW_H / 2)
            .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
            .attr('font-size', 10).attr('font-family', 'monospace').attr('fill', C.valRef)
            .text('ref');
          g.append('circle')
            .attr('cx', hw - 20).attr('cy', ry + FRAME_ROW_H / 2)
            .attr('r', 5).attr('fill', '#6d28d9').attr('stroke', '#a78bfa').attr('stroke-width', 1.5);
        } else {
          g.append('text')
            .attr('x', -hw + 96).attr('y', ry + FRAME_ROW_H / 2)
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 11).attr('font-family', 'monospace')
            .attr('fill', valColor(v.val?.type ?? 'undefined', C))
            .text(fmtVal(v.val));
        }
      });
    }

  } else {
    // ── Heap object ────────────────────────────────────────────────────────
    const col = heapColors(d.heapType, d.label, C);
    const badgeW = col.badge.length * 6 + 8;

    g.append('rect')
      .attr('x', -hw).attr('y', -hh)
      .attr('width', d.width).attr('height', d.height)
      .attr('rx', 8)
      .attr('fill', col.bg)
      .attr('stroke', col.accent)
      .attr('stroke-width', 1.5);

    // header
    g.append('rect')
      .attr('x', -hw).attr('y', -hh)
      .attr('width', d.width).attr('height', HEAP_HEADER_H)
      .attr('rx', 8).attr('fill', col.header);
    g.append('rect')
      .attr('x', -hw).attr('y', -hh + HEAP_HEADER_H - 8)
      .attr('width', d.width).attr('height', 8).attr('fill', col.header);

    // type badge
    g.append('rect')
      .attr('x', -hw + 8).attr('y', -hh + 11)
      .attr('width', badgeW).attr('height', 14).attr('rx', 3)
      .attr('fill', col.accent);
    g.append('text')
      .attr('x', -hw + 8 + badgeW / 2).attr('y', -hh + 19)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', 8).attr('font-weight', 700).attr('fill', '#fff')
      .text(col.badge);

    // label
    g.append('text')
      .attr('x', -hw + 8 + badgeW + 6).attr('y', -hh + 19)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 12).attr('font-weight', 700).attr('font-family', 'monospace')
      .attr('fill', col.text)
      .text(truncate(d.label, 14));

    // id
    g.append('text')
      .attr('x', hw - 8).attr('y', -hh + 19)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', 9).attr('font-family', 'monospace').attr('fill', C.heapId)
      .text('#' + d.id.replace('heap_', ''));

    // property rows
    const props = d.props ?? [];
    if (props.length === 0) {
      g.append('text')
        .attr('x', -hw + 10).attr('y', -hh + HEAP_HEADER_H + HEAP_ROW_H / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10).attr('font-style', 'italic').attr('fill', C.emptyText)
        .text(d.heapType === 'array' ? '(empty)' : d.heapType === 'function' ? '(body)' : '(empty)');
    } else {
      props.forEach((p, i) => {
        const ry = -hh + HEAP_HEADER_H + i * HEAP_ROW_H;

        if (i > 0) {
          g.append('line')
            .attr('x1', -hw).attr('y1', ry).attr('x2', hw).attr('y2', ry)
            .attr('stroke', C.heapSep).attr('stroke-width', 1);
        }

        g.append('text')
          .attr('x', -hw + 8).attr('y', ry + HEAP_ROW_H / 2)
          .attr('dominant-baseline', 'middle')
          .attr('font-size', 10).attr('font-family', 'monospace').attr('fill', C.propKey)
          .text(truncate(p.key, 9));

        g.append('line')
          .attr('x1', -hw + 72).attr('y1', ry).attr('x2', -hw + 72).attr('y2', ry + HEAP_ROW_H)
          .attr('stroke', C.heapSepV).attr('stroke-width', 1);

        if (p.val?.heapId) {
          g.append('text')
            .attr('x', hw - 42).attr('y', ry + HEAP_ROW_H / 2)
            .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
            .attr('font-size', 9).attr('font-family', 'monospace').attr('fill', C.valRef)
            .text('ref');
          g.append('circle')
            .attr('cx', hw - 18).attr('cy', ry + HEAP_ROW_H / 2)
            .attr('r', 4).attr('fill', '#6d28d9').attr('stroke', '#a78bfa').attr('stroke-width', 1.5);
        } else {
          g.append('text')
            .attr('x', -hw + 80).attr('y', ry + HEAP_ROW_H / 2)
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 10).attr('font-family', 'monospace')
            .attr('fill', valColor(p.val?.type ?? 'undefined', C))
            .text(fmtVal(p.val));
        }
      });
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  nodes:  GraphNode[];
  edges:  GraphEdge[];
  width:  number;
  height: number;
  /** Expose zoom controls to parent */
  onZoomIn?:    () => void;
  onZoomOut?:   () => void;
  onZoomReset?: () => void;
  registerZoom?: (zoomIn: () => void, zoomOut: () => void, reset: () => void) => void;
}

export function D3MemoryGraph({ nodes, edges, width, height, registerZoom }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const gRef    = useRef<SVGGElement>(null);
  const simRef  = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const posCache = useRef<Map<string, { x: number; y: number }>>(new Map());
  const { resolvedTheme } = useTheme();

  // ── One-time SVG init (zoom only) ───────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current!);

    // zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on('zoom', event => {
        d3.select(gRef.current!).attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // expose zoom controls
    if (registerZoom) {
      registerZoom(
        () => svg.transition().duration(250).call(zoom.scaleBy, 1.3),
        () => svg.transition().duration(250).call(zoom.scaleBy, 0.77),
        () => svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity),
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data update ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !gRef.current || width === 0 || height === 0) return;

    const C = resolvedTheme === 'light' ? C_light : C_dark;

    // Recreate arrowhead markers so colors update on theme change
    const svg = d3.select(svgRef.current);
    const defs = svg.select<SVGDefsElement>('defs');
    defs.selectAll('marker').remove();
    defs.append('marker')
      .attr('id', 'arrow-var')
      .attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z')
      .attr('fill', C.varRefEdge).attr('opacity', 0.9);
    defs.append('marker')
      .attr('id', 'arrow-prop')
      .attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto-start-reverse')
      .append('path').attr('d', 'M0,0 L10,5 L0,10 Z')
      .attr('fill', C.propRefEdge).attr('opacity', 0.85);

    const g = d3.select(gRef.current);

    // ── Screen-space layout constants (responsive) ─────────────────────────
    // ALL positions are in actual SVG pixels from the top-left corner.
    const PAD       = 14;
    const FRAME_GAP = 16;

    // Responsive: if the panel is narrow, use 40% for frames and 60% for heap
    const frameAreaW = Math.min(FRAME_W, Math.max(140, width * 0.38));
    const FRAME_CX  = PAD + frameAreaW / 2;
    const HEAP_X0   = frameAreaW + PAD * 2 + 20;
    const heapAreaW  = Math.max(140, width - HEAP_X0 - PAD);
    const heapColW   = Math.min(HEAP_W, heapAreaW);
    const heapCols   = Math.max(1, Math.floor(heapAreaW / (heapColW + 16)));

    // ── Dynamically resize node widths to fit available space ──────────────
    const effectiveFrameW = Math.min(FRAME_W, frameAreaW);
    const effectiveHeapW  = Math.min(HEAP_W, heapColW);
    nodes.forEach(n => {
      n.width = n.nodeType === 'frame' ? effectiveFrameW : effectiveHeapW;
    });

    // ── Separate frame / heap nodes ───────────────────────────────────────
    const frameNodes = nodes.filter(n => n.nodeType === 'frame');
    const heapNodes  = nodes.filter(n => n.nodeType === 'heap');

    // ── Pin frame nodes: left column, centred vertically ──────────────────
    const totalFrameH = frameNodes.reduce((acc, n) => acc + n.height + FRAME_GAP, 0) - FRAME_GAP;
    let nextY = Math.max(PAD, (height - totalFrameH) / 2);

    frameNodes.forEach(n => {
      n.fx = FRAME_CX;
      n.fy = nextY + n.height / 2;
      n.x  = n.fx;
      n.y  = n.fy;
      posCache.current.set(n.id, { x: n.x, y: n.y });
      nextY += n.height + FRAME_GAP;
    });

    // ── Initialise heap node positions (right area) ───────────────────────
    const approxRowH = 110;   // typical heap card height estimate for initial layout
    const totalHeapH = Math.ceil(heapNodes.length / heapCols) * (approxRowH + 16);
    const heapStartY = Math.max(PAD, (height - totalHeapH) / 2);

    heapNodes.forEach((n, i) => {
      const cached = posCache.current.get(n.id);
      if (cached) {
        n.x = cached.x;
        n.y = cached.y;
      } else {
        const col = i % heapCols;
        const row = Math.floor(i / heapCols);
        n.x = HEAP_X0 + heapColW / 2 + col * (heapColW + 16);
        n.y = heapStartY + n.height / 2 + row * (n.height + 16);
      }
    });

    // ── Stop previous simulation ─────────────────────────────────────────
    if (simRef.current) simRef.current.stop();

    // ── D3 force simulation ───────────────────────────────────────────────
    // forceX targets keep frames on the left and heap on the right.
    // forceY centres everything vertically.
    // forceCollide prevents nodes from overlapping.
    const heapCentreX = HEAP_X0 + heapAreaW / 2;

    // Link distance: responsive to the actual distance between frame and heap areas
    const linkDistance = Math.max(80, heapCentreX - FRAME_CX);

    const sim = d3.forceSimulation<GraphNode, GraphEdge>(nodes)
      .force(
        'link',
        d3.forceLink<GraphNode, GraphEdge>(edges)
          .id(d => d.id)
          .distance(linkDistance)
          .strength(0.2),
      )
      .force('charge', d3.forceManyBody<GraphNode>().strength(-220))
      .force(
        'x',
        d3.forceX<GraphNode>()
          // Frames: fx/fy already pins them; this is a safety fallback.
          // Heap: strongly attracted to the right area so they never drift into frames.
          .x(d => d.nodeType === 'frame' ? FRAME_CX : heapCentreX)
          .strength(d => d.nodeType === 'frame' ? 1 : 0.35),
      )
      .force('y', d3.forceY<GraphNode>().y(height / 2).strength(0.05))
      .force(
        'collide',
        d3.forceCollide<GraphNode>()
          // Extra clearance so wide nodes (FRAME_W=210) don't overlap heap nodes
          .radius(d => Math.max(d.width, d.height) / 2 + 18)
          .strength(0.9),
      )
      .alphaDecay(0.025)
      .velocityDecay(0.42);

    simRef.current = sim;

    // ── Drag behaviour (heap nodes only) ─────────────────────────────────
    const drag = d3.drag<SVGGElement, GraphNode>()
      .filter(d => d.nodeType === 'heap')
      .on('start', function (event, d) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function (event, d) {
        if (!event.active) sim.alphaTarget(0);
        // Leave fixed after drag so user placement persists
        posCache.current.set(d.id, { x: d.x ?? 0, y: d.y ?? 0 });
        d.fx = null;
        d.fy = null;
      });

    // ── Ensure link / node layer groups exist ────────────────────────────
    const linkGroup = (g.selectAll('.links').empty()
      ? g.append('g').attr('class', 'links')
      : g.select<SVGGElement>('.links')) as d3.Selection<SVGGElement, unknown, null, undefined>;

    const nodeGroup = (g.selectAll('.nodes').empty()
      ? g.append('g').attr('class', 'nodes')
      : g.select<SVGGElement>('.nodes')) as d3.Selection<SVGGElement, unknown, null, undefined>;

    // ── Links ─────────────────────────────────────────────────────────────
    const linkSel = linkGroup
      .selectAll<SVGPathElement, GraphEdge>('path.edge')
      .data(edges, d => d.id);

    linkSel.exit().remove();

    const linkEnter = linkSel.enter()
      .append('path')
      .attr('class', 'edge')
      .attr('fill', 'none')
      .attr('stroke', (d: GraphEdge) => d.rowType === 'var' ? C.varRefEdge : C.propRefEdge)
      .attr('stroke-width', (d: GraphEdge) => d.rowType === 'var' ? 1.6 : 1.2)
      .attr('stroke-dasharray', (d: GraphEdge) => d.rowType === 'prop' ? '5 3' : null)
      .attr('marker-end', (d: GraphEdge) => d.rowType === 'var' ? 'url(#arrow-var)' : 'url(#arrow-prop)')
      .style('opacity', 0.85);

    const linkMerged = linkEnter.merge(linkSel);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const nodeSel = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes, d => d.id);

    // EXIT – remove immediately (transitions get interrupted by rapid stepping)
    nodeSel.exit().remove();

    // ENTER – append groups with full opacity (no animation — rapid stepping breaks transitions)
    const nodeEnter = nodeSel.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      .style('opacity', 1);

    // Render content for NEW nodes
    nodeEnter.each(function (d) {
      renderNode(d3.select(this as SVGGElement), d, C);
    });

    // UPDATE – re-render content of existing nodes (variable values may have changed)
    nodeSel.each(function (d) {
      const el = d3.select(this as SVGGElement);
      el.selectAll('*').remove();
      renderNode(el, d, C);
    });

    // Cursor & drag for heap nodes
    const nodeMerged = nodeEnter.merge(nodeSel);
    // Ensure all nodes are fully visible (fix interrupted transitions)
    nodeMerged.style('opacity', 1);
    nodeMerged
      .filter(d => d.nodeType === 'heap')
      .style('cursor', 'grab')
      .call(drag);

    // ── Tick ──────────────────────────────────────────────────────────────
    // Hard left boundary for heap nodes: never let them drift into the frame column.
    const heapMinX = HEAP_X0 + heapColW / 2;
    // Hard right boundary: keep heap nodes inside the SVG
    const heapMaxX = Math.max(heapMinX + 20, width - heapColW / 2 - PAD);
    // Vertical bounds (with half-height padding)
    const minY = PAD;
    const maxY = Math.max(height - PAD, minY + 10);

    sim.on('tick', () => {
      // Clamp heap nodes inside the visible area
      heapNodes.forEach(n => {
        if ((n.x ?? 0) < heapMinX) { n.x = heapMinX; n.vx = Math.max(0, n.vx ?? 0); }
        if ((n.x ?? 0) > heapMaxX) { n.x = heapMaxX; n.vx = Math.min(0, n.vx ?? 0); }
        const hh = n.height / 2;
        if ((n.y ?? 0) - hh < minY) { n.y = minY + hh;   n.vy = Math.max(0, n.vy ?? 0); }
        if ((n.y ?? 0) + hh > maxY) { n.y = maxY - hh;   n.vy = Math.min(0, n.vy ?? 0); }
      });

      // Persist heap positions
      heapNodes.forEach(n => {
        if (n.x != null && n.y != null) posCache.current.set(n.id, { x: n.x, y: n.y });
      });

      // Move node groups
      nodeMerged.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

      // Route edge paths
      linkMerged.attr('d', d => {
        const src = d.source as GraphNode;
        const tgt = d.target as GraphNode;

        const sx = (src.x ?? 0) + src.width / 2;  // right edge of source
        const sy = rowY(src, d.rowIndex);            // specific row centre
        const tx = (tgt.x ?? 0) - tgt.width / 2;  // left edge of target
        const ty = tgt.y ?? 0;                       // target centre

        // Cubic bezier for smooth S-curve
        const dx    = tx - sx;
        const curve = Math.min(Math.abs(dx) * 0.45, 90);
        return `M${sx},${sy} C${sx + curve},${sy} ${tx - curve},${ty} ${tx},${ty}`;
      });
    });

    // ── Auto-fit: zoom to fit all content once simulation settles ────────
    sim.on('end', () => {
      if (!svgRef.current || !gRef.current || !zoomRef.current) return;
      // Compute bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        const nx = n.x ?? 0, ny = n.y ?? 0;
        const hw = n.width / 2, hh = n.height / 2;
        if (nx - hw < minX) minX = nx - hw;
        if (ny - hh < minY) minY = ny - hh;
        if (nx + hw > maxX) maxX = nx + hw;
        if (ny + hh > maxY) maxY = ny + hh;
      });
      if (!isFinite(minX)) return;
      const pad = 30;
      minX -= pad; minY -= pad; maxX += pad; maxY += pad;
      const bw = maxX - minX, bh = maxY - minY;
      if (bw <= 0 || bh <= 0) return;
      const scale = Math.min(1, width / bw, height / bh);
      const tx = (width - bw * scale) / 2 - minX * scale;
      const ty = (height - bh * scale) / 2 - minY * scale;
      const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
      d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, transform);
    });

    return () => { sim.stop(); };
  }, [nodes, edges, width, height, resolvedTheme]); // re-run whenever data, size, or theme changes

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'hidden', background: 'transparent' }}
    >
      <defs />
      <g ref={gRef}>
        {/* layers are appended imperatively by D3 */}
      </g>
    </svg>
  );
}
