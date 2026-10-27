import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesOrderFormPage } from "@/features/sales/CommercialSalesPages";
import { getSalesOrderById } from "@/services/sales/sales-order.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

import { getCommercialSalesReferenceData } from "@/app/sales/_lib/commercial-reference-data";

export default async function EditSalesOrderRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, referenceData] = await Promise.all([
    getSalesOrderById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getCommercialSalesReferenceData(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <SalesOrderFormPage
      salesOrderId={id}
      initialValue={item}
      referenceData={{
        ...referenceData,
        locations: filterLocationsForUser(user, referenceData.locations),
      }}
    />
  );
}
