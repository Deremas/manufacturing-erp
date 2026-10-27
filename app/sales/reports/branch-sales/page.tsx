import { ChannelSalesReportPage } from "@/features/sales/ChannelSalesReportPage";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getChannelSalesReport } from "@/services/sales/channel-sales-report.service";

export default async function BranchSalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const preferences = await getSystemPreferences();
  const report = await getChannelSalesReport({
    accessibleLocationIds: user.accessibleLocationIds,
    channel: "BRANCH",
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : null,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : null,
  });

  return (
    <ChannelSalesReportPage
      title="Branch Sales Report"
      subtitle="Branch-channel sales only, scoped to the signed-in user’s allowed locations."
      currencyCode={preferences.currencyCode}
      report={report}
    />
  );
}
