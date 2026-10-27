import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CustomerReceiptDetailPage } from "@/features/sales/AccountsReceivablePages";
import { getCustomerReceiptById } from "@/services/sales/accounts-receivable.service";

export default async function CustomerReceiptDetailRoutePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await requireAuth();
  const [item, preferences] = await Promise.all([
    getCustomerReceiptById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <CustomerReceiptDetailPage
      item={item}
      currencyCode={preferences.currencyCode}
    />
  );
}
