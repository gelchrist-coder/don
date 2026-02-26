const { supabase } = require('./_lib/supabase');
const { verifyToken } = require('./_lib/auth');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = 'media-uploads';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      multiples: true,
    });

    const [fields, files] = await form.parse(req);
    
    const fileArray = files.files || [];
    if (fileArray.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of fileArray) {
      const isVideo = file.mimetype.startsWith('video/');
      const ext = path.extname(file.originalFilename);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filePath = `${user.id}/${uniqueName}`;

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.filepath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Save to database
      const { data: newMedia, error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: user.id,
          username: user.username,
          url: urlData.publicUrl,
          storage_path: filePath,
          type: isVideo ? 'video' : 'image',
          original_name: file.originalFilename,
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

      // Clean up temp file
      fs.unlinkSync(file.filepath);
    }

    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};
