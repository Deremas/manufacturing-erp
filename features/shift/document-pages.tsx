"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { ActionButtons, DataTable, FormattedNumberInput, LineItemsGrid, LineItemsGridRow, PageHeader, RemarksWithRemoveCell, SectionHeading } from "@/components/shared";
import type { Action, Breadcrumb, Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

type Option = { value: string; label: string };
type ShiftOption = { code: string; name: string };
type ItemOption = Option & {
  itemCode?: string;
  itemName?: string;
  uomId?: string | null;
  uomName?: string | null;
  standardCost?: number;
};
type BomOption = {
  value: string;
  label: string;
  finishedGoodId?: string;
  outputQty?: number;
};

type AttendanceRow = {
  userId: string;
  displayName: string;
  role: string;
  present: boolean;
  remarks: string;
};

export type ShiftPersonOption = {
  key: string;
  userId: string;
  name: string;
  role: string;
  kind: "Employee" | "User";
};

type IssueRow = {
  itemId: string;
  uomName: string;
  availableQty: number;
  suggestedQty: number;
  issuedQty: number;
  unitCost: number;
  sourceLotNo: string;
  supplierBatchNo: string;
  serialNo: string;
  expiryDate: string;
  remarks: string;
};

type ReturnRow = {
  itemId: string;
  uomName: string;
  returnedQty: number;
  condition: string;
  unitCost: number;
  remarks: string;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const readOnlyStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: colors.secondary[50],
  color: colors.text.secondary,
};

const addRowWrapStyle: React.CSSProperties = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
};

const itemGridScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const shiftIssueLineGridTemplate =
  "minmax(200px, 1.2fr) 80px 80px 80px 88px 96px 112px 112px 112px 128px 40px";

const shiftReturnLineGridTemplate =
  "minmax(200px, 1.4fr) 80px 96px 120px 96px 40px";

const itemGridHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  alignItems: "center",
  marginBottom: "10px",
  padding: "0 4px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: colors.primary[600],
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};

const removeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${colors.danger[200]}`,
  backgroundColor: colors.danger[50],
  color: colors.danger[700],
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  justifySelf: "center",
};

const ghostButtonStyle: React.CSSProperties = {
  borderRadius: radius.components.input,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  padding: "10px 14px",
  fontSize: typography.sizes.small.fontSize,
  fontWeight: 600,
  cursor: "pointer",
};

function PersonPicker({
  people,
  userId,
  displayName,
  onSelect,
  onManual,
}: {
  people: ShiftPersonOption[];
  userId: string;
  displayName: string;
  onSelect: (person: ShiftPersonOption) => void;
  onManual: (name: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState({ top: 0, left: 0, width: 280 });

  function placeMenu() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 320);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setBox({ top: rect.bottom + 4, left, width });
  }

  function openList() {
    setQuery("");
    placeMenu();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function reposition() {
      placeMenu();
    }
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = people
    .filter((person) => !needle || `${person.name} ${person.role} ${person.kind}`.toLowerCase().includes(needle))
    .slice(0, 12);
  const exact = people.some((person) => person.name.toLowerCase() === needle);

  const menu = open ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        zIndex: 80,
        top: box.top,
        left: box.left,
        width: box.width,
        maxHeight: 280,
        overflowY: "auto",
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
      }}
    >
      {matches.map((person) => (
        <button
          key={person.key}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(person);
            setQuery("");
            setOpen(false);
          }}
          style={{
            display: "flex",
            width: "100%",
            gap: 8,
            padding: "10px 12px",
            border: "none",
            background: userId && person.userId === userId ? "#f0fdfa" : "transparent",
            cursor: "pointer",
            textAlign: "left",
            alignItems: "center",
          }}
        >
          <span style={{ flex: 1, fontWeight: 600 }}>{person.name}</span>
          <span style={{ color: colors.text.secondary, fontSize: 12 }}>{person.role || person.kind}</span>
        </button>
      ))}
      {needle && !exact ? (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onManual(query.trim());
            setOpen(false);
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 12px",
            border: "none",
            borderTop: `1px solid ${colors.border}`,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            color: colors.primary[700],
            fontWeight: 600,
          }}
        >
          Use &quot;{query.trim()}&quot;
        </button>
      ) : null}
      {matches.length === 0 && !needle ? (
        <div style={{ padding: 12, color: colors.text.secondary, fontSize: 13 }}>No employees or users yet. Type a name to add them.</div>
      ) : null}
      {matches.length === 0 && needle ? (
        <div style={{ padding: "10px 12px", color: colors.text.secondary, fontSize: 13 }}>No matching employee or user.</div>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        style={{ ...inputStyle, paddingRight: 36 }}
        value={open ? query : displayName}
        placeholder={open ? "Search employees and users" : "Select or type a name"}
        onFocus={openList}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (!open) openList();
          onManual(next);
        }}
      />
      <button
        type="button"
        aria-label="Open employee and user list"
        onMouseDown={(event) => {
          event.preventDefault();
          if (open) setOpen(false);
          else {
            openList();
            inputRef.current?.focus();
          }
        }}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 34,
          height: 34,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: colors.text.secondary,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        ▾
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

function getItemOption(items: ItemOption[], itemId: string) {
  return items.find((item) => item.value === itemId);
}

function totalsFromRows<T extends { issuedQty?: number; returnedQty?: number }>(rows: T[]) {
  return rows.reduce((sum, row) => sum + Number(row.issuedQty ?? row.returnedQty ?? 0), 0);
}

async function getJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "Request failed");
  }
  return result as T;
}

export function ShiftSessionEditor({
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  people,
  locations,
  shifts,
  initialValue,
  apiMethod = "POST",
  submitLabel = "Start Shift",
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  people: ShiftPersonOption[];
  locations: Option[];
  shifts: ShiftOption[];
  initialValue: {
    productionDate: string;
    shiftCode: string;
    locationId: string;
    remarks: string;
    attendance: Array<Omit<AttendanceRow, "displayName"> & { displayName?: string }>;
  };
  apiMethod?: "POST" | "PUT";
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ productionDate?: string; shiftCode?: string; locationId?: string }>({});
  const [header, setHeader] = useState(initialValue);
  const [attendance, setAttendance] = useState<AttendanceRow[]>(
    initialValue.attendance.length
      ? initialValue.attendance.map((row) => ({ ...row, displayName: row.displayName ?? "" }))
      : [{ userId: "", displayName: "", role: "", present: true, remarks: "" }],
  );

  function updateAttendance(index: number, key: keyof AttendanceRow, value: string | boolean) {
    setAttendance((current) =>
      current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row),
    );
  }

  function addAttendance() {
    setAttendance((current) => [...current, { userId: "", displayName: "", role: "", present: true, remarks: "" }]);
  }

  function removeAttendance(index: number) {
    setAttendance((current) => blankOrRemoveRow(current, index, { userId: "", displayName: "", role: "", present: true, remarks: "" }));
  }

  function assignPerson(index: number, person: ShiftPersonOption) {
    setAttendance((current) =>
      current.map((row, rowIndex) => rowIndex === index
        ? { ...row, userId: person.userId, displayName: person.name, role: row.role || person.role }
        : row),
    );
  }

  function assignManual(index: number, name: string) {
    setAttendance((current) =>
      current.map((row, rowIndex) => rowIndex === index ? { ...row, userId: "", displayName: name } : row),
    );
  }

  function save() {
    const nextErrors = {
      productionDate: header.productionDate ? undefined : "Production date is required.",
      shiftCode: header.shiftCode ? undefined : "Shift is required.",
      locationId: header.locationId ? undefined : "Production location is required.",
    };
    setFieldErrors(nextErrors);
    if (nextErrors.productionDate || nextErrors.shiftCode || nextErrors.locationId) {
      setMessage("Fill the required session fields.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const response = await fetch(apiBasePath, {
        method: apiMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, attendance }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save shift session");
        return;
      }
      router.push(`${successHref}/${result.publicId ?? result.id}`);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <div style={cardStyle}>
        <SectionHeading title="Session Details" />
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Date <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="date" style={{ ...inputStyle, borderColor: fieldErrors.productionDate ? "#dc2626" : undefined }} value={header.productionDate} onChange={(event) => { setFieldErrors((current) => ({ ...current, productionDate: undefined })); setHeader((current) => ({ ...current, productionDate: event.target.value })); }} />
            {fieldErrors.productionDate ? <span style={{ color: "#dc2626", fontSize: 12 }}>{fieldErrors.productionDate}</span> : null}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Shift <span style={{ color: "#dc2626" }}>*</span></label>
            <select style={{ ...inputStyle, borderColor: fieldErrors.shiftCode ? "#dc2626" : undefined }} value={header.shiftCode} onChange={(event) => { setFieldErrors((current) => ({ ...current, shiftCode: undefined })); setHeader((current) => ({ ...current, shiftCode: event.target.value })); }}>
              <option value="">Select ...</option>
              {shifts.map((shift) => <option key={shift.code} value={shift.code}>{shift.name} ({shift.code})</option>)}
            </select>
            {fieldErrors.shiftCode ? <span style={{ color: "#dc2626", fontSize: 12 }}>{fieldErrors.shiftCode}</span> : null}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Location <span style={{ color: "#dc2626" }}>*</span></label>
            <select style={{ ...inputStyle, borderColor: fieldErrors.locationId ? "#dc2626" : undefined }} value={header.locationId} onChange={(event) => { setFieldErrors((current) => ({ ...current, locationId: undefined })); setHeader((current) => ({ ...current, locationId: event.target.value })); }}>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
            {fieldErrors.locationId ? <span style={{ color: "#dc2626", fontSize: 12 }}>{fieldErrors.locationId}</span> : null}
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Assigned Staff" />
        <p style={{ margin: "0 0 12px", color: colors.text.secondary, fontSize: 13 }}>Optional. Search employees and users, type a name that is not in the lists, or clear a row with X.</p>
        <LineItemsGrid
          template="280px 140px 40px"
          headers={["Employee / User", "Role", ""]}
          minWidth={760}
          scroll={false}
        >
            {attendance.map((row, index) => (
              <LineItemsGridRow key={index}>
                <PersonPicker
                  people={people}
                  userId={row.userId}
                  displayName={row.displayName}
                  onSelect={(person) => assignPerson(index, person)}
                  onManual={(name) => assignManual(index, name)}
                />
                <input style={inputStyle} value={row.role} onChange={(event) => updateAttendance(index, "role", event.target.value)} placeholder="Supervisor" />
                <RemarksWithRemoveCell
                  value={row.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  placeholder="Notes"
                  onChange={(next) => updateAttendance(index, "remarks", next)}
                  onRemove={() => removeAttendance(index)}
                  removeAriaLabel={attendance.length > 1 ? `Remove assigned person ${index + 1}` : "Clear assigned person"}
                />
              </LineItemsGridRow>
            ))}
        </LineItemsGrid>
        <div style={addRowWrapStyle}>
          <button type="button" style={addButtonStyle} onClick={addAttendance}>+ Add Person</button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: submitLabel, variant: "primary", onClick: save, loading: isPending },
          ]}
        />
      </div>
    </div>
  );
}

export function ProductionMaterialIssueEditor({
  sessionNo,
  productionLocationId,
  productionLocationName,
  apiBasePath,
  cancelHref,
  storeLocations,
  finishedGoods,
  components,
  boms,
}: {
  sessionNo: string;
  productionLocationId: string;
  productionLocationName: string;
  apiBasePath: string;
  cancelHref: string;
  storeLocations: Option[];
  finishedGoods: ItemOption[];
  components: ItemOption[];
  boms: BomOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    issueDate: new Date().toISOString().slice(0, 10),
    storeLocationId: "",
    bomId: "",
    finishedGoodId: "",
    remarks: "",
  });
  const [rows, setRows] = useState<IssueRow[]>([
    { itemId: "", uomName: "", availableQty: 0, suggestedQty: 0, issuedQty: 0, unitCost: 0, sourceLotNo: "", supplierBatchNo: "", serialNo: "", expiryDate: "", remarks: "" },
  ]);

  async function syncRowFromStock(index: number, itemId: string, storeLocationId: string) {
    const option = getItemOption(components, itemId);
    setRows((current) =>
      current.map((row, rowIndex) => rowIndex === index ? {
        ...row,
        itemId,
        uomName: option?.uomName ?? "",
        unitCost: Number(option?.standardCost ?? 0),
      } : row),
    );

    if (!itemId || !storeLocationId) return;

    try {
      const snapshot = await getJson<{ availableQuantity: number; averageCost: number; uomName: string | null }>(`/api/inventory/stock-snapshot?itemId=${encodeURIComponent(itemId)}&locationId=${encodeURIComponent(storeLocationId)}`);
      setRows((current) =>
        current.map((row, rowIndex) => rowIndex === index ? {
          ...row,
          availableQty: Number(snapshot.availableQuantity ?? 0),
          unitCost: Number(snapshot.averageCost ?? row.unitCost ?? 0),
          uomName: snapshot.uomName ?? row.uomName,
        } : row),
      );
    } catch {
      // Leave default UOM and cost guidance when no snapshot exists yet.
    }
  }

  function updateRow(index: number, patch: Partial<IssueRow>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    setRows((current) => [...current, { itemId: "", uomName: "", availableQty: 0, suggestedQty: 0, issuedQty: 0, unitCost: 0, sourceLotNo: "", supplierBatchNo: "", serialNo: "", expiryDate: "", remarks: "" }]);
  }

  function removeRow(index: number) {
    setRows((current) => blankOrRemoveRow(current, index, { itemId: "", uomName: "", availableQty: 0, suggestedQty: 0, issuedQty: 0, unitCost: 0, sourceLotNo: "", supplierBatchNo: "", serialNo: "", expiryDate: "", remarks: "" }));
  }

  async function loadBomComponents() {
    if (!header.bomId) return;
    setMessage("");
    try {
      const bom = await getJson<{ items: Array<{ componentItemId: string; quantity: number; uomName: string | null }> }>(`/api/production/bom/${header.bomId}`);
      const nextRows = await Promise.all(
        bom.items.map(async (item) => {
          const option = getItemOption(components, item.componentItemId);
          let availableQty = 0;
          let unitCost = Number(option?.standardCost ?? 0);
          if (header.storeLocationId) {
            try {
              const snapshot = await getJson<{ availableQuantity: number; averageCost: number; uomName: string | null }>(`/api/inventory/stock-snapshot?itemId=${encodeURIComponent(item.componentItemId)}&locationId=${encodeURIComponent(header.storeLocationId)}`);
              availableQty = Number(snapshot.availableQuantity ?? 0);
              unitCost = Number(snapshot.averageCost ?? unitCost);
            } catch {
              // Keep fallback values.
            }
          }
          return {
            itemId: item.componentItemId,
            uomName: option?.uomName ?? item.uomName ?? "",
            availableQty,
            suggestedQty: Number(item.quantity ?? 0),
            issuedQty: Number(item.quantity ?? 0),
            unitCost,
            sourceLotNo: "",
            supplierBatchNo: "",
            serialNo: "",
            expiryDate: "",
            remarks: "",
          };
        }),
      );
      setRows(nextRows.length ? nextRows : rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load BOM components");
    }
  }

  function save(action: "draft" | "post") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          storeLocationId: header.storeLocationId,
          productionLocationId,
          remarks: header.remarks,
          items: rows,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save material issue");
        return;
      }
      router.push(result.redirectTo ?? cancelHref);
    });
  }

  const totalQty = useMemo(() => totalsFromRows(rows), [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Issue Materials"
        subtitle="Issue raw, packaging, and consumable stock from store into the active production shift."
        breadcrumbs={[
          { label: "Shifts", href: "/shifts" },
          { label: "Shift Sessions", href: "/production/shift-sessions" },
          { label: sessionNo, href: cancelHref },
          { label: "Issue Materials" },
        ]}
      />

      <div style={cardStyle}>
        <SectionHeading title="Issue Details" />
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Issue Date</label>
            <input type="date" style={inputStyle} value={header.issueDate} onChange={(event) => setHeader((current) => ({ ...current, issueDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Shift Session</label>
            <input style={readOnlyStyle} value={sessionNo} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Store Location</label>
            <select style={inputStyle} value={header.storeLocationId} onChange={(event) => setHeader((current) => ({ ...current, storeLocationId: event.target.value }))}>
              <option value="">Select ...</option>
              {storeLocations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Location</label>
            <input style={readOnlyStyle} value={productionLocationName} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Finished Good</label>
            <select style={inputStyle} value={header.finishedGoodId} onChange={(event) => setHeader((current) => ({ ...current, finishedGoodId: event.target.value }))}>
              <option value="">Optional finished good</option>
              {finishedGoods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>BOM</label>
            <select style={inputStyle} value={header.bomId} onChange={(event) => setHeader((current) => ({ ...current, bomId: event.target.value }))}>
              <option value="">Optional BOM</option>
              {boms
                .filter((bom) => !header.finishedGoodId || bom.finishedGoodId === header.finishedGoodId)
                .map((bom) => <option key={bom.value} value={bom.value}>{bom.label}</option>)}
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Items" />
        <LineItemsGrid
          template={shiftIssueLineGridTemplate}
          headers={["Item", "UOM", "Available", "Suggested", "Issue Qty", "Unit Cost", "Source Lot", "Supplier Batch", "Serial", "Expiry", ""]}
          minWidth={1900}
        >
            {rows.map((row, index) => (
              <LineItemsGridRow key={`${row.itemId}-${index}`}>
                <select style={inputStyle} value={row.itemId} onChange={(event) => void syncRowFromStock(index, event.target.value, header.storeLocationId)}>
                  <option value="">Select ...</option>
                  {components.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input style={readOnlyStyle} value={row.uomName || "UOM"} readOnly />
                <input style={readOnlyStyle} value={row.availableQty} readOnly />
                <input style={readOnlyStyle} value={row.suggestedQty} readOnly />
                <FormattedNumberInput style={inputStyle} decimals={0} value={row.issuedQty} onChange={(nextValue) => updateRow(index, { issuedQty: nextValue })} />
                <input type="number" min={0} step="0.01" style={inputStyle} value={row.unitCost} onChange={(event) => updateRow(index, { unitCost: Number(event.target.value) })} />
                <input style={inputStyle} value={row.sourceLotNo} onChange={(event) => updateRow(index, { sourceLotNo: event.target.value })} placeholder="Source lot" />
                <input style={inputStyle} value={row.supplierBatchNo} onChange={(event) => updateRow(index, { supplierBatchNo: event.target.value })} placeholder="Supplier batch" />
                <input style={inputStyle} value={row.serialNo} onChange={(event) => updateRow(index, { serialNo: event.target.value })} placeholder="Serial no." />
                <input type="date" style={inputStyle} value={row.expiryDate} onChange={(event) => updateRow(index, { expiryDate: event.target.value })} />
                <RemarksWithRemoveCell
                  value={row.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  placeholder="Issue remarks"
                  onChange={(next) => updateRow(index, { remarks: next })}
                  onRemove={() => removeRow(index)}
                  removeAriaLabel={`Remove issue item row ${index + 1}`}
                />
              </LineItemsGridRow>
            ))}
        </LineItemsGrid>
        <div style={addRowWrapStyle}>
          <button type="button" style={addButtonStyle} onClick={addRow}>+ Add Item</button>
          <button type="button" style={ghostButtonStyle} onClick={loadBomComponents}>Load BOM Components</button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
          Total issue quantity: <strong style={{ color: colors.text.primary }}>{totalQty}</strong>
        </div>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Draft", variant: "secondary", onClick: () => save("draft"), disabled: isPending },
            { label: "Post Issue", variant: "primary", onClick: () => save("post"), loading: isPending },
          ]}
        />
      </div>
    </div>
  );
}

export function ProductionMaterialReturnEditor({
  sessionNo,
  productionLocationId,
  productionLocationName,
  apiBasePath,
  cancelHref,
  storeLocations,
  components,
}: {
  sessionNo: string;
  productionLocationId: string;
  productionLocationName: string;
  apiBasePath: string;
  cancelHref: string;
  storeLocations: Option[];
  components: ItemOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    returnDate: new Date().toISOString().slice(0, 10),
    toStoreLocationId: "",
    reason: "",
    remarks: "",
  });
  const [rows, setRows] = useState<ReturnRow[]>([
    { itemId: "", uomName: "", returnedQty: 0, condition: "GOOD", unitCost: 0, remarks: "" },
  ]);

  function updateRow(index: number, patch: Partial<ReturnRow>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    setRows((current) => [...current, { itemId: "", uomName: "", returnedQty: 0, condition: "GOOD", unitCost: 0, remarks: "" }]);
  }

  function removeRow(index: number) {
    setRows((current) => blankOrRemoveRow(current, index, { itemId: "", uomName: "", returnedQty: 0, condition: "GOOD", unitCost: 0, remarks: "" }));
  }

  function syncRow(index: number, itemId: string) {
    const option = getItemOption(components, itemId);
    updateRow(index, {
      itemId,
      uomName: option?.uomName ?? "",
      unitCost: Number(option?.standardCost ?? 0),
    });
  }

  function save(action: "draft" | "post") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          fromLocationId: productionLocationId,
          toStoreLocationId: header.toStoreLocationId,
          remarks: [header.reason, header.remarks].filter(Boolean).join(" | "),
          items: rows,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save material return");
        return;
      }
      router.push(result.redirectTo ?? cancelHref);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Return Materials"
        subtitle="Return unused material from production back to store through the inventory posting flow."
        breadcrumbs={[
          { label: "Shifts", href: "/shifts" },
          { label: "Shift Sessions", href: "/production/shift-sessions" },
          { label: sessionNo, href: cancelHref },
          { label: "Return Materials" },
        ]}
      />

      <div style={cardStyle}>
        <SectionHeading title="Return Details" />
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return Date</label>
            <input type="date" style={inputStyle} value={header.returnDate} onChange={(event) => setHeader((current) => ({ ...current, returnDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Shift Session</label>
            <input style={readOnlyStyle} value={sessionNo} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>From Production Location</label>
            <input style={readOnlyStyle} value={productionLocationName} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>To Store Location</label>
            <select style={inputStyle} value={header.toStoreLocationId} onChange={(event) => setHeader((current) => ({ ...current, toStoreLocationId: event.target.value }))}>
              <option value="">Select ...</option>
              {storeLocations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Reason</label>
            <input style={inputStyle} value={header.reason} onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))} placeholder="Unused, excess, damaged..." />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Items" />
        <LineItemsGrid
          template={shiftReturnLineGridTemplate}
          headers={["Item", "UOM", "Return Qty", "Condition", "Unit Cost", ""]}
          minWidth={1120}
        >
            {rows.map((row, index) => (
              <LineItemsGridRow key={`${row.itemId}-${index}`}>
                <select style={inputStyle} value={row.itemId} onChange={(event) => syncRow(index, event.target.value)}>
                  <option value="">Select ...</option>
                  {components.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <input style={readOnlyStyle} value={row.uomName || "UOM"} readOnly />
                <FormattedNumberInput style={inputStyle} decimals={0} value={row.returnedQty} onChange={(nextValue) => updateRow(index, { returnedQty: nextValue })} />
                <select style={inputStyle} value={row.condition} onChange={(event) => updateRow(index, { condition: event.target.value })}>
                  <option value="GOOD">Good</option>
                  <option value="EXCESS">Excess</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="EXPIRED">Expired</option>
                </select>
                <input type="number" min={0} step="0.01" style={inputStyle} value={row.unitCost} onChange={(event) => updateRow(index, { unitCost: Number(event.target.value) })} />
                <RemarksWithRemoveCell
                  value={row.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  placeholder="Return remarks"
                  onChange={(next) => updateRow(index, { remarks: next })}
                  onRemove={() => removeRow(index)}
                  removeAriaLabel={`Remove return item row ${index + 1}`}
                />
              </LineItemsGridRow>
            ))}
        </LineItemsGrid>
        <div style={addRowWrapStyle}>
          <button type="button" style={addButtonStyle} onClick={addRow}>+ Add Item</button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Draft", variant: "secondary", onClick: () => save("draft"), disabled: isPending },
            { label: "Post Return", variant: "primary", onClick: () => save("post"), loading: isPending },
          ]}
        />
      </div>
    </div>
  );
}

export function ProductionOutputEditor({
  sessionNo,
  productionLocationName,
  apiBasePath,
  cancelHref,
  finishedGoods,
  boms,
  storeLocations,
  machines,
  productionStages,
}: {
  sessionNo: string;
  productionLocationName: string;
  apiBasePath: string;
  cancelHref: string;
  finishedGoods: ItemOption[];
  boms: BomOption[];
  storeLocations: Option[];
  machines: Option[];
  productionStages: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    finishedGoodId: "",
    bomId: "",
    locationId: "",
    qcHoldLocationId: "",
    productionStageId: "",
    machineId: "",
    producedQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    wastageQty: 0,
    qcRequired: true,
    remarks: "",
  });

  function save(action: "draft" | "post" | "submit-qc") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...header }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save production output");
        return;
      }
      router.push(result.redirectTo ?? cancelHref);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Record Output"
        subtitle="Capture finished goods output from the active shift and either post to inventory or hand off into QC."
        breadcrumbs={[
          { label: "Shifts", href: "/shifts" },
          { label: "Shift Sessions", href: "/production/shift-sessions" },
          { label: sessionNo, href: cancelHref },
          { label: "Record Output" },
        ]}
      />

      <div style={cardStyle}>
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Shift Session</label>
            <input style={readOnlyStyle} value={sessionNo} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Location</label>
            <input style={readOnlyStyle} value={productionLocationName} readOnly />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Finished Good</label>
            <select style={inputStyle} value={header.finishedGoodId} onChange={(event) => setHeader((current) => ({ ...current, finishedGoodId: event.target.value }))}>
              <option value="">Select ...</option>
              {finishedGoods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>BOM</label>
            <select style={inputStyle} value={header.bomId} onChange={(event) => setHeader((current) => ({ ...current, bomId: event.target.value }))}>
              <option value="">Optional BOM</option>
              {boms
                .filter((bom) => !header.finishedGoodId || bom.finishedGoodId === header.finishedGoodId)
                .map((bom) => <option key={bom.value} value={bom.value}>{bom.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Output Location</label>
            <select style={inputStyle} value={header.locationId} onChange={(event) => setHeader((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">Select ...</option>
              {storeLocations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          {header.qcRequired ? (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Production Stage</label>
                <select style={inputStyle} value={header.productionStageId} onChange={(event) => setHeader((current) => ({ ...current, productionStageId: event.target.value }))}>
                  <option value="">Select ...</option>
                  {productionStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>QC Hold Location</label>
                <select style={inputStyle} value={header.qcHoldLocationId} onChange={(event) => setHeader((current) => ({ ...current, qcHoldLocationId: event.target.value }))}>
                  <option value="">Select ...</option>
                  {storeLocations.filter((location) => location.value !== header.locationId).map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
                </select>
              </div>
            </>
          ) : null}
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Machine</label>
            <select style={inputStyle} value={header.machineId} onChange={(event) => setHeader((current) => ({ ...current, machineId: event.target.value }))}>
              <option value="">No machine-specific output</option>
              {machines.map((machine) => <option key={machine.value} value={machine.value}>{machine.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Produced Qty</label>
            <FormattedNumberInput style={inputStyle} decimals={0} value={header.producedQty} onChange={(nextValue) => setHeader((current) => ({ ...current, producedQty: nextValue }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Accepted Qty</label>
            <FormattedNumberInput style={inputStyle} decimals={0} value={header.acceptedQty} onChange={(nextValue) => setHeader((current) => ({ ...current, acceptedQty: nextValue }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Rejected Qty</label>
            <FormattedNumberInput style={inputStyle} decimals={0} value={header.rejectedQty} onChange={(nextValue) => setHeader((current) => ({ ...current, rejectedQty: nextValue }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Wastage Qty</label>
            <FormattedNumberInput style={inputStyle} decimals={0} value={header.wastageQty} onChange={(nextValue) => setHeader((current) => ({ ...current, wastageQty: nextValue }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>QC Required</label>
            <label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={header.qcRequired} onChange={(event) => setHeader((current) => ({ ...current, qcRequired: event.target.checked }))} />
              Route output into QC before release
            </label>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Draft", variant: "secondary", onClick: () => save("draft"), disabled: isPending },
            { label: "Submit to QC", variant: "secondary", onClick: () => save("submit-qc"), disabled: isPending || !header.qcRequired },
            { label: "Post Output", variant: "primary", onClick: () => save("post"), loading: isPending, disabled: header.qcRequired },
          ]}
        />
      </div>
    </div>
  );
}

export function DowntimeEditor({
  sessionNo,
  apiBasePath,
  cancelHref,
  assets,
  batches,
}: {
  sessionNo: string;
  apiBasePath: string;
  cancelHref: string;
  assets: Array<{ id: string; assetCode: string; assetName: string; status: string }>;
  batches: Array<{ id: string; batchNo: string; status: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    startTime: "",
    endTime: "",
    reason: "MACHINE_BREAKDOWN",
    assetId: "",
    productionBatchId: "",
    maintenanceRequired: true,
    remarks: "",
  });

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to record downtime");
        return;
      }
      router.push(result.redirectTo ?? cancelHref);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Add Downtime"
        subtitle="Record production stoppages for reporting and efficiency tracking."
        breadcrumbs={[
          { label: "Shifts", href: "/shifts" },
          { label: "Shift Sessions", href: "/production/shift-sessions" },
          { label: sessionNo, href: cancelHref },
          { label: "Downtime" },
        ]}
      />

      <div style={cardStyle}>
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Start Time</label>
            <input type="datetime-local" style={inputStyle} value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>End Time</label>
            <input type="datetime-local" style={inputStyle} value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Reason</label>
            <select style={inputStyle} value={form.reason} onChange={(event) => {
              const reason = event.target.value;
              setForm((current) => ({
                ...current,
                reason,
                maintenanceRequired: reason === "MACHINE_BREAKDOWN" || reason === "MAINTENANCE",
              }));
            }}>
              <option value="MACHINE_BREAKDOWN">Machine Breakdown</option>
              <option value="POWER_INTERRUPTION">Power Interruption</option>
              <option value="MATERIAL_SHORTAGE">Material Shortage</option>
              <option value="QUALITY_ISSUE">Quality Issue</option>
              <option value="OPERATOR_DELAY">Operator Delay</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Batch</label>
            <select style={inputStyle} value={form.productionBatchId} onChange={(event) => setForm((current) => ({ ...current, productionBatchId: event.target.value }))}>
              <option value="">No batch-specific downtime</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNo} - {batch.status}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Asset</label>
            <select style={inputStyle} value={form.assetId} onChange={(event) => setForm((current) => ({ ...current, assetId: event.target.value }))}>
              <option value="">{form.reason === "MACHINE_BREAKDOWN" ? "Select ..." : "No machine-specific asset"}</option>
              {assets.filter((asset) => !["UNDER_MAINTENANCE", "OUT_OF_SERVICE", "IN_TRANSIT", "RETIRED", "DISPOSED"].includes(asset.status)).map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.assetName}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Maintenance Required</label>
            <label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.maintenanceRequired}
                onChange={(event) => setForm((current) => ({ ...current, maintenanceRequired: event.target.checked }))}
              />
              Generate a linked maintenance ticket
            </label>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Downtime", variant: "primary", onClick: save, loading: isPending },
          ]}
        />
      </div>
    </div>
  );
}

export function ShiftSessionDetailPage({
  session,
}: {
  session: NonNullable<Awaited<ReturnType<typeof import("@/services/shift/shift-session.service").getShiftSessionById>>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function endShift() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/shifts/sessions/${session.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to end shift");
        return;
      }
      router.refresh();
    });
  }

  const summaryRows = [
    { label: "Session No", value: session.sessionNo },
    { label: "Production Date", value: new Date(session.productionDate).toLocaleDateString("en-KE") },
    { label: "Shift", value: session.shiftCode },
    { label: "Location", value: session.locationName },
    { label: "Status", value: session.status },
    { label: "Started By", value: session.startedByName ?? "-" },
    { label: "Started At", value: session.startedAt ? new Date(session.startedAt).toLocaleString("en-KE") : "-" },
    { label: "Ended By", value: session.endedByName ?? "-" },
    { label: "Ended At", value: session.endedAt ? new Date(session.endedAt).toLocaleString("en-KE") : "-" },
    { label: "Remarks", value: session.remarks ?? "-" },
  ];

  const summaryColumns: Column<(typeof summaryRows)[number]>[] = [
    { key: "label", label: "Field" },
    { key: "value", label: "Value" },
  ];

  const attendanceColumns: Column<(typeof session.attendance)[number]>[] = [
    { key: "userName", label: "Name" },
    { key: "role", label: "Role" },
    { key: "remarks", label: "Notes" },
  ];

  const relatedColumns: Column<Array<{ number: string; status: string; itemCount: number }>[number]>[] = [
    { key: "number", label: "Document No" },
    { key: "status", label: "Status" },
    { key: "itemCount", label: "Items" },
  ];

  const actions: Action[] = [
    ...(session.status === "ACTIVE"
      ? [
          { label: "Edit Shift", variant: "secondary" as const, onClick: () => router.push(`/production/shift-sessions/${session.publicId}/edit`) },
          { label: "Issue Materials", variant: "secondary" as const, onClick: () => router.push(`/production/shift-sessions/${session.publicId}/materials/receive`) },
          { label: "Return Materials", variant: "secondary" as const, onClick: () => router.push(`/production/shift-sessions/${session.publicId}/materials/returns`) },
          { label: "Record Output", variant: "secondary" as const, onClick: () => router.push(`/production/shift-sessions/${session.publicId}/daily-report`) },
          { label: "Add Downtime", variant: "secondary" as const, onClick: () => router.push(`/production/shift-sessions/${session.publicId}/downtime/create`) },
          { label: "End Shift", variant: "warning" as const, onClick: endShift, loading: isPending },
        ]
      : [
          { label: "Print Shift Report", variant: "secondary" as const, onClick: () => window.print() },
        ]),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        recordKind="shift"
        title={session.sessionNo}
        subtitle="Live shift control across assigned staff, materials, output, downtime, QC, and cost summary."
        breadcrumbs={[
          { label: "Shifts", href: "/shifts" },
          { label: "Shift Sessions", href: "/production/shift-sessions" },
          { label: session.sessionNo },
        ]}
        actions={<ActionButtons actions={actions} />}
      />

      {message ? <p style={{ margin: 0, color: colors.danger[600] }}>{message}</p> : null}

      <div style={cardStyle}>
        <SectionHeading title="Summary" />
        <DataTable columns={summaryColumns} data={summaryRows} pageSize={10} />
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Assigned Staff" />
        <DataTable columns={attendanceColumns} data={session.attendance} pageSize={15} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: `${spacing.card.gap}px` }}>
        <div style={cardStyle}>
          <SectionHeading title="Material Issues" />
          <DataTable columns={relatedColumns} data={session.issues.map((row) => ({ number: row.issueNo, status: row.status, itemCount: row.itemCount }))} pageSize={10} />
        </div>
        <div style={cardStyle}>
          <SectionHeading title="Material Returns" />
          <DataTable columns={relatedColumns} data={session.returns.map((row) => ({ number: row.returnNo, status: row.status, itemCount: row.itemCount }))} pageSize={10} />
        </div>
        <div style={cardStyle}>
          <SectionHeading title="Production Outputs" />
          <DataTable columns={[
            { key: "number", label: "Batch No" },
            { key: "status", label: "Status" },
            { key: "quantity", label: "Accepted Qty" },
            { key: "machine", label: "Machine" },
          ]} data={session.batches.map((row) => ({ number: row.batchNo, status: row.status, quantity: Number(row.acceptedQty ?? 0), machine: row.machineName ?? "-" }))} pageSize={10} />
        </div>
        <div style={cardStyle}>
          <SectionHeading title="Downtime" />
          <DataTable columns={[
            { key: "reason", label: "Reason" },
            { key: "durationMinutes", label: "Minutes" },
            { key: "machine", label: "Machine" },
            { key: "batchNo", label: "Batch" },
            { key: "maintenanceTicketNo", label: "Maintenance Ticket" },
            { key: "status", label: "Status" },
          ]} data={session.downtimes} pageSize={10} />
        </div>
      </div>
    </div>
  );
}
