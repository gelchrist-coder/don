# Media Upload App

A React + Node.js application for uploading and managing images and videos with Supabase cloud storage and user authentication.

## Features

- 📸 Upload images (JPG, PNG, GIF, WebP)
- 🎬 Upload videos (MP4, MOV, AVI, WebM)
- ☁️ Cloud storage with Supabase
- 🔐 User authentication (register/login)
- 👥 Multi-user support
- 🖼️ Gallery view with preview
- 🗑️ Delete your uploads
- 📱 Responsive design

## Setup

### 1. Get Supabase Credentials

1. Sign up at [https://supabase.com](https://supabase.com) (free tier available)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **service_role key** (secret)

### 2. Configure Server

1. Navigate to the server folder:
   ```
   cd server
   ```

2. Create a `.env` file (copy from `.env.example`):
   ```
   copy .env.example .env
   ```

3. Edit `.env` and add your Supabase credentials:
   ```
   PORT=5000
   JWT_SECRET=your-super-secret-key-here
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

### 3. Start the Application

**Terminal 1 - Start Backend:**
```
cd server
npm start
```

**Terminal 2 - Start Frontend:**
```
cd client
npm run dev
```

### 4. Open the App

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Register** - Create a new account
2. **Login** - Sign in with your credentials
3. **Upload** - Drag and drop or click to upload images/videos
4. **View** - Browse your media gallery
5. **Delete** - Remove your uploads

## Tech Stack

- **Frontend:** React, Vite, React Router, Axios
- **Backend:** Node.js, Express
- **Storage:** Supabase Storage
- **Auth:** JWT, bcrypt

## File Size Limits

- Images: Up to 100MB
- Videos: Up to 100MB



