// AuthPage.jsx — Login / Signup page

import { useState } from "react";
import { login, register, setToken } from "../api";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await login(email, password)
          : await register(name, email, password);
      setToken(data.token);
      onAuth({ id: data.user_id, name: data.name, email: data.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        backgroundImage:
          "radial-gradient(circle, var(--dot-color) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧠</div>
        <h1
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 900,
            fontSize: "32px",
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Brain<span style={{ color: "var(--citrus)" }}>Buddy</span>
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "14px",
            marginTop: "6px",
          }}
        >
          Engineering explained like you're five
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: "var(--bg-input)",
          border: "1.5px solid var(--border-main)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-page)",
            borderRadius: "var(--radius-sm)",
            padding: "4px",
            marginBottom: "24px",
          }}
        >
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: mode === m ? "var(--bg-input)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: "14px",
                fontWeight: mode === m ? 500 : 400,
                cursor: "pointer",
                boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name field — signup only */}
          {mode === "signup" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--border-main)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-page)",
                  color: "var(--text-primary)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--citrus)")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-main)")
                }
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid var(--border-main)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-page)",
                color: "var(--text-primary)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--citrus)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-main)")
              }
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              placeholder={
                mode === "signup" ? "At least 6 characters" : "••••••••"
              }
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid var(--border-main)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-page)",
                color: "var(--text-primary)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--citrus)")}
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-main)")
              }
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                background: "var(--coral-pale)",
                border: "1px solid #F5C4B6",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "var(--coral)",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "var(--radius-md)",
              background: "var(--navy)",
              color: "white",
              fontFamily: "DM Sans, sans-serif",
              fontSize: "15px",
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading
              ? mode === "login"
                ? "Logging in…"
                : "Creating account…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
      </div>

      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "12px",
          marginTop: "24px",
          opacity: 0.6,
        }}
      >
        Your conversations are private and tied to your account.
      </p>
    </div>
  );
}
