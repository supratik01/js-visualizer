/**
 * Inline Product Hunt launch badge for the ControlBar (header).
 *
 * Desktop only — hidden below sm breakpoint because the toolbar is already
 * dense on mobile and the badge would force horizontal scroll.
 *
 * Feature flag (VITE_SHOW_PH_BADGE):
 *  - undefined or "true" → badge visible (default, useful during launch week)
 *  - "false"             → badge hidden entirely
 *  Flip in Vercel → Settings → Environment Variables, then redeploy.
 */
const FLAG = import.meta.env.VITE_SHOW_PH_BADGE;
const ENABLED = FLAG === undefined || FLAG === 'true';

export function ProductHuntBadge() {
  if (!ENABLED) return null;

  return (
    <a
      href="https://www.producthunt.com/products/js-visualizer?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-js-visualizer"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View JS Visualizer on Product Hunt"
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
        alt="JS Visualizer - Finally understand the JS event loop | Product Hunt"
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1156919&theme=dark&t=1780007298335"
        width={185}
        height={40}
        className="h-8 w-auto"
      />
    </a>
  );
}
