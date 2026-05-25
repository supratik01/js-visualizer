import { useState, useEffect, useCallback } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'js-viz-mobile-dismissed';

function shouldShow() {
  // Show only when screen is narrow AND in portrait orientation
  return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

export function MobileWarning() {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }, []);

  useEffect(() => {
    // Already dismissed this session — never show again
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Show immediately if portrait + narrow on mount
    if (shouldShow()) setShow(true);

    // Check orientation after browser has finished updating dimensions.
    // Both 'orientationchange' and 'resize' are needed for cross-browser coverage.
    // requestAnimationFrame defers the check until after the layout has settled.
    function onOrientationChange() {
      requestAnimationFrame(() => {
        if (!shouldShow()) setShow(false);
      });
    }

    window.addEventListener('resize', onOrientationChange);
    window.addEventListener('orientationchange', onOrientationChange);

    return () => {
      window.removeEventListener('resize', onOrientationChange);
      window.removeEventListener('orientationchange', onOrientationChange);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-6 text-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Desktop recommended"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 flex-shrink-0">
        <Monitor className="w-8 h-8 text-amber-400" aria-hidden="true" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6 flex-shrink-0">
        <img src="/logo.png" alt="" className="w-8 h-8 object-contain" aria-hidden="true" />
        <span className="text-sm font-bold tracking-widest">
          <span style={{ color: '#E2B135' }}>JS</span>
          <span className="ml-1.5 text-zinc-100">VISUALIZER</span>
        </span>
      </div>

      {/* Message */}
      <div className="mb-8 flex-shrink-0">
        <h2 className="text-lg font-bold text-zinc-100 mb-3">
          Best on Desktop
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mb-2">
          JS Visualizer is an interactive coding tool with multiple panels — it
          works best on a larger screen.
        </p>
        <p className="text-xs text-zinc-500">
          For the full experience, open it on your laptop or desktop.
        </p>
      </div>

      {/* Continue button — explicit touch + click for mobile reliability */}
      <div className="w-full max-w-xs flex-shrink-0">
        <Button
          onClick={dismiss}
          onTouchEnd={(e) => { e.preventDefault(); dismiss(); }}
          variant="outline"
          className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-sm h-12 touch-manipulation"
        >
          Continue anyway
        </Button>
      </div>

      {/* Tip */}
      <p className="mt-6 text-[11px] text-zinc-600 flex-shrink-0">
        Tip: rotate to landscape to dismiss this automatically
      </p>
    </div>
  );
}
