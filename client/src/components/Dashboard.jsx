import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import api from '../config'

// Initialize Supabase client for direct uploads
const SUPABASE_URL = 'https://suwxuwlvfvbqknydaetx.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const BUCKET_NAME = 'media-uploads'

function Dashboard({ user }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [viewAll, setViewAll] = useState(false)
  const fileInputRef = useRef(null)

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const fetchMedia = async () => {
    try {
      const endpoint = viewAll ? '/api/media/all' : '/api/media'
      const response = await api.get(endpoint, getAuthHeader())
      setMedia(response.data)
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [viewAll])

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return

    if (!supabase) {
      alert('Upload not configured. Please add VITE_SUPABASE_ANON_KEY.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadedFiles = []
      const totalFiles = files.length
      let completed = 0

      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/')
        const ext = file.name.split('.').pop()
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
        const filePath = `${user.id}/${uniqueName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          })

        if (error) {
          console.error('Upload error:', error)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath)

        uploadedFiles.push({
          url: urlData.publicUrl,
          storagePath: filePath,
          type: isVideo ? 'video' : 'image',
          originalName: file.name,
          size: file.size
        })

        completed++
        setUploadProgress(Math.round((completed / totalFiles) * 100))
      }

      // Save metadata to database via API
      if (uploadedFiles.length > 0) {
        await api.post('/api/upload', { files: uploadedFiles }, getAuthHeader())
      }

      fetchMedia()
    } catch (error) {
      console.error('Upload error:', error)
      alert(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this?')) return

    try {
      await api.delete(`/api/media/${id}`, getAuthHeader())
      setMedia(media.filter(m => m.id !== id))
    } catch (error) {
      alert(error.response?.data?.error || 'Delete failed')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleUpload(e.dataTransfer.files)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get thumbnail URL (smaller size for grid view)
  const getThumbnailUrl = (url) => {
    if (url.includes('supabase.co')) {
      return url + '?width=300&quality=70'
    }
    return url
  }

  return (
    <div className="dashboard">
      {/* Upload Section */}
      <div 
        className={`upload-section ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <div className="upload-icon">☁️</div>
          <h3>Upload Your Media</h3>
          <p>Drag and drop images or videos here, or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button 
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Choose Files'}
          </button>
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="progress-text">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </div>

      {/* Gallery Section */}
      <div className="gallery-header">
        <h2>{viewAll ? 'All Media' : 'My Media'}</h2>
        <div className="view-toggle">
          <button 
            className={`btn ${!viewAll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewAll(false)}
          >
            My Uploads
          </button>
          <button 
            className={`btn ${viewAll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewAll(true)}
          >
            All Media
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : media.length === 0 ? (
        <div className="empty-state">
          <h3>No media yet</h3>
          <p>Upload your first image or video to get started!</p>
        </div>
      ) : (
        <div className="media-grid">
          {media.map((item) => (
            <div key={item.id} className="media-card">
              <div 
                className="media-preview"
                onClick={() => setSelectedMedia(item)}
                style={{ cursor: 'pointer' }}
              >
                <span className="media-type-badge">{item.type}</span>
                {item.type === 'video' ? (
                  <video src={item.url} muted preload="metadata" />
                ) : (
                  <img src={getThumbnailUrl(item.url)} alt={item.originalName} loading="lazy" />
                )}
              </div>
              <div className="media-info">
                <p className="media-name" title={item.originalName}>
                  {item.originalName}
                </p>
                <div className="media-meta">
                  <span>{item.username}</span>
                  <span>{formatDate(item.uploadedAt)}</span>
                </div>
              </div>
              <div className="media-actions">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  Open
                </a>
                {item.userId === user.id && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing media */}
      {selectedMedia && (
        <div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMedia(null)}>
              ×
            </button>
            {selectedMedia.type === 'video' ? (
              <video src={selectedMedia.url} controls autoPlay style={{ maxWidth: '100%' }} />
            ) : (
              <img src={selectedMedia.url} alt={selectedMedia.originalName} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
