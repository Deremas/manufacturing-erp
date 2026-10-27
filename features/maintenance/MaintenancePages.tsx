"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeftRight, Ban, Check, ClipboardCheck, Eye, Gauge, History, Pencil, PlusCircle, Printer, Send, UserCheck, Wrench, XCircle } from "lucide-react";

import { ActionButtons, DataTable, EmptyState, FormCard, MetricCard, PageHeader, SearchInput, StatusBadge } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { User } from "@/features/administration/types";
import type { Department, Location } from "@/features/master-data/types";
import type { AssetCategory, AssetType, MaintenanceAsset, MaintenanceTicket, MaintenanceWorkOrder, PreventiveMaintenancePlan } from "@/features/maintenance/types";
import type { AssetAssignmentRecord, AssetHistoryRecord, AssetMeterReadingRecord, AssetSparePartRecord } from "@/services/maintenance/asset-lifecycle.service";
import type { MaintenanceAssetCostReportRow } from "@/services/reports/maintenance-report.service";
import type { BadgeVariant } from "@/components/ui/badges";

const shellStyle: React.CSSProperties = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  background: "#f8fafc",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${colors.inputBorder}`,
  background: "#fff",
  fontSize: 16,
};

function toBadgeStatus(value: unknown): BadgeVariant {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "UNDER_MAINTENANCE":
      return "active";
    case "COMPLETED":
    case "TESTED":
    case "CLOSED":
      return "completed";
    case "SUBMITTED":
    case "PENDING":
    case "WAITING_PARTS":
    case "WAITING_EXTERNAL_SERVICE":
      return "pending";
    case "REJECTED":
    case "CANCELLED":
    case "OUT_OF_SERVICE":
    case "RETIRED":
    case "DISPOSED":
      return "rejected";
    case "INACTIVE":
      return "inactive";
    default:
      return "draft";
  }
}

type AssetFormState = {
  assetCode: string;
  assetName: string;
  assetClass: string;
  assetTypeId: string;
  assetCategoryId: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  manufactureYear: string;
  locationId: string;
  departmentId: string;
  responsibleUserId: string;
  purchaseDate: string;
  installationDate: string;
  commissioningDate: string;
  purchaseCost: string;
  currentBookValue: string;
  warrantyStart: string;
  warrantyEnd: string;
  expectedLifeYears: string;
  meterType: string;
  meterUnit: string;
  currentMeterReading: string;
  isProductionAsset: boolean;
  isMaintenanceRequired: boolean;
  status: string;
  criticality: string;
  description: string;
  isActive: boolean;
};

type TicketFormState = {
  requestDate: string;
  assetId: string;
  locationId: string;
  departmentId: string;
  requestedById: string;
  assignedToId: string;
  type: string;
  priority: string;
  problemDescription: string;
  failureDate: string;
  productionDowntimeId: string;
  status: string;
  approvalStatus: string;
  targetCompletionDate: string;
  actualCompletionDate: string;
  remarks: string;
};

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function assetInitialState(asset?: MaintenanceAsset): AssetFormState {
  return {
    assetCode: asset?.assetCode ?? "",
    assetName: asset?.assetName ?? "",
    assetClass: asset?.assetClass ?? "OTHER",
    assetTypeId: asset?.assetTypeId ?? "",
    assetCategoryId: asset?.assetCategoryId ?? "",
    serialNumber: asset?.serialNumber ?? "",
    model: asset?.model ?? "",
    manufacturer: asset?.manufacturer ?? "",
    manufactureYear: asset?.manufactureYear != null ? String(asset.manufactureYear) : "",
    locationId: asset?.locationId ?? "",
    departmentId: asset?.departmentId ?? "",
    responsibleUserId: asset?.responsibleUserId ?? "",
    purchaseDate: toDateInput(asset?.purchaseDate),
    installationDate: toDateInput(asset?.installationDate),
    commissioningDate: toDateInput(asset?.commissioningDate),
    purchaseCost: asset?.purchaseCost != null ? String(asset.purchaseCost) : "",
    currentBookValue: asset?.currentBookValue != null ? String(asset.currentBookValue) : "",
    warrantyStart: toDateInput(asset?.warrantyStart),
    warrantyEnd: toDateInput(asset?.warrantyEnd),
    expectedLifeYears: asset?.expectedLifeYears != null ? String(asset.expectedLifeYears) : "",
    meterType: asset?.meterType ?? "",
    meterUnit: asset?.meterUnit ?? "",
    currentMeterReading: asset?.currentMeterReading != null ? String(asset.currentMeterReading) : "",
    isProductionAsset: asset?.isProductionAsset ?? false,
    isMaintenanceRequired: asset?.isMaintenanceRequired ?? true,
    status: asset?.status ?? "ACTIVE",
    criticality: asset?.criticality ?? "MEDIUM",
    description: asset?.description ?? "",
    isActive: asset?.isActive ?? true,
  };
}

function ticketInitialState(ticket?: MaintenanceTicket): TicketFormState {
  return {
    requestDate: toDateInput(ticket?.requestDate) || new Date().toISOString().slice(0, 10),
    assetId: ticket?.assetId ?? "",
    locationId: ticket?.locationId ?? "",
    departmentId: ticket?.departmentId ?? "",
    requestedById: ticket?.requestedById ?? "",
    assignedToId: ticket?.assignedToId ?? "",
    type: ticket?.type ?? "BREAKDOWN",
    priority: ticket?.priority ?? "MEDIUM",
    problemDescription: ticket?.problemDescription ?? "",
    failureDate: toDateInput(ticket?.failureDate),
    productionDowntimeId: ticket?.productionDowntimeId ?? "",
    status: ticket?.status ?? "DRAFT",
    approvalStatus: ticket?.approvalStatus ?? "PENDING",
    targetCompletionDate: toDateInput(ticket?.targetCompletionDate),
    actualCompletionDate: toDateInput(ticket?.actualCompletionDate),
    remarks: ticket?.remarks ?? "",
  };
}

export function AssetsListPage({ assets, pmDueCount = 0 }: { assets: MaintenanceAsset[]; pmDueCount?: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [criticality, setCriticality] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => (!query || [asset.assetCode, asset.assetName, asset.serialNumber, asset.model, asset.manufacturer].some((value) => String(value ?? "").toLowerCase().includes(query)))
      && (!type || asset.assetTypeId === type) && (!category || asset.assetCategoryId === category)
      && (!location || asset.locationId === location) && (!department || asset.departmentId === department)
      && (!status || asset.status === status) && (!criticality || asset.criticality === criticality));
  }, [assets, category, criticality, department, location, search, status, type]);
  const options = (key: "assetTypeId" | "assetCategoryId" | "locationId" | "departmentId", labelKey: "assetTypeName" | "assetCategoryName" | "locationName" | "departmentName") => Array.from(new Map(assets.filter((asset) => asset[key]).map((asset) => [String(asset[key]), String(asset[labelKey] ?? asset[key])])).entries());
  const columns: Column<MaintenanceAsset>[] = [
    { key: "assetCode", label: "Asset Code" },
    { key: "assetName", label: "Asset Name" },
    { key: "assetTypeName", label: "Type" },
    { key: "locationName", label: "Location" },
    { key: "departmentName", label: "Department", render: (value) => value ?? "—" },
    { key: "criticality", label: "Criticality" },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(publicViewUrl("maintenance.asset", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(publicEditUrl("maintenance.asset", record.publicId)) },
    { label: "History", icon: <History size={16} />, onClick: (record) => router.push(`/maintenance/assets/${record.id}/history`) },
    { label: "Assign", icon: <UserCheck size={16} />, onClick: (record) => router.push(`/maintenance/assets/assignments/create?assetId=${record.id}`) },
    { label: "Transfer", icon: <ArrowLeftRight size={16} />, onClick: (record) => router.push(`/maintenance/assets/transfers/create?assetId=${record.id}`) },
    { label: "Create Maintenance Ticket", icon: <Wrench size={16} />, onClick: (record) => router.push(`/maintenance/tickets/create?assetId=${record.id}`) },
  ];

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Asset Register"
        subtitle="Live maintenance assets connected to location, department, and responsible user masters."
        breadcrumbs={[{ label: "Assets" }]}
        actions={<ActionButtons actions={[{ label: "Types", variant: "secondary", onClick: () => router.push("/maintenance/assets/setup") }, { label: "Categories", variant: "secondary", onClick: () => router.push("/maintenance/assets/setup") }, { label: "Assignments", icon: <UserCheck size={16} />, variant: "secondary", onClick: () => router.push("/maintenance/assets/assignments") }, { label: "Transfers", icon: <ClipboardCheck size={16} />, variant: "secondary", onClick: () => router.push("/maintenance/assets/transfers") }, { label: "Create Asset", icon: <PlusCircle size={16} />, variant: "primary", onClick: () => router.push("/maintenance/assets/create") }]} />}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        <MetricCard label="Total Assets" value={assets.filter((asset) => asset.isActive).length} />
        <MetricCard label="Production Machines" value={assets.filter((asset) => asset.isProductionAsset && asset.isActive).length} />
        <MetricCard label="Under Maintenance" value={assets.filter((asset) => asset.status === "UNDER_MAINTENANCE").length} />
        <MetricCard label="Out of Service" value={assets.filter((asset) => asset.status === "OUT_OF_SERVICE").length} />
        <MetricCard label="PM Due" value={pmDueCount} />
      </div>
      <FormCard title="Filters">
        <div style={{ ...fieldGridStyle, alignItems: "end" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Code, name, serial, model..." />
          <select style={inputStyle} value={type} onChange={(event) => setType(event.target.value)}><option value="">All Types</option>{options("assetTypeId", "assetTypeName").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select style={inputStyle} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All Categories</option>{options("assetCategoryId", "assetCategoryName").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select style={inputStyle} value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All Locations</option>{options("locationId", "locationName").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select style={inputStyle} value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">All Departments</option>{options("departmentId", "departmentName").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{Array.from(new Set(assets.map((asset) => asset.status))).map((value) => <option key={value}>{value}</option>)}</select>
          <select style={inputStyle} value={criticality} onChange={(event) => setCriticality(event.target.value)}><option value="">All Criticalities</option>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}</select>
        </div>
      </FormCard>
      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={<EmptyState title="No assets yet" message="Create the first maintenance asset to begin ticketing and lifecycle tracking." />}
      />
    </div>
  );
}

export function AssetFormPage({
  mode,
  asset,
  assetTypes,
  assetCategories,
  locations,
  departments,
  users,
  canViewCost = false,
}: {
  mode: "create" | "edit";
  asset?: MaintenanceAsset | null;
  assetTypes: AssetType[];
  assetCategories: AssetCategory[];
  locations: Location[];
  departments: Department[];
  users: User[];
  canViewCost?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<AssetFormState>(assetInitialState(asset ?? undefined));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const title = mode === "create" ? "Create Asset" : `Edit Asset ${asset?.assetCode ?? ""}`.trim();

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(
        mode === "create" ? "/api/maintenance/assets" : `/api/maintenance/assets/${asset?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            purchaseCost: canViewCost ? (form.purchaseCost ? Number(form.purchaseCost) : null) : undefined,
            currentBookValue: canViewCost ? (form.currentBookValue ? Number(form.currentBookValue) : null) : undefined,
            manufactureYear: form.manufactureYear ? Number(form.manufactureYear) : null,
            expectedLifeYears: form.expectedLifeYears ? Number(form.expectedLifeYears) : null,
            currentMeterReading: form.currentMeterReading ? Number(form.currentMeterReading) : null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save asset");
        return;
      }
      router.push(publicViewUrl("maintenance.asset", result.item.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: "Maintenance", href: "/maintenance" },
          { label: "Assets", href: "/assets" },
          { label: mode === "create" ? "Create" : "Edit" },
        ]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Asset Details"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: mode === "create" ? "Save Asset" : "Update Asset", variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Asset Code</span><input style={inputStyle} value={form.assetCode} onChange={(event) => setForm((current) => ({ ...current, assetCode: event.target.value.toUpperCase() }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset Name</span><input style={inputStyle} value={form.assetName} onChange={(event) => setForm((current) => ({ ...current, assetName: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset Class</span><select style={inputStyle} value={form.assetClass} onChange={(event) => setForm((current) => ({ ...current, assetClass: event.target.value, isProductionAsset: event.target.value === "PRODUCTION_MACHINE" ? true : current.isProductionAsset }))}>{["PRODUCTION_MACHINE", "FACILITY_EQUIPMENT", "LAB_EQUIPMENT", "VEHICLE", "TOOL", "MOLD", "OFFICE_EQUIPMENT", "OTHER"].map((entry) => <option key={entry} value={entry}>{entry.replace(/_/g, " ")}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset Type</span><select style={inputStyle} value={form.assetTypeId} onChange={(event) => setForm((current) => ({ ...current, assetTypeId: event.target.value }))}><option value="">Select ...</option>{assetTypes.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset Category</span><select style={inputStyle} value={form.assetCategoryId} onChange={(event) => setForm((current) => ({ ...current, assetCategoryId: event.target.value }))}><option value="">No category</option>{assetCategories.filter((entry) => entry.isActive && (!entry.assetTypeId || entry.assetTypeId === form.assetTypeId)).map((entry) => <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Serial Number</span><input style={inputStyle} value={form.serialNumber} onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Model</span><input style={inputStyle} value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Manufacturer</span><input style={inputStyle} value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Manufacture Year</span><input type="number" min="1900" max="2100" style={inputStyle} value={form.manufactureYear} onChange={(event) => setForm((current) => ({ ...current, manufactureYear: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Location</span><select style={inputStyle} value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}><option value="">Select ...</option>{locations.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.locationCode} - {entry.locationName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Department</span><select style={inputStyle} value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}><option value="">Select ...</option>{departments.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Responsible User</span><select style={inputStyle} value={form.responsibleUserId} onChange={(event) => setForm((current) => ({ ...current, responsibleUserId: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Purchase Date</span><input type="date" style={inputStyle} value={form.purchaseDate} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Installation Date</span><input type="date" style={inputStyle} value={form.installationDate} onChange={(event) => setForm((current) => ({ ...current, installationDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Commissioning Date</span><input type="date" style={inputStyle} value={form.commissioningDate} onChange={(event) => setForm((current) => ({ ...current, commissioningDate: event.target.value }))} /></label>
          {canViewCost ? <label style={fieldStyle}><span style={labelStyle}>Purchase Cost</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.purchaseCost} onChange={(event) => setForm((current) => ({ ...current, purchaseCost: event.target.value }))} /></label> : null}
          {canViewCost ? <label style={fieldStyle}><span style={labelStyle}>Current Book Value</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.currentBookValue} onChange={(event) => setForm((current) => ({ ...current, currentBookValue: event.target.value }))} /></label> : null}
          <label style={fieldStyle}><span style={labelStyle}>Warranty Start</span><input type="date" style={inputStyle} value={form.warrantyStart} onChange={(event) => setForm((current) => ({ ...current, warrantyStart: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Warranty End</span><input type="date" style={inputStyle} value={form.warrantyEnd} onChange={(event) => setForm((current) => ({ ...current, warrantyEnd: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Useful Life (Years)</span><input type="number" min="0" step="1" style={inputStyle} value={form.expectedLifeYears} onChange={(event) => setForm((current) => ({ ...current, expectedLifeYears: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Meter Type</span><input style={inputStyle} value={form.meterType} onChange={(event) => setForm((current) => ({ ...current, meterType: event.target.value }))} placeholder="Hour meter / Odometer" /></label>
          <label style={fieldStyle}><span style={labelStyle}>Meter Unit</span><input style={inputStyle} value={form.meterUnit} onChange={(event) => setForm((current) => ({ ...current, meterUnit: event.target.value }))} placeholder="Hours / km / cycles" /></label>
          <label style={fieldStyle}><span style={labelStyle}>Current Meter Reading</span><input type="number" min="0" step="0.01" style={inputStyle} value={form.currentMeterReading} onChange={(event) => setForm((current) => ({ ...current, currentMeterReading: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Status</span><select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{["ACTIVE", "ASSIGNED", "IN_USE", "UNDER_MAINTENANCE", "OUT_OF_SERVICE", "IN_TRANSIT", "RETIRED", "DISPOSED"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Criticality</span><select style={inputStyle} value={form.criticality} onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value }))}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Active</span><select style={inputStyle} value={form.isActive ? "true" : "false"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "true" }))}><option value="true">Active</option><option value="false">Inactive</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Production Asset</span><select style={inputStyle} value={form.isProductionAsset ? "true" : "false"} onChange={(event) => setForm((current) => ({ ...current, isProductionAsset: event.target.value === "true" }))}><option value="true">Yes</option><option value="false">No</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Maintenance Required</span><select style={inputStyle} value={form.isMaintenanceRequired ? "true" : "false"} onChange={(event) => setForm((current) => ({ ...current, isMaintenanceRequired: event.target.value === "true" }))}><option value="true">Yes</option><option value="false">No</option></select></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Description</span>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
      </FormCard>
    </div>
  );
}

export function AssetDetailPage({
  asset,
  canViewCost = false,
  canRetire = false,
  canDispose = false,
  tickets = [],
  workOrders = [],
  assignments = [],
  meterReadings = [],
  history = [],
  pmPlans = [],
  spareParts = [],
  items = [],
  cost = null,
}: {
  asset: MaintenanceAsset | null;
  canViewCost?: boolean;
  canRetire?: boolean;
  canDispose?: boolean;
  tickets?: MaintenanceTicket[];
  workOrders?: MaintenanceWorkOrder[];
  assignments?: AssetAssignmentRecord[];
  meterReadings?: AssetMeterReadingRecord[];
  history?: AssetHistoryRecord[];
  pmPlans?: PreventiveMaintenancePlan[];
  spareParts?: AssetSparePartRecord[];
  items?: Array<{ id: string; itemCode: string; itemName: string }>;
  cost?: MaintenanceAssetCostReportRow | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [spareItemId, setSpareItemId] = useState("");
  const [spareQty, setSpareQty] = useState("");
  const [pending, startTransition] = useTransition();
  if (!asset) {
    return <div style={shellStyle}><EmptyState title="Asset not found" message="The requested asset does not exist or is archived." action={{ label: "Back to Assets", onClick: () => router.push("/maintenance/assets") }} /></div>;
  }
  const currentAsset = asset;

  const closed = ["RETIRED", "DISPOSED"].includes(currentAsset.status);
  const fields = [
    ["Asset Code", asset.assetCode],
    ["Asset Name", asset.assetName],
    ["Asset Class", asset.assetClass.replace(/_/g, " ")],
    ["Asset Type", asset.assetTypeCode ? `${asset.assetTypeCode} - ${asset.assetTypeName ?? ""}` : (asset.assetTypeName ?? "—")],
    ["Asset Category", asset.assetCategoryName ?? "—"],
    ["Serial Number", asset.serialNumber ?? "—"],
    ["Model", asset.model ?? "—"],
    ["Manufacturer", asset.manufacturer ?? "—"],
    ["Location", asset.locationCode ? `${asset.locationCode} - ${asset.locationName ?? ""}` : (asset.locationName ?? "—")],
    ["Department", asset.departmentName ?? "—"],
    ["Responsible User", asset.responsibleUserName ?? "—"],
    ["Production Asset", asset.isProductionAsset ? "Yes" : "No"],
    ["Maintenance Required", asset.isMaintenanceRequired ? "Yes" : "No"],
    ["Criticality", asset.criticality],
    ["Purchase Date", asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"],
    ...(canViewCost ? [["Purchase Cost", asset.purchaseCost != null ? String(asset.purchaseCost) : "—"] as const] : []),
    ["Warranty Start", asset.warrantyStart ? new Date(asset.warrantyStart).toLocaleDateString() : "—"],
    ["Warranty End", asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString() : "—"],
    ["Installation Date", asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : "—"],
    ["Commissioning Date", asset.commissioningDate ? new Date(asset.commissioningDate).toLocaleDateString() : "—"],
    ["Meter Type", asset.meterType ?? "—"],
    ["Current Reading", asset.currentMeterReading != null ? String(asset.currentMeterReading) : "—"],
    ["Supplier", asset.supplierId ?? "—"],
    ["Purchase Order", asset.purchaseOrderId ?? "—"],
    ["GRN", asset.grnId ?? "—"],
    ["Status", asset.status],
  ];

  const actions = [
    { label: "Edit Asset", variant: "primary" as const, onClick: () => router.push(publicEditUrl("maintenance.asset", asset.publicId)) },
    { label: "Assign", variant: "secondary" as const, onClick: () => router.push(`/maintenance/assets/assignments/create?assetId=${asset.id}`) },
    { label: "Transfer", variant: "secondary" as const, onClick: () => router.push(`/maintenance/assets/transfers/create?assetId=${asset.id}`) },
    { label: "Create Ticket", variant: "secondary" as const, onClick: () => router.push(`/maintenance/tickets/create?assetId=${asset.id}`) },
    { label: "Meter Readings", icon: <Gauge size={16} />, variant: "secondary" as const, onClick: () => router.push(`/maintenance/assets/${asset.id}/meter-readings`) },
    { label: "Asset History", variant: "secondary" as const, onClick: () => router.push(`/maintenance/assets/${asset.id}/history`) },
    ...(canRetire && !closed ? [{ label: "Retire", icon: <Archive size={16} />, variant: "warning" as const, onClick: () => router.push(`/maintenance/assets/${asset.id}/retire`) }] : []),
    ...(canDispose && !closed ? [{ label: "Dispose", icon: <Ban size={16} />, variant: "danger" as const, onClick: () => router.push(`/maintenance/assets/${asset.id}/dispose`) }] : []),
  ];

  function addSparePart() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/assets/${currentAsset.id}/spare-parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: spareItemId, minimumRecommendedQty: spareQty ? Number(spareQty) : null, isPreferred: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to add compatible spare");
        return;
      }
      setSpareItemId("");
      setSpareQty("");
      router.refresh();
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="maintenance.asset"
        title={asset.assetName}
        subtitle={`${asset.assetCode} • live maintenance asset record`}
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Assets", href: "/assets" }, { label: asset.assetCode }]}
        actions={<ActionButtons actions={actions} />}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard title="Asset Information" variant="teal-header">
        <div style={fieldGridStyle}>
          {fields.map(([label, value]) => (
            <div key={label} style={fieldStyle}>
              <span style={labelStyle}>{label}</span>
              <div>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Description</span>
          <div>{asset.description ?? "—"}</div>
        </div>
      </FormCard>
      {cost ? (
        <FormCard title="Maintenance Cost" variant="teal-header">
          <div style={fieldGridStyle}>
            {[["Work Orders", String(cost.workOrderCount)], ["Spare Cost", String(cost.spareCost)], ["Labor Cost", String(cost.laborCost)], ["External Cost", String(cost.externalCost)], ["Total Cost", String(cost.totalCost)]].map(([label, value]) => (
              <div key={label} style={fieldStyle}><span style={labelStyle}>{label}</span><div>{value}</div></div>
            ))}
          </div>
        </FormCard>
      ) : null}
      <FormCard title="Compatible Spare Parts" variant="teal-header">
        <DataTable
          columns={[
            { key: "itemCode", label: "Item" , render: (_value, row) => `${row.itemCode ?? ""} - ${row.itemName ?? ""}` },
            { key: "source", label: "Source" },
            { key: "minimumRecommendedQty", label: "Min Qty", render: (value) => value ?? "—" },
            { key: "isPreferred", label: "Preferred", render: (value) => value ? "Yes" : "No" },
          ] as Column<AssetSparePartRecord>[]}
          data={spareParts}
          pageSize={8}
          emptyState={<EmptyState title="No compatible spares" message="Add preferred spare items for this asset." />}
        />
        <div style={{ ...fieldGridStyle, marginTop: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Item</span><select style={inputStyle} value={spareItemId} onChange={(event) => setSpareItemId(event.target.value)}><option value="">Select ...</option>{items.map((item) => <option key={item.id} value={item.id}>{item.itemCode} - {item.itemName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Minimum Qty</span><input style={inputStyle} value={spareQty} onChange={(event) => setSpareQty(event.target.value)} /></label>
        </div>
        <div style={{ marginTop: 12 }}><ActionButtons actions={[{ label: "Add Spare", variant: "secondary", onClick: addSparePart, loading: pending }]} /></div>
      </FormCard>
      <FormCard title="Recent Meter Readings" variant="teal-header">
        <DataTable
          columns={[
            { key: "readingDate", label: "Date", render: (value) => new Date(String(value)).toLocaleString() },
            { key: "readingType", label: "Type" },
            { key: "readingValue", label: "Reading" },
            { key: "unit", label: "Unit" },
            { key: "recordedByName", label: "Recorded By", render: (value) => value ?? "—" },
          ] as Column<AssetMeterReadingRecord>[]}
          data={meterReadings.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No meter readings" message="Record the first meter reading for this asset." />}
        />
      </FormCard>
      <FormCard title="Assignments" variant="teal-header">
        <DataTable
          columns={[
            { key: "assignmentNo", label: "Assignment" },
            { key: "assigneeName", label: "Assigned To" },
            { key: "assignedDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString() },
            { key: "status", label: "Status" },
          ] as Column<AssetAssignmentRecord>[]}
          data={assignments.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No assignments" message="This asset has not been assigned yet." />}
        />
      </FormCard>
      <FormCard title="Tickets" variant="teal-header">
        <DataTable
          columns={[
            { key: "ticketNo", label: "Ticket" },
            { key: "type", label: "Type" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status" },
          ] as Column<MaintenanceTicket>[]}
          data={tickets.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No tickets" message="No maintenance tickets are linked to this asset." />}
        />
      </FormCard>
      <FormCard title="Work Orders" variant="teal-header">
        <DataTable
          columns={[
            { key: "workOrderNo", label: "Work Order" },
            { key: "workType", label: "Type" },
            { key: "status", label: "Status" },
            { key: "totalCost", label: "Cost" },
          ] as Column<MaintenanceWorkOrder>[]}
          data={workOrders.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No work orders" message="No work orders are linked to this asset." />}
        />
      </FormCard>
      <FormCard title="Preventive Maintenance" variant="teal-header">
        <DataTable
          columns={[
            { key: "planNo", label: "Plan" },
            { key: "title", label: "Title" },
            { key: "nextDueDate", label: "Next Due", render: (value) => value ? new Date(String(value)).toLocaleDateString() : "—" },
            { key: "status", label: "Status" },
          ] as Column<PreventiveMaintenancePlan>[]}
          data={pmPlans.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No PM plans" message="No preventive plans are linked to this asset." />}
        />
      </FormCard>
      <FormCard title="Recent History" variant="teal-header">
        <DataTable
          columns={[
            { key: "eventDate", label: "Date", render: (value) => new Date(String(value)).toLocaleString() },
            { key: "eventType", label: "Event", render: (value) => String(value).replace(/_/g, " ") },
            { key: "performedByName", label: "By", render: (value) => value ?? "—" },
          ] as Column<AssetHistoryRecord>[]}
          data={history.slice(0, 8)}
          pageSize={8}
          emptyState={<EmptyState title="No history" message="Lifecycle events will appear here." />}
        />
      </FormCard>
    </div>
  );
}

export function AssetPrintPage({ asset, canViewCost = false }: { asset: MaintenanceAsset | null; canViewCost?: boolean }) {
  if (!asset) return <div style={shellStyle}>Asset not found.</div>;
  const rows = [
    ["Asset Code", asset.assetCode], ["Asset Name", asset.assetName], ["Type", asset.assetTypeName], ["Category", asset.assetCategoryName],
    ["Class", asset.assetClass], ["Serial Number", asset.serialNumber], ["Model", asset.model], ["Manufacturer", asset.manufacturer],
    ["Location", asset.locationName], ["Department", asset.departmentName], ["Responsible User", asset.responsibleUserName],
    ["Production Asset", asset.isProductionAsset ? "Yes" : "No"], ["Maintenance Required", asset.isMaintenanceRequired ? "Yes" : "No"],
    ["Criticality", asset.criticality], ["Status", asset.status], ["Purchase Date", asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "-"],
    ...(canViewCost ? [["Purchase Cost", asset.purchaseCost != null ? asset.purchaseCost.toLocaleString() : "-"] as const] : []),
    ["Warranty", [asset.warrantyStart, asset.warrantyEnd].filter(Boolean).map((value) => new Date(String(value)).toLocaleDateString()).join(" – ") || "-"],
    ["Meter", [asset.currentMeterReading, asset.meterUnit].filter((value) => value != null).join(" ") || "-"],
  ];
  return <main style={{ padding: 32, maxWidth: 1000, margin: "0 auto", background: "white" }}>
    <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}><button style={inputStyle} onClick={() => window.print()}>Print Asset Record</button></div>
    <h1 style={{ marginBottom: 4 }}>Asset Record</h1><div style={{ color: colors.text.secondary, marginBottom: 24 }}>{asset.assetCode} · generated {new Date().toLocaleDateString()}</div>
    <div style={fieldGridStyle}>{rows.map(([name, value]) => <div key={name} style={{ borderBottom: `1px solid ${colors.border}`, padding: "10px 0" }}><div style={labelStyle}>{name}</div><div>{value ?? "-"}</div></div>)}</div>
    <div style={{ marginTop: 24 }}><div style={labelStyle}>Description</div><p>{asset.description || "-"}</p></div>
    <style jsx global>{`@media print { .no-print, nav, aside { display: none !important; } main { max-width: none !important; padding: 0 !important; } }`}</style>
  </main>;
}

export function TicketsListPage({ tickets }: { tickets: MaintenanceTicket[] }) {
  const router = useRouter();
  const columns: Column<MaintenanceTicket>[] = [
    { key: "ticketNo", label: "Ticket No" },
    { key: "requestDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "assetCode", label: "Asset Code" },
    { key: "assetName", label: "Asset" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={toBadgeStatus(value)} /> },
    { key: "assignedToName", label: "Assigned To", render: (value) => value ?? "—" },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(publicViewUrl("maintenance.ticket", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(publicEditUrl("maintenance.ticket", record.publicId)) },
    { label: "Assign", icon: <UserCheck size={16} />, onClick: (record) => router.push(`/maintenance/tickets/${record.id}/assign`) },
  ];
  return (
    <div style={shellStyle}>
      <PageHeader
        title="Maintenance Tickets"
        subtitle="Log breakdown, corrective, and preventive maintenance requests against live assets."
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Tickets" }]}
        actions={<ActionButtons actions={[{ label: "Create Ticket", icon: <PlusCircle size={16} />, variant: "primary", onClick: () => router.push("/maintenance/tickets/create") }]} />}
      />
      <DataTable
        columns={columns}
        data={tickets}
        actions={actions}
        pageSize={15}
        emptyState={<EmptyState title="No maintenance tickets yet" message="Create the first ticket to begin assignment, diagnosis, and spare-parts traceability." />}
      />
    </div>
  );
}

export function TicketFormPage({
  mode,
  ticket,
  assets,
  locations,
  departments,
  users,
  presetAssetId,
}: {
  mode: "create" | "edit";
  ticket?: MaintenanceTicket | null;
  assets: MaintenanceAsset[];
  locations: Location[];
  departments: Department[];
  users: User[];
  presetAssetId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TicketFormState>(() => {
    const next = ticketInitialState(ticket ?? undefined);
    if (presetAssetId && !ticket?.assetId) {
      const asset = assets.find((entry) => entry.id === presetAssetId);
      next.assetId = presetAssetId;
      next.locationId = asset?.locationId ?? "";
      next.departmentId = asset?.departmentId ?? "";
    }
    return next;
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const assetOptions = assets.filter((entry) => entry.isActive);
  const selectedAsset = useMemo(() => assetOptions.find((entry) => entry.id === form.assetId), [assetOptions, form.assetId]);

  function updateAsset(assetId: string) {
    const asset = assetOptions.find((entry) => entry.id === assetId);
    setForm((current) => ({
      ...current,
      assetId,
      locationId: asset?.locationId ?? current.locationId,
      departmentId: asset?.departmentId ?? current.departmentId,
    }));
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(
        mode === "create" ? "/api/maintenance/tickets" : `/api/maintenance/tickets/${ticket?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save maintenance ticket");
        return;
      }
      router.push(publicViewUrl("maintenance.ticket", result.item.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={mode === "create" ? "Create Maintenance Ticket" : `Edit Ticket ${ticket?.ticketNo ?? ""}`.trim()}
        breadcrumbs={[
          { label: "Maintenance", href: "/maintenance" },
          { label: "Tickets", href: "/maintenance/tickets" },
          { label: mode === "create" ? "Create" : "Edit" },
        ]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title="Ticket Details"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: mode === "create" ? "Save Ticket" : "Update Ticket", variant: "primary", onClick: submit, loading: isPending }, { label: "Cancel", variant: "secondary", onClick: () => router.back() }]} /> }}
      >
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Ticket Date</span><input type="date" style={inputStyle} value={form.requestDate} onChange={(event) => setForm((current) => ({ ...current, requestDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Asset</span><select style={inputStyle} value={form.assetId} onChange={(event) => updateAsset(event.target.value)}><option value="">Select ...</option>{assetOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.assetCode} - {entry.assetName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Location</span><select style={inputStyle} value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}><option value="">Select ...</option>{locations.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.locationCode} - {entry.locationName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Department</span><select style={inputStyle} value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}><option value="">Select ...</option>{departments.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.code} - {entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Requested By</span><select style={inputStyle} value={form.requestedById} onChange={(event) => setForm((current) => ({ ...current, requestedById: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Assigned To</span><select style={inputStyle} value={form.assignedToId} onChange={(event) => setForm((current) => ({ ...current, assignedToId: event.target.value }))}><option value="">Select ...</option>{users.filter((entry) => entry.isActive).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Type</span><select style={inputStyle} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>{["BREAKDOWN", "CORRECTIVE", "PREVENTIVE", "INSPECTION", "CALIBRATION", "EMERGENCY"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Priority</span><select style={inputStyle} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Failure Date</span><input type="date" style={inputStyle} value={form.failureDate} onChange={(event) => setForm((current) => ({ ...current, failureDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Target Completion</span><input type="date" style={inputStyle} value={form.targetCompletionDate} onChange={(event) => setForm((current) => ({ ...current, targetCompletionDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Status</span><input style={{ ...inputStyle, background: "#f1f5f9" }} readOnly value={form.status} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Approval Status</span><input style={{ ...inputStyle, background: "#f1f5f9" }} readOnly value={form.approvalStatus} /></label>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Problem Description</span>
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.problemDescription} onChange={(event) => setForm((current) => ({ ...current, problemDescription: event.target.value }))} placeholder={selectedAsset ? `Describe the issue observed on ${selectedAsset.assetCode}` : "Describe the issue"} />
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Remarks</span>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
        </div>
      </FormCard>
    </div>
  );
}

export function TicketDetailPage({ ticket }: { ticket: MaintenanceTicket | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isPending = pendingAction != null;
  const isActionLoading = (action: string) => pendingAction === action;
  if (!ticket) {
    return <div style={shellStyle}><EmptyState title="Ticket not found" message="The requested maintenance ticket does not exist or is archived." action={{ label: "Back to Tickets", onClick: () => router.push("/maintenance/tickets") }} /></div>;
  }

  const fields = [
    ["Ticket No", ticket.ticketNo],
    ["Request Date", new Date(ticket.requestDate).toLocaleDateString("en-KE")],
    ["Asset", ticket.assetCode ? `${ticket.assetCode} - ${ticket.assetName ?? ""}` : (ticket.assetName ?? "—")],
    ["Location", ticket.locationCode ? `${ticket.locationCode} - ${ticket.locationName ?? ""}` : (ticket.locationName ?? "—")],
    ["Department", ticket.departmentName ?? "—"],
    ["Requested By", ticket.requestedByName ?? "—"],
    ["Assigned To", ticket.assignedToName ?? "—"],
    ["Type", ticket.type],
    ["Priority", ticket.priority],
    ["Status", ticket.status],
    ["Approval Status", ticket.approvalStatus],
    ["Failure Date", ticket.failureDate ? new Date(ticket.failureDate).toLocaleDateString("en-KE") : "—"],
    ["Target Completion", ticket.targetCompletionDate ? new Date(ticket.targetCompletionDate).toLocaleDateString("en-KE") : "—"],
  ];
  const transition = (action: string) => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        setMessage("");
        const response = await fetch(`/api/maintenance/tickets/${ticket.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        const result = await response.json();
        if (!response.ok) return setMessage(result.error ?? `Failed to ${action} ticket`);
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  };
  const actions = [] as Array<{ label: string; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "success" | "warning"; onClick: () => void; loading?: boolean; disabled?: boolean }>;
  if (ticket.status === "DRAFT") actions.push({ label: "Submit", icon: <Send size={16} />, variant: "primary", onClick: () => transition("submit"), loading: isActionLoading("submit"), disabled: isPending });
  if (ticket.status === "SUBMITTED" && ticket.approvalStatus === "PENDING") actions.push({ label: "Check", icon: <ClipboardCheck size={16} />, variant: "primary", onClick: () => transition("check"), loading: isActionLoading("check"), disabled: isPending });
  if (ticket.status === "SUBMITTED" && ticket.approvalStatus === "CHECKED") actions.push({ label: "Approve", icon: <Check size={16} />, variant: "success", onClick: () => transition("approve"), loading: isActionLoading("approve"), disabled: isPending });
  if (ticket.status === "SUBMITTED") actions.push({ label: "Reject", icon: <XCircle size={16} />, variant: "danger", onClick: () => transition("reject"), loading: isActionLoading("reject"), disabled: isPending });
  if (["DRAFT", "SUBMITTED", "APPROVED"].includes(ticket.status)) actions.push({ label: "Cancel", icon: <XCircle size={16} />, variant: "danger", onClick: () => transition("cancel"), loading: isActionLoading("cancel"), disabled: isPending });
  if (["APPROVED", "ASSIGNED"].includes(ticket.status)) actions.push({ label: "Assign", icon: <UserCheck size={16} />, variant: "secondary", onClick: () => router.push(`/maintenance/tickets/${ticket.id}/assign`) });
  if (ticket.status === "DRAFT") actions.push({ label: "Edit Ticket", variant: "secondary", onClick: () => router.push(publicEditUrl("maintenance.ticket", ticket.publicId)) });
  if (["APPROVED", "ASSIGNED"].includes(ticket.status) && ticket.approvalStatus === "APPROVED") actions.push({ label: "Create Work Order", icon: <Wrench size={16} />, variant: "primary", onClick: () => router.push(`/maintenance/work-orders/create?ticketId=${ticket.id}`) });
  if (!["DRAFT", "SUBMITTED", "CLOSED", "CANCELLED", "REJECTED"].includes(ticket.status)) actions.push({ label: "Close Ticket", icon: <ClipboardCheck size={16} />, variant: "success", onClick: () => router.push(`/maintenance/tickets/${ticket.id}/close`) });
  actions.push({ label: "Print", icon: <Printer size={16} />, variant: "secondary", onClick: () => window.open(publicPrintUrl("maintenance.ticket", ticket.publicId), "_blank", "noopener,noreferrer") });

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="maintenance"
        title={ticket.ticketNo}
        subtitle="Live maintenance request document"
        breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Tickets", href: "/maintenance/tickets" }, { label: ticket.ticketNo }]}
        actions={<ActionButtons actions={actions} />}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard title="Ticket Information" variant="teal-header">
        <div style={fieldGridStyle}>
          {fields.map(([label, value]) => (
            <div key={label} style={fieldStyle}>
              <span style={labelStyle}>{label}</span>
              <div>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Problem Description</span>
          <div>{ticket.problemDescription}</div>
        </div>
        <div style={{ ...fieldStyle, marginTop: 16 }}>
          <span style={labelStyle}>Remarks</span>
          <div>{ticket.remarks ?? "—"}</div>
        </div>
      </FormCard>
    </div>
  );
}
