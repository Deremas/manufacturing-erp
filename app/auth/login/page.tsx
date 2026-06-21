"use client";

import React, { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

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
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      identifier: identifier.trim(),
      password,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error || !result?.ok) {
      setError("Invalid username, email, phone, or password.");
      return;
    }

    router.replace(result.url || callbackUrl);
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        background:
          "radial-gradient(circle at top left, rgba(0,140,122,0.18), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #eef7f5 100%)",
      }}
    >
      <section
        style={{
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "#008C7A",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              boxShadow: "0 14px 32px rgba(0,140,122,0.28)",
            }}
          >
            NE
          </div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#111827" }}>
              NEW ERP
            </div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>
              Secure manufacturing and operations control
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(0,140,122,0.12)",
              color: "#00786a",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: 12,
              marginBottom: 24,
            }}
          >
            Sign in securely
          </div>
          <h1
            style={{
              fontSize: 58,
              lineHeight: 1,
              margin: 0,
              color: "#0f172a",
              letterSpacing: "-0.05em",
            }}
          >
            One account for the full ERP.
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 18,
              lineHeight: 1.7,
              color: "#475569",
              maxWidth: 520,
            }}
          >
            Use your username, email, or phone number with your password to
            access the dashboard and the modules your role allows.
          </p>
        </div>
      </section>

      <section
        style={{
          padding: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            boxShadow: "0 22px 60px rgba(15, 23, 42, 0.12)",
            padding: 30,
          }}
        >
          <div className="mobile-brand" style={mobileBrandStyle}>
            <div style={mobileBrandIconStyle}>NE</div>
            <div>
              <div style={mobileBrandTitleStyle}>NEW ERP</div>
              <div style={mobileBrandSubtitleStyle}>
                Secure manufacturing and operations control
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#008C7A",
              }}
            >
              Welcome back
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 32, color: "#111827" }}>
              Sign in
            </h2>
            <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
              Enter your username, email, or phone number together with your
              password.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            <label style={labelStyle}>
              Username, Email, or Phone
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin, admin@newerp.local, or +254700000000"
                autoComplete="username"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Password
              <div style={passwordFieldStyle}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={toggleButtonStyle}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        @media (max-width: 960px) {
          main {
            grid-template-columns: 1fr !important;
          }

          section:first-child {
            display: none !important;
          }

          section:last-child {
            padding: 24px 18px 28px !important;
          }

          section:last-child > div {
            max-width: 560px !important;
          }
        }

        @media (max-width: 520px) {
          .mobile-brand {
            display: flex !important;
          }

          section:last-child > div {
            padding: 20px 16px 24px !important;
            border-radius: 20px !important;
          }

          section:last-child h2 {
            font-size: 28px !important;
          }
        }
      `}</style>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  height: 52,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 14px",
  fontSize: 15,
  outline: "none",
  backgroundColor: "#fff",
  width: "100%",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  borderRadius: 12,
  padding: 12,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  height: 52,
  borderRadius: 12,
  border: "none",
  background: "#008C7A",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(0,140,122,0.22)",
};

const toggleButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: 12,
  transform: "translateY(-50%)",
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#64748b",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const passwordFieldStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const mobileBrandStyle: React.CSSProperties = {
  display: "none",
  alignItems: "center",
  gap: 12,
  marginBottom: 20,
};

const mobileBrandIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: "#008C7A",
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
