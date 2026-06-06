import { Link, useParams, useLocation } from 'wouter';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { getBlogPost, blogPosts } from '@/data/blogPosts';
import { useSEO } from '@/hooks/useSEO';
import { useEffect } from 'react';

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const post = getBlogPost(slug || '');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useSEO({
    title: post?.metaTitle || 'Blog — JS Visualizer',
    description: post?.metaDescription || '',
    path: `/blog/${slug}`,
    type: 'article',
    publishedTime: post?.publishedAt,
    author: 'Bytefront',
  });

  if (!post) {
    // Redirect to blog index if post not found
    useEffect(() => {
      setLocation('/blog');
    }, []);
    return null;
  }

  // Find next/prev posts for navigation
  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All posts
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest">
            <span style={{ color: '#E2B135' }}>JS</span>
            <span className="ml-1 text-zinc-100">VISUALIZER</span>
          </span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Article header */}
        <div className="mb-10">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {post.readingTime}
            </span>
          </div>
        </div>

        {/* Article content */}
        <article className="prose-custom text-[15px] text-zinc-300 leading-relaxed [&>p]:mb-4 [&>h2]:scroll-mt-20 [&>p>a]:text-amber-400 [&>p>a]:underline [&>p>a]:underline-offset-2 [&>p>a:hover]:text-amber-300">
          {post.content}
        </article>

        {/* Post navigation */}
        {(prevPost || nextPost) && (
          <div className="mt-16 pt-8 border-t border-zinc-800 grid grid-cols-2 gap-4">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="text-left group"
              >
                <span className="text-xs text-zinc-500 mb-1 block">← Previous</span>
                <span className="text-sm text-zinc-300 group-hover:text-amber-400 transition-colors">
                  {prevPost.title}
                </span>
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="text-right group"
              >
                <span className="text-xs text-zinc-500 mb-1 block">Next →</span>
                <span className="text-sm text-zinc-300 group-hover:text-amber-400 transition-colors">
                  {nextPost.title}
                </span>
              </Link>
            ) : <div />}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h3 className="text-lg font-bold text-zinc-100 mb-2">See it in action</h3>
          <p className="text-sm text-zinc-400 mb-5 max-w-md mx-auto">
            Stop reading about the event loop — <em>watch</em> it. Paste any code snippet from this
            article into JS Visualizer and see every step animate in real time.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition-colors"
          >
            Open JS Visualizer — Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 mt-16 text-center">
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
