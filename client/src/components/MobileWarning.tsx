import { useState, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'js-viz-mobile-dismissed';
const MOBILE_BREAKPOINT = 768; // px — below this = show warning

export function MobileWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem(STORAGE_KEY);
    if (alreadyDismissed) return;
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-6 text-center"
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
      <h2 className="text-lg font-bold text-zinc-100 mb-3">
        Best on Desktop
      </h2>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mb-2">
        JS Visualizer is an interactive coding tool with multiple panels — it
        works best on a larger screen.
      </p>
      <p className="text-xs text-zinc-500 mb-8">
        For the full experience, open it on your laptop or desktop.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={dismiss}
          variant="outline"
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-sm"
        >
          <X className="w-4 h-4 mr-2" aria-hidden="true" />
          Continue anyway
        </Button>
      </div>

      {/* Subtle tip */}
      <p className="mt-6 text-[11px] text-zinc-600">
        Tip: rotate to landscape for a better view on tablets
      </p>
    </div>
  );
}
