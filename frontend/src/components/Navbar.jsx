import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FarmerNotificationLink from "./FarmerNotificationLink";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || "farmer").toLowerCase();
  const home = role === "admin" ? "/admin" : role === "expert" ? "/expert/reviews" : "/dashboard";
  const links = role === "admin"
    ? [{ to: "/admin", label: "Control Center" }, { to: "/expert/reviews", label: "Reviews" }, { to: "/profile", label: "Profile" }]
    : role === "expert"
      ? [{ to: "/expert/reviews", label: "Diagnostic Queue" }, { to: "/profile", label: "Profile" }]
      : [{ to: "/dashboard", label: "Dashboard" }, { to: "/history", label: "History" }, { to: "/recovery", label: "Recovery" }, { to: "/subsidies", label: "Subsidies" }, { to: "/profile", label: "Profile" }];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleTitle = role === "admin"
    ? "Operations Command"
    : role === "expert"
      ? "Agronomy Pathology Lab"
      : "Sustainable crop intelligence";

  const brandIcon = role === "admin" ? "⚡" : role === "expert" ? "🔬" : "S";

  return (
    <header className={`topbar topbar-${role}`}>
      <Link to={isAuthenticated ? home : "/"} className="brand">
        <span className="brand-mark">{brandIcon}</span>
        <span>
          <strong>SAMRUDDHI</strong>
          <small>{roleTitle}</small>
        </span>
      </Link>

      {isAuthenticated && role === "expert" && (
        <div className="nav-status-pill expert-status">
          <span className="live-dot" />
          <span>Pathologist Console</span>
        </div>
      )}

      {isAuthenticated && role === "admin" && (
        <div className="nav-status-pill admin-status">
          <span className="live-dot" />
          <span>Super Admin Mode</span>
        </div>
      )}

      {isAuthenticated ? (
        <nav className="topbar-nav" aria-label="Application">
          {links.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
          {role === "farmer" && <FarmerNotificationLink />}
          <button type="button" className="text-button topbar-logout" onClick={handleLogout}>
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
        <div className={`user-chip user-chip-${role}`} title={user?.email}>
          <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
          <div className="user-chip-text">
            <strong>{user?.name || "User"}</strong>
            <small>{role.toUpperCase()}</small>
          </div>
        </div>
      )}
    </header>
  );
}
