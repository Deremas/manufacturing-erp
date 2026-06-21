"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: "44px 36px",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 20,
            letterSpacing: "-0.06em",
          }}
        >
          404
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.25,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 32,
          }}
        >
          The page you are looking for does not exist.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              borderRadius: 12,
              backgroundColor: "#008C7A",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              borderRadius: 12,
              backgroundColor: "#ffffff",
              color: "#111827",
              border: "1px solid #d1d5db",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
