import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setApiKey as setGlobalApiKey } from "@/dashboard/api";

const STORAGE_KEY = "argus.api_key";

interface AuthState {
  apiKey: string | null;
  authEnabled: boolean | null;  // null = still checking, false = guest mode, true = auth required
  isGuest: boolean;             // true = guest mode (no key on server, no key entered)
  login: (key: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  handleUnauthorized: () => void;
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  authEnabled: null,
  isGuest: false,
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
  // null = still checking server config; false = no auth required (dev mode);
  // true = auth required, must show Login unless apiKey is set.
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

  // Probe server auth config on mount, then verify any stored key.
  // If auth is required, the stored key must validate against /auth/verify
  // (don't trust localStorage blindly — server-side key may have changed).
  // If auth is not required, treat as guest mode (read-only) and clear stored key.
  useEffect(() => {
    let cancelled = false;
    const stored = (() => {
      try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
    })();

    (async () => {
      try {
        const configRes = await fetch("/auth/config");
        const config = await configRes.json();
        if (cancelled) return;
        const enabled = !!config?.auth_enabled;
        setAuthEnabled(enabled);

        if (!enabled) {
          // Guest mode: clear any stale key
          localStorage.setItem(STORAGE_KEY, "");
          setGlobalApiKey("");
          setApiKey("");
          return;
        }

        if (stored) {
          // Verify stored key against server before trusting it
          const verifyRes = await fetch("/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: stored }),
          });
          const verify = await verifyRes.json();
          if (cancelled) return;
          if (verify.ok && verify.auth_required) {
            setGlobalApiKey(stored);
            setApiKey(stored);
          } else {
            // Invalid key — clear and force Login
            localStorage.removeItem(STORAGE_KEY);
            setGlobalApiKey(null);
            setApiKey(null);
          }
        }
      } catch {
        // Backend unreachable: fall back to guest mode (server enforces read-only)
        if (!cancelled) setAuthEnabled(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (key: string) => {
    try {
      const res = await fetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.ok && data.auth_required) {
        localStorage.setItem(STORAGE_KEY, key);
        setGlobalApiKey(key);
        setApiKey(key);
        return { ok: true };
      }
      if (data.ok && !data.auth_required) {
        // Server doesn't require auth (no key configured) — accept any input
        return { ok: true };
      }
      return { ok: false, error: data.error || "Invalid key" };
    } catch (e) {
      return { ok: false, error: "Connection failed" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGlobalApiKey(null);
    setApiKey(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGlobalApiKey(null);
    setApiKey(null);
  }, []);

  // Listen for 401 events from apiFetch
  useEffect(() => {
    const handler = () => handleUnauthorized();
    window.addEventListener("argus:unauthorized", handler);
    return () => window.removeEventListener("argus:unauthorized", handler);
  }, [handleUnauthorized]);

  // React to key updates from settings (auth-tab dispatches this event)
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setGlobalApiKey(stored);
        setApiKey(stored);
      }
    };
    window.addEventListener("argus:auth-updated", handler);
    return () => window.removeEventListener("argus:auth-updated", handler);
  }, []);

  const isGuest = authEnabled === false;

  return (
    <AuthContext.Provider value={{ apiKey, authEnabled, isGuest, login, logout, handleUnauthorized }}>
      {children}
    </AuthContext.Provider>
  );
}
