import { requireAuth } from "@/lib/auth/auth";
import { SalesOrderFormPage } from "@/features/sales/CommercialSalesPages";
import { getSalesQuotationById } from "@/services/sales/quotation.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

import { getCommercialSalesReferenceData } from "@/app/sales/_lib/commercial-reference-data";

export default async function CreateSalesOrderRoute({
  searchParams,
}: {
  searchParams: Promise<{ quotationId?: string }>;
}) {
  const user = await requireAuth();
  const { quotationId } = await searchParams;
  const [referenceData, quotationSeed] = await Promise.all([
    getCommercialSalesReferenceData(),
    quotationId
      ? getSalesQuotationById(quotationId, { accessibleLocationIds: user.accessibleLocationIds })
      : Promise.resolve(null),
  ]);

  return (
    <SalesOrderFormPage
      quotationSeed={quotationSeed ?? undefined}
      referenceData={{
        ...referenceData,
        locations: filterLocationsForUser(user, referenceData.locations),
      }}
    />
  );
}
