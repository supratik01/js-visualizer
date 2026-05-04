/**
 * MemoryVisualization
 *
 * Wrapper panel that:
 *   1. Reads the current memory snapshot from the store
 *   2. Converts it to a D3 graph model via buildGraphModel
 *   3. Renders the D3MemoryGraph force-directed canvas
 *   4. Provides a header with title, legend, step count, and zoom controls
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useRuntimeStore } from '@/lib/runtimeStore';
import { buildGraphModel } from './buildGraphModel';
import { D3MemoryGraph } from './D3MemoryGraph';

// ─── Theme tokens ─────────────────────────────────────────────────────────────

function makeTokens(isDark: boolean) {
  return isDark
    ? {
        panelBg:        '#060c1a',
        panelBorder:    '1px solid rgba(255,255,255,0.07)',
        headerBg:       'rgba(0,0,0,0.25)',
        headerBorder:   '1px solid rgba(255,255,255,0.07)',
        titleColor:     '#f1f5f9',
        legendColor:    '#64748b',
        hintColor:      '#334155',
        stepColor:      '#475569',
        zoomBorder:     '1px solid rgba(255,255,255,0.12)',
        zoomBg:         'rgba(255,255,255,0.05)',
        zoomBgHover:    'rgba(255,255,255,0.12)',
        zoomColor:      '#94a3b8',
        emptyIconBg:    'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(139,92,246,0.12))',
        emptyIconBorder:'1.5px solid rgba(139,92,246,0.25)',
        emptyTitle:     '#94a3b8',
        emptyBody:      '#475569',
        emptyBadgeBg:   'rgba(59,130,246,0.07)',
        emptyBadgeBor:  '1px solid rgba(59,130,246,0.2)',
        emptyBadgeTxt:  '#60a5fa',
      }
    : {
        panelBg:        '#FAF9F6',
        panelBorder:    '1px solid rgba(26,22,18,0.09)',
        headerBg:       'rgba(26,22,18,0.025)',
        headerBorder:   '1px solid rgba(26,22,18,0.09)',
        titleColor:     '#1A1612',
        legendColor:    '#64748b',
        hintColor:      '#78716c',
        stepColor:      '#78716c',
        zoomBorder:     '1px solid rgba(26,22,18,0.14)',
        zoomBg:         'rgba(26,22,18,0.04)',
        zoomBgHover:    'rgba(26,22,18,0.09)',
        zoomColor:      '#57534e',
        emptyIconBg:    'linear-gradient(135deg,rgba(218,119,86,0.12),rgba(147,51,234,0.10))',
        emptyIconBorder:'1.5px solid rgba(218,119,86,0.30)',
        emptyTitle:     '#78716c',
        emptyBody:      '#57534e',
        emptyBadgeBg:   'rgba(218,119,86,0.08)',
        emptyBadgeBor:  '1px solid rgba(218,119,86,0.25)',
        emptyBadgeTxt:  '#c2410c',
      };
}

// ─── Zoom-control button ─────────────────────────────────────────────────────

function ZoomBtn({
  onClick,
  title,
  T,
  children,
}: {
  onClick: () => void;
  title: string;
  T: ReturnType<typeof makeTokens>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        borderRadius: 5,
        border: T.zoomBorder,
        background: T.zoomBg,
        color: T.zoomColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = T.zoomBgHover)}
      onMouseLeave={e => (e.currentTarget.style.background = T.zoomBg)}
    >
      {children}
    </button>
  );
}

// ─── Legend dot ───────────────────────────────────────────────────────────────

function LegendDot({ color, label, T }: { color: string; label: string; T: ReturnType<typeof makeTokens> }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 10, color: T.legendColor }}>{label}</span>
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ T }: { T: ReturnType<typeof makeTokens> }) {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ padding: 24, userSelect: 'none' }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 14px',
            borderRadius: 14,
            background: T.emptyIconBg,
            border: T.emptyIconBorder,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="3" width="8" height="6" rx="1.5" />
            <rect x="14" y="3" width="8" height="6" rx="1.5" />
            <rect x="2" y="15" width="8" height="6" rx="1.5" />
            <path d="M10 6h4M10 18h1" />
            <path d="M14 6v5c0 1.5 1 2 2 2h2" />
          </svg>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.emptyTitle, marginBottom: 6 }}>
          Memory Graph
        </p>
        <p style={{ fontSize: 11, color: T.emptyBody, maxWidth: 190, margin: '0 auto 16px' }}>
          Step through or run code to watch the D3 force-directed memory graph come to life
        </p>
        <div style={{
          display: 'inline-flex', gap: 6, padding: '4px 12px',
          borderRadius: 20, border: T.emptyBadgeBor,
          background: T.emptyBadgeBg, fontSize: 11, color: T.emptyBadgeTxt,
        }}>
          <span>◉</span><span>Stack left · Heap right</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MemoryVisualization() {
  const { currentMemorySnapshotData: snapshot, currentStepIndex } = useRuntimeStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const T = makeTokens(isDark);

  // Container dimensions measured via ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Zoom callbacks registered by D3MemoryGraph
  const zoomInRef    = useRef<() => void>(() => {});
  const zoomOutRef   = useRef<() => void>(() => {});
  const zoomResetRef = useRef<() => void>(() => {});

  const registerZoom = useCallback(
    (zIn: () => void, zOut: () => void, reset: () => void) => {
      zoomInRef.current    = zIn;
      zoomOutRef.current   = zOut;
      zoomResetRef.current = reset;
    },
    [],
  );

  // Build the D3 graph model from the snapshot
  const graphModel = snapshot ? buildGraphModel(snapshot) : null;

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: T.panelBg,
        borderLeft: T.panelBorder,
      }}
      data-testid="memory-visualization"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 12px',
          borderBottom: T.headerBorder,
          flexShrink: 0,
          background: T.headerBg,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(135deg,#3b82f6,#7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <rect x="2" y="3" width="8" height="6" rx="1.5" />
            <rect x="14" y="3" width="8" height="6" rx="1.5" />
            <rect x="2" y="15" width="8" height="6" rx="1.5" />
            <path d="M10 6h4" />
            <path d="M18 9v5c0 1-1 2-2 2h-2" />
          </svg>
        </div>

        <span style={{ fontWeight: 700, fontSize: 12, color: T.titleColor }}>
          Memory Graph
        </span>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
          <LegendDot color="#3b82f6" label="Frame" T={T} />
          <LegendDot color={isDark ? '#22c55e' : '#16a34a'} label="Object" T={T} />
          <LegendDot color={isDark ? '#a855f7' : '#9333ea'} label="Array" T={T} />
          <LegendDot color={isDark ? '#f97316' : '#ea580c'} label="Fn" T={T} />
        </div>

        {/* Step counter */}
        {snapshot && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: T.stepColor }}>
            step {currentStepIndex + 1}
          </span>
        )}

        {/* Drag hint */}
        <span style={{ fontSize: 9, color: T.hintColor, whiteSpace: 'nowrap' }}>
          drag heap nodes
        </span>

        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: 3, marginLeft: snapshot ? 4 : 'auto' }}>
          <ZoomBtn onClick={() => zoomInRef.current()} title="Zoom in" T={T}>+</ZoomBtn>
          <ZoomBtn onClick={() => zoomOutRef.current()} title="Zoom out" T={T}>−</ZoomBtn>
          <ZoomBtn onClick={() => zoomResetRef.current()} title="Reset view" T={T}>⊙</ZoomBtn>
        </div>
      </div>

      {/* ── Graph canvas or empty state ─────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {!snapshot ? (
          <EmptyState T={T} />
        ) : dims.w > 0 && dims.h > 0 ? (
          <D3MemoryGraph
            nodes={graphModel!.nodes}
            edges={graphModel!.edges}
            width={dims.w}
            height={dims.h}
            registerZoom={registerZoom}
          />
        ) : null}
      </div>
    </div>
  );
}
