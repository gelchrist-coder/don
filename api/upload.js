const { supabase } = require('./_lib/supabase');
const { verifyToken } = require('./_lib/auth');

const BUCKET_NAME = 'media-uploads';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Expect JSON body with file info (uploaded directly to Supabase from frontend)
    const { files } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Save to database
      const { data: newMedia, error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          username: user.username,
          url: file.url,
          storage_path: file.storagePath,
          type: file.type,
          original_name: file.originalName,
          size: file.size
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        continue;
      }

      uploadedFiles.push({
        id: newMedia.id,
        userId: newMedia.user_id,
        username: newMedia.username,
        url: newMedia.url,
        storagePath: newMedia.storage_path,
        type: newMedia.type,
        originalName: newMedia.original_name,
        size: newMedia.size,
        uploadedAt: newMedia.uploaded_at
      });
    }

    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};
