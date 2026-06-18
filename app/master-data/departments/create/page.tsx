"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";

export default function CreateDepartmentPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist department
    router.push("/master-data/departments");
  };

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
        title="Create Department"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: "Create" },
        ]}
      />
      <DepartmentForm onSubmit={handleSubmit} />
    </div>
  );
}
