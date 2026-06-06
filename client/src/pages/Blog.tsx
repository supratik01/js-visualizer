import { Link } from 'wouter';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { blogPosts } from '@/data/blogPosts';
import { useSEO } from '@/hooks/useSEO';

export function Blog() {
  useSEO({
    title: 'Blog — JS Visualizer | JavaScript Tutorials & Guides',
    description: 'Learn JavaScript concepts visually. Tutorials on the event loop, call stack, Promises, async/await, closures, and more — with interactive examples you can run in JS Visualizer.',
    path: '/blog',
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to JS Visualizer
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest">
            <span style={{ color: '#E2B135' }}>JS</span>
            <span className="ml-1 text-zinc-100">VISUALIZER</span>
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-zinc-100 mb-3">Blog</h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-lg">
            JavaScript concepts explained visually — with interactive examples you can run in JS Visualizer.
          </p>
        </div>

        {/* Post list */}
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <article className="rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 p-6 transition-all">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors mb-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readingTime}
                    </span>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center">
        <p className="text-xs text-zinc-600">
          © 2026{' '}
          <a href="https://bytefront.dev" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            Bytefront
          </a>
        </p>
      </footer>
    </div>
  );
}
