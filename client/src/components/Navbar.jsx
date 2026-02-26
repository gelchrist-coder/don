import { Link } from 'react-router-dom'

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar feed-navbar">
      <Link to="/gallery" style={{ textDecoration: 'none' }}>
        <h1>DON FRANCIS</h1>
      </Link>
      <div className="nav-user">
        <Link to="/gallery">
          <button className="btn btn-secondary">View Gallery</button>
        </Link>
        <Link to="/upload">
          <button className="btn btn-primary">Upload</button>
        </Link>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
