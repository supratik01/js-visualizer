import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
}

const BASE_URL = 'https://www.jsvisualizer.bytefront.dev';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/**
 * Dynamically sets <title>, meta description, canonical, and OG tags
 * for SPA pages that aren't the main index.html.
 *
 * Restores the original index.html values on unmount so navigating
 * back to the visualizer doesn't carry stale meta.
 */
export function useSEO({ title, description, path, ogImage, type = 'website', publishedTime, author }: SEOProps) {
  useEffect(() => {
    // Store originals for cleanup
    const origTitle = document.title;
    const originals = new Map<string, string | null>();

    function setMeta(nameOrProp: string, content: string, isProperty = false) {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
      if (el) {
        originals.set(`${attr}:${nameOrProp}`, el.getAttribute('content'));
        el.setAttribute('content', content);
      } else {
        el = document.createElement('meta');
        el.setAttribute(attr, nameOrProp);
        el.setAttribute('content', content);
        document.head.appendChild(el);
        originals.set(`${attr}:${nameOrProp}`, null); // mark as newly created
      }
    }

    const fullUrl = `${BASE_URL}${path}`;
    const image = ogImage || DEFAULT_OG_IMAGE;

    // Title
    document.title = title;

    // Primary meta
    setMeta('title', title);
    setMeta('description', description);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const origCanonical = canonical?.getAttribute('href') || null;
    if (canonical) {
      canonical.setAttribute('href', fullUrl);
    }

    // Open Graph
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', fullUrl, true);
    setMeta('og:image', image, true);
    setMeta('og:type', type, true);

    // Twitter
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:url', fullUrl);
    setMeta('twitter:image', image);

    // Article-specific
    if (type === 'article' && publishedTime) {
      setMeta('article:published_time', publishedTime, true);
    }
    if (author) {
      setMeta('article:author', author, true);
    }

    // Cleanup on unmount — restore originals
    return () => {
      document.title = origTitle;
      originals.forEach((origValue, key) => {
        const [attr, name] = key.split(':');
        const el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
        if (el) {
          if (origValue === null) {
            el.remove(); // was newly created, remove it
          } else {
            el.setAttribute('content', origValue);
          }
        }
      });
      if (canonical && origCanonical) {
        canonical.setAttribute('href', origCanonical);
      }
    };
  }, [title, description, path, ogImage, type, publishedTime, author]);
}
