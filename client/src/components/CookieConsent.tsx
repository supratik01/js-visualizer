import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getConsentStatus, grantConsent, denyConsent } from '@/lib/analytics';

export function CookieConsent() {
  const [visible, setVisible] = useState(() => getConsentStatus() === null);

  function handleAccept() {
    grantConsent();
    setVisible(false);
  }

  function handleDecline() {
    denyConsent();
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
          /* ── Mobile: full-width bar pinned to bottom edge
             ── Desktop (sm+): floating card centred above the footer  */
          className="fixed bottom-0 left-0 right-0 z-[60]
                     sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2
                     sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:right-auto"
        >
          <div className="
            flex flex-col gap-3
            px-4 pt-4 pb-5
            /* safe-area padding so it clears the iOS home bar */
            [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]
            bg-zinc-900 border-t border-zinc-700
            /* Mobile: square bottom corners; Desktop: fully rounded */
            sm:rounded-xl sm:border sm:shadow-2xl sm:shadow-black/40
          ">
            {/* Top row — icon + text */}
            <div className="flex items-start gap-3">
              <Cookie
                className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-zinc-400 leading-relaxed">
                We use cookies to understand how you use JS Visualizer and
                improve the experience.{' '}
                <a
                  href="/privacy"
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2 whitespace-nowrap"
                >
                  Privacy Policy
                </a>
              </p>
            </div>

            {/* Button row — full-width on mobile, natural width on desktop */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs h-8"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-8"
              >
                Accept
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
