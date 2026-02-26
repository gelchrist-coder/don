const { supabase } = require('./_lib/supabase');
const { verifyToken } = require('./_lib/auth');

const BUCKET_NAME = 'media-uploads';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all user's media
    const { data: userMedia, error: mediaError } = await supabase
      .from('media')
      .select('storage_path')
      .eq('user_id', user.id);

    if (!mediaError && userMedia && userMedia.length > 0) {
      // Delete all files from storage
      const filePaths = userMedia.map(m => m.storage_path);
      await supabase.storage
        .from(BUCKET_NAME)
        .remove(filePaths);
    }

    // Delete all media records
    await supabase
      .from('media')
      .delete()
      .eq('user_id', user.id);

    // Delete user account
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
