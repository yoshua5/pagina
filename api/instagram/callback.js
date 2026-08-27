const { STATE_COOKIE, parseCookies, setSessionCookie, clearCookie, redirectUri } = require('../_lib/session');

async function exchangeCodeForToken({ appId, appSecret, redirect, code }) {
  const form = new URLSearchParams();
  form.set('client_id', appId);
  form.set('client_secret', appSecret);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', redirect);
  form.set('code', code);

  const r = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) {
    throw new Error(data.error_message || data.error_type || 'Failed to exchange code for token');
  }
  return data; // { access_token, user_id, permissions }
}

async function exchangeForLongLivedToken({ appSecret, shortToken }) {
  const url = 'https://graph.instagram.com/access_token'
    + '?grant_type=ig_exchange_token'
    + `&client_secret=${encodeURIComponent(appSecret)}`
    + `&access_token=${encodeURIComponent(shortToken)}`;
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Failed to get long-lived token');
  }
  return data; // { access_token, token_type, expires_in }
}

module.exports = async (req, res) => {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectBase = new URL(`https://${req.headers.host}/feedbrand/`);

  try {
    if (!appId || !appSecret) {
      throw new Error('Server is missing INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET environment variables.');
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error') || url.searchParams.get('error_description');

    if (errorParam) throw new Error(errorParam);
    if (!code) throw new Error('Missing authorization code from Instagram.');

    const cookies = parseCookies(req);
    if (!state || !cookies[STATE_COOKIE] || cookies[STATE_COOKIE] !== state) {
      throw new Error('OAuth state mismatch. Please try connecting again.');
    }
    clearCookie(res, STATE_COOKIE);

    const redirect = redirectUri(req);
    const shortLived = await exchangeCodeForToken({ appId, appSecret, redirect, code });
    const longLived = await exchangeForLongLivedToken({ appSecret, shortToken: shortLived.access_token });

    setSessionCookie(res, {
      access_token: longLived.access_token,
      user_id: shortLived.user_id,
      obtained_at: Date.now(),
    }, longLived.expires_in || 60 * 24 * 60 * 60);

    redirectBase.searchParams.set('connected', '1');
    res.statusCode = 302;
    res.setHeader('Location', redirectBase.toString());
    res.end();
  } catch (err) {
    redirectBase.searchParams.set('ig_error', err.message || 'connection_failed');
    res.statusCode = 302;
    res.setHeader('Location', redirectBase.toString());
    res.end();
  }
};
