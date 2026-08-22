import { getCookie, verifySession } from './_lib/auth.js';

const PUBLIC_PATHS = new Set([
  '/login',
  '/login.html',
  '/api/login',
  '/api/logout',
  '/favicon.ico'
]);

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/assets/');
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (isPublicPath(url.pathname)) {
    return context.next();
  }

  if (!context.env.SESSION_SECRET) {
    return new Response('SESSION_SECRET no configurado.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const token = getCookie(context.request, 'pm_session');
  const authenticated = await verifySession(token, context.env.SESSION_SECRET);

  if (authenticated) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  const next = `${url.pathname}${url.search}`;
  const loginUrl = new URL('/login.html', url.origin);
  loginUrl.searchParams.set('next', next);
  return Response.redirect(loginUrl.toString(), 302);
}
