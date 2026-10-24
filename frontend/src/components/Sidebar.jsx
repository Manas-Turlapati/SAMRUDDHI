import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FarmerNotificationLink from "./FarmerNotificationLink";

const linksByRole = {
  farmer: [
    { to: "/dashboard", icon: "🌾", label: "Dashboard" },
    { to: "/history", icon: "📋", label: "History" },
    { to: "/recovery", icon: "🌱", label: "Crop Recovery" },
    { to: "/subsidies", icon: "🏛️", label: "Subsidies" },
    { to: "/profile", icon: "👤", label: "Profile" },
  ],
  expert: [
    { to: "/expert/reviews", icon: "🔬", label: "Diagnostic Queue" },
    { to: "/profile", icon: "👤", label: "Lab Profile" },
  ],
  admin: [
    { to: "/admin", icon: "⚡", label: "Control Center" },
    { to: "/expert/reviews", icon: "🔬", label: "Review Queue" },
    { to: "/profile", icon: "👤", label: "Admin Profile" },
  ],
};

const roleMeta = {
  farmer: {
    mark: "🌿",
    title: "SAMRUDDHI",
    subtitle: "Sustainable crop AI",
    badge: "Farmer Portal",
  },
  expert: {
    mark: "🔬",
    title: "AGRONOMY LAB",
    subtitle: "Clinical pathology suite",
    badge: "Licensed Agronomist",
  },
  admin: {
    mark: "⚡",
    title: "COMMAND CENTER",
    subtitle: "Platform ops & telemetry",
    badge: "System Administrator",
  },
};

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || "farmer").toLowerCase();
  const items = linksByRole[role] || linksByRole.farmer;
  const meta = roleMeta[role] || roleMeta.farmer;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`sidebar sidebar-${role}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">{meta.mark}</span>
        <div>
          <strong>{meta.title}</strong>
          <small>{meta.subtitle}</small>
        </div>
      </div>

      <div className="sidebar-role-pill">
        <span className="role-pulse-dot" />
        <span>{meta.badge}</span>
      </div>

      <nav className="side-nav" aria-label={`${role} navigation`}>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {role === "farmer" && <FarmerNotificationLink sidebar />}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-brief">
          <span className="brief-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
          <div className="brief-info">
            <strong>{user?.name || "User"}</strong>
            <small>{user?.email || ""}</small>
          </div>
        </div>
        <button type="button" className="side-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
