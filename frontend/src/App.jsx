import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Loading from "./components/Loading";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import WebsiteTranslator from "./components/WebsiteTranslator";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";

function ProtectedRoute({ children }) {
  const { isAuthenticated, checkingAuth } = useAuth();
  const location = useLocation();

  if (checkingAuth) {
    return <Loading label="Preparing your workspace..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) {
    return <Loading label="Checking session..." fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Navbar />
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
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <AppLayout>
                <History />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
