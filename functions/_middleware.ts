/**
 * Cloudflare Pages Middleware
 * 
 * Routes requests based on hostname:
 * - ironforged-events.emuy.gg → events.html (Events app)
 * - emuy.gg → index.html (Main app)
 * 
 * Also handles SPA routing by serving the appropriate HTML for all routes.
 */

interface Env {
  ASSETS: Fetcher;
}

export async function onRequest(context: { request: Request; env: Env; next: () => Promise<Response> }) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // Skip middleware for static assets
  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/favicon/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.webmanifest')
  ) {
    return context.next();
  }
  
  // Route based on hostname
  const hostname = url.hostname;
  
  // Events subdomain → serve events.html
  if (hostname === 'ironforged-events.emuy.gg' || hostname.includes('ironforged-events')) {
    // Fetch events.html from assets
    const eventsUrl = new URL('/events.html', url.origin);
    return context.env.ASSETS.fetch(eventsUrl.toString());
  }
  
  // Default (emuy.gg, localhost, etc.) → serve index.html
  // Let the default behavior handle this (fallback to index.html via _redirects)
  return context.next();
}

