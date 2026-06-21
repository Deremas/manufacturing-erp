import { notFound } from "next/navigation";
import { PriceListDetail } from "@/features/master-data/components";
import { getPriceListById } from "@/lib/master-data-db";

interface PageProps {
  params: { id: string };
}

export default async function PriceListDetailPage({ params }: PageProps) {
  const priceList = await getPriceListById(params.id);
  if (!priceList) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24 }}>
      <PriceListDetail priceList={priceList} />
    </div>
  );
}
