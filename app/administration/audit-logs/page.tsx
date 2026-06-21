import { AuditLogsPage } from "@/features/administration";
import { getAuditLogs } from "@/lib/administration-db";

export default async function AdministrationAuditLogsPage() {
  const logs = await getAuditLogs();
  return <AuditLogsPage initialData={logs} />;
}
