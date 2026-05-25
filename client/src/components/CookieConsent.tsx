import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getConsentStatus, grantConsent, denyConsent } from '@/lib/analytics';

const DELAY_MS = 15_000; // show after 15 s — lets onboarding finish first

export function CookieConsent() {
  // Start hidden; reveal after delay (only if user hasn't already decided)
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() !== null) return; // already accepted or declined
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

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
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
          // z-index intentionally BELOW shadcn Dialog (z-50) so it never
          // covers an open modal. Onboarding is always gone before 30 s anyway.
          className="fixed z-40 bottom-0 left-0 right-0"
        >
          {/*
            Two visual modes via CSS:
            ─ Mobile  (<640 px): full-width bar flush to the bottom edge
            ─ Tablet+ (≥640 px): floating card, bottom-right corner
          */}
          <div className="
            mx-0 rounded-none border-t
            sm:mx-auto sm:mb-6 sm:max-w-md sm:rounded-xl sm:border
            bg-zinc-900 border-zinc-700
            shadow-2xl shadow-black/50
            px-4 pt-4
            pb-4 sm:pb-4
            [padding-bottom:max(1rem,env(safe-area-inset-bottom))]
          ">
            {/* Icon + text */}
            <div className="flex items-start gap-3 mb-3">
              <Cookie
                className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-zinc-400 leading-relaxed">
                We use cookies to understand how you use JS Visualizer and
                improve the experience.{' '}
                <a
                  href="/privacy"
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  Privacy&nbsp;Policy
                </a>
              </p>
            </div>

            {/* Buttons — full width on all screen sizes for easy tapping */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs h-9"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-9"
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
