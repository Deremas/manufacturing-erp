"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PlusCircle, Power } from "lucide-react";
import { ActionButtons, DataTable, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { TableAction } from "@/components/shared";
import type { AssetCategory, AssetType } from "@/features/maintenance/types";

const shell: React.CSSProperties = { padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7 };
const input: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid #94a3b8", background: "white" };

export function AssetMasterSetupPage({ assetTypes, categories, mode = "all" }: { assetTypes: AssetType[]; categories: AssetCategory[]; mode?: "all" | "types" | "categories" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [typeForm, setTypeForm] = useState({ code: "", name: "", description: "", isActive: true });
  const [categoryForm, setCategoryForm] = useState({ code: "", name: "", assetTypeId: "", description: "", isActive: true });

  function save(url: string, method: "POST" | "PUT", body: object, reset: () => void) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Failed to save asset setup");
      reset();
      router.refresh();
    });
  }

  function toggleActive(kind: "types" | "categories", record: AssetType | AssetCategory) {
    const nextActive = !record.isActive;
    const url = kind === "types" ? `/api/maintenance/asset-types/${record.id}` : `/api/maintenance/asset-categories/${record.id}`;
    const payload = kind === "types"
      ? { code: record.code, name: record.name, description: record.description, isActive: nextActive }
      : { code: record.code, name: record.name, description: record.description, assetTypeId: (record as AssetCategory).assetTypeId, isActive: nextActive };
    save(url, "PUT", payload, () => undefined);
  }

  const typeActions: TableAction[] = [
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record: AssetType) => { setEditingTypeId(record.id); setTypeForm({ code: record.code, name: record.name, description: record.description ?? "", isActive: record.isActive }); } },
    { label: "Deactivate", icon: <Power size={16} />, onClick: (record: AssetType) => record.isActive && toggleActive("types", record) },
    { label: "Activate", icon: <Power size={16} />, onClick: (record: AssetType) => !record.isActive && toggleActive("types", record) },
  ];
  const categoryActions: TableAction[] = [
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record: AssetCategory) => { setEditingCategoryId(record.id); setCategoryForm({ code: record.code, name: record.name, assetTypeId: record.assetTypeId ?? "", description: record.description ?? "", isActive: record.isActive }); } },
    { label: "Deactivate", icon: <Power size={16} />, onClick: (record: AssetCategory) => record.isActive && toggleActive("categories", record) },
    { label: "Activate", icon: <Power size={16} />, onClick: (record: AssetCategory) => !record.isActive && toggleActive("categories", record) },
  ];

  return <div style={shell}>
    <PageHeader title={mode === "types" ? "Asset Types" : mode === "categories" ? "Asset Categories" : "Asset Types & Categories"} subtitle="DB-managed classification used by asset registration, production machine selection, maintenance, and reports." breadcrumbs={[{ label: "Assets", href: "/assets" }, { label: mode === "all" ? "Setup" : mode === "types" ? "Types" : "Categories" }]} />
    {message ? <div style={{ color: "#dc2626", fontWeight: 600 }}>{message}</div> : null}
    <div style={grid}>
      {mode !== "categories" ? <FormCard title={editingTypeId ? "Edit Asset Type" : "Create Asset Type"} variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: editingTypeId ? "Update Type" : "Add Type", icon: <PlusCircle size={16} />, variant: "primary", loading: pending, onClick: () => save(editingTypeId ? `/api/maintenance/asset-types/${editingTypeId}` : "/api/maintenance/asset-types", editingTypeId ? "PUT" : "POST", typeForm, () => { setEditingTypeId(""); setTypeForm({ code: "", name: "", description: "", isActive: true }); }) }, ...(editingTypeId ? [{ label: "Cancel", variant: "secondary" as const, onClick: () => { setEditingTypeId(""); setTypeForm({ code: "", name: "", description: "", isActive: true }); } }] : [])]} /> }}>
        <div style={grid}><label style={field}>Code<input style={input} value={typeForm.code} onChange={(e) => setTypeForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} /></label><label style={field}>Name<input style={input} value={typeForm.name} onChange={(e) => setTypeForm((c) => ({ ...c, name: e.target.value }))} /></label></div>
        <label style={{ ...field, marginTop: 14 }}>Description<textarea style={{ ...input, minHeight: 80 }} value={typeForm.description} onChange={(e) => setTypeForm((c) => ({ ...c, description: e.target.value }))} /></label>
      </FormCard> : null}
      {mode !== "types" ? <FormCard title={editingCategoryId ? "Edit Asset Category" : "Create Asset Category"} variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: editingCategoryId ? "Update Category" : "Add Category", icon: <PlusCircle size={16} />, variant: "primary", loading: pending, onClick: () => save(editingCategoryId ? `/api/maintenance/asset-categories/${editingCategoryId}` : "/api/maintenance/asset-categories", editingCategoryId ? "PUT" : "POST", categoryForm, () => { setEditingCategoryId(""); setCategoryForm({ code: "", name: "", assetTypeId: "", description: "", isActive: true }); }) }, ...(editingCategoryId ? [{ label: "Cancel", variant: "secondary" as const, onClick: () => { setEditingCategoryId(""); setCategoryForm({ code: "", name: "", assetTypeId: "", description: "", isActive: true }); } }] : [])]} /> }}>
        <div style={grid}><label style={field}>Code<input style={input} value={categoryForm.code} onChange={(e) => setCategoryForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} /></label><label style={field}>Name<input style={input} value={categoryForm.name} onChange={(e) => setCategoryForm((c) => ({ ...c, name: e.target.value }))} /></label><label style={field}>Asset Type<select style={input} value={categoryForm.assetTypeId} onChange={(e) => setCategoryForm((c) => ({ ...c, assetTypeId: e.target.value }))}><option value="">All asset types</option>{assetTypes.filter((item) => item.isActive || item.id === categoryForm.assetTypeId).map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label></div>
        <label style={{ ...field, marginTop: 14 }}>Description<textarea style={{ ...input, minHeight: 80 }} value={categoryForm.description} onChange={(e) => setCategoryForm((c) => ({ ...c, description: e.target.value }))} /></label>
      </FormCard> : null}
    </div>
    {mode !== "categories" ? <FormCard title="Asset Types"><DataTable columns={[{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "description", label: "Description", render: (v) => v ?? "-" }, { key: "isActive", label: "Status", render: (v) => <StatusBadge status={v ? "active" : "inactive"} /> }]} data={assetTypes} actions={typeActions} pageSize={10} /></FormCard> : null}
    {mode !== "types" ? <FormCard title="Asset Categories"><DataTable columns={[{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "assetTypeName", label: "Asset Type", render: (v) => v ?? "All types" }, { key: "description", label: "Description", render: (v) => v ?? "-" }, { key: "isActive", label: "Status", render: (v) => <StatusBadge status={v ? "active" : "inactive"} /> }]} data={categories} actions={categoryActions} pageSize={10} /></FormCard> : null}
  </div>;
}
