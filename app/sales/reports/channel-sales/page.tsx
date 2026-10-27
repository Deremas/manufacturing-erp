import { ChannelSummaryReportPage } from "@/features/sales/SalesSummaryReportPages";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getChannelSummaryReport } from "@/services/sales/sales-report.service";

export default async function SalesChannelReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const preferences = await getSystemPreferences();

  const report = await getChannelSummaryReport({
    accessibleLocationIds: user.accessibleLocationIds,
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : null,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : null,
    locationId: typeof params.locationId === "string" ? params.locationId : null,
    channel: typeof params.channel === "string" ? params.channel : null,
  });

  return <ChannelSummaryReportPage report={report} currencyCode={preferences.currencyCode} />;
}
