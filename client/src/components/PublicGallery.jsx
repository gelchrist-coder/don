import { useState, useEffect } from 'react'
import api from '../config'

function PublicGallery() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState(null)

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await api.get('/api/gallery')
        setMedia(response.data)
      } catch (error) {
        console.error('Failed to fetch media:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMedia()
  }, [])

  // Get thumbnail URL (smaller size for grid view)
  const getThumbnailUrl = (url) => {
    // Supabase storage supports image transformation
    if (url.includes('supabase.co')) {
      return url + '?width=400&quality=70'
    }
    return url
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Close modal on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedMedia(null)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="empty-icon">📷</div>
        <h2>No photos yet</h2>
        <p>Check back soon for new uploads!</p>
      </div>
    )
  }

  return (
    <div className="google-gallery">
      {/* Masonry Grid */}
      <div className="masonry-grid">
        {media.map((item) => (
          <div 
            key={item.id} 
            className="masonry-item"
            onClick={() => setSelectedMedia(item)}
          >
            {item.type === 'video' ? (
              <div className="media-wrapper">
                <video src={item.url} muted className="masonry-media" preload="metadata" />
                <div className="video-indicator">▶</div>
              </div>
            ) : (
              <div className="media-wrapper">
                <img 
                  src={getThumbnailUrl(item.url)} 
                  alt={item.originalName} 
                  className="masonry-media"
                  loading="lazy"
                />
              </div>
            )}
            <div className="item-overlay">
              <span className="item-date">{formatDate(item.uploadedAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="lightbox" onClick={() => setSelectedMedia(null)}>
          <button className="lightbox-close" onClick={() => setSelectedMedia(null)}>×</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === 'video' ? (
              <video 
                src={selectedMedia.url} 
                controls 
                autoPlay 
                className="lightbox-media"
              />
            ) : (
              <img 
                src={selectedMedia.url} 
                alt={selectedMedia.originalName}
                className="lightbox-media"
              />
            )}
            <div className="lightbox-info">
              <p className="lightbox-name">{selectedMedia.originalName}</p>
              <p className="lightbox-meta">
                Uploaded by {selectedMedia.username} • {formatDate(selectedMedia.uploadedAt)}
              </p>
            </div>
          </div>
          
          {/* Navigation arrows */}
          <button 
            className="lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation()
              const idx = media.findIndex(m => m.id === selectedMedia.id)
              if (idx > 0) setSelectedMedia(media[idx - 1])
            }}
            disabled={media.findIndex(m => m.id === selectedMedia.id) === 0}
          >
            ‹
          </button>
          <button 
            className="lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation()
              const idx = media.findIndex(m => m.id === selectedMedia.id)
              if (idx < media.length - 1) setSelectedMedia(media[idx + 1])
            }}
            disabled={media.findIndex(m => m.id === selectedMedia.id) === media.length - 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

export default PublicGallery
