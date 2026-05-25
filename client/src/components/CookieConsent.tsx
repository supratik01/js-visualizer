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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-2rem)] max-w-lg"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/40">
            <Cookie
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0"
              aria-hidden="true"
            />

            <p className="flex-1 text-xs text-zinc-400 leading-relaxed">
              We use cookies to understand how you use JS Visualizer and improve
              the experience.{' '}
              <a
                href="/privacy"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Privacy Policy
              </a>
            </p>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                className="flex-1 sm:flex-none border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs h-7 px-3"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-7 px-3"
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
