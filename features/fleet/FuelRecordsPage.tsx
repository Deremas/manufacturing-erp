"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { FleetDriver, FleetTrip, FuelRecord, Vehicle } from "@/features/fleet/types";
import type { BankAccount, Location, Supplier } from "@/features/master-data/types";

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

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 1180,
  borderCollapse: "collapse",
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#ffffff",
  color: colors.text.primary,
  cursor: "pointer",
};

const dangerActionButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  color: colors.danger[600],
  borderColor: "#fda29b",
  background: "#fef3f2",
};

type FuelFormState = {
  fuelNo: string;
  fuelDate: string;
  vehicleId: string;
  driverId: string;
  tripId: string;
  locationId: string;
  fuelType: string;
  quantity: string;
  unitPrice: string;
  totalCost: string;
  odometer: string;
  supplierId: string;
  bankAccountId: string;
  status: string;
  remarks: string;
};

const defaultFuelTypeOptions = ["DIESEL", "PETROL", "ENGINE_OIL", "LUBRICANT"];

function fuelBadge(status: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "posted") return "posted";
  if (normalized === "cancelled") return "rejected";
  return "draft";
}

function createEmptyForm(): FuelFormState {
  return {
    fuelNo: "",
    fuelDate: new Date().toISOString().slice(0, 10),
    vehicleId: "",
    driverId: "",
    tripId: "",
    locationId: "",
    fuelType: "DIESEL",
    quantity: "",
    unitPrice: "",
    totalCost: "",
    odometer: "",
    supplierId: "",
    bankAccountId: "",
    status: "POSTED",
    remarks: "",
  };
}

export function FuelRecordsPage({
  initialItems,
  vehicles,
  drivers,
  trips,
  suppliers,
  bankAccounts,
  locations,
  initialEditingId,
}: {
  initialItems: FuelRecord[];
  vehicles: Vehicle[];
  drivers: FleetDriver[];
  trips: FleetTrip[];
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  locations: Location[];
  initialEditingId?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FuelFormState>(createEmptyForm());

  const activeVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.isActive), [vehicles]);
  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.isActive), [drivers]);
  const activeTrips = useMemo(
    () => trips.filter((trip) => trip.isActive && trip.status !== "CANCELLED"),
    [trips],
  );
  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive), [suppliers]);
  const activeBankAccounts = useMemo(() => bankAccounts.filter((account) => account.isActive), [bankAccounts]);
  const activeLocations = useMemo(() => locations.filter((location) => location.isActive), [locations]);

  const selectedTrip = useMemo(
    () => activeTrips.find((trip) => trip.id === form.tripId) ?? null,
    [activeTrips, form.tripId],
  );

  useEffect(() => {
    if (!selectedTrip) {
      return;
    }

    setForm((current) => ({
      ...current,
      vehicleId: selectedTrip.vehicleId || current.vehicleId,
      driverId: selectedTrip.driverId ?? current.driverId,
      locationId: selectedTrip.fromLocationId ?? current.locationId,
    }));
  }, [selectedTrip]);

  useEffect(() => {
    const quantity = Number(form.quantity || 0);
    const unitPrice = Number(form.unitPrice || 0);
    const computed = quantity > 0 && unitPrice >= 0 ? (quantity * unitPrice).toFixed(2) : "";
    setForm((current) => (current.totalCost === computed ? current : { ...current, totalCost: computed }));
  }, [form.quantity, form.unitPrice]);

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setMessage("");
  }

  function startEdit(item: FuelRecord) {
    setEditingId(item.id);
    setForm({
      fuelNo: item.fuelNo,
      fuelDate: item.fuelDate.slice(0, 10),
      vehicleId: item.vehicleId,
      driverId: item.driverId ?? "",
      tripId: item.tripId ?? "",
      locationId: item.locationId ?? "",
      fuelType: item.fuelType,
      quantity: String(item.quantity ?? ""),
      unitPrice: String(item.unitPrice ?? ""),
      totalCost: String(item.totalCost ?? ""),
      odometer: item.odometer !== undefined ? String(item.odometer) : "",
      supplierId: item.supplierId ?? "",
      bankAccountId: item.bankAccountId ?? "",
      status: item.status,
      remarks: item.remarks ?? "",
    });
    setMessage("");
  }

  useEffect(() => {
    if (!initialEditingId) return;
    const item = initialItems.find((candidate) => candidate.id === initialEditingId);
    if (item) startEdit(item);
  }, [initialEditingId, initialItems]);

  async function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/fleet/fuel/${editingId}` : "/api/fleet/fuel", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to save fuel record");
        return;
      }

      const next = result.item as FuelRecord;
      setItems((current) =>
        editingId ? current.map((item) => (item.id === next.id ? next : item)) : [next, ...current],
      );
      resetForm();
    });
  }

  async function archive(id: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/fuel/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to archive fuel record");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Fuel Records"
        subtitle="Capture real fleet fuel cost, trip linkage, and finance posting in one place"
        breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Fuel Records" }]}
      />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}

      <FormCard
        title={editingId ? "Edit Fuel Record" : "Create Fuel Record"}
        variant="teal-header"
        footer={{
          actions: (
            <ActionButtons
              actions={[
                { label: editingId ? "Update Fuel Record" : "Save Fuel Record", variant: "primary", onClick: submit, loading: isPending },
                { label: "Reset", variant: "secondary", onClick: resetForm, disabled: isPending },
              ]}
            />
          ),
        }}
      >
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Fuel No</label>
            <input style={inputStyle} value={form.fuelNo} onChange={(event) => setForm((current) => ({ ...current, fuelNo: event.target.value.toUpperCase() }))} placeholder="FUEL-001" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Fuel Date</label>
            <input style={inputStyle} type="date" value={form.fuelDate} onChange={(event) => setForm((current) => ({ ...current, fuelDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Trip</label>
            <select style={inputStyle} value={form.tripId} onChange={(event) => setForm((current) => ({ ...current, tripId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.tripNo} - {trip.routeName} - {trip.vehicleCode}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle</label>
            <select style={inputStyle} value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleCode} - {vehicle.plateNumber} - {vehicle.vehicleName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Driver</label>
            <select style={inputStyle} value={form.driverId} onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.driverCode} - {driver.fullName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Location</label>
            <select style={inputStyle} value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Fuel Type</label>
            <select style={inputStyle} value={form.fuelType} onChange={(event) => setForm((current) => ({ ...current, fuelType: event.target.value.toUpperCase() }))}>
              {defaultFuelTypeOptions.map((fuelType) => (
                <option key={fuelType} value={fuelType}>
                  {fuelType.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Quantity</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="0.00" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Unit Price</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="0.00" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Total Cost</label>
            <input style={inputStyle} value={form.totalCost} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Odometer</label>
            <input style={inputStyle} type="number" min="0" step="0.1" value={form.odometer} onChange={(event) => setForm((current) => ({ ...current, odometer: event.target.value }))} placeholder="0.0" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier</label>
            <select style={inputStyle} value={form.supplierId} onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplierCode} - {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Bank Account</label>
            <select style={inputStyle} value={form.bankAccountId} onChange={(event) => setForm((current) => ({ ...current, bankAccountId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeBankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} - {account.accountName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value.toUpperCase() }))}>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 88, resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Fuel note, trip note, or settlement remark" />
          </div>
        </div>
      </FormCard>

      <FormCard title="Fuel Register" variant="teal-header">
        {items.length === 0 ? (
          <EmptyState title="No fuel records yet" message="Record fuel usage here so fleet cost, finance posting, and trip reconciliation stay aligned." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Fuel No", "Date", "Vehicle", "Trip", "Location", "Qty", "Unit Price", "Total", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{item.fuelNo}</td>
                    <td style={{ padding: "14px 10px" }}>{item.fuelDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 10px" }}>{item.vehicleLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.tripLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.locationLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.quantity.toLocaleString()}</td>
                    <td style={{ padding: "14px 10px" }}>{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "14px 10px" }}>{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "14px 10px" }}>
                      <StatusBadge status={fuelBadge(item.status)} />
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" style={actionButtonStyle} onClick={() => startEdit(item)} title="Edit fuel record" aria-label="Edit fuel record">
                          <Pencil size={16} />
                        </button>
                        <button type="button" style={dangerActionButtonStyle} onClick={() => archive(item.id)} title="Archive fuel record" aria-label="Archive fuel record">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}
