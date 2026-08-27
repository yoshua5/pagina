const { getSession } = require('../_lib/session');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const session = getSession(req);
  if (!session || !session.access_token) {
    res.statusCode = 401;
    res.end(JSON.stringify({ connected: false }));
    return;
  }

  try {
    const fields = 'id,username,account_type,media_count';
    const profileRes = await fetch(`https://graph.instagram.com/me?fields=${fields}&access_token=${encodeURIComponent(session.access_token)}`);
    const profile = await profileRes.json();
    if (!profileRes.ok) throw new Error(profile.error?.message || 'Failed to load profile');

    const mediaFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const mediaRes = await fetch(`https://graph.instagram.com/me/media?fields=${mediaFields}&limit=50&access_token=${encodeURIComponent(session.access_token)}`);
    const mediaJson = await mediaRes.json();
    if (!mediaRes.ok) throw new Error(mediaJson.error?.message || 'Failed to load media');

    res.statusCode = 200;
    res.end(JSON.stringify({
      connected: true,
      profile,
      media: mediaJson.data || [],
    }));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ connected: false, error: err.message }));
  }
};
