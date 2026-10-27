"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  SearchInput,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { Category } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";

export interface CategoriesListPageProps {
  initialData?: Category[];
}

export default function CategoriesListPage({
  initialData = [],
}: CategoriesListPageProps) {
  const router = useRouter();
  const [data] = useState<Category[]>(initialData);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Categories" },
  ];

  const parentCategoryOptions = useMemo(
    () => data.map((category) => ({ label: category.name, value: category.id })),
    [data],
  );

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    const parentCategoryId = filters.parentCategoryId?.trim() ?? "";
    const status = filters.status?.trim() ?? "";

    return data.filter((category) => {
      if (parentCategoryId && category.parentCategoryId !== parentCategoryId) return false;
      if (status && String(category.isActive) !== status) return false;
      if (!query) return true;

      return [
        category.name,
        category.parentCategoryName,
        category.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data, filters, search]);

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name...",
    },
    {
      type: "select",
      key: "parentCategoryId",
      label: "Parent Category",
      placeholder: "All Categories",
      options: parentCategoryOptions,
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ];

  const columns: Column<Category>[] = [
    { key: "name", label: "Name", sortable: true },
    {
      key: "parentCategoryName",
      label: "Parent Category",
      render: (value) => value ?? "—",
      sortable: true,
    },
    {
      key: "description",
      label: "Description",
      render: (value) => value ?? "—",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(publicViewUrl("master-data.category", record.publicId)),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(publicEditUrl("master-data.category", record.publicId)),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/categories/${record.id}`,
            "category",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Failed to delete category");
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Categories Found"
      message="There are no categories to display. Create your first category to get started."
      action={{
        label: "Create Category",
        onClick: () => router.push("/master-data/categories/create"),
      }}
    />
  );

  function exportCategories() {
    const header = ["Name", "Parent Category", "Description", "Status"];
    const rows = filteredData.map((category: Category) => [
      category.name,
      category.parentCategoryName ?? "",
      category.description ?? "",
      category.isActive ? "Active" : "Inactive",
    ]);
    const csv = [header, ...rows]
      .map((row: Array<string>) =>
        row
          .map((value: string) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: exportCategories,
    },
    {
      label: "Create Category",
      variant: "primary",
      onClick: () => router.push("/master-data/categories/create"),
    },
  ];

  const handleReset = () => {
    setSearch("");
    setFilters({});
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Categories"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Categories"
        fields={filterFields}
        onFilter={setFilters}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={filteredData.length}
      />
    </div>
  );
}
