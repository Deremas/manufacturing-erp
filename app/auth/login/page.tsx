"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const TEAL = "#00897b";
const MODULES = ["Procurement", "Production", "Quality", "Inventory", "Finance"];

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCallbackUrl(params.get("callbackUrl") || "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      setError("Enter your username, email, or phone number.");
      return;
    }
    if (!password || !password.trim()) {
      setError("Enter your password.");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier: normalizedIdentifier,
        password,
        callbackUrl,
      });
      if (result?.error || !result?.ok) {
        setError("Invalid username, email, phone, or password.");
        return;
      }
      router.replace(result.url || callbackUrl);
      router.refresh();
    } catch {
      setError("Sign in could not be completed. Check the server connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="login-brand-mark">
          <div className="login-logo">NE</div>
          <div>
            <div className="login-brand-title">NEW ERP</div>
            <div className="login-brand-tagline">Secure manufacturing and operations control.</div>
          </div>
        </div>

        <div className="login-copy">
          <div className="login-pill">Sign in securely</div>
          <h1>One account for the full ERP.</h1>
          <p>
            Use your username, email, or phone number with your password to access
            the dashboard and the modules your role allows.
          </p>
        </div>

        <ul className="login-modules">
          {MODULES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand" style={mobileBrandStyle}>
            <div style={mobileBrandIconStyle}>NE</div>
            <div>
              <div style={mobileBrandTitleStyle}>NEW ERP</div>
              <div style={mobileBrandSubtitleStyle}>
                Secure manufacturing and operations control.
              </div>
            </div>
          </div>

          <div className="login-card-head">
            <div className="login-kicker">Welcome back</div>
            <h2>Sign in</h2>
            <p>Enter your username, email, or phone number together with your password.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              Username, Email, or Phone
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                aria-invalid={Boolean(error) && !identifier.trim()}
                aria-describedby={error ? "login-error" : undefined}
              />
            </label>

            <label>
              Password
              <div className="login-password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(error) && !password.trim()}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div id="login-error" role="alert" aria-live="polite" className="login-error">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          background:
            radial-gradient(circle at 12% 18%, rgba(0, 137, 123, 0.16), transparent 34%),
            linear-gradient(135deg, #f7fbfa 0%, #eef6f4 52%, #f8fafc 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
          color: #0f172a;
        }

        .login-brand {
          padding: 48px 64px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 48px;
        }

        .login-brand-mark {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .login-logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: ${TEAL};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.04em;
          box-shadow: 0 10px 24px rgba(0, 137, 123, 0.24);
        }

        .login-brand-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          color: #0f172a;
        }

        .login-brand-tagline {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }

        .login-copy {
          max-width: 520px;
        }

        .login-pill {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(0, 137, 123, 0.1);
          color: #0f766e;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 11px;
          margin-bottom: 20px;
        }

        .login-copy h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1.08;
          letter-spacing: -0.045em;
          color: #0f172a;
          font-weight: 800;
        }

        .login-copy p {
          margin: 18px 0 0;
          max-width: 460px;
          font-size: 16px;
          line-height: 1.65;
          color: #475569;
        }

        .login-modules {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .login-modules li {
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: #334155;
          font-size: 12px;
          font-weight: 600;
        }

        .login-panel {
          padding: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
          padding: 32px 28px 28px;
        }

        .login-card-head {
          margin-bottom: 24px;
        }

        .login-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${TEAL};
        }

        .login-card h2 {
          margin: 8px 0 0;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #111827;
        }

        .login-card-head p {
          margin: 8px 0 0;
          color: #6b7280;
          line-height: 1.55;
          font-size: 14px;
        }

        .login-card form {
          display: grid;
          gap: 16px;
        }

        .login-card label {
          display: grid;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #334155;
        }

        .login-card input {
          height: 48px;
          border-radius: 10px;
          border: 1px solid #94a3b8;
          padding: 0 14px;
          font-size: 15px;
          outline: none;
          background: #fff;
          width: 100%;
          box-sizing: border-box;
          color: #0f172a;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .login-card input::placeholder {
          color: #94a3b8;
        }

        .login-card input:focus {
          border-color: ${TEAL};
          box-shadow: 0 0 0 3px rgba(0, 137, 123, 0.14);
        }

        .login-password {
          position: relative;
        }

        .login-password input {
          padding-right: 48px;
        }

        .login-password button {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .login-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
        }

        .login-card form > button[type="submit"] {
          height: 48px;
          border-radius: 10px;
          border: none;
          background: ${TEAL};
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(0, 137, 123, 0.2);
        }

        .login-card form > button[type="submit"]:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 960px) {
          .login-shell {
            grid-template-columns: 1fr;
          }

          .login-brand {
            display: none;
          }

          .login-panel {
            padding: 24px 18px 28px;
          }

          .login-card {
            max-width: 560px;
          }
        }

        @media (max-width: 520px) {
          .mobile-brand {
            display: flex !important;
          }

          .login-card {
            padding: 20px 16px 24px;
            border-radius: 18px;
          }

          .login-card h2 {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}

const mobileBrandStyle: React.CSSProperties = {
  display: "none",
  alignItems: "center",
  gap: 12,
  marginBottom: 20,
};

const mobileBrandIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: TEAL,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 16,
  flexShrink: 0,
};

const mobileBrandTitleStyle: React.CSSProperties = {
  fontSize: 22,
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#111827",
  letterSpacing: "-0.03em",
};

const mobileBrandSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 1.4,
  color: "#6b7280",
};
