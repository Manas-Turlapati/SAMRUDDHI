import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Loading from "./components/Loading";
import Navbar from "./components/Navbar";
import Notifications from "./pages/Notifications";
import Sidebar from "./components/Sidebar";
import WebsiteTranslator from "./components/WebsiteTranslator";
import FarmerRealtimeBridge from "./components/FarmerRealtimeBridge";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import AdminTools from "./pages/AdminTools";
import ExpertReviewQueue from "./pages/ExpertReviewQueue";
import History from "./pages/History";
import Home from "./pages/Home";
import MagicReview from "./pages/MagicReview";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Subsidies from "./pages/Subsidies";
import RecoveryTracker from "./pages/RecoveryTracker";

const roleHome = (value) => {
  const role = String(value || "farmer").toLowerCase();
  if (role === "expert") return "/expert/reviews";
  if (role === "admin") return "/admin";
  return "/dashboard";
};

function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, checkingAuth, user } = useAuth();
  const location = useLocation();

  if (checkingAuth) {
    return <Loading label="Preparing your workspace..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = String(user?.role || "farmer").toLowerCase();
  if (roles.length && !roles.includes(role === "user" ? "farmer" : role)) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, checkingAuth, user } = useAuth();

  if (checkingAuth) {
    return <Loading label="Checking session..." fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  return children;
}

function AppLayout({ children }) {
  const { user } = useAuth();
  const role = String(user?.role || "farmer").toLowerCase();
  return (
    <div className={`app-shell role-${role}`} data-role={role}>
      <Sidebar />
      <main className="app-main">
        <Navbar />
        {role === "farmer" && <FarmerRealtimeBridge />}
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <WebsiteTranslator />
      <Routes>
        <Route path="/review/magic" element={<MagicReview />} />
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <AppLayout>
                <History />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recovery"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <AppLayout>
                <RecoveryTracker />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <AppLayout><Notifications /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subsidies"
          element={
            <ProtectedRoute roles={["farmer"]}>
              <AppLayout>
                <Subsidies />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/expert/reviews" element={<ProtectedRoute roles={["expert", "admin"]}><AppLayout><ExpertReviewQueue /></AppLayout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminTools /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
