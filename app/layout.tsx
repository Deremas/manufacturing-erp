import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout";
import { AuthProvider } from "@/lib/auth/auth-context";
import ToastHost from "@/components/shared/ToastHost";

export const metadata: Metadata = {
  title: "NEW ERP",
  description: "Manufacturing Enterprise Resource Planning System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <ToastHost />
        </AuthProvider>
      </body>
    </html>
  );
}
