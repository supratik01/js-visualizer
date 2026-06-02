/**
 * Inline launch badge for the ControlBar (header).
 *
 * Desktop only — hidden below sm breakpoint because the toolbar is already
 * dense on mobile and the badge would force horizontal scroll.
 *
 * Feature flag (VITE_SHOW_LAUNCH_BADGE):
 *  - undefined or "true" → badge visible (default, useful during launch week)
 *  - "false"             → badge hidden entirely
 *  Flip in Vercel → Settings → Environment Variables, then redeploy.
 */
const FLAG = import.meta.env.VITE_SHOW_LAUNCH_BADGE ?? import.meta.env.VITE_SHOW_PH_BADGE;
const ENABLED = FLAG === undefined || FLAG === 'true';

export function ProductHuntBadge() {
  if (!ENABLED) return null;

  return (
    <a
      href="https://smollaunch.com"
      target="_blank"
      rel="noopener"
      aria-label="Featured on Smol Launch"
      className="
        hidden sm:flex items-center
        ml-3 pl-3 border-l border-zinc-700
        transition-transform hover:scale-[1.03] active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-amber-400 focus-visible:ring-offset-2
        focus-visible:ring-offset-zinc-950
        rounded
      "
    >
      <img
        alt="Featured on Smol Launch"
        src="https://smollaunch.com/badges/featured-dark.svg"
        loading="lazy"
        width={210}
        height={50}
        className="h-8 w-auto"
      />
    </a>
  );
}
