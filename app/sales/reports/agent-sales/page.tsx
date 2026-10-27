import { ChannelSalesReportPage } from "@/features/sales/ChannelSalesReportPage";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getChannelSalesReport } from "@/services/sales/channel-sales-report.service";

export default async function AgentSalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const preferences = await getSystemPreferences();
  const report = await getChannelSalesReport({
    accessibleLocationIds: user.accessibleLocationIds,
    channel: "AGENT",
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : null,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : null,
  });

  return (
    <ChannelSalesReportPage
      title="Agent Sales Report"
      subtitle="Agent-channel sales only, filtered to locations the signed-in user is allowed to operate."
      currencyCode={preferences.currencyCode}
      report={report}
    />
  );
}
