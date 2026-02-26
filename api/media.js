const { supabase } = require('./_lib/supabase');
const { verifyToken } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: media, error } = await supabase
      .from('media')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Media fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }

    const formatted = media.map(m => ({
      id: m.id,
      userId: m.user_id,
      username: m.username,
      url: m.url,
      storagePath: m.storage_path,
      type: m.type,
      originalName: m.original_name,
      size: m.size,
      uploadedAt: m.uploaded_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Media error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};
