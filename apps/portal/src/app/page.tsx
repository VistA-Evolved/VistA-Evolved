/**
 * Portal Login Page
 *
 * Dev mode: shows sandbox credentials for demo patient.
 * Production: OIDC/SAML integration (future).
 *
 * No VA terminology in patient-facing UI.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDev = process.env.NODE_ENV !== "production";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/portal/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Login failed" }));
        setError(body.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Health Portal</h1>
        <p>Sign in to access your health records</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--portal-danger)",
                fontSize: "0.8125rem",
                marginBottom: "0.75rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {isDev && (
          <div className="sandbox-hint">
            <strong>Development mode</strong>
            <br />
            Use <code>patient1</code> / <code>patient1</code> to sign in as a
            demo patient.
          </div>
        )}
      </div>
    </div>
  );
}
