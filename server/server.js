require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const USERS_FILE = path.join(__dirname, 'users.json');
const MEDIA_FILE = path.join(__dirname, 'media.json');

// Configure Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'media-uploads';

// Initialize bucket (run once)
async function initBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
    if (error) {
      console.log('Bucket check error:', error.message);
      console.log('Attempting to create bucket...');
      const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 104857600 // 100MB
      });
      if (createError) {
        console.error('Failed to create bucket:', createError.message);
        console.log('\n⚠️  Please create the bucket manually in Supabase:');
        console.log('1. Go to your Supabase dashboard → Storage');
        console.log('2. Click "New bucket"');
        console.log('3. Name it "media-uploads"');
        console.log('4. Check "Public bucket"');
        console.log('5. Click "Create bucket"\n');
      } else {
        console.log('✓ Created storage bucket:', BUCKET_NAME);
      }
    } else {
      console.log('✓ Storage bucket ready:', BUCKET_NAME);
    }
  } catch (err) {
    console.error('Bucket init error:', err.message);
  }
}
initBucket();

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.use(cors());
app.use(express.json());

// Helper functions for file-based storage
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readMedia() {
  if (!fs.existsSync(MEDIA_FILE)) {
    fs.writeFileSync(MEDIA_FILE, '[]');
  }
  return JSON.parse(fs.readFileSync(MEDIA_FILE, 'utf8'));
}

function writeMedia(media) {
  fs.writeFileSync(MEDIA_FILE, JSON.stringify(media, null, 2));
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = readUsers();
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const users = readUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Media routes
app.post('/api/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const media = readMedia();
    const uploadedFiles = [];

    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filePath = `${req.user.id}/${uniqueName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
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

      const newMedia = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        userId: req.user.id,
        username: req.user.username,
        url: urlData.publicUrl,
        storagePath: filePath,
        type: isVideo ? 'video' : 'image',
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
      
      media.push(newMedia);
      uploadedFiles.push(newMedia);
    }

    writeMedia(media);
    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/media', authenticateToken, (req, res) => {
  const media = readMedia();
  const userMedia = media.filter(m => m.userId === req.user.id);
  res.json(userMedia.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
});

app.get('/api/media/all', authenticateToken, (req, res) => {
  const media = readMedia();
  res.json(media.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
});

// Public gallery - no authentication required
app.get('/api/gallery', (req, res) => {
  const media = readMedia();
  res.json(media.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
});

app.delete('/api/media/:id', authenticateToken, async (req, res) => {
  try {
    const media = readMedia();
    const mediaItem = media.find(m => m.id === req.params.id && m.userId === req.user.id);
    
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([mediaItem.storagePath]);

    if (error) {
      console.error('Supabase delete error:', error);
    }

    const updatedMedia = media.filter(m => m.id !== req.params.id);
    writeMedia(updatedMedia);
    
    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
