import type { ReactNode } from "react";

import { requireAuth } from "@/lib/auth/auth";
import { requireReportGroupAccess } from "@/services/reports/report-access.service";

export default async function ReportsModuleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ module: string }>;
}) {
  const user = await requireAuth();
  const { module } = await params;

  requireReportGroupAccess(user, module);

  return <>{children}</>;
}
