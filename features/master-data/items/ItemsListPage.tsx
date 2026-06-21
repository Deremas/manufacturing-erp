"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  MetricCard,
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
import type { Item, Category, ItemType, Unit } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";
import * as itemService from "@/services/master-data/itemService";
import * as categoryService from "@/services/master-data/categoryService";
import * as itemTypeService from "@/services/master-data/itemTypeService";
import * as unitService from "@/services/master-data/unitService";

export default function ItemsListPage() {
  const router = useRouter();
  const [data, setData] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsResult, categoriesResult, itemTypesResult, unitsResult] =
          await Promise.all([
            itemService.getAll({ limit: 500 }),
            categoryService.getAll({ limit: 500, isActive: true }),
            itemTypeService.getAll({ limit: 500, isActive: true }),
            unitService.getAll({ limit: 500, isActive: true }),
          ]);

        setData(itemsResult.items);
        setCategories(categoriesResult.items);
        setItemTypes(itemTypesResult.items);
        setUnits(unitsResult.items);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Items" },
  ];

  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));
  const itemTypeOptions = itemTypes.map((itemType) => ({
    label: itemType.name,
    value: itemType.code,
  }));
  const unitOptions = units.map((unit) => ({
    label: `${unit.name} (${unit.abbreviation})`,
    value: unit.id,
  }));

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name, code, or SKU...",
    },
    {
      type: "select",
      key: "categoryId",
      label: "Category",
      placeholder: "All Categories",
      options: categoryOptions,
    },
    {
      type: "select",
      key: "itemType",
      label: "Item Type",
      placeholder: "All Types",
      options: itemTypeOptions,
    },
    {
      type: "select",
      key: "uomId",
      label: "UOM",
      placeholder: "All Units",
      options: unitOptions,
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

  const columns: Column<Item>[] = [
    { key: "itemCode", label: "Item Code", sortable: true },
    { key: "itemName", label: "Name", sortable: true },
    {
      key: "categoryName",
      label: "Category",
      render: (value) => value ?? "—",
    },
    {
      key: "itemType",
      label: "Item Type",
      render: (_value, row) => row.itemTypeName ?? row.itemType ?? "—",
    },
    {
      key: "uomName",
      label: "UOM",
      render: (value) => value ?? "—",
    },
    {
      key: "reorderPoint",
      label: "Low Stock",
      render: (value) => (value ?? 0).toString(),
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      render: (value) =>
        value == null
          ? "—"
          : `$${(value as number).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => {
      return (
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const totalItems = data.length;
  const activeItems = data.filter((item) => item.isActive).length;
  const inactiveItems = data.filter((item) => !item.isActive).length;
  const lowStockItems = data.filter(
    (item) => item.isActive && (item.reorderPoint ?? 0) > 0,
  ).length;
  const finishedGoods = data.filter((item) =>
    item.itemType === "FG" ||
    (item.itemTypeName ?? "").toLowerCase().includes("finished"),
  ).length;

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(`/master-data/items/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) => router.push(`/master-data/items/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(`/api/records/master-data/items/${record.id}`, "item");
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Failed to delete item");
        }
      },
    },
  ];

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export"),
    },
    {
      label: "Create Item",
      variant: "primary",
      onClick: () => router.push("/master-data/items/create"),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Items"
        subtitle="Manage reusable item master records."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: `${spacing.card.gap}px`,
        }}
      >
        <MetricCard label="Total Items" value={totalItems} />
        <MetricCard
          label="Active Items"
          value={activeItems}
          color={colors.success[600]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Inactive Items"
          value={inactiveItems}
          color={colors.text.secondary}
          borderColor={colors.secondary[300]}
        />
        <MetricCard
          label="Finished Goods"
          value={finishedGoods}
          color={colors.primary[600]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Low Stock Configured"
          value={lowStockItems}
          color={colors.warning?.[600] ?? colors.danger[600]}
          borderColor={colors.warning?.[500] ?? colors.danger[400]}
        />
      </div>

      <FilterCard
        title="Filter Items"
        fields={filterFields}
        onFilter={(values) => {
          if (values.search !== undefined) {
            setSearch(values.search);
          }
        }}
        onReset={() => setSearch("")}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code, or SKU..."
        />
      </div>

      {loading ? (
        <EmptyState title="Loading items" message="Fetching item records..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          actions={tableActions}
          emptyState={
            <EmptyState
              title="No Items Found"
              message="There are no items to display. Create your first item to get started."
              action={{
                label: "Create Item",
                onClick: () => router.push("/master-data/items/create"),
              }}
            />
          }
          recordCount={filteredData.length}
        />
      )}
    </div>
  );
}
