import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { UnitDetail } from "@/features/master-data/components";
import { getUnitById } from "@/lib/master-data-db";

interface UnitPageProps {
  params: { id: string };
}

export default async function UnitDetailPage({ params }: UnitPageProps) {
  const unit = await getUnitById(params.id);

  if (!unit) {
    notFound();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
      }}
    >
      <PageHeader
        title={unit.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Units", href: "/master-data/units" },
          { label: unit.name },
        ]}
      />
      <UnitDetail unit={unit} />
    </div>
  );
}
