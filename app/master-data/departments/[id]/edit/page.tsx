"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";
import type { Department } from "@/features/master-data/types";

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch department by ID
    setData({
      id: params.id as string,
      name: "Production",
      code: "DEPT-PROD",
      managerName: "Jane Smith",
      isActive: true,
    } as Department);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update department
    router.push("/master-data/departments");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Department not found</div>;
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
        title={`Edit: ${data.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: data.code },
          { label: "Edit" },
        ]}
      />
      <DepartmentForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
