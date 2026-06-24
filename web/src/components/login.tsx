import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { color, radius, fontFamily } from "@/design/tokens";

export function Login() {
  const { login } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    const result = await login(key.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Invalid key");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 340,
          padding: 32,
          background: "var(--color-card)",
          borderRadius: radius.card,
          border: "1px solid var(--color-hairline)",
          boxShadow: "var(--shadow-elev)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4, textAlign: "center" }}>
          Argus
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 24, textAlign: "center" }}>
          Enter access key to continue
        </div>

        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(""); }}
          placeholder="Access key"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily,
            color: "var(--color-text-primary)",
            background: "var(--color-surface-2)",
            border: `1px solid ${error ? color.neg : "var(--color-hairline)"}`,
            borderRadius: radius.inner,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: color.neg }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !key.trim()}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 600,
            fontFamily,
            color: "var(--color-white)",
            background: "var(--color-accent)",
            border: "none",
            borderRadius: radius.inner,
            cursor: loading || !key.trim() ? "default" : "pointer",
            opacity: loading || !key.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Verifying..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
