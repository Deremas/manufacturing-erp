import { notFound } from "next/navigation";
import { PriceListForm } from "@/features/master-data/components";
import { getPriceListById } from "@/lib/master-data-db";

interface PageProps {
  params: { id: string };
}

export default async function EditPriceListPage({ params }: PageProps) {
  const priceList = await getPriceListById(params.id);
  if (!priceList) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24 }}>
      <PriceListForm initialData={priceList} />
    </div>
  );
}
