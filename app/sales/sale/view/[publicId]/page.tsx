import { requireAuth } from "@/lib/auth/auth";
import { SaleDetailPage } from "@/features/sales/SaleDetailPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getSaleById } from "@/services/sales/sales.service";

export default async function SalesHistoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicId } = await params;
  const query = await searchParams;
  const user = await requireAuth();
  const [sale, preferences] = await Promise.all([
    getSaleById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  const channel = typeof query.channel === "string" ? query.channel.toUpperCase() : "";
  const backHref = channel ? `/sales/history?channel=${encodeURIComponent(channel)}` : "/sales/history";
  const reopenHref = channel === "TRUCK"
    ? "/sales/truck"
    : channel === "BRANCH"
      ? "/sales/branch"
      : channel === "AGENT"
        ? "/sales/agents/sales/create"
        : "/sales/pos";
  const reopenLabel = channel === "TRUCK"
    ? "Open Truck Sales"
    : channel === "BRANCH"
      ? "Open Branch Sales"
      : channel === "AGENT"
        ? "Open Agent Sales"
        : "Open POS";

  return (
    <SaleDetailPage
      sale={sale}
      currencyCode={preferences.currencyCode}
      backHref={backHref}
      reopenHref={reopenHref}
      reopenLabel={reopenLabel}
    />
  );
}
