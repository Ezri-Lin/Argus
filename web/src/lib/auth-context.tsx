import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "argus.api_key";

interface AuthState {
  apiKey: string | null;
  login: (key: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  handleUnauthorized: () => void;
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  login: async () => ({ ok: false }),
  logout: () => {},
  handleUnauthorized: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const login = useCallback(async (key: string) => {
    try {
      const res = await fetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem(STORAGE_KEY, key);
        setApiKey(key);
        return { ok: true };
      }
      return { ok: false, error: data.error || "Invalid key" };
    } catch (e) {
      return { ok: false, error: "Connection failed" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  }, []);

  // Listen for 401 events from apiFetch
  useEffect(() => {
    const handler = () => handleUnauthorized();
    window.addEventListener("argus:unauthorized", handler);
    return () => window.removeEventListener("argus:unauthorized", handler);
  }, [handleUnauthorized]);

  return (
    <AuthContext.Provider value={{ apiKey, login, logout, handleUnauthorized }}>
      {children}
    </AuthContext.Provider>
  );
}
