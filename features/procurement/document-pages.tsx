"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, PackagePlus, Pencil, Send } from "lucide-react";

import { blankOrRemoveRow } from "@/lib/forms/line-rows";

import {
  ActionButtons,
  DataTable,
  EmptyState,
  LineTableScroll,
  PageHeader,
  SearchInput,
  SectionHeading,
  StatusBadge,
  useFormSubmit,
} from "@/components/shared";
import type {
  Action,
  Breadcrumb,
  Column,
  TableAction,
} from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { ItemSearchSelect } from "./ItemSearchSelect";
import { useProcurementApprovalDialog } from "./approval-controls";
import { DecoratedSelect } from "@/components/shared";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementViewUrl,
  type ProcurementDocKind,
} from "@/lib/procurement/routes";
import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { formatMoney } from "@/lib/utils/format-number";
import {
  calculateProcurementLineAmounts,
  type ProcurementTaxSettings,
} from "@/services/procurement/procurement-tax";

type Option = { value: string; label: string };
type ItemOption = Option & {
  itemCode: string;
  itemName: string;
  uomId?: string;
  uomName: string;
  unitCost: number;
};
type SupplierOption = Option & { paymentTerms: string };

const FALLBACK_TAX_SETTINGS: ProcurementTaxSettings = {
  vatEnabled: false,
  taxRate: 0,
  taxCodeId: null,
  taxCodeName: null,
  treatment: "INCLUSIVE",
};

type ListRow = {
  id: string;
  publicId: number;
  number: string;
  date: string;
  status: string;
  primary: string;
  secondary: string;
  owner: string;
  itemCount: number;
  amount: number;
  canConvert?: boolean;
};

type RequisitionLine = {
  itemId: string;
  uomId: string;
  requestedQty: number;
  approvedQty: number;
  estimatedUnitPrice: number;
  remarks: string;
};

type PurchaseOrderLine = {
  prItemId?: string;
  itemId: string;
  uomId: string;
  orderedQty: number;
  unitPrice: number;
  remarks: string;
};

type RequisitionEditorProps = {
  mode: "create" | "edit";
  documentId?: string;
  documentPublicId?: number;
  requisitionNo?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  departments: Option[];
  locations: Option[];
  items: ItemOption[];
  initialValue?: {
    requisitionDate: string;
    requestedById: string;
    departmentId: string;
    locationId: string;
    neededByDate: string;
    purpose: string;
    requestType: string;
    remarks: string;
    items: RequisitionLine[];
  };
};

type PurchaseOrderEditorProps = {
  mode: "create" | "edit";
  documentId?: string;
  documentPublicId?: number;
  poNo?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  suppliers: SupplierOption[];
  locations: Option[];
  items: ItemOption[];
  taxSettings?: ProcurementTaxSettings;
  paymentTerms?: Option[];
  requisitions?: Option[];
  initialValue?: {
    poDate: string;
    supplierId: string;
    prId: string;
    prReferenceNo?: string;
    deliveryLocationId: string;
    expectedDeliveryDate: string;
    paymentTerms: string;
    requestType: string;
    remarks: string;
    items: PurchaseOrderLine[];
  };
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
  minWidth: 0,
  maxWidth: "100%",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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

const addRowWrapStyle: React.CSSProperties = {
  marginTop: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
};

const readonlyInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.secondary[100],
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.secondary,
  boxSizing: "border-box",
};

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

const addItemButtonStyle: React.CSSProperties = {
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

const removeItemButtonStyle: React.CSSProperties = {
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

function parseNumericInput(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNumberInputProps<T extends string>(
  value: number,
  onCommit: (nextValue: number) => void,
) {
  return {
    type: "number" as const,
    value,
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      if (Number(event.currentTarget.value) === 0) {
        event.currentTarget.value = "";
      } else {
        event.currentTarget.select();
      }
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onCommit(parseNumericInput(event.target.value));
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      if (!event.currentTarget.value.trim()) {
        onCommit(0);
      }
    },
  };
}

function badgeForStatus(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "POSTED":
    case "RECEIVED":
    case "PAID":
    case "CONVERTED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_CONVERTED":
    case "PARTIALLY_RECEIVED":
    case "PARTIAL_PAID":
      return "pending";
    default:
      return "draft";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function ProcurementListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  baseHref,
  primaryLabel,
  secondaryLabel,
  ownerLabel,
  kind = "generic",
  rows,
  apiBasePath,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  baseHref: string;
  primaryLabel: string;
  secondaryLabel: string;
  ownerLabel: string;
  kind?: ProcurementDocKind | "generic";
  rows: ListRow[];
  apiBasePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const docKind = kind === "generic" ? undefined : kind;
  const approval = useProcurementApprovalDialog({
    apiBasePath: apiBasePath ?? `/api${baseHref}`,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.number, row.primary, row.secondary, row.owner, row.status].some(
        (value) => String(value).toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const columns: Column<ListRow>[] = [
    {
      key: "number",
      label: "Document No",
      sortable: true,
      render: (_value, record) => (
        <a
          href={
            docKind
              ? procurementViewUrl(docKind, record.publicId)
              : `${baseHref}/${record.id}`
          }
          style={{
            color: colors.primary[600],
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {record.number}
        </a>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (value) => formatDate(String(value)),
    },
    { key: "primary", label: primaryLabel },
    { key: "secondary", label: secondaryLabel },
    { key: "owner", label: ownerLabel },
    { key: "itemCount", label: "Items" },
    {
      key: "amount",
      label: "Amount",
      render: (value) =>
        Number(value).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge status={badgeForStatus(String(value)) as never} />
      ),
    },
  ];

  const locked = (status: string, values: string[]) =>
    values.includes(String(status).toUpperCase());

  const actions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => {
        if (!docKind) {
          router.push(`${baseHref}/${(record as ListRow).id}`);
          return;
        }
        router.push(procurementViewUrl(docKind, (record as ListRow).publicId));
      },
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      show: (record) => {
        const status = String((record as ListRow).status).toUpperCase();
        if (kind === "pr") return !locked(status, ["CONVERTED", "CANCELLED"]);
        if (kind === "po")
          return !locked(status, ["RECEIVED", "POSTED", "CANCELLED"]);
        if (kind === "return") return !locked(status, ["POSTED", "CANCELLED"]);
        return !locked(status, ["POSTED", "CANCELLED", "PAID"]);
      },
      onClick: (record) => {
        if (!docKind) {
          router.push(`${baseHref}/${(record as ListRow).id}/edit`);
          return;
        }
        router.push(procurementEditUrl(docKind, (record as ListRow).publicId));
      },
    },
    ...(kind === "pr"
      ? [
          {
            label: "Convert to Purchase Order",
            icon: <Send size={16} />,
            show: (record: ListRow) =>
              locked(String(record.status), [
                "APPROVED",
                "PARTIALLY_CONVERTED",
              ]),
            onClick: (record: ListRow) => {
              router.push(
                procurementCreateUrl("po", { prPublicId: record.publicId }),
              );
            },
          },
        ]
      : []),
    ...(kind === "po"
      ? [
          {
            label: "Create GRN",
            icon: <PackagePlus size={16} />,
            show: (record: ListRow) =>
              locked(String(record.status), ["APPROVED", "PARTIALLY_RECEIVED"]),
            onClick: (record: ListRow) => {
              router.push(
                procurementCreateUrl("grn", { poPublicId: record.publicId }),
              );
            },
          },
          {
            label: "Create Invoice",
            icon: <FileText size={16} />,
            show: (record: ListRow) =>
              locked(String(record.status), [
                "APPROVED",
                "PARTIALLY_RECEIVED",
                "RECEIVED",
                "POSTED",
              ]),
            onClick: (record: ListRow) => {
              router.push(
                procurementCreateUrl("invoice", {
                  poPublicId: record.publicId,
                }),
              );
            },
          },
        ]
      : []),
    ...(apiBasePath ? approval.actions : []),
  ];

  const pageActions: Action[] = [
    {
      label: "Create",
      variant: "primary",
      onClick: () => {
        router.push(createHref);
      },
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
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />
      <div style={cardStyle}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={
          <EmptyState
            title={`No ${title}`}
            message={`There are no ${title.toLowerCase()} recorded yet.`}
          />
        }
      />
      {apiBasePath ? approval.dialog : null}
    </div>
  );
}

export function PurchaseRequisitionEditor({
  mode,
  documentId,
  documentPublicId,
  requisitionNo,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  departments,
  locations,
  items,
  initialValue,
}: RequisitionEditorProps) {
  const router = useRouter();
  const { currencyCode } = useSystemPreferences();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    locationId?: string;
    requisitionDate?: string;
    items?: string;
  }>({});
  const [header, setHeader] = useState({
    requisitionDate:
      initialValue?.requisitionDate ?? new Date().toISOString().slice(0, 10),
    requestedById: initialValue?.requestedById ?? "",
    departmentId: initialValue?.departmentId ?? "",
    locationId: initialValue?.locationId ?? "",
    neededByDate: initialValue?.neededByDate ?? "",
    purpose: initialValue?.purpose ?? "",
    requestType: initialValue?.requestType ?? "INVENTORY_PURCHASE",
    remarks: initialValue?.remarks ?? "",
    priority: "NORMAL",
    requisitionNo: requisitionNo ?? "",
  });
  const [lineItems, setLineItems] = useState<RequisitionLine[]>(
    initialValue?.items?.length
      ? initialValue.items
      : [
          {
            itemId: "",
            uomId: "",
            requestedQty: 0,
            approvedQty: 0,
            estimatedUnitPrice: 0,
            remarks: "",
          },
        ],
  );
  const showApprovedColumn = mode !== "create";
  const grandTotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, line) =>
          sum +
          Number(line.requestedQty ?? 0) * Number(line.estimatedUnitPrice ?? 0),
        0,
      ),
    [lineItems],
  );
  const itemGridTemplate = showApprovedColumn
    ? "48px minmax(160px, 1.8fr) minmax(72px, 0.7fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) 32px"
    : "48px minmax(160px, 1.8fr) minmax(72px, 0.7fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) 32px";
  const itemHeaders = showApprovedColumn
    ? [
        "#",
        "Item *",
        "UOM",
        "Qty Required *",
        "Approved",
        "Est. Price",
        "Line Total",
        "",
      ]
    : ["#", "Item *", "UOM", "Qty Required *", "Est. Price", "Line Total", ""];

  function updateLine(
    index: number,
    key: keyof RequisitionLine,
    value: string | number,
  ) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "itemId") {
          const duplicateIndex = current.findIndex(
            (entry, entryIndex) =>
              entryIndex !== index &&
              entry.itemId === String(value) &&
              entry.itemId,
          );
          if (duplicateIndex >= 0) {
            setMessage(
              "Use one row per item and adjust the quantity instead of adding the same item again.",
            );
            return line;
          }
          const item = items.find((entry) => entry.value === String(value));
          if (item) {
            next.uomId = item.uomId ?? "";
            next.estimatedUnitPrice = Number(item.unitCost ?? 0);
          } else {
            next.uomId = "";
            next.estimatedUnitPrice = 0;
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [
      ...current,
      {
        itemId: "",
        uomId: "",
        requestedQty: 0,
        approvedQty: 0,
        estimatedUnitPrice: 0,
        remarks: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setLineItems((current) =>
      blankOrRemoveRow(current, index, {
        itemId: "",
        uomId: "",
        requestedQty: 0,
        approvedQty: 0,
        estimatedUnitPrice: 0,
        remarks: "",
      }),
    );
  }

  function validateForm() {
    const nextErrors: {
      locationId?: string;
      requisitionDate?: string;
      items?: string;
    } = {};
    if (!header.requisitionDate.trim()) {
      nextErrors.requisitionDate = "PR date is required";
    }
    if (!header.locationId.trim()) {
      nextErrors.locationId = "Receiving location is required";
    }
    const hasValidItem = lineItems.some(
      (line) => line.itemId && Number(line.requestedQty ?? 0) > 0,
    );
    if (!hasValidItem) {
      nextErrors.items =
        "Add at least one item with quantity greater than zero";
    }
    setFieldErrors(nextErrors);
    const firstError =
      nextErrors.locationId ?? nextErrors.requisitionDate ?? nextErrors.items;
    if (firstError) {
      setMessage(firstError);
      return false;
    }
    return true;
  }

  function save(status: string) {
    setMessage("");
    if (!validateForm()) return;
    void submitJson(status, {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: {
        requisitionDate: header.requisitionDate,
        requestedById: header.requestedById,
        departmentId: header.departmentId,
        locationId: header.locationId,
        neededByDate: header.neededByDate,
        purpose: header.purpose || header.priority,
        requestType: header.requestType,
        remarks: "",
        requisitionNo: header.requisitionNo,
        status,
        lineItems: lineItems.map((line) => ({
          ...line,
          approvedQty: showApprovedColumn ? line.approvedQty : 0,
        })),
      },
      errorFallback: "Unable to save purchase requisition",
      successHref: (result) =>
        procurementViewUrl(
          "pr",
          Number(result.publicId ?? documentPublicId ?? 0),
        ),
      onError: setMessage,
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <div style={cardStyle}>
        <SectionHeading title="Requisition Details" />
        {message ? (
          <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p>
        ) : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>PR Number</label>
            <input
              style={inputStyle}
              value={header.requisitionNo}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  requisitionNo: event.target.value,
                }))
              }
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              PR Date <span style={{ color: colors.danger[600] }}>*</span>
            </label>
            <input
              type="date"
              className={
                fieldErrors.requisitionDate ? "erp-field-invalid" : undefined
              }
              style={inputStyle}
              value={header.requisitionDate}
              disabled={!canEdit}
              onChange={(event) => {
                setHeader((current) => ({
                  ...current,
                  requisitionDate: event.target.value,
                }));
                setFieldErrors((current) => ({
                  ...current,
                  requisitionDate: undefined,
                }));
              }}
            />
            {fieldErrors.requisitionDate ? (
              <span style={{ color: colors.danger[600], fontSize: 12 }}>
                {fieldErrors.requisitionDate}
              </span>
            ) : null}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Required By</label>
            <input
              type="date"
              style={inputStyle}
              value={header.neededByDate}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  neededByDate: event.target.value,
                }))
              }
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Priority</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.priority}
              disabled={!canEdit}
              placeholder="Select ..."
              onChange={(next) =>
                setHeader((current) => ({ ...current, priority: next }))
              }
              options={[
                { value: "NORMAL", label: "Normal" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Receiving Location{" "}
              <span style={{ color: colors.danger[600] }}>*</span>
            </label>
            <DecoratedSelect
              style={inputStyle}
              value={header.locationId}
              disabled={!canEdit}
              invalid={Boolean(fieldErrors.locationId)}
              placeholder="Select ..."
              onChange={(next) => {
                setHeader((current) => ({ ...current, locationId: next }));
                setFieldErrors((current) => ({
                  ...current,
                  locationId: undefined,
                }));
              }}
              options={locations}
            />
            {fieldErrors.locationId ? (
              <span style={{ color: colors.danger[600], fontSize: 12 }}>
                {fieldErrors.locationId}
              </span>
            ) : null}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Department</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.departmentId}
              disabled={!canEdit}
              placeholder="Select ..."
              onChange={(next) =>
                setHeader((current) => ({ ...current, departmentId: next }))
              }
              options={departments}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading
          title="Requisition Items"
          extra={
            fieldErrors.items ? (
              <p
                style={{
                  margin: 0,
                  color: colors.danger[600],
                  fontSize: 13,
                }}
              >
                {fieldErrors.items}
              </p>
            ) : null
          }
        />
        <LineTableScroll minWidth={showApprovedColumn ? 980 : 880}>
          <div
            style={{
              ...itemGridHeaderStyle,
              gridTemplateColumns: itemGridTemplate,
            }}
          >
            {itemHeaders.map((label, index) => (
              <div key={`${label}-${index}`}>{label}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {lineItems.map((line, index) => {
              const selectedItem = items.find(
                (item) => item.value === line.itemId,
              );
              const lineTotal =
                Number(line.requestedQty ?? 0) *
                Number(line.estimatedUnitPrice ?? 0);
              return (
                <div
                  key={`${line.itemId}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: itemGridTemplate,
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    style={readonlyInputStyle}
                    value={index + 1}
                    readOnly
                  />
                  <ItemSearchSelect
                    value={line.itemId}
                    options={items}
                    disabled={!canEdit}
                    inputStyle={inputStyle}
                    placeholder="Search by code or name"
                    onChange={(next) => updateLine(index, "itemId", next)}
                  />
                  <input
                    style={readonlyInputStyle}
                    value={selectedItem?.uomName ?? ""}
                    disabled
                  />
                  <input
                    style={inputStyle}
                    disabled={!canEdit}
                    {...getNumberInputProps(line.requestedQty, (nextValue) =>
                      updateLine(index, "requestedQty", nextValue),
                    )}
                  />
                  {showApprovedColumn ? (
                    <input
                      style={inputStyle}
                      disabled={!canEdit}
                      {...getNumberInputProps(line.approvedQty, (nextValue) =>
                        updateLine(index, "approvedQty", nextValue),
                      )}
                    />
                  ) : null}
                  <input
                    style={inputStyle}
                    disabled={!canEdit}
                    {...getNumberInputProps(
                      line.estimatedUnitPrice,
                      (nextValue) =>
                        updateLine(index, "estimatedUnitPrice", nextValue),
                    )}
                  />
                  <input
                    style={readonlyInputStyle}
                    value={formatMoney(lineTotal, currencyCode)}
                    readOnly
                  />
                  <button
                    type="button"
                    className="erp-remove-row-btn"
                    disabled={!canEdit}
                    style={{
                      ...removeItemButtonStyle,
                      opacity: canEdit ? 1 : 0.45,
                      cursor: canEdit ? "pointer" : "not-allowed",
                    }}
                    onClick={() => removeRow(index)}
                    aria-label={`Remove requisition item row ${index + 1}`}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        </LineTableScroll>
        <div style={{ ...addRowWrapStyle, justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, color: colors.text.primary }}>
            Grand Total: {formatMoney(grandTotal, currencyCode)}
          </div>
          {canEdit ? (
            <button type="button" style={addItemButtonStyle} onClick={addRow}>
              + Add Item
            </button>
          ) : null}
        </div>
      </div>

      <div className="erp-save-row" style={cardStyle}>
        <ActionButtons
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => router.push(cancelHref),
              disabled: isBusy,
            },
            {
              label: "Save as Draft",
              variant: "secondary",
              onClick: () => save("DRAFT"),
              loading: savingKey === "DRAFT",
              loadingLabel: "Saving...",
              disabled: !canEdit,
            },
            {
              label: "Submit for Approval",
              variant: "primary",
              onClick: () => save("SUBMITTED"),
              loading: savingKey === "SUBMITTED",
              loadingLabel: "Submitting...",
              disabled: !canEdit,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function PurchaseOrderEditor({
  documentId,
  documentPublicId,
  poNo,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  suppliers,
  locations,
  items,
  taxSettings = FALLBACK_TAX_SETTINGS,
  paymentTerms: paymentTermOptions = [],
  requisitions = [],
  initialValue,
}: PurchaseOrderEditorProps) {
  const router = useRouter();
  const { currencyCode } = useSystemPreferences();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    poDate: initialValue?.poDate ?? new Date().toISOString().slice(0, 10),
    supplierId: initialValue?.supplierId ?? "",
    prId: initialValue?.prId ?? "",
    deliveryLocationId: initialValue?.deliveryLocationId ?? "",
    expectedDeliveryDate: initialValue?.expectedDeliveryDate ?? "",
    paymentTerms: initialValue?.paymentTerms ?? "",
    requestType: initialValue?.requestType ?? "INVENTORY_PURCHASE",
    remarks: initialValue?.remarks ?? "",
    poNo: poNo ?? "",
  });
  const [lineItems, setLineItems] = useState<PurchaseOrderLine[]>(
    initialValue?.items?.length
      ? initialValue.items
      : [
          {
            itemId: "",
            uomId: "",
            orderedQty: 0,
            unitPrice: 0,
            remarks: "",
          },
        ],
  );
  const grandTotal = useMemo(
    () =>
      lineItems.reduce((sum, line) => {
        const amounts = calculateProcurementLineAmounts(
          Number(line.orderedQty ?? 0),
          Number(line.unitPrice ?? 0),
          taxSettings,
        );
        return sum + amounts.lineTotal;
      }, 0),
    [lineItems, taxSettings],
  );
  const vatSummary = taxSettings.vatEnabled
    ? `${taxSettings.taxCodeName ? `${taxSettings.taxCodeName} — ` : ""}${taxSettings.taxRate}% ${
        taxSettings.treatment === "INCLUSIVE" ? "inclusive" : "exclusive"
      }`
    : "VAT disabled";
  const poGridTemplate =
    "48px minmax(160px, 2fr) minmax(72px, 0.7fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) minmax(88px, 0.8fr) 32px";

  function updateLine(
    index: number,
    key: keyof PurchaseOrderLine,
    value: string | number,
  ) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "itemId") {
          const item = items.find((entry) => entry.value === String(value));
          if (item) {
            next.uomId = item.uomId ?? "";
            next.unitPrice = Number(item.unitCost ?? 0);
          } else {
            next.uomId = "";
            next.unitPrice = 0;
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [
      ...current,
      {
        itemId: "",
        uomId: "",
        orderedQty: 0,
        unitPrice: 0,
        remarks: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setLineItems((current) =>
      blankOrRemoveRow(current, index, {
        itemId: "",
        uomId: "",
        orderedQty: 0,
        unitPrice: 0,
        remarks: "",
      }),
    );
  }

  function syncSupplier(supplierId: string) {
    const supplier = suppliers.find((entry) => entry.value === supplierId);
    setHeader((current) => ({
      ...current,
      supplierId,
      paymentTerms: current.paymentTerms || supplier?.paymentTerms || "",
    }));
  }

  function save(status: string) {
    setMessage("");
    void submitJson(status, {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: { ...header, status, lineItems },
      errorFallback: "Unable to save purchase order",
      successHref: (result) =>
        procurementViewUrl(
          "po",
          Number(result.publicId ?? documentPublicId ?? 0),
        ),
      onError: setMessage,
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <div style={cardStyle}>
        <SectionHeading title="Order Details" />
        {message ? (
          <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p>
        ) : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>PO Number</label>
            <input
              style={inputStyle}
              value={header.poNo}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  poNo: event.target.value,
                }))
              }
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              PO Date <span style={{ color: colors.danger[600] }}>*</span>
            </label>
            <input
              type="date"
              style={inputStyle}
              value={header.poDate}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  poDate: event.target.value,
                }))
              }
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Purchase Type</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.requestType}
              disabled={!canEdit || Boolean(header.prId)}
              onChange={(next) =>
                setHeader((current) => ({ ...current, requestType: next }))
              }
              options={[
                { value: "INVENTORY_PURCHASE", label: "Inventory Purchase" },
                { value: "MAINTENANCE_SPARE", label: "Maintenance Spare" },
                { value: "ASSET_PURCHASE", label: "Asset Purchase" },
                { value: "EXTERNAL_SERVICE", label: "External Service" },
              ]}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.supplierId}
              disabled={!canEdit}
              placeholder="Select ..."
              onChange={syncSupplier}
              options={suppliers}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>PR Reference</label>
            {requisitions.length > 0 ? (
              <DecoratedSelect
                style={inputStyle}
                value={header.prId}
                disabled={!canEdit}
                placeholder={initialValue?.prReferenceNo ?? "Select ..."}
                onChange={(next) =>
                  setHeader((current) => ({ ...current, prId: next }))
                }
                options={requisitions}
              />
            ) : (
              <input
                style={inputStyle}
                value={initialValue?.prReferenceNo ?? ""}
                disabled
              />
            )}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Receiving Location</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.deliveryLocationId}
              disabled={!canEdit}
              placeholder="Select ..."
              onChange={(next) =>
                setHeader((current) => ({
                  ...current,
                  deliveryLocationId: next,
                }))
              }
              options={locations}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Expected Delivery</label>
            <input
              type="date"
              style={inputStyle}
              value={header.expectedDeliveryDate}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  expectedDeliveryDate: event.target.value,
                }))
              }
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Terms</label>
            <DecoratedSelect
              style={inputStyle}
              value={header.paymentTerms}
              disabled={!canEdit}
              placeholder="Select ..."
              onChange={(next) =>
                setHeader((current) => ({
                  ...current,
                  paymentTerms: next,
                }))
              }
              options={
                header.paymentTerms &&
                !paymentTermOptions.some((option) => option.value === header.paymentTerms)
                  ? [{ value: header.paymentTerms, label: header.paymentTerms }, ...paymentTermOptions]
                  : paymentTermOptions
              }
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
              value={header.remarks}
              disabled={!canEdit}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Order Items" />
        <LineTableScroll minWidth={1200}>
          <div
            style={{
              ...itemGridHeaderStyle,
              gridTemplateColumns: poGridTemplate,
            }}
          >
            {[
              "#",
              "Item *",
              "UOM",
              "Qty Ordered *",
              "Unit Price",
              "Line Total",
              "",
            ].map((label, index) => (
              <div key={`${label}-${index}`}>{label}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {lineItems.map((line, index) => {
              const selectedItem = items.find(
                (item) => item.value === line.itemId,
              );
              const lineTotal = calculateProcurementLineAmounts(
                Number(line.orderedQty ?? 0),
                Number(line.unitPrice ?? 0),
                taxSettings,
              ).lineTotal;
              return (
                <div
                  key={`${line.itemId}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: poGridTemplate,
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    style={readonlyInputStyle}
                    value={index + 1}
                    readOnly
                  />
                  <ItemSearchSelect
                    value={line.itemId}
                    options={items}
                    disabled={!canEdit}
                    inputStyle={inputStyle}
                    placeholder="Search by code or name"
                    onChange={(next) => updateLine(index, "itemId", next)}
                  />
                  <input
                    style={readonlyInputStyle}
                    value={selectedItem?.uomName ?? ""}
                    disabled
                  />
                  <input
                    style={inputStyle}
                    disabled={!canEdit}
                    {...getNumberInputProps(line.orderedQty, (nextValue) =>
                      updateLine(index, "orderedQty", nextValue),
                    )}
                  />
                  <input
                    style={inputStyle}
                    disabled={!canEdit}
                    {...getNumberInputProps(line.unitPrice, (nextValue) =>
                      updateLine(index, "unitPrice", nextValue),
                    )}
                  />
                  <input
                    style={readonlyInputStyle}
                    value={formatMoney(lineTotal, currencyCode)}
                    readOnly
                  />
                  <button
                    type="button"
                    className="erp-remove-row-btn"
                    disabled={!canEdit}
                    style={{
                      ...removeItemButtonStyle,
                      opacity: canEdit ? 1 : 0.45,
                      cursor: canEdit ? "pointer" : "not-allowed",
                    }}
                    onClick={() => removeRow(index)}
                    aria-label={`Remove purchase order item row ${index + 1}`}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        </LineTableScroll>
        <div style={{ ...addRowWrapStyle, justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, color: colors.text.primary }}>
              Grand Total: {formatMoney(grandTotal, currencyCode)}
            </div>
            <p style={{ margin: "6px 0 0", color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
              VAT is applied from Administration settings ({vatSummary})
            </p>
          </div>
          {canEdit ? (
            <button type="button" style={addItemButtonStyle} onClick={addRow}>
              + Add Item
            </button>
          ) : null}
        </div>
      </div>

      <div className="erp-save-row" style={cardStyle}>
        <ActionButtons
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => router.push(cancelHref),
              disabled: isBusy,
            },
            {
              label: "Save as Draft",
              variant: "secondary",
              onClick: () => save("DRAFT"),
              loading: savingKey === "DRAFT",
              loadingLabel: "Saving...",
              disabled: !canEdit,
            },
            {
              label: "Submit for Approval",
              variant: "primary",
              onClick: () => save("SUBMITTED"),
              loading: savingKey === "SUBMITTED",
              loadingLabel: "Submitting...",
              disabled: !canEdit,
            },
          ]}
        />
      </div>
    </div>
  );
}
