"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { LocationDetail } from "@/features/master-data/components";
import type { Location } from "@/features/master-data/types";

export default function LocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch location by ID
    setData({
      id: params.id as string,
      locationCode: "LOC-001",
      locationName: "Main Warehouse",
      locationType: "warehouse",
      address: "123 Industrial Area, Nairobi",
      isActive: true,
    } as Location);
    setLoading(false);
  }, [params.id]);

  const handleEdit = () => {
    router.push(`/master-data/locations/${params.id}/edit`);
  };

  const handleBack = () => {
    router.push("/master-data/locations");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Location not found</div>;
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
        title={data.locationName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Locations", href: "/master-data/locations" },
          { label: data.locationCode },
        ]}
      />
      <LocationDetail location={data} onEdit={handleEdit} onBack={handleBack} />
    </div>
  );
}
