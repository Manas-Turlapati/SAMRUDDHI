import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="page-content">
      <section className="page-header">
        <span className="eyebrow">Profile</span>
        <h1>Account details</h1>
        <p>Your protected account information from the Node/Express backend.</p>
      </section>

      <section className="profile-card">
        <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{user?.name || "Not available"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "Not available"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role || "USER"}</dd>
          </div>
        </dl>
        <button type="button" className="primary-button" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
