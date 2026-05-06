import { next, rewrite } from '@vercel/edge';

// All Meta/Facebook crawler user-agent strings
const META_BOTS = [
  'facebookexternalhit',
  'facebot',
  'facebookbot',
  'meta-externalfetcher',
  'meta-externalagent',
  'meta-webindexer',
  'meta-externalads',
];

export const config = {
  matcher: ['/', '/index.html'],
};

export default function middleware(request: Request): Response {
  const ua = (request.headers.get('user-agent') ?? '').toLowerCase();
  const isMeta = META_BOTS.some(bot => ua.includes(bot));

  if (!isMeta) {
    return next();
  }

  // For Meta/Facebook crawlers: explicitly rewrite to /index.html so Vercel
  // serves the static file directly, bypassing any routing layer that may
  // be returning 403 for Meta's datacenter IP ranges.
  const url = new URL(request.url);
  return rewrite(new URL('/index.html', url.origin));
}
