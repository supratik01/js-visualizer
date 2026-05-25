import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">

      {/* Animated 404 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-8 select-none"
      >
        <span className="text-[120px] sm:text-[160px] font-black leading-none text-zinc-800 tracking-tighter">
          404
        </span>
        {/* Glowing overlay */}
        <span
          className="absolute inset-0 flex items-center justify-center text-[120px] sm:text-[160px] font-black leading-none tracking-tighter"
          style={{
            background: 'linear-gradient(135deg, #E2B135 0%, #f97316 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: 0.15,
          }}
          aria-hidden="true"
        >
          404
        </span>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex items-center gap-2.5 mb-5"
      >
        <img src="/logo.png" alt="" className="w-7 h-7 object-contain" aria-hidden="true" />
        <span className="text-xs font-bold tracking-widest">
          <span style={{ color: '#E2B135' }}>JS</span>
          <span className="ml-1.5 text-zinc-400">VISUALIZER</span>
        </span>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
          Looks like this URL got lost somewhere between the call stack and the
          task queue. Let's get you back on track.
        </p>
      </motion.div>

      {/* Code snippet flavour */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mb-8 px-5 py-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-left font-mono text-xs text-zinc-500 max-w-xs w-full"
        aria-hidden="true"
      >
        <span className="text-purple-400">const</span>
        <span className="text-zinc-300"> page </span>
        <span className="text-zinc-500">= </span>
        <span className="text-amber-400">await </span>
        <span className="text-zinc-300">fetch</span>
        <span className="text-zinc-500">(url);</span>
        <br />
        <span className="text-zinc-600">{'// '}</span>
        <span className="text-red-400">404 Not Found</span>
        <br />
        <span className="text-zinc-600">{'// '}</span>
        <span className="text-zinc-600">page doesn't exist 🤔</span>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          asChild
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6"
        >
          <Link href="/">
            <Code2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Open JS Visualizer
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Go back
          </Link>
        </Button>
      </motion.div>

      {/* Footer */}
      <p className="mt-12 text-[11px] text-zinc-700">
        © 2026 Bytefront ·{' '}
        <Link href="/privacy" className="hover:text-zinc-500 transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
