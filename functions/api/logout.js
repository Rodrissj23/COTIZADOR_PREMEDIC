import { clearSessionCookie } from '../_lib/auth.js';

export function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': clearSessionCookie()
    }
  });
}

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login.html',
      'Set-Cookie': clearSessionCookie(),
      'Cache-Control': 'no-store'
    }
  });
}
