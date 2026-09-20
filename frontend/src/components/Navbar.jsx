import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <Link to={isAuthenticated ? "/dashboard" : "/"} className="brand">
        <span className="brand-mark">S</span>
        <span>
          <strong>SAMRUDDHI</strong>
          <small>Sustainable crop intelligence</small>
        </span>
      </Link>

      {isAuthenticated ? (
        <nav className="topbar-nav" aria-label="Application">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <button type="button" className="text-button" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      ) : (
        <nav className="topbar-nav" aria-label="Public">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register" className="nav-register">
            Register
          </NavLink>
        </nav>
      )}

      {isAuthenticated && (
        <div className="user-chip" title={user?.email}>
          <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
          <strong>{user?.name || "User"}</strong>
        </div>
      )}
    </header>
  );
}
