import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/dashboard", icon: "D", label: "Dashboard" },
  { to: "/history", icon: "H", label: "History" },
  { to: "/profile", icon: "P", label: "Profile" },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">S</span>
        <div>
          <strong>SAMRUDDHI</strong>
          <small>Sustainable crop AI</small>
        </div>
      </div>

      <nav className="side-nav" aria-label="Main">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="side-logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}
