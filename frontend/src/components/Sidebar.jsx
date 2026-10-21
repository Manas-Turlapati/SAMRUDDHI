import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FarmerNotificationLink from "./FarmerNotificationLink";

const linksByRole = {
  farmer: [
    { to: "/dashboard", icon: "D", label: "Dashboard" },
    { to: "/history", icon: "H", label: "History" },
    { to: "/subsidies", icon: "S", label: "Subsidies" },
    { to: "/profile", icon: "P", label: "Profile" },
  ],
  expert: [
    { to: "/expert/reviews", icon: "E", label: "Review Queue" },
    { to: "/profile", icon: "P", label: "Profile" },
  ],
  admin: [
    { to: "/admin", icon: "A", label: "Admin Tools" },
    { to: "/expert/reviews", icon: "E", label: "Expert Reviews" },
    { to: "/profile", icon: "P", label: "Profile" },
  ],
};

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || "farmer").toLowerCase();
  const items = linksByRole[role] || linksByRole.farmer;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">S</span>
        <div><strong>SAMRUDDHI</strong><small>{role === "farmer" ? "Sustainable crop AI" : `${role[0].toUpperCase()}${role.slice(1)} workspace`}</small></div>
      </div>
      <nav className="side-nav" aria-label={`${role} navigation`}>
        {items.map((item) => <NavLink key={item.to} to={item.to}><span>{item.icon}</span>{item.label}</NavLink>)}
        {role === "farmer" && <FarmerNotificationLink sidebar />}
      </nav>
      <button type="button" className="side-logout" onClick={handleLogout}>Logout</button>
    </aside>
  );
}
