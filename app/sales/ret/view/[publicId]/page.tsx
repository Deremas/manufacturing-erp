import { requireAuth } from "@/lib/auth/auth";
import { SalesReturnDetailPage } from "@/features/sales/SalesReturnDetailPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getSalesReturnById } from "@/services/sales/sales.service";

export default async function SalesReturnDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await requireAuth();
  const [salesReturn, preferences] = await Promise.all([
    getSalesReturnById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <SalesReturnDetailPage
      salesReturn={salesReturn}
      currencyCode={preferences.currencyCode}
    />
  );
}
