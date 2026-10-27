"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Eye, Pencil, Send, TimerReset, Truck, Undo2, Waypoints, Trash2 } from "lucide-react";

import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { FleetDriver, FleetTrip, FuelRecord, Vehicle } from "@/features/fleet/types";
import { publicViewUrl } from "@/lib/routing";

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
  minWidth: 900,
  borderCollapse: "collapse",
};

const listActionButtonStyle: React.CSSProperties = {
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
  ...listActionButtonStyle,
  color: colors.danger[600],
  borderColor: "#fda29b",
  background: "#fef3f2",
};

const successActionButtonStyle: React.CSSProperties = {
  ...listActionButtonStyle,
  color: "#027a48",
  borderColor: "#86efac",
  background: "#ecfdf3",
};

function isTruthyStatus(value: boolean) {
  return value ? "active" : "inactive";
}

function tripLifecycleBadge(status: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  switch (normalized) {
    case "completed":
      return "approved";
    case "arrived":
      return "approved";
    case "in_transit":
      return "posted";
    case "dispatched":
      return "posted";
    case "loading":
      return "pending";
    case "assigned":
      return "draft";
    case "cancelled":
      return "inactive";
    default:
      return "draft";
  }
}

function reconciliationColor(status: FleetTrip["reconciliationStatus"]) {
  if (status === "CLEAR") {
    return "#067647";
  }

  if (status === "VARIANCE") {
    return colors.danger[600];
  }

  return colors.warning[600];
}

export function VehiclesPage({ initialItems }: { initialItems: Vehicle[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    vehicleCode: "",
    plateNumber: "",
    vehicleName: "",
    vehicleType: "",
    capacity: "",
    isActive: true,
  });

  function startCreate() {
    setEditingId(null);
    setForm({
      vehicleCode: "",
      plateNumber: "",
      vehicleName: "",
      vehicleType: "",
      capacity: "",
      isActive: true,
    });
    setMessage("");
  }

  function startEdit(item: Vehicle) {
    setEditingId(item.id);
    setForm({
      vehicleCode: item.vehicleCode,
      plateNumber: item.plateNumber,
      vehicleName: item.vehicleName,
      vehicleType: item.vehicleType ?? "",
      capacity: item.capacity ? String(item.capacity) : "",
      isActive: item.isActive,
    });
    setMessage("");
  }

  async function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/fleet/vehicles/${editingId}` : "/api/fleet/vehicles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save vehicle");
        return;
      }

      const next = result.item as Vehicle;
      setItems((currentItems) =>
        editingId
          ? currentItems.map((item) => (item.id === next.id ? next : item))
          : [next, ...currentItems],
      );
      startCreate();
    });
  }

  async function archive(id: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/vehicles/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to archive vehicle");
        return;
      }
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      if (editingId === id) {
        startCreate();
      }
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader title="Vehicles" subtitle="Manage live fleet truck masters for sales loading and dispatch" breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Vehicles" }]} />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title={editingId ? "Edit Vehicle" : "Create Vehicle"}
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: editingId ? "Update Vehicle" : "Save Vehicle", variant: "primary", onClick: submit, loading: isPending }, { label: "Reset", variant: "secondary", onClick: startCreate, disabled: isPending }]} /> }}
      >
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle Code</label>
            <input style={inputStyle} value={form.vehicleCode} onChange={(event) => setForm((currentForm) => ({ ...currentForm, vehicleCode: event.target.value.toUpperCase() }))} placeholder="TRK-001" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Plate Number</label>
            <input style={inputStyle} value={form.plateNumber} onChange={(event) => setForm((currentForm) => ({ ...currentForm, plateNumber: event.target.value.toUpperCase() }))} placeholder="AA-12345" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle Name</label>
            <input style={inputStyle} value={form.vehicleName} onChange={(event) => setForm((currentForm) => ({ ...currentForm, vehicleName: event.target.value }))} placeholder="Factory Truck 01" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle Type</label>
            <input style={inputStyle} value={form.vehicleType} onChange={(event) => setForm((currentForm) => ({ ...currentForm, vehicleType: event.target.value }))} placeholder="Truck / Van / Pickup" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Capacity</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.capacity} onChange={(event) => setForm((currentForm) => ({ ...currentForm, capacity: event.target.value }))} placeholder="Optional" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.isActive ? "true" : "false"} onChange={(event) => setForm((currentForm) => ({ ...currentForm, isActive: event.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </FormCard>

      <FormCard title="Vehicle Register" variant="teal-header">
        {items.length === 0 ? (
          <EmptyState title="No vehicles yet" message="Create your first fleet truck to use TRUCK loading with DB-backed selectors." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Code", "Plate", "Name", "Type", "Capacity", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{item.vehicleCode}</td>
                    <td style={{ padding: "14px 10px" }}>{item.plateNumber}</td>
                    <td style={{ padding: "14px 10px" }}>{item.vehicleName}</td>
                    <td style={{ padding: "14px 10px" }}>{item.vehicleType ?? "—"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.capacity ?? "—"}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={isTruthyStatus(item.isActive)} /></td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" style={listActionButtonStyle} onClick={() => startEdit(item)} title="Edit vehicle" aria-label="Edit vehicle"><Pencil size={16} /></button>
                        <button type="button" style={dangerActionButtonStyle} onClick={() => archive(item.id)} title="Archive vehicle" aria-label="Archive vehicle"><Trash2 size={16} /></button>
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

export function DriversPage({ initialItems }: { initialItems: FleetDriver[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    driverCode: "",
    fullName: "",
    phone: "",
    licenseNumber: "",
    isActive: true,
  });

  function startCreate() {
    setEditingId(null);
    setForm({
      driverCode: "",
      fullName: "",
      phone: "",
      licenseNumber: "",
      isActive: true,
    });
    setMessage("");
  }

  function startEdit(item: FleetDriver) {
    setEditingId(item.id);
    setForm({
      driverCode: item.driverCode,
      fullName: item.fullName,
      phone: item.phone ?? "",
      licenseNumber: item.licenseNumber ?? "",
      isActive: item.isActive,
    });
    setMessage("");
  }

  async function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/fleet/drivers/${editingId}` : "/api/fleet/drivers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save driver");
        return;
      }

      const next = result.item as FleetDriver;
      setItems((currentItems) =>
        editingId
          ? currentItems.map((item) => (item.id === next.id ? next : item))
          : [next, ...currentItems],
      );
      startCreate();
    });
  }

  async function archive(id: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/drivers/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to archive driver");
        return;
      }
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      if (editingId === id) {
        startCreate();
      }
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader title="Drivers" subtitle="Manage live fleet driver masters for truck loading and dispatch" breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Drivers" }]} />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title={editingId ? "Edit Driver" : "Create Driver"}
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: editingId ? "Update Driver" : "Save Driver", variant: "primary", onClick: submit, loading: isPending }, { label: "Reset", variant: "secondary", onClick: startCreate, disabled: isPending }]} /> }}
      >
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Driver Code</label>
            <input style={inputStyle} value={form.driverCode} onChange={(event) => setForm((currentForm) => ({ ...currentForm, driverCode: event.target.value.toUpperCase() }))} placeholder="DRV-001" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={form.fullName} onChange={(event) => setForm((currentForm) => ({ ...currentForm, fullName: event.target.value }))} placeholder="Driver full name" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={(event) => setForm((currentForm) => ({ ...currentForm, phone: event.target.value }))} placeholder="Optional" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>License Number</label>
            <input style={inputStyle} value={form.licenseNumber} onChange={(event) => setForm((currentForm) => ({ ...currentForm, licenseNumber: event.target.value.toUpperCase() }))} placeholder="Optional" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.isActive ? "true" : "false"} onChange={(event) => setForm((currentForm) => ({ ...currentForm, isActive: event.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </FormCard>

      <FormCard title="Driver Register" variant="teal-header">
        {items.length === 0 ? (
          <EmptyState title="No drivers yet" message="Create your first driver to use DB-backed truck dispatch assignments." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Code", "Name", "Phone", "License", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{item.driverCode}</td>
                    <td style={{ padding: "14px 10px" }}>{item.fullName}</td>
                    <td style={{ padding: "14px 10px" }}>{item.phone ?? "—"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.licenseNumber ?? "—"}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={isTruthyStatus(item.isActive)} /></td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" style={listActionButtonStyle} onClick={() => startEdit(item)} title="Edit driver" aria-label="Edit driver"><Pencil size={16} /></button>
                        <button type="button" style={dangerActionButtonStyle} onClick={() => archive(item.id)} title="Archive driver" aria-label="Archive driver"><Trash2 size={16} /></button>
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

export function TripsPage({
  initialItems,
  vehicles,
  drivers,
  locations,
  initialEditingId,
}: {
  initialItems: FleetTrip[];
  vehicles: Vehicle[];
  drivers: FleetDriver[];
  locations: Array<{ id: string; locationCode: string; locationName: string; isActive: boolean }>;
  initialEditingId?: string;
}) {
  type TripFormState = {
    tripNo: string;
    tripDate: string;
    vehicleId: string;
    driverId: string;
    fromLocationId: string;
    destinationId: string;
    routeName: string;
    routeDescription: string;
    plannedDeparture: string;
    actualDeparture: string;
    plannedArrival: string;
    actualArrival: string;
    openingOdometer: string;
    closingOdometer: string;
    distance: string;
    deliveryRemarks: string;
    status: string;
    remarks: string;
    isActive: boolean;
  };

  const createEmptyForm = (): TripFormState => ({
    tripNo: "",
    tripDate: new Date().toISOString().slice(0, 10),
    vehicleId: "",
    driverId: "",
    fromLocationId: "",
    destinationId: "",
    routeName: "",
    routeDescription: "",
    plannedDeparture: "",
    actualDeparture: "",
    plannedArrival: "",
    actualArrival: "",
    openingOdometer: "",
    closingOdometer: "",
    distance: "",
    deliveryRemarks: "",
    status: "PLANNED",
    remarks: "",
    isActive: true,
  });

  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<TripFormState>(createEmptyForm());

  const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive);
  const activeDrivers = drivers.filter((driver) => driver.isActive);
  const activeLocations = locations.filter((location) => location.isActive);

  function startCreate() {
    setEditingId(null);
    setForm(createEmptyForm());
    setMessage("");
  }

  function startEdit(item: FleetTrip) {
    setEditingId(item.id);
    setForm({
      tripNo: item.tripNo,
      tripDate: item.tripDate.slice(0, 10),
      vehicleId: item.vehicleId,
      driverId: item.driverId ?? "",
      fromLocationId: item.fromLocationId ?? "",
      destinationId: item.destinationId ?? "",
      routeName: item.routeName,
      routeDescription: item.routeDescription ?? "",
      plannedDeparture: item.plannedDeparture ? item.plannedDeparture.slice(0, 16) : "",
      actualDeparture: item.actualDeparture ? item.actualDeparture.slice(0, 16) : "",
      plannedArrival: item.plannedArrival ? item.plannedArrival.slice(0, 16) : "",
      actualArrival: item.actualArrival ? item.actualArrival.slice(0, 16) : "",
      openingOdometer: item.openingOdometer !== undefined ? String(item.openingOdometer) : "",
      closingOdometer: item.closingOdometer !== undefined ? String(item.closingOdometer) : "",
      distance: item.distance !== undefined ? String(item.distance) : "",
      deliveryRemarks: item.deliveryRemarks ?? "",
      status: item.status,
      remarks: item.remarks ?? "",
      isActive: item.isActive,
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
      const response = await fetch(editingId ? `/api/fleet/trips/${editingId}` : "/api/fleet/trips", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to save trip");
        return;
      }

      const next = result.item as FleetTrip;
      setItems((currentItems) =>
        editingId
          ? currentItems.map((item) => (item.id === next.id ? next : item))
          : [next, ...currentItems],
      );
      startCreate();
    });
  }

  async function archive(id: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/trips/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to archive trip");
        return;
      }
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      if (editingId === id) {
        startCreate();
      }
    });
  }

  async function changeTripStatus(
    id: string,
    status: "PLANNED" | "ASSIGNED" | "LOADING" | "DISPATCHED" | "IN_TRANSIT" | "ARRIVED" | "COMPLETED" | "CANCELLED",
  ) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/trips/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to update trip status");
        return;
      }

      const next = result.item as FleetTrip;
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === next.id ? next : item)),
      );
      if (editingId === id) {
        startEdit(next);
      }
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader title="Trips" subtitle="Manage live trip assignments so truck loading can reference real dispatch documents" breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Trips" }]} />
      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}
      <FormCard
        title={editingId ? "Edit Trip" : "Create Trip"}
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={[{ label: editingId ? "Update Trip" : "Save Trip", variant: "primary", onClick: submit, loading: isPending }, { label: "Reset", variant: "secondary", onClick: startCreate, disabled: isPending }]} /> }}
      >
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Trip No</label>
            <input style={inputStyle} value={form.tripNo} onChange={(event) => setForm((current) => ({ ...current, tripNo: event.target.value.toUpperCase() }))} placeholder="TRIP-001" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Trip Date</label>
            <input style={inputStyle} type="date" value={form.tripDate} onChange={(event) => setForm((current) => ({ ...current, tripDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Planned Departure</label>
            <input style={inputStyle} type="datetime-local" value={form.plannedDeparture} onChange={(event) => setForm((current) => ({ ...current, plannedDeparture: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Planned Arrival</label>
            <input style={inputStyle} type="datetime-local" value={form.plannedArrival} onChange={(event) => setForm((current) => ({ ...current, plannedArrival: event.target.value }))} />
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
            <label style={labelStyle}>From Location</label>
            <select style={inputStyle} value={form.fromLocationId} onChange={(event) => setForm((current) => ({ ...current, fromLocationId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Destination</label>
            <select style={inputStyle} value={form.destinationId} onChange={(event) => setForm((current) => ({ ...current, destinationId: event.target.value }))}>
              <option value="">Select ...</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Route Name</label>
            <input style={inputStyle} value={form.routeName} onChange={(event) => setForm((current) => ({ ...current, routeName: event.target.value }))} placeholder="Addis Ababa North Route" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value.toUpperCase() }))}>
              <option value="PLANNED">Planned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="LOADING">Loading</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="ARRIVED">Arrived</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Actual Departure</label>
            <input style={inputStyle} type="datetime-local" value={form.actualDeparture} onChange={(event) => setForm((current) => ({ ...current, actualDeparture: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Actual Arrival</label>
            <input style={inputStyle} type="datetime-local" value={form.actualArrival} onChange={(event) => setForm((current) => ({ ...current, actualArrival: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Opening Odometer</label>
            <input style={inputStyle} type="number" min="0" step="0.1" value={form.openingOdometer} onChange={(event) => setForm((current) => ({ ...current, openingOdometer: event.target.value }))} placeholder="0.0" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Closing Odometer</label>
            <input style={inputStyle} type="number" min="0" step="0.1" value={form.closingOdometer} onChange={(event) => setForm((current) => ({ ...current, closingOdometer: event.target.value }))} placeholder="0.0" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Distance</label>
            <input style={inputStyle} type="number" min="0" step="0.1" value={form.distance} onChange={(event) => setForm((current) => ({ ...current, distance: event.target.value }))} placeholder="KM" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status Flag</label>
            <select style={inputStyle} value={form.isActive ? "true" : "false"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "true" }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Route Description</label>
            <input style={inputStyle} value={form.routeDescription} onChange={(event) => setForm((current) => ({ ...current, routeDescription: event.target.value }))} placeholder="Optional route detail, checkpoint, or dispatch note" />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Delivery Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.deliveryRemarks} onChange={(event) => setForm((current) => ({ ...current, deliveryRemarks: event.target.value }))} placeholder="Delivery observation, variance note, or reconciliation comment" />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 88, resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Operational remarks" />
          </div>
        </div>
      </FormCard>

      <FormCard title="Trip Register" variant="teal-header">
        {items.length === 0 ? (
          <EmptyState title="No trips yet" message="Create the first trip so truck loading can reference a real dispatch route instead of plain route text." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Trip No", "Schedule", "Vehicle / Driver", "Route", "Odometer / KM", "Loading / Dispatch / Sales", "Fuel", "Lifecycle", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{item.tripNo}</td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{item.tripDate.slice(0, 10)}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>
                          {item.plannedDeparture ? `Dep ${item.plannedDeparture.slice(0, 16).replace("T", " ")}` : "No planned departure"}
                        </span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>
                          {item.plannedArrival ? `Arr ${item.plannedArrival.slice(0, 16).replace("T", " ")}` : "No planned arrival"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{item.vehicleCode} - {item.plateNumber}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>
                          {item.driverCode ? `${item.driverCode} - ${item.driverName ?? ""}`.trim() : "No driver assigned"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{item.routeName}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>{item.fromLocationLabel ?? "-"}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>{item.destinationLabel ?? "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>Open: {item.openingOdometer ?? "-"}</span>
                        <span>Close: {item.closingOdometer ?? "-"}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>KM: {item.distance ?? "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span><Truck size={14} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />{item.loadingQuantity ?? 0} loaded</span>
                        <span><Waypoints size={14} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />{item.dispatchQuantity ?? 0} dispatched</span>
                        <span><CheckCircle2 size={14} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />{item.soldQuantity ?? 0} sold</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{item.fuelQuantity ?? 0} qty</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>Cost: {(item.fuelCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>Records: {item.fuelRecordCount ?? 0}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <StatusBadge status={tripLifecycleBadge(item.status)} />
                        <span style={{ color: colors.text.secondary, fontSize: 12 }}>{item.status}</span>
                        <span style={{ color: reconciliationColor(item.reconciliationStatus), fontSize: 12, fontWeight: 700 }}>
                          {item.reconciliationStatus === "CLEAR"
                            ? "Reconciled"
                            : item.reconciliationStatus === "VARIANCE"
                              ? "Commercial variance"
                              : "Pending reconciliation"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("fleet.trip", item.publicId)} style={listActionButtonStyle} title="View trip" aria-label="View trip"><Eye size={16} /></Link>
                        <button type="button" style={listActionButtonStyle} onClick={() => startEdit(item)} title="Edit trip" aria-label="Edit trip"><Pencil size={16} /></button>
                        {item.status === "PLANNED" ? (
                          <button type="button" style={listActionButtonStyle} onClick={() => changeTripStatus(item.id, "ASSIGNED")} title="Assign trip" aria-label="Assign trip"><Truck size={16} /></button>
                        ) : null}
                        {item.status === "ASSIGNED" ? (
                          <button type="button" style={listActionButtonStyle} onClick={() => changeTripStatus(item.id, "LOADING")} title="Move to loading" aria-label="Move to loading"><Waypoints size={16} /></button>
                        ) : null}
                        {item.status === "LOADING" ? (
                          <button type="button" style={successActionButtonStyle} onClick={() => changeTripStatus(item.id, "DISPATCHED")} title="Dispatch trip" aria-label="Dispatch trip"><Send size={16} /></button>
                        ) : null}
                        {item.status === "DISPATCHED" ? (
                          <button type="button" style={successActionButtonStyle} onClick={() => changeTripStatus(item.id, "IN_TRANSIT")} title="Mark in transit" aria-label="Mark in transit"><Waypoints size={16} /></button>
                        ) : null}
                        {item.status === "IN_TRANSIT" ? (
                          <button type="button" style={successActionButtonStyle} onClick={() => changeTripStatus(item.id, "ARRIVED")} title="Mark arrived" aria-label="Mark arrived"><CheckCircle2 size={16} /></button>
                        ) : null}
                        {item.status === "ARRIVED" ? (
                          <button type="button" style={successActionButtonStyle} onClick={() => changeTripStatus(item.id, "COMPLETED")} title="Complete trip" aria-label="Complete trip"><CheckCircle2 size={16} /></button>
                        ) : null}
                        {item.status === "CANCELLED" ? (
                          <button type="button" style={listActionButtonStyle} onClick={() => changeTripStatus(item.id, "PLANNED")} title="Reset to planned" aria-label="Reset to planned"><TimerReset size={16} /></button>
                        ) : null}
                        {["PLANNED", "ASSIGNED", "LOADING", "DISPATCHED", "IN_TRANSIT", "ARRIVED"].includes(item.status) ? (
                          <button type="button" style={dangerActionButtonStyle} onClick={() => changeTripStatus(item.id, "CANCELLED")} title="Cancel trip" aria-label="Cancel trip"><Ban size={16} /></button>
                        ) : null}
                        <button type="button" style={dangerActionButtonStyle} onClick={() => archive(item.id)} title="Archive trip" aria-label="Archive trip"><Trash2 size={16} /></button>
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

export function TripDetailPage({
  trip,
  fuelRecords,
}: {
  trip: FleetTrip | null;
  fuelRecords: FuelRecord[];
}) {
  const [message, setMessage] = useState("");
  const [note, setNote] = useState(trip?.reconciliationNote ?? "");
  const [liveTrip, setLiveTrip] = useState<FleetTrip | null>(trip);
  const [isPending, startTransition] = useTransition();

  async function changeLifecycle(nextStatus: string) {
    if (!liveTrip) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/trips/${liveTrip.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to update trip lifecycle");
        return;
      }

      setLiveTrip(result.item as FleetTrip);
      setMessage(`Trip moved to ${nextStatus}.`);
    });
  }

  async function applyReconciliation(decision: NonNullable<FleetTrip["reconciliationDecision"]>) {
    if (!liveTrip) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/fleet/trips/${liveTrip.id}/reconciliation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Failed to update reconciliation");
        return;
      }

      setLiveTrip(result.item as FleetTrip);
      setNote((result.item as FleetTrip).reconciliationNote ?? note);
      setMessage("Trip reconciliation updated.");
    });
  }

  if (!liveTrip) {
    return (
      <div style={shellStyle}>
        <PageHeader title="Trip Detail" subtitle="Trip reconciliation and lifecycle view" breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Trips", href: "/fleet/trips" }, { label: "Not Found" }]} />
        <FormCard title="Trip not found" variant="teal-header">
          <EmptyState title="Trip not found" message="This trip could not be loaded or is outside your location scope." />
        </FormCard>
      </div>
    );
  }

  const metrics = [
    { label: "Loaded Qty", value: Number(liveTrip.loadingQuantity ?? 0).toLocaleString() },
    { label: "Dispatched Qty", value: Number(liveTrip.dispatchQuantity ?? 0).toLocaleString() },
    { label: "Sold Qty", value: Number(liveTrip.soldQuantity ?? 0).toLocaleString() },
    { label: "Fuel Cost", value: Number(liveTrip.fuelCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ];

  const reconciliationMessage = liveTrip.reconciliationStatus === "CLEAR"
    ? "Loading, dispatch, and posted sale quantities are aligned for this trip."
    : liveTrip.reconciliationStatus === "VARIANCE"
      ? "This trip has a true commercial variance. Review dispatch or posted sale quantities before closing downstream reconciliation."
      : "This trip is still operationally open. Some loaded, dispatched, sold, or collected values are not yet commercially closed.";

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="fleet"
        title={`Trip ${liveTrip.tripNo}`}
        subtitle="Lifecycle, fuel, and sales reconciliation"
        breadcrumbs={[{ label: "Fleet", href: "/fleet" }, { label: "Trips", href: "/fleet/trips" }, { label: liveTrip.tripNo }]}
      />

      <FormCard title="Trip Lifecycle" variant="teal-header">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <StatusBadge status={tripLifecycleBadge(liveTrip.status)} />
          <span style={{ color: colors.text.secondary, marginRight: 8 }}>{liveTrip.status}</span>
          {liveTrip.status === "PLANNED" ? (
            <button type="button" disabled={isPending} style={listActionButtonStyle} onClick={() => changeLifecycle("ASSIGNED")} title="Assign trip" aria-label="Assign trip"><Truck size={16} /></button>
          ) : null}
          {liveTrip.status === "ASSIGNED" ? (
            <button type="button" disabled={isPending} style={listActionButtonStyle} onClick={() => changeLifecycle("LOADING")} title="Move trip to loading" aria-label="Move trip to loading"><Waypoints size={16} /></button>
          ) : null}
          {liveTrip.status === "LOADING" ? (
            <button type="button" disabled={isPending} style={successActionButtonStyle} onClick={() => changeLifecycle("DISPATCHED")} title="Dispatch trip" aria-label="Dispatch trip"><Send size={16} /></button>
          ) : null}
          {liveTrip.status === "DISPATCHED" ? (
            <button type="button" disabled={isPending} style={successActionButtonStyle} onClick={() => changeLifecycle("IN_TRANSIT")} title="Mark trip in transit" aria-label="Mark trip in transit"><Waypoints size={16} /></button>
          ) : null}
          {liveTrip.status === "IN_TRANSIT" ? (
            <button type="button" disabled={isPending} style={successActionButtonStyle} onClick={() => changeLifecycle("ARRIVED")} title="Mark trip arrived" aria-label="Mark trip arrived"><CheckCircle2 size={16} /></button>
          ) : null}
          {liveTrip.status === "ARRIVED" ? (
            <button type="button" disabled={isPending} style={successActionButtonStyle} onClick={() => changeLifecycle("COMPLETED")} title="Complete trip" aria-label="Complete trip"><CheckCircle2 size={16} /></button>
          ) : null}
          {liveTrip.status === "CANCELLED" ? (
            <button type="button" disabled={isPending} style={listActionButtonStyle} onClick={() => changeLifecycle("PLANNED")} title="Reset trip to planned" aria-label="Reset trip to planned"><TimerReset size={16} /></button>
          ) : null}
          {["PLANNED", "ASSIGNED", "LOADING", "DISPATCHED", "IN_TRANSIT", "ARRIVED"].includes(liveTrip.status) ? (
            <button type="button" disabled={isPending} style={dangerActionButtonStyle} onClick={() => changeLifecycle("CANCELLED")} title="Cancel trip" aria-label="Cancel trip"><Ban size={16} /></button>
          ) : null}
          {isPending ? <span style={{ color: colors.text.secondary, fontSize: 13 }}>Saving...</span> : null}
        </div>
        {message ? <div style={{ marginTop: 12, color: colors.text.secondary }}>{message}</div> : null}
      </FormCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ color: colors.text.secondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{metric.label}</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: colors.text.primary }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <FormCard title="Trip Summary" variant="teal-header">
        <div style={fieldGridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Vehicle</span><div>{liveTrip.vehicleCode} - {liveTrip.plateNumber}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Driver</span><div>{liveTrip.driverCode ? `${liveTrip.driverCode} - ${liveTrip.driverName ?? ""}`.trim() : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>From Location</span><div>{liveTrip.fromLocationLabel ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Destination</span><div>{liveTrip.destinationLabel ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Planned Departure</span><div>{liveTrip.plannedDeparture ? liveTrip.plannedDeparture.replace("T", " ").slice(0, 16) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Actual Departure</span><div>{liveTrip.actualDeparture ? liveTrip.actualDeparture.replace("T", " ").slice(0, 16) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Planned Arrival</span><div>{liveTrip.plannedArrival ? liveTrip.plannedArrival.replace("T", " ").slice(0, 16) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Actual Arrival</span><div>{liveTrip.actualArrival ? liveTrip.actualArrival.replace("T", " ").slice(0, 16) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Opening Odometer</span><div>{liveTrip.openingOdometer ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Closing Odometer</span><div>{liveTrip.closingOdometer ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Distance</span><div>{liveTrip.distance ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Lifecycle</span><div style={{ display: "flex", alignItems: "center", gap: 10 }}><StatusBadge status={tripLifecycleBadge(liveTrip.status)} /><span>{liveTrip.status}</span></div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Route</span><div>{liveTrip.routeName}</div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Route Description</span><div>{liveTrip.routeDescription ?? "-"}</div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Delivery Remarks</span><div>{liveTrip.deliveryRemarks ?? "-"}</div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Operational Remarks</span><div>{liveTrip.remarks ?? "-"}</div></div>
        </div>
      </FormCard>

      <FormCard title="Commercial Reconciliation" variant="teal-header">
        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${
              liveTrip.reconciliationStatus === "CLEAR"
                ? "#86efac"
                : liveTrip.reconciliationStatus === "VARIANCE"
                  ? "#fda29b"
                  : "#facc15"
            }`,
            background:
              liveTrip.reconciliationStatus === "CLEAR"
                ? "#ecfdf3"
                : liveTrip.reconciliationStatus === "VARIANCE"
                  ? "#fef3f2"
                  : "#fffaeb",
          }}
        >
          <div style={{ fontWeight: 700, color: reconciliationColor(liveTrip.reconciliationStatus) }}>
            {liveTrip.reconciliationStatus === "CLEAR"
              ? "Reconciliation clear"
              : liveTrip.reconciliationStatus === "VARIANCE"
                ? "Commercial variance detected"
                : "Trip still partially reconciled"}
          </div>
          <div style={{ marginTop: 6, color: colors.text.secondary, lineHeight: "22px" }}>{reconciliationMessage}</div>
          {message ? <div style={{ marginTop: 8, color: colors.text.secondary }}>{message}</div> : null}
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/reports/sales/loading-orders?tripId=${liveTrip.id}`} style={listActionButtonStyle} title="Open loading report" aria-label="Open loading report"><Eye size={16} /></Link>
            <Link href={`/reports/sales/truck-sales?tripId=${liveTrip.id}`} style={listActionButtonStyle} title="Open truck sales report" aria-label="Open truck sales report"><Truck size={16} /></Link>
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Explain the variance, shortage, over-delivery, or operational exception."
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={isPending} style={listActionButtonStyle} onClick={() => applyReconciliation("MARK_VARIANCE_EXPLAINED")} title="Mark variance explained" aria-label="Mark variance explained"><CheckCircle2 size={16} /></button>
              <button type="button" disabled={isPending} style={dangerActionButtonStyle} onClick={() => applyReconciliation("MARK_SHORTAGE")} title="Mark shortage" aria-label="Mark shortage"><Undo2 size={16} /></button>
              <button type="button" disabled={isPending} style={dangerActionButtonStyle} onClick={() => applyReconciliation("MARK_OVER_DELIVERY")} title="Mark over delivery" aria-label="Mark over delivery"><Send size={16} /></button>
              <button type="button" disabled={isPending} style={successActionButtonStyle} onClick={() => applyReconciliation("CLOSE_WITH_EXCEPTION")} title="Close with exception" aria-label="Close with exception"><Ban size={16} /></button>
            </div>
          </div>
        </div>
        <div style={fieldGridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Loading Documents</span><div>{liveTrip.loadingCount ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Dispatch Documents</span><div>{liveTrip.dispatchCount ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Sales Documents</span><div>{liveTrip.saleCount ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Fuel Records</span><div>{liveTrip.fuelRecordCount ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Loaded Quantity</span><div>{liveTrip.loadingQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Dispatched Quantity</span><div>{liveTrip.dispatchQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Sold Quantity</span><div>{liveTrip.soldQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Sold Amount</span><div>{Number(liveTrip.soldAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Expected Collection</span><div>{Number(liveTrip.expectedCollection ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Actual Collection</span><div>{Number(liveTrip.actualCollection ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Credit Sales</span><div>{Number(liveTrip.creditSales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Payment Variance</span><div style={{ color: Math.abs(Number(liveTrip.paymentVariance ?? 0)) > 0.01 ? colors.danger[700] : colors.success[700], fontWeight: 700 }}>{Number(liveTrip.paymentVariance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Fuel Quantity</span><div>{liveTrip.fuelQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Fuel Cost</span><div>{Number(liveTrip.fuelCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Undispatched Qty</span><div>{liveTrip.undispatchedQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Unsold Qty</span><div>{liveTrip.unsoldQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Over-Dispatch Qty</span><div>{liveTrip.overDispatchedQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Over-Sold Qty</span><div>{liveTrip.overSoldQuantity ?? 0}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Dispatch Completion</span><div>{Number(liveTrip.dispatchCompletionPercent ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Sales Completion</span><div>{Number(liveTrip.salesCompletionPercent ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Fuel Cost / Km</span><div>{liveTrip.fuelCostPerKm != null ? Number(liveTrip.fuelCostPerKm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Fuel Cost / Sold Unit</span><div>{liveTrip.fuelCostPerSoldUnit != null ? Number(liveTrip.fuelCostPerSoldUnit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Reconciliation Status</span><div style={{ color: reconciliationColor(liveTrip.reconciliationStatus), fontWeight: 700 }}>{liveTrip.reconciliationStatus ?? "PENDING"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Decision</span><div>{liveTrip.reconciliationDecision ?? "-"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Reconciled At</span><div>{liveTrip.reconciledAt ? liveTrip.reconciledAt.replace("T", " ").slice(0, 16) : "-"}</div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Decision Note</span><div>{liveTrip.reconciliationNote ?? "-"}</div></div>
        </div>
      </FormCard>

      <FormCard title="Fuel Records" variant="teal-header">
        {fuelRecords.length === 0 ? (
          <EmptyState title="No fuel records for this trip" message="Posted or draft fuel entries linked to this trip will appear here for reconciliation." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Fuel No", "Date", "Vehicle", "Driver", "Location", "Type", "Qty", "Unit Price", "Total", "Status"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fuelRecords.map((record) => (
                  <tr key={record.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{record.fuelNo}</td>
                    <td style={{ padding: "14px 10px" }}>{record.fuelDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 10px" }}>{record.vehicleLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{record.driverLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{record.locationLabel ?? "-"}</td>
                    <td style={{ padding: "14px 10px" }}>{record.fuelType}</td>
                    <td style={{ padding: "14px 10px" }}>{record.quantity}</td>
                    <td style={{ padding: "14px 10px" }}>{record.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "14px 10px" }}>{record.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={record.status === "POSTED" ? "posted" : record.status === "CANCELLED" ? "rejected" : "draft"} /></td>
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
