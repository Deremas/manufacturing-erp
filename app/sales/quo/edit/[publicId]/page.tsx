import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesQuotationFormPage } from "@/features/sales/CommercialSalesPages";
import { getSalesQuotationById } from "@/services/sales/quotation.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

import { getCommercialSalesReferenceData } from "@/app/sales/_lib/commercial-reference-data";

export default async function EditSalesQuotationRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, referenceData] = await Promise.all([
    getSalesQuotationById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getCommercialSalesReferenceData(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <SalesQuotationFormPage
      quotationId={id}
      initialValue={item}
      referenceData={{
        ...referenceData,
        locations: filterLocationsForUser(user, referenceData.locations),
      }}
    />
  );
}
