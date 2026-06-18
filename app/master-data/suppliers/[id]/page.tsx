"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierDetail } from "@/features/master-data/components";
import type { Supplier } from "@/features/master-data/types";

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch supplier by ID
    setData({
      id: params.id as string,
      supplierCode: "SUPP-001",
      name: "XYZ Suppliers Ltd",
      contactPerson: "John Doe",
      phone: "+254 722 111 222",
      email: "orders@xyzsuppliers.com",
      address: "456 Industrial Park, Mombasa",
      paymentTerms: "net_45",
      isActive: true,
    } as Supplier);
    setLoading(false);
  }, [params.id]);

  const handleEdit = () => {
    router.push(`/master-data/suppliers/${params.id}/edit`);
  };

  const handleBack = () => {
    router.push("/master-data/suppliers");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Supplier not found</div>;
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
        title={data.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Suppliers", href: "/master-data/suppliers" },
          { label: data.supplierCode },
        ]}
      />
      <SupplierDetail supplier={data} onEdit={handleEdit} onBack={handleBack} />
    </div>
  );
}
