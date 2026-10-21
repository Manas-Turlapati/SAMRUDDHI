import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FarmerNotificationLink from "./FarmerNotificationLink";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || "farmer").toLowerCase();
  const home = role === "admin" ? "/admin" : role === "expert" ? "/expert/reviews" : "/dashboard";
  const links = role === "admin"
    ? [{ to: "/admin", label: "Admin Tools" }, { to: "/expert/reviews", label: "Reviews" }, { to: "/profile", label: "Profile" }]
    : role === "expert"
      ? [{ to: "/expert/reviews", label: "Review Queue" }, { to: "/profile", label: "Profile" }]
      : [{ to: "/dashboard", label: "Dashboard" }, { to: "/history", label: "History" }, { to: "/subsidies", label: "Subsidies" }, { to: "/profile", label: "Profile" }];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <Link to={isAuthenticated ? home : "/"} className="brand">
        <span className="brand-mark">S</span>
        <span>
          <strong>SAMRUDDHI</strong>
          <small>Sustainable crop intelligence</small>
        </span>
      </Link>

      {isAuthenticated ? (
        <nav className="topbar-nav" aria-label="Application">
          {links.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
          {role === "farmer" && <FarmerNotificationLink />}
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
