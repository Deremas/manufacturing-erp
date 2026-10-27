"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import type { AssetReceiptRecord } from "@/services/procurement/asset-receipt.service";

type Option = { value: string; label: string; assetTypeId?: string | null };
type RegistrationRow = {
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
  warrantyStart: string;
  warrantyEnd: string;
  purchaseCost: number;
  expectedLifeYears: string;
  isProductionAsset: boolean;
  isMaintenanceRequired: boolean;
  criticality: string;
  description: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 10,
  background: colors.surface,
  color: colors.text.primary,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: colors.text.secondary,
  fontSize: 13,
  fontWeight: 600,
};

function blankRow(receipt: AssetReceiptRecord): RegistrationRow {
  return {
    assetCode: "",
    assetName: receipt.itemName,
    assetClass: "OTHER",
    assetTypeId: "",
    assetCategoryId: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    manufactureYear: "",
    locationId: receipt.receivingLocationId,
    departmentId: "",
    responsibleUserId: "",
    warrantyStart: "",
    warrantyEnd: "",
    purchaseCost: Number(receipt.unitCost),
    expectedLifeYears: "",
    isProductionAsset: false,
    isMaintenanceRequired: true,
    criticality: "MEDIUM",
    description: "",
  };
}

export function AssetRegistrationPage({
  grnNo,
  grnViewHref,
  receipts,
  assetTypes,
  assetCategories,
  locations,
  departments,
  users,
}: {
  grnNo: string;
  grnViewHref: string;
  receipts: AssetReceiptRecord[];
  assetTypes: Option[];
  assetCategories: Option[];
  locations: Option[];
  departments: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const openReceipts = receipts.filter((receipt) => Number(receipt.remainingQty) > 0 && receipt.status !== "CANCELLED");
  const [selectedReceiptId, setSelectedReceiptId] = useState(openReceipts[0]?.id ?? receipts[0]?.id ?? "");
  const selectedReceipt = receipts.find((receipt) => receipt.id === selectedReceiptId) ?? receipts[0];
  const [rows, setRows] = useState<RegistrationRow[]>(selectedReceipt ? [blankRow(selectedReceipt)] : []);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const availableCategories = useMemo(() => {
    const typeId = rows[0]?.assetTypeId;
    return assetCategories.filter((category) => !category.assetTypeId || !typeId || category.assetTypeId === typeId);
  }, [assetCategories, rows]);

  function selectReceipt(id: string) {
    const receipt = receipts.find((entry) => entry.id === id);
    setSelectedReceiptId(id);
    setRows(receipt ? [blankRow(receipt)] : []);
    setMessage("");
  }

  function updateRow<K extends keyof RegistrationRow>(index: number, key: K, value: RegistrationRow[K]) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function addRow() {
    if (!selectedReceipt || rows.length >= Number(selectedReceipt.remainingQty)) return;
    setRows((current) => [...current, blankRow(selectedReceipt)]);
  }

  function register() {
    if (!selectedReceipt) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/procurement/asset-receipts/${selectedReceipt.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: rows }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to register assets");
        return;
      }
      setMessage(`${result.assetIds.length} asset(s) registered successfully.`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title={`Register Assets from ${grnNo}`}
        subtitle="Convert posted asset receipt quantities into individually traceable asset records. This does not create inventory stock."
        breadcrumbs={[
          { label: "Procurement", href: "/procurement" },
          { label: "Goods Receipts / GRN", href: "/procurement/grn" },
          { label: grnNo, href: grnViewHref },
          { label: "Register Assets" },
        ]}
      />

      {receipts.length === 0 ? (
        <EmptyState title="No asset receipts" message="This GRN has no posted lines classified as asset purchases." />
      ) : (
        <>
          <FormCard title="Asset Receipt" variant="teal-header">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
              <label style={labelStyle}>Receipt Line
                <select style={inputStyle} value={selectedReceiptId} onChange={(event) => selectReceipt(event.target.value)}>
                  {receipts.map((receipt) => <option key={receipt.id} value={receipt.id}>{receipt.assetReceiptNo} - {receipt.itemCode} - {receipt.itemName}</option>)}
                </select>
              </label>
              {selectedReceipt ? <>
                <div style={labelStyle}>Received<strong style={{ color: colors.text.primary }}>{selectedReceipt.receivedQty}</strong></div>
                <div style={labelStyle}>Registered<strong style={{ color: colors.text.primary }}>{selectedReceipt.registeredQty}</strong></div>
                <div style={labelStyle}>Remaining<strong style={{ color: colors.text.primary }}>{selectedReceipt.remainingQty}</strong></div>
                <div style={labelStyle}>Status<StatusBadge status={selectedReceipt.status === "REGISTERED" ? "posted" : "pending"} /></div>
              </> : null}
            </div>
          </FormCard>

          {selectedReceipt && Number(selectedReceipt.remainingQty) > 0 ? (
            <FormCard title="Asset Registration Details" variant="teal-header">
              {message ? <p style={{ color: message.includes("successfully") ? colors.success[700] : colors.danger[600] }}>{message}</p> : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {rows.map((row, index) => (
                  <section key={index} style={{ border: `1px solid ${colors.border}`, borderRadius: 14, padding: 18, background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <strong>Asset {index + 1}</strong>
                      <button type="button" className="erp-remove-row-btn" aria-label={index === 0 ? "Clear asset row" : `Remove asset ${index + 1}`} onClick={() => selectedReceipt && setRows((current) => blankOrRemoveRow(current, index, blankRow(selectedReceipt)))} style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fef2f2", borderRadius: 6, padding: 0 }}>X</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
                      <label style={labelStyle}>Asset Code *<input style={inputStyle} value={row.assetCode} onChange={(event) => updateRow(index, "assetCode", event.target.value)} /></label>
                      <label style={labelStyle}>Asset Name *<input style={inputStyle} value={row.assetName} onChange={(event) => updateRow(index, "assetName", event.target.value)} /></label>
                      <label style={labelStyle}>Asset Class *<select style={inputStyle} value={row.assetClass} onChange={(event) => { updateRow(index, "assetClass", event.target.value); updateRow(index, "isProductionAsset", event.target.value === "PRODUCTION_MACHINE"); }}><option value="PRODUCTION_MACHINE">Production Machine</option><option value="FACILITY_EQUIPMENT">Facility Equipment</option><option value="LAB_EQUIPMENT">Lab Equipment</option><option value="VEHICLE">Vehicle</option><option value="TOOL">Tool</option><option value="MOLD">Mold</option><option value="OFFICE_EQUIPMENT">Office Equipment</option><option value="OTHER">Other</option></select></label>
                      <label style={labelStyle}>Asset Type *<select style={inputStyle} value={row.assetTypeId} onChange={(event) => updateRow(index, "assetTypeId", event.target.value)}><option value="">Select ...</option>{assetTypes.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                      <label style={labelStyle}>Asset Category<select style={inputStyle} value={row.assetCategoryId} onChange={(event) => updateRow(index, "assetCategoryId", event.target.value)}><option value="">No category</option>{availableCategories.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                      <label style={labelStyle}>Serial Number<input style={inputStyle} value={row.serialNumber} onChange={(event) => updateRow(index, "serialNumber", event.target.value)} /></label>
                      <label style={labelStyle}>Model<input style={inputStyle} value={row.model} onChange={(event) => updateRow(index, "model", event.target.value)} /></label>
                      <label style={labelStyle}>Manufacturer<input style={inputStyle} value={row.manufacturer} onChange={(event) => updateRow(index, "manufacturer", event.target.value)} /></label>
                      <label style={labelStyle}>Manufacture Year<input type="number" style={inputStyle} value={row.manufactureYear} onChange={(event) => updateRow(index, "manufactureYear", event.target.value)} /></label>
                      <label style={labelStyle}>Location *<select style={inputStyle} value={row.locationId} onChange={(event) => updateRow(index, "locationId", event.target.value)}><option value="">Select ...</option>{locations.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                      <label style={labelStyle}>Department<select style={inputStyle} value={row.departmentId} onChange={(event) => updateRow(index, "departmentId", event.target.value)}><option value="">No department</option>{departments.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                      <label style={labelStyle}>Responsible User<select style={inputStyle} value={row.responsibleUserId} onChange={(event) => updateRow(index, "responsibleUserId", event.target.value)}><option value="">Unassigned</option>{users.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
                      <label style={labelStyle}>Purchase Cost<input type="number" min="0" step="0.01" style={inputStyle} value={row.purchaseCost} onChange={(event) => updateRow(index, "purchaseCost", Number(event.target.value))} /></label>
                      <label style={labelStyle}>Warranty Start<input type="date" style={inputStyle} value={row.warrantyStart} onChange={(event) => updateRow(index, "warrantyStart", event.target.value)} /></label>
                      <label style={labelStyle}>Warranty End<input type="date" style={inputStyle} value={row.warrantyEnd} onChange={(event) => updateRow(index, "warrantyEnd", event.target.value)} /></label>
                      <label style={labelStyle}>Expected Life (Years)<input type="number" min="0" style={inputStyle} value={row.expectedLifeYears} onChange={(event) => updateRow(index, "expectedLifeYears", event.target.value)} /></label>
                      <label style={labelStyle}>Criticality<select style={inputStyle} value={row.criticality} onChange={(event) => updateRow(index, "criticality", event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
                      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", marginTop: 22 }}><input type="checkbox" checked={row.isProductionAsset} onChange={(event) => updateRow(index, "isProductionAsset", event.target.checked)} /> Production Asset</label>
                      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", marginTop: 22 }}><input type="checkbox" checked={row.isMaintenanceRequired} onChange={(event) => updateRow(index, "isMaintenanceRequired", event.target.checked)} /> Maintenance Required</label>
                      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Description<textarea style={{ ...inputStyle, minHeight: 72 }} value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} /></label>
                    </div>
                  </section>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={addRow} disabled={rows.length >= Number(selectedReceipt.remainingQty)} style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", border: "none", borderRadius: 6, background: colors.primary[600], color: "white", fontSize: 12, fontWeight: 600, cursor: rows.length >= Number(selectedReceipt.remainingQty) ? "not-allowed" : "pointer", width: "fit-content", opacity: rows.length >= Number(selectedReceipt.remainingQty) ? 0.55 : 1 }}>+ Add Asset</button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <ActionButtons actions={[{ label: "Back to GRN", variant: "secondary", onClick: () => router.push(grnViewHref) }, { label: "Register Assets", variant: "primary", onClick: register, loading: isPending }]} />
              </div>
            </FormCard>
          ) : <EmptyState title="Registration complete" message="All accepted asset units on this receipt have been registered." />}
        </>
      )}
    </div>
  );
}
