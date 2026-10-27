import { requireAuth } from "@/lib/auth/auth";
import { EmptyState, FormCard, PageHeader } from "@/components/shared";
import { SalesReturnFormPage } from "@/features/sales/SalesReturnFormPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getSaleById } from "@/services/sales/sales.service";

export default async function SalesReturnCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ saleId?: string }>;
}) {
  const { saleId } = await searchParams;
  const user = await requireAuth();
  const preferences = await getSystemPreferences();

  if (!saleId) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          background: "#f8fafc",
        }}
      >
        <PageHeader
          title="Create Sales Return"
          subtitle="Start from a posted sale so the system can reuse the price snapshot and returned lines."
          breadcrumbs={[
            { label: "Sales", href: "/sales" },
            { label: "Sales Returns", href: "/sales/returns" },
            { label: "Create Return" },
          ]}
        />
        <FormCard title="Missing Sale Reference">
          <EmptyState
            title="Pick a sale first"
            message="Open Sales History and use Create Return on a posted sale to prefill the return lines."
          />
        </FormCard>
      </div>
    );
  }

  const sale = await getSaleById(saleId, {
    accessibleLocationIds: user.accessibleLocationIds,
  });

  if (!sale) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          background: "#f8fafc",
        }}
      >
        <PageHeader
          title="Create Sales Return"
          subtitle="The selected sale could not be found."
          breadcrumbs={[
            { label: "Sales", href: "/sales" },
            { label: "Sales Returns", href: "/sales/returns" },
            { label: "Create Return" },
          ]}
        />
        <FormCard title="Sale Not Found">
          <EmptyState
            title="Sale not found"
            message="The source sale may have been removed or the link is no longer valid."
          />
        </FormCard>
      </div>
    );
  }

  return (
    <SalesReturnFormPage
      sale={sale}
      currencyCode={preferences.currencyCode}
    />
  );
}
