import { requireAuth } from "@/lib/auth/auth";
import { SalesQuotationFormPage } from "@/features/sales/CommercialSalesPages";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

import { getCommercialSalesReferenceData } from "@/app/sales/_lib/commercial-reference-data";

export default async function CreateSalesQuotationRoute() {
  const user = await requireAuth();
  const referenceData = await getCommercialSalesReferenceData();

  return (
    <SalesQuotationFormPage
      referenceData={{
        ...referenceData,
        locations: filterLocationsForUser(user, referenceData.locations),
      }}
    />
  );
}
