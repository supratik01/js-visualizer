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
    path: `/blogs/${slug}`,
    type: 'article',
    publishedTime: post?.publishedAt,
    author: 'Bytefront',
  });

  // Inject Article structured data (rich-result eligibility) for the post.
  useEffect(() => {
    if (!post) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-blog-jsonld', 'true');
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      author: { '@type': 'Organization', name: 'Bytefront', url: 'https://www.bytefront.dev/' },
      publisher: {
        '@type': 'Organization',
        name: 'JS Visualizer',
        logo: { '@type': 'ImageObject', url: 'https://www.jsvisualizer.bytefront.dev/logo.png' },
      },
      image: 'https://www.jsvisualizer.bytefront.dev/og-image.png',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://www.jsvisualizer.bytefront.dev/blogs/${post.slug}`,
      },
      keywords: post.tags.join(', '),
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [post]);

  if (!post) {
    // Redirect to blog index if post not found
    useEffect(() => {
      setLocation('/blogs');
    }, []);
    return null;
  }

  // Find next/prev posts for navigation
  const currentIndex = blogPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-[hsl(var(--app-bar))] border-b border-border px-6 py-4 flex items-center justify-between">
        <Link
          href="/blogs"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All posts
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest">
            <span style={{ color: '#E2B135' }}>JS</span>
            <span className="ml-1 text-foreground">VISUALIZER</span>
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
                className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
        <article className="prose-custom text-[15px] text-foreground leading-relaxed [&>p]:mb-4 [&>h2]:scroll-mt-20 [&>p>a]:text-amber-500 dark:[&>p>a]:text-amber-400 [&>p>a]:underline [&>p>a]:underline-offset-2 [&>p>a:hover]:text-amber-400 dark:[&>p>a:hover]:text-amber-300">
          {post.content}
        </article>

        {/* Post navigation */}
        {(prevPost || nextPost) && (
          <div className="mt-16 pt-8 border-t border-border grid grid-cols-2 gap-4">
            {prevPost ? (
              <Link
                href={`/blogs/${prevPost.slug}`}
                className="text-left group"
              >
                <span className="text-xs text-muted-foreground mb-1 block">← Previous</span>
                <span className="text-sm text-foreground group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                  {prevPost.title}
                </span>
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link
                href={`/blogs/${nextPost.slug}`}
                className="text-right group"
              >
                <span className="text-xs text-muted-foreground mb-1 block">Next →</span>
                <span className="text-sm text-foreground group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                  {nextPost.title}
                </span>
              </Link>
            ) : <div />}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">See it in action</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
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
      <footer className="border-t border-border px-6 py-4 mt-16 text-center">
        <p className="text-xs text-muted-foreground/60">
          © 2026{' '}
          <a href="https://bytefront.dev" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
            Bytefront
          </a>
        </p>
      </footer>
    </div>
  );
}
