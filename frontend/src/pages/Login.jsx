import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [selectedRole, setSelectedRole] = useState("farmer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError("");
    try {
      await googleLogin(credential);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await login({ ...form, role: selectedRole });
      const roleHome = selectedRole === "admin" ? "/admin" : selectedRole === "expert" ? "/expert/reviews" : "/dashboard";
      navigate(location.state?.from?.pathname || roleHome, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">S</span>
          <span>
            <strong>SAMRUDDHI</strong>
            <small>Welcome back</small>
          </span>
        </Link>
        <h1>Login</h1>
        <p>Choose your account role, then enter the email and password for that account.</p>

        <div className="login-role-picker" role="group" aria-label="Choose account role">
          {["farmer", "expert", "admin"].map((role) => <button
            key={role}
            type="button"
            className={selectedRole === role ? "active" : ""}
            aria-pressed={selectedRole === role}
            onClick={() => { setSelectedRole(role); setError(""); }}
          >{role[0].toUpperCase() + role.slice(1)}</button>)}
        </div>

        <form onSubmit={handleSubmit} className="form-stack" autoComplete="off">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Enter email"
              autoComplete="off"
            />
          </label>
          <label>
            Password
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Enter password"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {selectedRole === "farmer"
          ? <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
          : <p className="role-login-note">{selectedRole === "expert" ? "Expert accounts must be verified by an administrator. If you need access, contact the app administrator." : "Admin accounts are assigned by the app owner; public registration creates farmer accounts only."}</p>}

        {selectedRole === "farmer" && <p className="auth-switch">New here? <Link to="/register">Create a farmer account</Link></p>}
      </section>
    </main>
  );
}
