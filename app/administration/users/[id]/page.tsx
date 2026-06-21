import Link from "next/link";
import { UserDetailPage } from "@/features/administration/users";
import { getUserById } from "@/lib/administration-db";
import { Users } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewUserPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
            width: "100%",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <Users size={36} strokeWidth={1.8} />
          <h2 style={{ margin: "16px 0 8px", fontSize: "28px" }}>
            User not found
          </h2>
          <p style={{ margin: 0, color: "#6b7280" }}>
            The user record could not be loaded. Please go back to the users list
            and try again.
          </p>
          <div style={{ marginTop: "24px" }}>
            <Link
              href="/administration/users"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 18px",
                borderRadius: "12px",
                background: "#008c7a",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <UserDetailPage user={user} />;
}
