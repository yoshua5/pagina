const crypto = require('crypto');

const COOKIE_NAME = 'ig_session';
const STATE_COOKIE = 'ig_oauth_state';

function secret() {
  return process.env.COOKIE_SECRET || process.env.INSTAGRAM_APP_SECRET || 'feedbrand-dev-secret';
}

function sign(value) {
  const h = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  return `${value}.${h}`;
}

function unsign(signed) {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  return value;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, data, maxAgeSeconds) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signed = sign(payload);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${signed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function getSession(req) {
  const cookies = parseCookies(req);
  const raw = cookies[COOKIE_NAME];
  const unsigned = unsign(raw);
  if (!unsigned) return null;
  try {
    return JSON.parse(Buffer.from(unsigned, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function redirectUri(req) {
  return process.env.INSTAGRAM_REDIRECT_URI || `https://${req.headers.host}/api/instagram/callback`;
}

module.exports = {
  COOKIE_NAME,
  STATE_COOKIE,
  sign,
  unsign,
  parseCookies,
  setSessionCookie,
  clearCookie,
  getSession,
  redirectUri,
};
