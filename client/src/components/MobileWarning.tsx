import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

const STORAGE_KEY = 'js-viz-mobile-dismissed';

function isPortraitMobile() {
  return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

export function MobileWarning() {
  const [show, setShow] = useState(() => {
    // Evaluate immediately on first render — no useEffect needed for initial state
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem(STORAGE_KEY)) return false;
    return isPortraitMobile();
  });

  // Auto-dismiss when rotating to landscape
  useEffect(() => {
    function check() {
      // rAF ensures dimensions are updated after rotation animation
      requestAnimationFrame(() => {
        if (!isPortraitMobile()) setShow(false);
      });
    }
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!show) return null;

  function handleDismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-6 text-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Desktop recommended"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <Monitor className="w-8 h-8 text-amber-400" aria-hidden="true" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6">
        <img src="/logo.png" alt="" className="w-8 h-8 object-contain" aria-hidden="true" />
        <span className="text-sm font-bold tracking-widest">
          <span style={{ color: '#E2B135' }}>JS</span>
          <span className="ml-1.5 text-zinc-100">VISUALIZER</span>
        </span>
      </div>

      {/* Message */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-zinc-100 mb-3">Best on Desktop</h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mb-2">
          JS Visualizer is an interactive coding tool with multiple panels — it
          works best on a larger screen.
        </p>
        <p className="text-xs text-zinc-500">
          For the full experience, open it on your laptop or desktop.
        </p>
      </div>

      {/* Plain button — no wrapper component, no touch overrides */}
      <button
        type="button"
        onClick={handleDismiss}
        style={{ touchAction: 'manipulation' }}
        className="w-full max-w-xs h-12 rounded-lg border border-zinc-700 bg-transparent text-zinc-300 text-sm font-medium active:bg-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
      >
        Continue anyway
      </button>

      <p className="mt-6 text-[11px] text-zinc-600">
        Tip: rotate to landscape to dismiss this automatically
      </p>
    </div>
  );
}
