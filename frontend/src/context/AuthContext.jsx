import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ldfrs_token"));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("ldfrs_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (active) {
          setUser(data.user);
          localStorage.setItem("ldfrs_user", JSON.stringify(data.user));
        }
      } catch {
        if (active) {
          setToken(null);
          setUser(null);
          localStorage.removeItem("ldfrs_token");
          localStorage.removeItem("ldfrs_user");
        }
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  const persistSession = (authToken, authUser) => {
    localStorage.setItem("ldfrs_token", authToken);
    localStorage.setItem("ldfrs_user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      persistSession(data.token, data.user);
      return data;
    } catch (error) {
      throw new Error(getApiError(error, "Unable to create your account. Please try again."));
    }
  };

  const login = async (payload) => {
    try {
      const { data } = await api.post("/auth/login", payload);
      persistSession(data.token, data.user);
      return data;
    } catch (error) {
      throw new Error(getApiError(error, "Unable to sign in. Please check your details."));
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post("/auth/logout");
      }
    } finally {
      localStorage.removeItem("ldfrs_token");
      localStorage.removeItem("ldfrs_user");
      setToken(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      checkingAuth,
      isAuthenticated: Boolean(token && user),
      register,
      login,
      logout,
    }),
    [token, user, checkingAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
