import { createSession, safeEqual, sessionCookie } from '../_lib/auth.js';

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

export async function onRequestPost({ request, env }) {
  const configured = env.AUTH_USER && env.AUTH_PASSWORD && env.SESSION_SECRET;
  if (!configured) {
    return json({ ok: false, error: 'El acceso seguro todavía no está configurado en el servidor.' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Solicitud inválida.' }, 400);
  }

  const username = String(payload?.username ?? '').trim();
  const password = String(payload?.password ?? '');

  const validUser = safeEqual(username, env.AUTH_USER);
  const validPassword = safeEqual(password, env.AUTH_PASSWORD);
  if (!validUser || !validPassword) {
    return json({ ok: false, error: 'Usuario o contraseña incorrectos.' }, 401);
  }

  const token = await createSession(env.SESSION_SECRET);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token) });
}

export function onRequestGet() {
  return json({ ok: false, error: 'Método no permitido.' }, 405, { Allow: 'POST' });
}
