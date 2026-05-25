import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="flex items-center justify-between px-4 sm:px-6 h-7 bg-[hsl(var(--app-bar))] border-t border-zinc-800/80 flex-shrink-0">
      {/* Left — branding */}
      <span className="text-[10px] text-zinc-600 tracking-wide">
        © 2026{' '}
        <a
          href="https://bytefront.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-400 transition-colors"
        >
          Bytefront
        </a>
        {' '}— Built for the JS community
      </span>

      {/* Right — links */}
      <nav aria-label="Footer navigation" className="flex items-center gap-4">
        <Link
          href="/privacy"
          className="text-[10px] text-zinc-600 hover:text-amber-400 transition-colors"
        >
          Privacy Policy
        </Link>
        <a
          href="mailto:supratikdas01@gmail.com"
          className="text-[10px] text-zinc-600 hover:text-amber-400 transition-colors"
        >
          Contact
        </a>
      </nav>
    </footer>
  );
}
