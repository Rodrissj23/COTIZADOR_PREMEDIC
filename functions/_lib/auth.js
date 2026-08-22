const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function safeEqual(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  const len = Math.max(left.length, right.length, 1);
  let diff = left.length ^ right.length;
  for (let i = 0; i < len; i++) {
    diff |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0) ^
            (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
  }
  return diff === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSession(secret, ttlSeconds = 8 * 60 * 60) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `v1.${expires}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySession(token, secret) {
  if (!token || !secret) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;

  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await sign(payload, secret);
  return safeEqual(parts[2], expected);
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

export function sessionCookie(token) {
  return `pm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${8 * 60 * 60}`;
}

export function clearSessionCookie() {
  return 'pm_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
