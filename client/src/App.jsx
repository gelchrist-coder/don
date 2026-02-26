import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import PublicGallery from './components/PublicGallery'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="app">
      <Navbar user={user} onLogout={logout} />
      <Routes>
        <Route 
          path="/gallery" 
          element={<PublicGallery />} 
        />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/upload" /> : <Login onLogin={login} />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/upload" /> : <Register onLogin={login} />} 
        />
        <Route 
          path="/upload" 
          element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to="/gallery" />} 
        />
      </Routes>
    </div>
  )
}

export default App
