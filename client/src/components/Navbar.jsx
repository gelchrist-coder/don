import { Link } from 'react-router-dom'

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar feed-navbar">
      <Link to="/gallery" style={{ textDecoration: 'none' }}>
        <h1>DON FRANCIS</h1>
      </Link>
      {user ? (
        <div className="nav-user">
          <Link to="/upload">
            <button className="btn btn-primary">Upload</button>
          </Link>
          <button className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="nav-user">
          <Link to="/login">
            <button className="btn btn-secondary">Admin</button>
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar
