"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  LogOut,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Table2,
  X,
} from "lucide-react";

import {
  ActionButtons,
  ApprovalDialog,
  ConfirmDialog,
  DataTable,
  DecoratedSelect,
  EmptyState,
  HistoryActionBadge,
  RecordDetailIcon,
  SectionHeading,
  FormattedNumberInput,
  PageHeader,
  LineItemsGrid,
  LineItemsGridRow,
  LineItemsGridSpan,
  SearchInput,
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
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { ItemSearchSelect } from "@/features/procurement/ItemSearchSelect";
import {
  notifyActionError,
  notifyFromEndpoint,
} from "@/components/shared/toast";
import { approvalActionKeyFromEndpoint } from "@/lib/approval/action-keys";
import type { ApprovalActionKey } from "@/lib/approval/action-keys";
import {
  publicEditUrl,
  publicViewUrl,
  type PublicRouteKey,
} from "@/lib/routing/urls";
import type {
  IssueDetail,
  RequisitionDetail,
} from "@/services/inventory/inventory-documents.service";

export type InventoryDocumentKind =
  | "transfer"
  | "adjustment"
  | "issue"
  | "return"
  | "requisition";

export interface Option {
  label: string;
  value: string;
}

export interface ItemOption extends Option {
  itemCode: string;
  itemName: string;
  uom?: string;
  uomName?: string;
  unitCost?: number;
}

export interface InventoryDocumentListRow {
  id: string;
  publicId: number;
  number: string;
  date: string;
  status: string;
  itemCount: number;
  primaryText: string;
  secondaryText?: string;
  ownerText?: string;
  reason?: string;
  returnedFromType?: string;
}

export interface InventoryDocumentListPageProps {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  rows: InventoryDocumentListRow[];
  searchPlaceholder: string;
  primaryColumnLabel: string;
  secondaryColumnLabel?: string;
  ownerColumnLabel?: string;
  routeKey: PublicRouteKey;
  baseHref?: string;
}

type EditableLine = {
  itemId: string;
  quantity?: number;
  unitCost?: number;
  condition?: string;
  remarks?: string;
  systemQty?: number;
  physicalQty?: number;
  differenceQty?: number;
  requestedQty?: number;
  approvedQty?: number;
  issuedQty?: number;
};

type RequisitionIssueRow = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  uomName?: string | null;
  maxQty: number;
  issueQty: number;
  remarks: string;
};

type IssueReturnRow = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  uomName?: string | null;
  issuedQty: number;
  alreadyReturnedQty: number;
  remainingQty: number;
  returnQty: number;
  condition: string;
  remarks: string;
};

interface InventoryDocumentEditorProps {
  kind: InventoryDocumentKind;
  mode: "create" | "edit";
  documentId?: string;
  documentPublicId?: number;
  routeKey?: PublicRouteKey;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  initialValue?: Record<string, unknown>;
  items: ItemOption[];
  locations: Option[];
  departments?: Option[];
  users?: Option[];
  shifts?: Option[];
  issues?: Option[];
  issueDetailsById?: Record<string, IssueDetail>;
  requisitions?: Array<
    Option & { sourceLocationId?: string; issueToId?: string }
  >;
  requisitionDetailsById?: Record<string, RequisitionDetail>;
  stockSnapshotEndpoint?: string;
}

interface InventoryDocumentDetailProps {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  status: string;
  summary: Array<{ label: string; value: string }>;
  items: Array<Record<string, string | number | null | undefined>>;
  itemColumns: Array<{
    key: string;
    label: string;
    width?: number | string;
    align?: "left" | "center" | "right";
    wrap?: boolean;
    format?: "text" | "qty" | "money";
    emphasis?: boolean;
  }>;
  approvalHistory?: Array<{
    status: string;
    requestedBy: string;
    assignedApprover?: string;
    approvedBy?: string;
    comment?: string;
    createdAt: string;
  }>;
  documentHistory?: Array<{
    action: string;
    performedBy?: string;
    comment?: string;
    createdAt: string;
  }>;
  auditTrail?: Array<{ action: string; user?: string; timestamp: string }>;
  compactHeader?: boolean;
  recordKind?: string;
  summaryTitle?: string;
  itemsTitle?: string;
  showAuditTrail?: boolean;
  editHref?: string;
  postEndpoint?: string;
  approveEndpoint?: string;
  rejectEndpoint?: string;
  cancelEndpoint?: string;
  generateIssueEndpoint?: string;
  relatedActionHref?: string;
  relatedActionLabel?: string;
  afterActionHref?: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
  minWidth: 0,
  maxWidth: "100%",
};

const issueHeaderStyle: React.CSSProperties = {
  ...cardStyle,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const issueHeaderTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  minWidth: 0,
  flexWrap: "nowrap",
};

const issueTitleGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: 0,
  flex: 1,
};

const issueIconWrapStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  color: colors.text.primary,
  flexShrink: 0,
};

const issueHeaderTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: colors.text.primary,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const issueHeaderSubtitleStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 40,
  fontSize: typography.sizes.small.fontSize,
  color: colors.text.secondary,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 42,
  minWidth: 156,
  width: "auto",
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  backgroundColor: colors.primary[700],
  color: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 8px 18px rgba(0, 143, 131, 0.18)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  textAlign: "center",
  lineHeight: 1.1,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 20,
};

const summaryCardStyle: React.CSSProperties = {
  ...cardStyle,
  minHeight: 110,
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const summaryIconStyle = (bg: string, fg: string): React.CSSProperties => ({
  width: 56,
  height: 56,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: bg,
  color: fg,
  flexShrink: 0,
});

const summaryTextWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 800,
  color: colors.text.primary,
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
  fontWeight: 600,
};

const filtersCardStyle: React.CSSProperties = {
  ...cardStyle,
  paddingTop: 22,
  paddingBottom: 22,
};

const issueFiltersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 14,
  alignItems: "end",
};

const filterFieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const filterControlStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: `1px solid ${colors.inputBorder}`,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  padding: "0 12px",
  fontSize: typography.sizes.body.fontSize,
  boxSizing: "border-box",
};

const tableSectionStyle: React.CSSProperties = {
  ...cardStyle,
  padding: 0,
  overflow: "hidden",
};

const tableSectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "16px 20px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.secondary[50],
};

const tableSectionTitleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const recordBadgeStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  backgroundColor: colors.secondary[100],
  color: colors.text.primary,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 220px))",
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

const requiredMarkStyle: React.CSSProperties = {
  color: colors.danger[600],
  marginLeft: 4,
};

const fieldErrorStyle: React.CSSProperties = {
  color: colors.danger[600],
  fontSize: typography.sizes.caption.fontSize,
  lineHeight: "1.2",
  marginTop: 4,
  display: "block",
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

const compactLineInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 8px",
  minHeight: 36,
  height: 36,
};

function varianceChipStyle(value: number): React.CSSProperties {
  if (value > 0) {
    return {
      ...inputStyle,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderColor: colors.success[200],
      backgroundColor: colors.success[50],
      color: colors.success[700],
      fontWeight: typography.weights.semibold,
      fontVariantNumeric: "tabular-nums",
    };
  }

  if (value < 0) {
    return {
      ...inputStyle,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderColor: colors.danger[200],
      backgroundColor: colors.danger[50],
      color: colors.danger[700],
      fontWeight: typography.weights.semibold,
      fontVariantNumeric: "tabular-nums",
    };
  }

  return {
    ...inputStyle,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.secondary[200],
    backgroundColor: colors.secondary[50],
    color: colors.text.secondary,
    fontWeight: typography.weights.semibold,
    fontVariantNumeric: "tabular-nums",
  };
}

const itemSectionHeaderStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const adjustmentTypeOptions = [
  "Count Variance",
  "Damage Write-off",
  "Expired Items",
  "Revaluation",
  "Other",
];

const returnConditionOptions = [
  { value: "Excess", label: "Excess" },
  { value: "Not Needed", label: "Not Needed" },
  { value: "Wrong Item", label: "Wrong Item" },
  { value: "Damaged", label: "Damaged" },
  { value: "Other", label: "Other" },
];

const addRowWrapStyle: React.CSSProperties = {
  marginTop: "12px",
  width: "100%",
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

const itemGridScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const addItemButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px dashed ${colors.primary[400]}`,
  borderRadius: 8,
  background: colors.primary[50],
  color: colors.primary[700],
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const removeItemButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  minWidth: 40,
  maxWidth: 40,
  height: 40,
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

function getInventoryItemMinWidth(kind: InventoryDocumentKind) {
  return kind === "adjustment"
    ? 720
    : kind === "requisition"
      ? 860
      : kind === "issue"
        ? 652
        : kind === "return"
          ? 780
          : 680;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function badgeForStatus(status: string) {
  switch (status) {
    case "POSTED":
    case "APPROVED":
    case "ISSUED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_ISSUED":
      return "pending";
    default:
      return "draft";
  }
}

function issueStatusBucket(status: string) {
  switch (status.trim().toUpperCase()) {
    case "DRAFT":
    case "OPEN":
    case "NEW":
      return "draft";
    case "SUBMITTED":
    case "PARTIALLY_ISSUED":
    case "PENDING":
    case "PENDING_APPROVAL":
      return "pending";
    case "POSTED":
    case "APPROVED":
    case "ISSUED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
    case "VOIDED":
      return "voided";
    default:
      return "other";
  }
}

function defaultHeaderValue(
  kind: InventoryDocumentKind,
  key: string,
  initialValue?: Record<string, unknown>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const seeded = initialValue?.[key];
  if (typeof seeded === "string" || typeof seeded === "number") {
    return String(seeded);
  }

  switch (key) {
    case "transferDate":
    case "adjustmentDate":
    case "issueDate":
    case "returnDate":
    case "requisitionDate":
      return today;
    case "issuedToType":
    case "returnedFromType":
      return "Department";
    default:
      return "";
  }
}

function normalizeLineItems(
  kind: InventoryDocumentKind,
  rawItems: unknown,
): EditableLine[] {
  const rows = Array.isArray(rawItems) ? rawItems : [];
  const mapped = rows.map((row) => {
    const line = row as Record<string, unknown>;
    return {
      itemId: String(line.itemId ?? ""),
      quantity: Number(line.quantity ?? 0) || 0,
      unitCost: Number(line.unitCost ?? 0) || 0,
      condition:
        String(line.condition ?? "") || (kind === "return" ? "Excess" : ""),
      remarks: String(line.remarks ?? ""),
      systemQty: Number(line.systemQty ?? 0) || 0,
      physicalQty: Number(line.physicalQty ?? 0) || 0,
      differenceQty: Number(line.differenceQty ?? 0) || 0,
      requestedQty: Number(line.requestedQty ?? 0) || 0,
      approvedQty: Number(line.approvedQty ?? 0) || 0,
      issuedQty: Number(line.issuedQty ?? 0) || 0,
    };
  });

  if (mapped.length > 0) {
    return mapped;
  }

  return kind === "adjustment"
    ? [
        {
          itemId: "",
          systemQty: 0,
          physicalQty: 0,
          differenceQty: 0,
          unitCost: 0,
          remarks: "",
        },
      ]
    : kind === "requisition"
      ? [
          {
            itemId: "",
            requestedQty: 0,
            approvedQty: 0,
            issuedQty: 0,
            remarks: "",
          },
        ]
      : kind === "return"
        ? [
            {
              itemId: "",
              quantity: 0,
              unitCost: 0,
              condition: "Excess",
              remarks: "",
            },
          ]
        : [{ itemId: "", quantity: 0, unitCost: 0, remarks: "" }];
}

function getInventoryItemGridTemplate(kind: InventoryDocumentKind) {
  return kind === "adjustment"
    ? "280px 110px 120px 130px 110px"
    : kind === "requisition"
      ? "280px 110px 120px 120px 110px 110px"
      : kind === "issue"
        ? "44px 312px 110px 120px 44px"
        : kind === "return"
          ? "44px 280px 110px 120px 160px 44px"
          : "280px 110px 120px 130px 44px";
}

function getInventoryItemHeaders(kind: InventoryDocumentKind) {
  if (kind === "adjustment") {
    return ["Item", "UOM", "System Qty", "Physical Qty", "Variance"];
  }

  if (kind === "requisition") {
    return ["Item", "UOM", "Requested", "Approved", "Issued", "Open Qty"];
  }

  if (kind === "issue") {
    return ["#", "Item *", "UOM", "Qty *", ""];
  }

  if (kind === "return") {
    return ["#", "Item *", "UOM", "Qty *", "Condition", ""];
  }

  return ["Item *", "UOM", "Available", "Transfer Qty *", ""];
}

export function InventoryDocumentListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  rows,
  searchPlaceholder,
  primaryColumnLabel,
  secondaryColumnLabel,
  ownerColumnLabel,
  routeKey,
}: InventoryDocumentListPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const isIssuePage = routeKey === "inventory.issue";
  const isReturnPage = routeKey === "inventory.return";

  const summaryCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        const bucket = issueStatusBucket(String(row.status ?? ""));
        if (bucket === "draft") acc.draft += 1;
        if (bucket === "posted") acc.posted += 1;
        if (bucket === "pending") acc.pending += 1;
        if (bucket === "voided") acc.voided += 1;
        return acc;
      },
      { total: 0, draft: 0, posted: 0, pending: 0, voided: 0 },
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromTime = fromDate
      ? new Date(`${fromDate}T00:00:00`).getTime()
      : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    const statusValue = statusFilter.toLowerCase();

    return rows.filter((row) => {
      const rowTime = Number.isNaN(new Date(row.date).getTime())
        ? null
        : new Date(row.date).getTime();
      const bucket = issueStatusBucket(String(row.status ?? ""));
      const matchesStatus = statusValue === "all" || bucket === statusValue;
      const matchesDate =
        (!fromTime || (rowTime !== null && rowTime >= fromTime)) &&
        (!toTime || (rowTime !== null && rowTime <= toTime));
      const matchesSearch =
        !query ||
        [
          row.number,
          row.primaryText,
          row.secondaryText,
          row.ownerText,
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [rows, search, fromDate, toDate, statusFilter]);

  const columns: Column<InventoryDocumentListRow>[] = [
    { key: "number", label: "Voucher No.", sortable: true },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(String(value)),
    },
    { key: "primaryText", label: primaryColumnLabel },
    ...(secondaryColumnLabel
      ? ([
          { key: "secondaryText", label: secondaryColumnLabel },
        ] as Column<InventoryDocumentListRow>[])
      : []),
    {
      key: "itemCount",
      label: "Items",
      render: (value) => Number(value).toLocaleString(),
    },
    ...(ownerColumnLabel
      ? ([
          { key: "ownerText", label: ownerColumnLabel },
        ] as Column<InventoryDocumentListRow>[])
      : []),
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge
          status={badgeForStatus(String(value).toUpperCase()) as never}
        />
      ),
    },
  ];

  const actions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      color: colors.text.secondary,
      onClick: (record) =>
        router.push(
          publicViewUrl(
            routeKey,
            (record as InventoryDocumentListRow).publicId,
          ),
        ),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      color: colors.primary[700],
      show: (record) =>
        badgeForStatus(
          String((record as InventoryDocumentListRow).status).toUpperCase(),
        ) === "draft",
      onClick: (record) =>
        router.push(
          publicEditUrl(
            routeKey,
            (record as InventoryDocumentListRow).publicId,
          ),
        ),
    },
  ];

  const pageActions: Action[] = [
    {
      label: "Create",
      variant: "primary",
      onClick: () => router.push(createHref),
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
  };

  if (isIssuePage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${spacing.page.gap}px`,
        }}
      >
        <div style={issueHeaderStyle}>
          <div style={issueHeaderTopRowStyle}>
            <div style={issueTitleGroupStyle}>
              <div style={issueIconWrapStyle}>
                <LogOut size={20} strokeWidth={2.25} />
              </div>
              <h1 style={issueHeaderTitleStyle}>{title}</h1>
            </div>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
              }}
              onClick={() => router.push(createHref)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Issue Voucher</span>
            </button>
          </div>
          <p style={issueHeaderSubtitleStyle}>{subtitle}</p>
        </div>

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.primary[50], colors.primary[700])}
            >
              <FileText size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.total}</span>
              <span style={summaryLabelStyle}>Total Vouchers</span>
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.warning[50], colors.warning[700])}
            >
              <Clock3 size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.draft}</span>
              <span style={summaryLabelStyle}>Draft</span>
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.success[50], colors.success[700])}
            >
              <CircleCheck size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.posted}</span>
              <span style={summaryLabelStyle}>Posted</span>
            </div>
          </div>
        </div>

        <div style={filtersCardStyle}>
          <form onSubmit={(event) => event.preventDefault()}>
            <div style={issueFiltersGridStyle}>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="issue-from-date">
                  From Date
                </label>
                <input
                  id="issue-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  style={filterControlStyle}
                />
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="issue-to-date">
                  To Date
                </label>
                <input
                  id="issue-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  style={filterControlStyle}
                />
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="issue-status">
                  Status
                </label>
                <select
                  id="issue-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  style={filterControlStyle}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Approval</option>
                  <option value="posted">Posted</option>
                  <option value="voided">Voided</option>
                </select>
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="issue-search">
                  Search
                </label>
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    strokeWidth={2.3}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: colors.text.muted,
                    }}
                  />
                  <input
                    id="issue-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    style={{ ...filterControlStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>
              <button
                type="submit"
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  minWidth: 0,
                  padding: "0 12px",
                  boxShadow: "none",
                }}
              >
                <Search size={15} />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  ...filterControlStyle,
                  width: "100%",
                  minWidth: 0,
                  fontWeight: 700,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            </div>
          </form>
        </div>

        <div style={tableSectionStyle}>
          <div style={tableSectionHeaderStyle}>
            <div style={tableSectionTitleStyle}>
              <Table2 size={18} color={colors.primary[700]} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.text.primary,
                }}
              >
                Issue Vouchers
              </span>
            </div>
            <div style={recordBadgeStyle}>{filtered.length} RECORDS</div>
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            actions={actions}
            pageSize={15}
            emptyState={
              <EmptyState
                title={`No ${title} Found`}
                message={`There are no ${title.toLowerCase()} to display right now.`}
              />
            }
          />
        </div>
      </div>
    );
  }

  if (isReturnPage) {
    const returnColumns: Column<InventoryDocumentListRow>[] = [
      { key: "number", label: "Voucher No.", sortable: true, width: 160 },
      {
        key: "date",
        label: "Date",
        sortable: true,
        width: 120,
        render: (value) => formatDate(String(value)),
      },
      { key: "secondaryText", label: "Location", width: 150 },
      { key: "returnedFromType", label: "Department", width: 140 },
      { key: "primaryText", label: "Returned From", width: 170 },
      { key: "ownerText", label: "Created By" },
      {
        key: "status",
        label: "Status",
        width: 120,
        render: (value) => (
          <StatusBadge
            status={badgeForStatus(String(value).toUpperCase()) as never}
          />
        ),
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
        <div style={issueHeaderStyle}>
          <div style={issueHeaderTopRowStyle}>
            <div style={issueTitleGroupStyle}>
              <div style={issueIconWrapStyle}>
                <RotateCcw size={20} strokeWidth={2.25} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 0,
                }}
              >
                <h1 style={issueHeaderTitleStyle}>{title}</h1>
                <p style={issueHeaderSubtitleStyle}>{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                minWidth: 220,
                padding: "0 18px",
              }}
              onClick={() => router.push(createHref)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Return Voucher</span>
            </button>
          </div>
        </div>

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.primary[50], colors.primary[700])}
            >
              <FileText size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.total}</span>
              <span style={summaryLabelStyle}>Total Returns</span>
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.warning[50], colors.warning[700])}
            >
              <Clock3 size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.pending}</span>
              <span style={summaryLabelStyle}>Pending Approval</span>
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div
              style={summaryIconStyle(colors.success[50], colors.success[700])}
            >
              <CircleCheck size={22} />
            </div>
            <div style={summaryTextWrapStyle}>
              <span style={summaryValueStyle}>{summaryCounts.posted}</span>
              <span style={summaryLabelStyle}>Posted</span>
            </div>
          </div>
        </div>

        <div style={filtersCardStyle}>
          <form onSubmit={(event) => event.preventDefault()}>
            <div style={issueFiltersGridStyle}>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="return-search">
                  Search
                </label>
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    strokeWidth={2.3}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: colors.text.muted,
                    }}
                  />
                  <input
                    id="return-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    style={{ ...filterControlStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="return-from-date">
                  From Date
                </label>
                <input
                  id="return-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  style={filterControlStyle}
                />
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="return-to-date">
                  To Date
                </label>
                <input
                  id="return-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  style={filterControlStyle}
                />
              </div>
              <div style={filterFieldStyle}>
                <label style={filterLabelStyle} htmlFor="return-status">
                  Status
                </label>
                <select
                  id="return-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  style={filterControlStyle}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Approval</option>
                  <option value="posted">Posted</option>
                  <option value="voided">Voided</option>
                </select>
              </div>
              <button
                type="submit"
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  minWidth: 0,
                  padding: "0 12px",
                  boxShadow: "none",
                }}
              >
                <Search size={15} />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  ...filterControlStyle,
                  width: "100%",
                  minWidth: 0,
                  fontWeight: 700,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            </div>
          </form>
        </div>

        <div style={tableSectionStyle}>
          <div style={tableSectionHeaderStyle}>
            <div style={tableSectionTitleStyle}>
              <Table2 size={18} color={colors.primary[700]} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.text.primary,
                }}
              >
                Return Vouchers
              </span>
            </div>
            <div style={recordBadgeStyle}>{filtered.length} RECORDS</div>
          </div>
          <DataTable
            columns={returnColumns}
            data={filtered}
            actions={actions}
            pageSize={15}
            emptyState={
              <EmptyState
                title={`No ${title} Found`}
                message={`There are no ${title.toLowerCase()} to display right now.`}
              />
            }
          />
        </div>
      </div>
    );
  }

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
          placeholder={searchPlaceholder}
        />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={
          <EmptyState
            title={`No ${title} Found`}
            message={`There are no ${title.toLowerCase()} to display right now.`}
          />
        }
      />
    </div>
  );
}

export function InventoryDocumentEditor({
  kind,
  mode,
  documentId,
  documentPublicId,
  routeKey,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  initialValue,
  items,
  locations,
  departments = [],
  users = [],
  shifts = [],
  issues = [],
  issueDetailsById = {},
  requisitions = [],
  requisitionDetailsById = {},
  stockSnapshotEndpoint = "/api/inventory/stock-snapshot",
}: InventoryDocumentEditorProps) {
  const router = useRouter();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stockSnapshots, setStockSnapshots] = useState<
    Record<
      string,
      {
        availableQuantity: number;
        averageCost: number;
        locationName: string;
        uomName: string | null;
        status: string;
      } | null
    >
  >({});
  const [selectedRequisition, setSelectedRequisition] =
    useState<RequisitionDetail | null>(null);
  const [requisitionIssueRows, setRequisitionIssueRows] = useState<
    RequisitionIssueRow[]
  >([]);
  const [requisitionLoading, setRequisitionLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);
  const [issueReturnRows, setIssueReturnRows] = useState<IssueReturnRow[]>([]);
  const [issueLoading, setIssueLoading] = useState(false);
  const [header, setHeader] = useState<Record<string, string>>({
    transferNo: defaultHeaderValue(kind, "transferNo", initialValue),
    adjustmentNo: defaultHeaderValue(kind, "adjustmentNo", initialValue),
    adjustmentType:
      defaultHeaderValue(kind, "adjustmentType", initialValue) ||
      (kind === "adjustment" ? "Count Variance" : ""),
    issueNo: defaultHeaderValue(kind, "issueNo", initialValue),
    returnNo: defaultHeaderValue(kind, "returnNo", initialValue),
    transferDate: defaultHeaderValue(kind, "transferDate", initialValue),
    fromLocationId: defaultHeaderValue(kind, "fromLocationId", initialValue),
    toLocationId: defaultHeaderValue(kind, "toLocationId", initialValue),
    adjustmentDate: defaultHeaderValue(kind, "adjustmentDate", initialValue),
    locationId: defaultHeaderValue(kind, "locationId", initialValue),
    reason: defaultHeaderValue(kind, "reason", initialValue),
    issueDate: defaultHeaderValue(kind, "issueDate", initialValue),
    issuedToType: defaultHeaderValue(kind, "issuedToType", initialValue),
    issuedToId: defaultHeaderValue(kind, "issuedToId", initialValue),
    purpose: defaultHeaderValue(kind, "purpose", initialValue),
    requisitionId: defaultHeaderValue(kind, "requisitionId", initialValue),
    returnDate: defaultHeaderValue(kind, "returnDate", initialValue),
    returnedFromType: defaultHeaderValue(
      kind,
      "returnedFromType",
      initialValue,
    ),
    returnedFromId: defaultHeaderValue(kind, "returnedFromId", initialValue),
    requisitionDate: defaultHeaderValue(kind, "requisitionDate", initialValue),
    requisitionNo: defaultHeaderValue(kind, "requisitionNo", initialValue),
    shiftCode: defaultHeaderValue(kind, "shiftCode", initialValue),
    neededByDate: defaultHeaderValue(kind, "neededByDate", initialValue),
    requestedById: defaultHeaderValue(kind, "requestedById", initialValue),
    approverId: defaultHeaderValue(kind, "approverId", initialValue),
    toDepartmentId: defaultHeaderValue(kind, "toDepartmentId", initialValue),
    remarks: defaultHeaderValue(kind, "remarks", initialValue),
  });
  const [lineItems, setLineItems] = useState<EditableLine[]>(() =>
    normalizeLineItems(kind, initialValue?.items),
  );

  const targetActors =
    kind === "issue" ? departments : kind === "return" ? departments : users;
  const documentFieldGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(220px, 360px))",
    justifyContent: "start",
    gap: 16,
    alignItems: "start",
  };

  const selectedLocationId =
    kind === "transfer" || kind === "requisition"
      ? header.fromLocationId
      : header.locationId;
  const snapshotItemKey = lineItems.map((line) => line.itemId).join("|");

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshots() {
      if (!selectedLocationId) {
        setStockSnapshots({});
        return;
      }

      const uniqueItemIds = [
        ...new Set(lineItems.map((line) => line.itemId).filter(Boolean)),
      ];
      if (uniqueItemIds.length === 0) {
        setStockSnapshots({});
        return;
      }

      const entries = await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          try {
            const response = await fetch(
              `${stockSnapshotEndpoint}?itemId=${encodeURIComponent(itemId)}&locationId=${encodeURIComponent(selectedLocationId)}`,
            );
            if (!response.ok) {
              return [itemId, null] as const;
            }
            return [itemId, await response.json()] as const;
          } catch {
            return [itemId, null] as const;
          }
        }),
      );

      if (!cancelled) {
        setStockSnapshots(Object.fromEntries(entries));
      }
    }

    loadSnapshots();
    return () => {
      cancelled = true;
    };
  }, [snapshotItemKey, selectedLocationId, stockSnapshotEndpoint]);

  useEffect(() => {
    if (kind !== "issue") {
      return;
    }

    if (!header.requisitionId) {
      setSelectedRequisition(null);
      setRequisitionIssueRows([]);
      setRequisitionLoading(false);
      return;
    }

    const preloadedRequisition = requisitionDetailsById[header.requisitionId];
    if (preloadedRequisition) {
      setSelectedRequisition(preloadedRequisition);
      setRequisitionIssueRows(
        preloadedRequisition.items.map((item) => {
          const maxQty = Math.max(
            0,
            Number(item.approvedQty ?? item.requestedQty ?? 0) -
              Number(item.issuedQty ?? 0),
          );
          return {
            id: item.id,
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            uomName: item.uomName ?? null,
            maxQty,
            issueQty: maxQty,
            remarks: item.remarks ?? "",
          };
        }),
      );
      setHeader((current) => ({
        ...current,
        locationId: preloadedRequisition.fromLocationId ?? current.locationId,
        issuedToType: preloadedRequisition.toDepartmentId
          ? "Department"
          : preloadedRequisition.toLocationId
            ? "Location"
            : current.issuedToType,
        issuedToId:
          preloadedRequisition.toDepartmentId ??
          preloadedRequisition.toLocationId ??
          current.issuedToId,
        remarks:
          current.remarks ||
          preloadedRequisition.remarks ||
          preloadedRequisition.purpose ||
          current.remarks,
      }));
      setRequisitionLoading(false);
      return;
    }

    let cancelled = false;
    setRequisitionLoading(true);

    async function loadRequisition() {
      try {
        const response = await fetch(
          `/api/inventory/requisitions/${header.requisitionId}`,
        );
        if (!response.ok) {
          throw new Error("Unable to load requisition");
        }
        const requisition = (await response.json()) as RequisitionDetail;
        if (cancelled) return;
        setSelectedRequisition(requisition);
        setRequisitionIssueRows(
          requisition.items.map((item) => {
            const maxQty = Math.max(
              0,
              Number(item.approvedQty ?? item.requestedQty ?? 0) -
                Number(item.issuedQty ?? 0),
            );
            return {
              id: item.id,
              itemId: item.itemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              uomName: item.uomName ?? null,
              maxQty,
              issueQty: maxQty,
              remarks: item.remarks ?? "",
            };
          }),
        );
        setHeader((current) => ({
          ...current,
          locationId: requisition.fromLocationId ?? current.locationId,
          issuedToType: requisition.toDepartmentId
            ? "Department"
            : requisition.toLocationId
              ? "Location"
              : current.issuedToType,
          issuedToId:
            requisition.toDepartmentId ??
            requisition.toLocationId ??
            current.issuedToId,
          remarks:
            current.remarks ||
            requisition.remarks ||
            requisition.purpose ||
            current.remarks,
        }));
      } catch {
        if (!cancelled) {
          setSelectedRequisition(null);
          setRequisitionIssueRows([]);
        }
      } finally {
        if (!cancelled) {
          setRequisitionLoading(false);
        }
      }
    }

    void loadRequisition();
    return () => {
      cancelled = true;
    };
  }, [kind, header.requisitionId, requisitionDetailsById]);

  useEffect(() => {
    if (kind !== "return") {
      return;
    }

    if (!header.reason) {
      setSelectedIssue(null);
      setIssueReturnRows([]);
      setIssueLoading(false);
      return;
    }

    const applyIssue = (issue: IssueDetail) => {
      setSelectedIssue(issue);
      setIssueReturnRows(
        issue.items.map((item) => {
          const remainingQty = Math.max(
            0,
            Number(item.remainingReturnableQty ?? item.quantity ?? 0),
          );
          const catalogItem = items.find(
            (entry) => entry.value === item.itemId,
          );
          return {
            id: item.id,
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            uomName:
              item.uomName || catalogItem?.uomName || catalogItem?.uom || null,
            issuedQty: Number(item.quantity ?? 0),
            alreadyReturnedQty: Number(item.alreadyReturnedQty ?? 0),
            remainingQty,
            returnQty: remainingQty,
            condition: "Excess",
            remarks: item.remarks ?? "",
          };
        }),
      );
      setHeader((current) => ({
        ...current,
        locationId: issue.locationId || current.locationId,
        returnedFromType: issue.issuedToType || current.returnedFromType,
        returnedFromId: issue.issuedToId || current.returnedFromId,
      }));
      setIssueLoading(false);
    };

    const preloadedIssue = issueDetailsById[header.reason];
    if (preloadedIssue) {
      applyIssue(preloadedIssue);
      return;
    }

    let cancelled = false;
    setIssueLoading(true);

    async function loadIssue() {
      try {
        const response = await fetch(`/api/inventory/issues/${header.reason}`);
        if (!response.ok) {
          throw new Error("Unable to load issue voucher");
        }
        const issue = (await response.json()) as IssueDetail;
        if (cancelled) return;
        applyIssue(issue);
      } catch {
        if (!cancelled) {
          setSelectedIssue(null);
          setIssueReturnRows([]);
        }
      } finally {
        if (!cancelled) {
          setIssueLoading(false);
        }
      }
    }

    void loadIssue();
    return () => {
      cancelled = true;
    };
  }, [kind, header.reason, issueDetailsById]);

  useEffect(() => {
    if (kind !== "adjustment") {
      return;
    }

    setLineItems((current) =>
      current.map((line) => {
        const snapshot = stockSnapshots[line.itemId];
        const systemQty = Number(snapshot?.availableQuantity ?? 0);
        const physicalQty = Number(line.physicalQty ?? 0);
        return {
          ...line,
          systemQty,
          differenceQty: physicalQty - systemQty,
        };
      }),
    );
  }, [kind, stockSnapshots]);

  function updateLine(
    index: number,
    key: keyof EditableLine,
    value: string | number,
  ) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, [key]: value };
        if (kind === "adjustment") {
          const systemQty = Number(next.systemQty ?? 0);
          const physicalQty = Number(next.physicalQty ?? 0);
          next.differenceQty = physicalQty - systemQty;
        }
        if ((key === "itemId" && !line.unitCost) || key === "itemId") {
          const item = items.find((entry) => entry.value === String(value));
          if (item && (!next.unitCost || next.unitCost === 0)) {
            next.unitCost = Number(item.unitCost ?? 0);
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [...current, ...normalizeLineItems(kind, [])]);
  }

  function removeRow(index: number) {
    setLineItems((current) => blankOrRemoveRow(current, index, normalizeLineItems(kind, [])[0]));
  }

  function payloadForStatus(status: string) {
    const body: Record<string, unknown> = { ...header, status };
    if (kind === "issue") {
      const selectedRequisitionOption = requisitions.find(
        (entry) => entry.value === header.requisitionId,
      );
      body.purpose = selectedRequisitionOption
        ? `Requisition: ${selectedRequisitionOption.label}`
        : header.purpose;
      const requisitionLineItems = requisitionIssueRows
        .map((item) => {
          return {
            itemId: item.itemId,
            quantity: Number(item.issueQty ?? 0),
            unitCost: 0,
            remarks: item.remarks ?? "",
          };
        })
        .filter((item) => item.quantity > 0);
      const additionalItems = lineItems
        .map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity ?? 0),
          unitCost: Number(line.unitCost ?? 0),
          remarks: line.remarks ?? "",
        }))
        .filter((line) => line.itemId && Number(line.quantity ?? 0) > 0);
      body.lineItems = [...requisitionLineItems, ...additionalItems];
      return body;
    }
    if (kind === "return") {
      const issueLineItems = issueReturnRows
        .map((item) => ({
          itemId: item.itemId,
          quantity: Number(item.returnQty ?? 0),
          unitCost: 0,
          condition: item.condition || "Excess",
          remarks: item.remarks ?? "",
        }))
        .filter((item) => item.quantity > 0);
      const additionalItems = lineItems
        .map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity ?? 0),
          unitCost: Number(line.unitCost ?? 0),
          condition: line.condition || "Excess",
          remarks: line.remarks ?? "",
        }))
        .filter((line) => line.itemId && Number(line.quantity ?? 0) > 0);
      body.lineItems = [...issueLineItems, ...additionalItems];
      return body;
    }
    body.lineItems = lineItems.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity ?? 0),
      unitCost: Number(line.unitCost ?? 0),
      condition: line.condition ?? "",
      remarks: line.remarks ?? "",
      systemQty: Number(line.systemQty ?? 0),
      physicalQty: Number(line.physicalQty ?? 0),
      differenceQty: Number(line.differenceQty ?? 0),
      requestedQty: Number(line.requestedQty ?? 0),
      approvedQty: Number(line.approvedQty ?? 0),
      issuedQty: Number(line.issuedQty ?? 0),
    }));
    return body;
  }

  function hasValidTransferLineItems() {
    return lineItems.some(
      (line) => line.itemId && Number(line.quantity ?? 0) > 0,
    );
  }

  function save(status: string) {
    setMessage("");
    setFieldErrors({});
    if (kind === "return") {
      const nextErrors: Record<string, string> = {};
      const hasIssueItems = issueReturnRows.some(
        (item) => Number(item.returnQty ?? 0) > 0,
      );
      const additionalLines = lineItems.filter(
        (line) =>
          Boolean(line.itemId) ||
          Number(line.quantity ?? 0) > 0 ||
          Boolean(String(line.remarks ?? "").trim()),
      );
      if (!header.returnDate)
        nextErrors.returnDate = "Return date is required.";
      if (!header.locationId)
        nextErrors.locationId = "Return To (Location) is required.";
      if (!header.reason)
        nextErrors.reason = "Issue Voucher Reference is required.";
      if (!hasIssueItems && additionalLines.length === 0)
        nextErrors.items = "At least one item is required.";
      else if (additionalLines.some((line) => !line.itemId))
        nextErrors.item = "Item is required.";
      if (additionalLines.some((line) => line.itemId && Number(line.quantity ?? 0) <= 0))
        nextErrors.transferQty = "Qty is required.";
      if (
        issueReturnRows.some(
          (row) => Number(row.returnQty ?? 0) > Number(row.remainingQty ?? 0),
        )
      ) {
        nextErrors.returnQty =
          "Qty to return cannot exceed the remaining returnable quantity.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
    }
    if (kind === "issue") {
      const nextErrors: Record<string, string> = {};
      const hasRequisitionItems = requisitionIssueRows.some(
        (item) => Number(item.issueQty ?? 0) > 0,
      );
      const additionalLines = lineItems.filter((line) => {
        return (
          Boolean(line.itemId) ||
          Number(line.quantity ?? 0) > 0 ||
          Boolean(String(line.remarks ?? "").trim())
        );
      });
      if (!header.issueDate) nextErrors.issueDate = "Issue date is required.";
      if (!header.locationId)
        nextErrors.locationId = "Issue From (Source Store) is required.";
      if (!hasRequisitionItems && additionalLines.length === 0) {
        nextErrors.items = "At least one item is required.";
      } else if (additionalLines.some((line) => !line.itemId)) {
        nextErrors.item = "Item is required.";
      } else if (
        additionalLines.length > 0 &&
        !additionalLines.some((line) => Number(line.quantity ?? 0) > 0)
      ) {
        nextErrors.transferQty = "Qty is required.";
      }
      if (
        requisitionIssueRows.some(
          (row) => Number(row.issueQty ?? 0) > Number(row.maxQty ?? 0),
        )
      ) {
        nextErrors.issueQty =
          "Qty to issue cannot exceed the remaining requisition quantity.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
    }
    if (kind === "transfer") {
      const nextErrors: Record<string, string> = {};
      if (!header.transferNo.trim())
        nextErrors.transferNo = "Transfer number is required.";
      if (!header.fromLocationId)
        nextErrors.fromLocationId = "From location is required.";
      if (!header.toLocationId)
        nextErrors.toLocationId = "To location is required.";
      if (
        header.fromLocationId &&
        header.toLocationId &&
        header.fromLocationId === header.toLocationId
      ) {
        nextErrors.toLocationId = "Destination must be different from source.";
      }
      if (lineItems.some((line) => !line.itemId)) {
        nextErrors.item = "Item is required.";
      }
      if (!hasValidTransferLineItems()) {
        nextErrors.transferQty = "Transfer Qty is required.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
    }
    if (kind === "requisition") {
      const number = header.requisitionNo.trim();
      if (!/^(SR\/RAW\/\d{4}\/\d+|SRV-\d{4}-\d+)$/i.test(number)) {
        setFieldErrors({
          requisitionNo: "Use the format SR/RAW/2026/0250.",
        });
        return;
      }
    }
    if (kind === "requisition" && status === "SUBMITTED") {
      const nextErrors: Record<string, string> = {};
      if (!header.fromLocationId)
        nextErrors.fromLocationId = "Request From location is required.";
      if (lineItems.length === 0) {
        nextErrors.items = "At least one item is required.";
      } else if (lineItems.some((line) => !line.itemId)) {
        nextErrors.item = "Item is required.";
      }
      if (
        lineItems.length > 0 &&
        !lineItems.some((line) => Number(line.requestedQty ?? 0) > 0)
      ) {
        nextErrors.requestedQty = "Quantity is required.";
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
    }
    void submitJson(status, {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: payloadForStatus(status),
      errorFallback: "Unable to save document",
      successHref: (result) => {
        const publicId = Number(result.publicId ?? documentPublicId ?? 0);
        if (routeKey && publicId > 0) {
          return publicViewUrl(routeKey, publicId);
        }
        return documentId
          ? `${successHref}/${documentId}`
          : `${successHref}/${String(result.id ?? "")}`;
      },
      onError: setMessage,
    });
  }

  const pageActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary" as const,
      onClick: () => router.push(cancelHref),
      disabled: isBusy,
    },
    {
      label: "Save Draft",
      variant: "secondary",
      onClick: () => save("DRAFT"),
      loading: savingKey === "DRAFT",
      loadingLabel: "Saving...",
      disabled: !canEdit || requisitionLoading || issueLoading,
    },
    {
      label: kind === "return" ? "Save Return Voucher" : "Submit",
      variant: "primary",
      onClick: () => save("SUBMITTED"),
      loading: savingKey === "SUBMITTED",
      loadingLabel: "Submitting...",
      disabled: !canEdit || requisitionLoading || issueLoading,
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
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <div style={cardStyle}>
        <SectionHeading
          icon={<ClipboardList size={16} />}
          title={kind === "return" ? "Return Details" : kind === "requisition" ? "Requisition Details" : "Document Details"}
          extra={
            message ? (
              <span
                style={{
                  color: colors.danger[600],
                  fontSize: typography.sizes.small.fontSize,
                }}
              >
                {message}
              </span>
            ) : null
          }
        />
        <div
          className="inventory-doc-fields"
          style={documentFieldGridStyle}
        >
          {kind === "transfer" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>Transfer Number</span>
                <span style={requiredMarkStyle}>*</span>
              </label>
              <input
                required
                disabled={!canEdit}
                style={inputStyle}
                value={header.transferNo}
                onChange={(event) => {
                  setHeader((current) => ({
                    ...current,
                    transferNo: event.target.value,
                  }));
                  setFieldErrors((current) => ({ ...current, transferNo: "" }));
                }}
                placeholder="TRF/2026/0001"
              />
              {fieldErrors.transferNo ? (
                <span style={fieldErrorStyle}>{fieldErrors.transferNo}</span>
              ) : null}
            </div>
          )}

          {kind === "adjustment" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>Adjustment Number</span>
                <span style={requiredMarkStyle}>*</span>
              </label>
              <input
                required
                disabled={!canEdit}
                style={inputStyle}
                value={header.adjustmentNo}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    adjustmentNo: event.target.value,
                  }))
                }
              />
            </div>
          )}

          {kind === "issue" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Issue Number</label>
              <input
                disabled={!canEdit}
                style={inputStyle}
                value={header.issueNo}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    issueNo: event.target.value,
                  }))
                }
                placeholder="SIV/RAW/2026/0109"
              />
            </div>
          )}

          {(kind === "transfer" ||
            kind === "adjustment" ||
            kind === "issue") && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>
                  {kind === "transfer"
                    ? "Transfer Date"
                    : kind === "adjustment"
                      ? "Adjustment Date"
                      : kind === "issue"
                        ? "Issue Date"
                        : kind === "return"
                          ? "Return Date"
                          : "Requisition Date"}
                </span>
                <span style={requiredMarkStyle}>*</span>
              </label>
              <input
                required
                disabled={!canEdit}
                style={inputStyle}
                type="date"
                value={
                  header.transferDate ||
                  header.adjustmentDate ||
                  header.issueDate ||
                  header.returnDate ||
                  header.requisitionDate
                }
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    transferDate:
                      kind === "transfer"
                        ? event.target.value
                        : current.transferDate,
                    adjustmentDate:
                      kind === "adjustment"
                        ? event.target.value
                        : current.adjustmentDate,
                    issueDate:
                      kind === "issue" ? event.target.value : current.issueDate,
                    returnDate:
                      kind === "return"
                        ? event.target.value
                        : current.returnDate,
                    requisitionDate:
                      kind === "requisition"
                        ? event.target.value
                        : current.requisitionDate,
                  }))
                }
              />
            </div>
          )}

          {kind === "transfer" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>From Location</span>
                {kind === "transfer" || kind === "requisition" ? (
                  <span style={requiredMarkStyle}>*</span>
                ) : null}
              </label>
              <select
                disabled={!canEdit}
                style={
                  fieldErrors.fromLocationId
                    ? {
                        ...inputStyle,
                        border: `1px solid ${colors.danger[500]}`,
                        boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                      }
                    : inputStyle
                }
                value={header.fromLocationId}
                onChange={(event) => {
                  setHeader((current) => ({
                    ...current,
                    fromLocationId: event.target.value,
                  }));
                  setFieldErrors((current) => ({
                    ...current,
                    fromLocationId: "",
                  }));
                }}
              >
                <option value="">Select Source Location</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
              {(kind === "transfer" || kind === "requisition") &&
              fieldErrors.fromLocationId ? (
                <span style={fieldErrorStyle}>
                  {fieldErrors.fromLocationId}
                </span>
              ) : null}
            </div>
          )}

          {kind === "adjustment" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>Adjustment Type</span>
                <span style={requiredMarkStyle}>*</span>
              </label>
              <select
                required
                disabled={!canEdit}
                style={inputStyle}
                value={header.adjustmentType}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    adjustmentType: event.target.value,
                  }))
                }
              >
                <option value="">Select ...</option>
                {adjustmentTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === "issue" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>Issue From (Source Store)</span>
                <span style={requiredMarkStyle}>*</span>
              </label>
              <select
                disabled={!canEdit}
                style={
                  fieldErrors.locationId
                    ? {
                        ...inputStyle,
                        border: `1px solid ${colors.danger[500]}`,
                        boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                      }
                    : inputStyle
                }
                value={header.locationId}
                onChange={(event) => {
                  setHeader((current) => ({
                    ...current,
                    locationId: event.target.value,
                  }));
                  setFieldErrors((current) => ({ ...current, locationId: "" }));
                }}
              >
                <option value="">Select Source ...</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
              {fieldErrors.locationId ? (
                <span style={fieldErrorStyle}>{fieldErrors.locationId}</span>
              ) : (
                <div style={{ minHeight: 20 }} />
              )}
            </div>
          )}

          {kind === "issue" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                <span>Issue To (Department / WIP)</span>
              </label>
              {(() => {
                const issueToValue = header.issuedToId
                  ? `${header.issuedToType.toLowerCase()}:${header.issuedToId}`
                  : "";
                return (
                  <select
                    disabled={!canEdit}
                    style={inputStyle}
                    value={issueToValue}
                    onChange={(event) => {
                      const [type, id] = event.target.value.split(":");
                      setHeader((current) => ({
                        ...current,
                        issuedToType:
                          type === "location" ? "Location" : "Department",
                        issuedToId: id ?? "",
                      }));
                    }}
                  >
                    <option value="">Select ...</option>
                    {departments.map((department) => (
                      <option
                        key={`department:${department.value}`}
                        value={`department:${department.value}`}
                      >
                        Department - {department.label}
                      </option>
                    ))}
                    {locations.map((location) => (
                      <option
                        key={`location:${location.value}`}
                        value={`location:${location.value}`}
                      >
                        Location - {location.label}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          )}

          {kind === "issue" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Requisition Reference</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.requisitionId}
                  onChange={(event) => {
                    const requisitionId = event.target.value;
                    const selectedRequisition = requisitions.find(
                      (entry) => entry.value === requisitionId,
                    );
                    setHeader((current) => ({
                      ...current,
                      requisitionId,
                      locationId:
                        selectedRequisition?.sourceLocationId ??
                        current.locationId,
                      issuedToId:
                        selectedRequisition?.issueToId ?? current.issuedToId,
                    }));
                  }}
                >
                  <option value="">Direct Issue (no requisition)</option>
                  {(requisitions ?? []).map((requisition) => (
                    <option key={requisition.value} value={requisition.value}>
                      {requisition.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {kind === "return" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Voucher Number</span>
                </label>
                <input
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.returnNo}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      returnNo: event.target.value,
                    }))
                  }
                  placeholder="RET/RAW/2026/0013"
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Return Date</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.returnDate}
                  onChange={(event) => {
                    setHeader((current) => ({
                      ...current,
                      returnDate: event.target.value,
                    }));
                    setFieldErrors((current) => ({
                      ...current,
                      returnDate: "",
                    }));
                  }}
                />
                {fieldErrors.returnDate ? (
                  <span style={fieldErrorStyle}>{fieldErrors.returnDate}</span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Return To (Location)</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <DecoratedSelect
                  disabled={!canEdit}
                  invalid={Boolean(fieldErrors.locationId)}
                  style={
                    fieldErrors.locationId
                      ? {
                          ...inputStyle,
                          border: `1px solid ${colors.danger[500]}`,
                          boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                        }
                      : inputStyle
                  }
                  value={header.locationId}
                  placeholder="Select ..."
                  options={locations}
                  onChange={(next) => {
                    setHeader((current) => ({ ...current, locationId: next }));
                    setFieldErrors((current) => ({
                      ...current,
                      locationId: "",
                    }));
                  }}
                />
                {fieldErrors.locationId ? (
                  <span style={fieldErrorStyle}>{fieldErrors.locationId}</span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Return From (Department)</span>
                </label>
                <DecoratedSelect
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.returnedFromId}
                  placeholder="Select ..."
                  options={departments}
                  onChange={(next) => {
                    setHeader((current) => ({
                      ...current,
                      returnedFromId: next,
                    }));
                    setFieldErrors((current) => ({
                      ...current,
                      returnedFromId: "",
                    }));
                  }}
                />
                {fieldErrors.returnedFromId ? (
                  <span style={fieldErrorStyle}>
                    {fieldErrors.returnedFromId}
                  </span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Issue Voucher Reference</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <DecoratedSelect
                  disabled={!canEdit}
                  invalid={Boolean(fieldErrors.reason)}
                  style={
                    fieldErrors.reason
                      ? {
                          ...inputStyle,
                          border: `1px solid ${colors.danger[500]}`,
                          boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                        }
                      : inputStyle
                  }
                  value={header.reason}
                  placeholder="Select the Issue Voucher this material was issued on"
                  options={issues}
                  onChange={(next) => {
                    setHeader((current) => ({ ...current, reason: next }));
                    setFieldErrors((current) => ({ ...current, reason: "" }));
                  }}
                />
                {fieldErrors.reason ? (
                  <span style={fieldErrorStyle}>{fieldErrors.reason}</span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
            </>
          )}

          {kind === "requisition" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Requisition Number</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <input
                  disabled={!canEdit}
                  style={{
                    ...inputStyle,
                    ...(fieldErrors.requisitionNo
                      ? {
                          border: `1px solid ${colors.danger[500]}`,
                          boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                        }
                      : null),
                  }}
                  value={
                    header.requisitionNo
                      ? header.requisitionNo.replace(
                          /^([A-Z]+)-(\d{4})-(\d{4,})$/i,
                          "SR/RAW/$2/$3",
                        )
                      : ""
                  }
                  placeholder="SR/RAW/2026/0250"
                  onChange={(event) => {
                    setHeader((current) => ({
                      ...current,
                      requisitionNo: event.target.value,
                    }));
                    setFieldErrors((current) => ({
                      ...current,
                      requisitionNo: "",
                    }));
                  }}
                />
                {fieldErrors.requisitionNo ? (
                  <span style={fieldErrorStyle}>{fieldErrors.requisitionNo}</span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Date</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <input
                  required
                  disabled={!canEdit}
                  style={inputStyle}
                  type="date"
                  value={header.requisitionDate}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, requisitionDate: event.target.value }))
                  }
                />
                <div style={{ minHeight: 20 }} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Shift</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.shiftCode}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, shiftCode: event.target.value }))
                  }
                >
                  <option value="">Select shift...</option>
                  {shifts.map((shift) => (
                    <option key={shift.value} value={shift.value}>{shift.label}</option>
                  ))}
                </select>
                <div style={{ minHeight: 20 }} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <span>Request From (Location)</span>
                  <span style={requiredMarkStyle}>*</span>
                </label>
                <select
                  disabled={!canEdit}
                  style={
                    fieldErrors.fromLocationId
                      ? { ...inputStyle, border: `1px solid ${colors.danger[500]}`, boxShadow: `0 0 0 1px ${colors.danger[50]}` }
                      : inputStyle
                  }
                  value={header.fromLocationId}
                  onChange={(event) => {
                    setHeader((current) => ({ ...current, fromLocationId: event.target.value }));
                    setFieldErrors((current) => ({ ...current, fromLocationId: "" }));
                  }}
                >
                  <option value="">Select Store Location</option>
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>{location.label}</option>
                  ))}
                </select>
                {fieldErrors.fromLocationId ? (
                  <span style={fieldErrorStyle}>{fieldErrors.fromLocationId}</span>
                ) : (
                  <div style={{ minHeight: 20 }} />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>For Department</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.toDepartmentId}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, toDepartmentId: event.target.value }))
                  }
                >
                  <option value="">Department name</option>
                  {departments.map((department) => (
                    <option key={department.value} value={department.value}>{department.label}</option>
                  ))}
                </select>
                <div style={{ minHeight: 20 }} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Needed By Date</label>
                <input
                  disabled={!canEdit}
                  style={inputStyle}
                  type="date"
                  value={header.neededByDate ? header.neededByDate.slice(0, 10) : ""}
                  onChange={(event) =>
                    setHeader((current) => ({ ...current, neededByDate: event.target.value }))
                  }
                />
                <div style={{ minHeight: 20 }} />
              </div>
            </>
          )}

          <div style={{ ...fieldStyle, gridColumn: "1 / -1", order: 10 }}>
            <label style={labelStyle}>{kind === "requisition" ? "Remarks / Purpose" : "Remarks"}</label>
            <textarea
              disabled={!canEdit}
              style={{ ...inputStyle, minHeight: "56px", resize: "vertical" }}
              placeholder={kind === "requisition" ? "Purpose of this requisition..." : "Remarks"}
              value={header.remarks}
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

      {kind === "issue" && (requisitionLoading || selectedRequisition) ? (
        <div style={cardStyle}>
          <SectionHeading
            icon={<ClipboardList size={16} />}
            title="Items from Requisition"
            subtitle="from approved stock request"
          />
          {requisitionLoading ? (
            <div
              style={{
                color: colors.text.secondary,
                fontSize: typography.sizes.small.fontSize,
              }}
            >
              Loading requisition items...
            </div>
          ) : selectedRequisition ? (
            <div style={{ overflowX: "auto" }}>
              <table
                className="requisition-items-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: 32 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 170 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 180 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 4px",
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.text.secondary,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 2px 12px 4px",
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.text.secondary,
                      }}
                    >
                      Item Code
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 2px",
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.text.secondary,
                      }}
                    >
                      Item Name
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 4px 12px 2px",
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.text.secondary,
                      }}
                    >
                      UOM
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "12px 4px",
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.text.secondary,
                      }}
                    >
                      Qty to Issue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requisitionIssueRows.map((item, index) => {
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                      >
                        <td
                          style={{
                            padding: "12px 4px",
                            fontSize: typography.sizes.body.fontSize,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td
                          style={{
                            padding: "12px 2px 12px 4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: colors.text.primary,
                            }}
                          >
                            {item.itemCode}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ color: colors.text.primary }}>
                            {item.itemName}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 4px 12px 2px",
                            fontSize: typography.sizes.body.fontSize,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.uomName ?? "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px 4px",
                            width: 100,
                            textAlign: "center",
                          }}
                        >
                          <FormattedNumberInput
                            disabled={!canEdit}
                            style={{
                              ...inputStyle,
                              width: 90,
                              minHeight: 42,
                              border: `1px solid ${colors.inputBorder}`,
                              textAlign: "right",
                            }}
                            decimals={0}
                            value={item.issueQty}
                            onChange={(nextValue) => {
                              setRequisitionIssueRows((current) =>
                                current.map((row) =>
                                  row.id === item.id
                                    ? {
                                        ...row,
                                        issueQty: Number(nextValue ?? 0),
                                      }
                                    : row,
                                ),
                              );
                              setFieldErrors((current) => ({
                                ...current,
                                issueQty: "",
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {kind === "return" && (issueLoading || selectedIssue) ? (
        <div style={cardStyle}>
          <SectionHeading
            icon={<PackageMinus size={16} />}
            title="Items from Issue Voucher"
            subtitle="issued materials still available to return"
          />
          {issueLoading ? (
            <div
              style={{
                color: colors.text.secondary,
                fontSize: typography.sizes.small.fontSize,
              }}
            >
              Loading issue items...
            </div>
          ) : selectedIssue ? (
            <LineItemsGrid
              template="32px minmax(180px, 1.8fr) minmax(86px, 100px) minmax(78px, 90px) minmax(128px, 140px) minmax(148px, 160px) minmax(108px, 120px) minmax(128px, 150px)"
              headers={[
                "#",
                "Item",
                "UoM",
                "Issued",
                "Already Returned",
                "Remaining Returnable",
                "Qty to Return",
                "Condition",
              ]}
              minWidth={980}
              fullWidth
              compact
              headerAlign="center"
              headerStyle={{ textTransform: "none", letterSpacing: "0.01em" }}
              alignItems="center"
            >
              {issueReturnRows.map((item, index) => (
                <LineItemsGridRow key={item.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 36,
                      fontWeight: 600,
                      color: colors.text.secondary,
                    }}
                  >
                    {index + 1}
                  </div>
                  <input
                    disabled
                    style={compactLineInputStyle}
                    value={`${item.itemCode} - ${item.itemName}`}
                    title={`${item.itemCode} - ${item.itemName}`}
                  />
                  <input
                    disabled
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    value={item.uomName || "-"}
                  />
                  <input
                    disabled
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    value={item.issuedQty}
                  />
                  <input
                    disabled
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    value={item.alreadyReturnedQty}
                  />
                  <input
                    disabled
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    value={item.remainingQty}
                  />
                  <FormattedNumberInput
                    disabled={!canEdit}
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    decimals={0}
                    value={item.returnQty}
                    onChange={(nextValue) => {
                      setIssueReturnRows((current) =>
                        current.map((row) =>
                          row.id === item.id
                            ? { ...row, returnQty: Number(nextValue ?? 0) }
                            : row,
                        ),
                      );
                      setFieldErrors((current) => ({
                        ...current,
                        returnQty: "",
                      }));
                    }}
                  />
                  <DecoratedSelect
                    disabled={!canEdit}
                    style={{ ...compactLineInputStyle, textAlign: "center" }}
                    value={item.condition || "Excess"}
                    allowEmpty={false}
                    placeholder="Excess"
                    options={returnConditionOptions}
                    onChange={(nextCondition) => {
                      setIssueReturnRows((current) =>
                        current.map((row) =>
                          row.id === item.id
                            ? { ...row, condition: nextCondition }
                            : row,
                        ),
                      );
                    }}
                  />
                </LineItemsGridRow>
              ))}
              {fieldErrors.returnQty ? (
                <LineItemsGridSpan>
                  <div
                    style={{
                      color: colors.danger[600],
                      fontSize: typography.sizes.small.fontSize,
                    }}
                  >
                    {fieldErrors.returnQty}
                  </div>
                </LineItemsGridSpan>
              ) : null}
            </LineItemsGrid>
          ) : null}
        </div>
      ) : null}

      <div style={cardStyle}>
        <SectionHeading
          icon={<PackagePlus size={16} />}
          title={
            kind === "issue"
              ? "Additional Items to Issue"
              : kind === "return"
                ? "Additional Items to Return"
                : "Items"
          }
          subtitle={kind === "issue" || kind === "return" ? "optional" : undefined}
        />
        {fieldErrors.items ? (
          <div
            style={{
              color: colors.danger[600],
              fontSize: typography.sizes.small.fontSize,
              marginBottom: 12,
            }}
          >
            {fieldErrors.items}
          </div>
        ) : null}
        <LineItemsGrid
          template={getInventoryItemGridTemplate(kind)}
          headers={getInventoryItemHeaders(kind)}
          minWidth={getInventoryItemMinWidth(kind)}
          compact={kind === "return"}
          headerAlign={kind === "return" ? "center" : undefined}
          alignItems="center"
          columnGap={kind === "issue" ? 20 : undefined}
        >
          {lineItems.map((line, index) => {
            const selectedItem = items.find(
              (item) => item.value === line.itemId,
            );
            const itemInvalid =
              (kind === "transfer" ||
                kind === "requisition" ||
                kind === "issue" ||
                kind === "return") &&
              !line.itemId &&
              Boolean(fieldErrors.item);
            const requestedQtyInvalid =
              kind === "requisition" &&
              !!line.itemId &&
              Number(line.requestedQty ?? 0) <= 0 &&
              Boolean(fieldErrors.requestedQty);
            const transferQtyInvalid =
              (kind === "transfer" || kind === "issue" || kind === "return") &&
              !!line.itemId &&
              Number(line.quantity ?? 0) <= 0 &&
              Boolean(fieldErrors.transferQty);
            const invalidInputStyle =
              transferQtyInvalid || requestedQtyInvalid
                ? {
                    ...inputStyle,
                    border: `1px solid ${colors.danger[500]}`,
                    boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                  }
                : inputStyle;
            const invalidItemStyle = itemInvalid
              ? {
                  ...inputStyle,
                  border: `1px solid ${colors.danger[500]}`,
                  boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                }
              : inputStyle;
            return (
              <Fragment key={`${line.itemId}-${index}`}>
                <LineItemsGridRow>
                  {kind === "transfer" ||
                  kind === "issue" ||
                  kind === "return" ? null : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          minWidth: 0,
                        }}
                      >
                        <ItemSearchSelect
                          value={line.itemId}
                          options={items}
                          disabled={!canEdit}
                          inputStyle={invalidItemStyle}
                          placeholder="Search by code or name"
                          onChange={(next) => {
                            updateLine(index, "itemId", next);
                            setFieldErrors((current) => ({
                              ...current,
                              item: "",
                              transferQty: "",
                              requestedQty: "",
                            }));
                          }}
                        />
                        {itemInvalid ? (
                          <span style={fieldErrorStyle}>
                            {fieldErrors.item}
                          </span>
                        ) : null}
                      </div>
                      <input
                        disabled
                        style={inputStyle}
                        value={selectedItem?.uomName ?? selectedItem?.uom ?? ""}
                        placeholder="UOM"
                      />
                    </>
                  )}

                  {kind === "adjustment" ? (
                    <>
                      <FormattedNumberInput
                        disabled
                        style={inputStyle}
                        decimals={0}
                        value={line.systemQty ?? 0}
                        onChange={() => undefined}
                      />
                      <FormattedNumberInput
                        disabled={!canEdit}
                        style={inputStyle}
                        decimals={0}
                        value={line.physicalQty ?? 0}
                        onChange={(nextValue) =>
                          updateLine(index, "physicalQty", nextValue)
                        }
                      />
                      <div
                        style={varianceChipStyle(
                          Number(line.differenceQty ?? 0),
                        )}
                      >
                        {(() => {
                          const value = Number(line.differenceQty ?? 0);
                          if (value > 0) {
                            return `+${Math.abs(value).toLocaleString()}`;
                          }
                          if (value < 0) {
                            return `-${Math.abs(value).toLocaleString()}`;
                          }
                          return "0";
                        })()}
                      </div>
                    </>
                  ) : kind === "requisition" ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          minWidth: 0,
                        }}
                      >
                        <FormattedNumberInput
                          disabled={!canEdit}
                          style={invalidInputStyle}
                          decimals={0}
                          value={line.requestedQty ?? 0}
                          onChange={(nextValue) => {
                            updateLine(index, "requestedQty", nextValue);
                            setFieldErrors((current) => ({
                              ...current,
                              requestedQty: "",
                            }));
                          }}
                        />
                        {requestedQtyInvalid ? (
                          <span style={fieldErrorStyle}>
                            {fieldErrors.requestedQty}
                          </span>
                        ) : null}
                      </div>
                      <FormattedNumberInput
                        disabled={!canEdit}
                        style={inputStyle}
                        decimals={0}
                        value={line.approvedQty ?? 0}
                        onChange={(nextValue) =>
                          updateLine(index, "approvedQty", nextValue)
                        }
                      />
                      <FormattedNumberInput
                        disabled={!canEdit}
                        style={inputStyle}
                        decimals={0}
                        value={line.issuedQty ?? 0}
                        onChange={(nextValue) =>
                          updateLine(index, "issuedQty", nextValue)
                        }
                      />
                      <FormattedNumberInput
                        disabled
                        style={inputStyle}
                        decimals={0}
                        value={
                          Number(line.approvedQty ?? 0) -
                          Number(line.issuedQty ?? 0)
                        }
                        onChange={() => undefined}
                      />
                    </>
                  ) : kind === "issue" ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 48,
                          fontSize: typography.sizes.body.fontSize,
                          fontWeight: 600,
                          color: colors.text.secondary,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          minWidth: 0,
                        }}
                      >
                        <ItemSearchSelect
                          value={line.itemId}
                          options={items}
                          disabled={!canEdit}
                          inputStyle={invalidItemStyle}
                          placeholder="Search by code or name"
                          onChange={(next) => {
                            updateLine(index, "itemId", next);
                            setFieldErrors((current) => ({
                              ...current,
                              item: "",
                              transferQty: "",
                            }));
                          }}
                        />
                        {itemInvalid ? (
                          <span style={fieldErrorStyle}>
                            {fieldErrors.item}
                          </span>
                        ) : null}
                      </div>
                      <input
                        disabled
                        style={inputStyle}
                        value={selectedItem?.uomName ?? selectedItem?.uom ?? ""}
                        placeholder="UOM"
                      />
                      <FormattedNumberInput
                        disabled={!canEdit}
                        style={invalidInputStyle}
                        decimals={0}
                        value={line.quantity ?? 0}
                        onChange={(nextValue) => {
                          updateLine(index, "quantity", nextValue);
                          setFieldErrors((current) => ({
                            ...current,
                            transferQty: "",
                          }));
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 42,
                        }}
                      >
                        <button
                          type="button"
                          style={removeItemButtonStyle}
                          onClick={() => removeRow(index)}
                          aria-label={`Remove item row ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  ) : kind === "return" ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 36,
                          fontSize: typography.sizes.body.fontSize,
                          fontWeight: 600,
                          color: colors.text.secondary,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <ItemSearchSelect
                          value={line.itemId}
                          options={items}
                          disabled={!canEdit}
                          inputStyle={{
                            ...invalidItemStyle,
                            ...compactLineInputStyle,
                            ...(itemInvalid
                              ? {
                                  border: `1px solid ${colors.danger[500]}`,
                                  boxShadow: `0 0 0 1px ${colors.danger[50]}`,
                                }
                              : null),
                          }}
                          placeholder="Search by code or name"
                          onChange={(next) => {
                            updateLine(index, "itemId", next);
                            setFieldErrors((current) => ({
                              ...current,
                              item: "",
                              transferQty: "",
                            }));
                          }}
                        />
                        {itemInvalid ? <span style={fieldErrorStyle}>{fieldErrors.item}</span> : null}
                      </div>
                      <input
                        disabled
                        style={{
                          ...compactLineInputStyle,
                          textAlign: "center",
                        }}
                        value={selectedItem?.uomName ?? selectedItem?.uom ?? ""}
                      />
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <FormattedNumberInput
                          disabled={!canEdit}
                          className={transferQtyInvalid ? "erp-field-invalid" : undefined}
                          style={{
                            ...compactLineInputStyle,
                            textAlign: "center",
                            ...(transferQtyInvalid
                              ? {
                                  border: `1px solid ${colors.danger[500]}`,
                                  boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.18)`,
                                }
                              : null),
                          }}
                          decimals={0}
                          value={line.quantity ?? 0}
                          onChange={(nextValue) => {
                            updateLine(index, "quantity", nextValue);
                            setFieldErrors((current) => ({
                              ...current,
                              transferQty: "",
                            }));
                          }}
                        />
                        {transferQtyInvalid ? (
                          <span style={fieldErrorStyle}>{fieldErrors.transferQty}</span>
                        ) : null}
                      </div>
                      <DecoratedSelect
                        disabled={!canEdit}
                        style={{
                          ...compactLineInputStyle,
                          textAlign: "center",
                        }}
                        value={line.condition || "Excess"}
                        allowEmpty={false}
                        placeholder="Excess"
                        options={returnConditionOptions}
                        onChange={(next) =>
                          updateLine(index, "condition", next)
                        }
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 36,
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...removeItemButtonStyle,
                            width: 32,
                            minWidth: 32,
                            maxWidth: 32,
                            height: 32,
                          }}
                          onClick={() => removeRow(index)}
                          aria-label={`Remove item row ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          minWidth: 0,
                        }}
                      >
                        <ItemSearchSelect
                          value={line.itemId}
                          options={items}
                          disabled={!canEdit}
                          inputStyle={invalidItemStyle}
                          placeholder="Search by code or name"
                          onChange={(next) => {
                            updateLine(index, "itemId", next);
                            setFieldErrors((current) => ({
                              ...current,
                              item: "",
                              transferQty: "",
                            }));
                          }}
                        />
                        {itemInvalid ? (
                          <span style={fieldErrorStyle}>
                            {fieldErrors.item}
                          </span>
                        ) : null}
                      </div>
                      <input
                        disabled
                        style={inputStyle}
                        value={selectedItem?.uomName ?? selectedItem?.uom ?? ""}
                        placeholder="UOM"
                      />
                      <input
                        disabled
                        style={inputStyle}
                        value={String(
                          Number(
                            stockSnapshots[line.itemId]?.availableQuantity ?? 0,
                          ),
                        )}
                        placeholder="0"
                      />
                      <FormattedNumberInput
                        disabled={!canEdit}
                        style={invalidInputStyle}
                        decimals={0}
                        value={line.quantity ?? 0}
                        onChange={(nextValue) => {
                          updateLine(index, "quantity", nextValue);
                          setFieldErrors((current) => ({
                            ...current,
                            transferQty: "",
                          }));
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 42,
                        }}
                      >
                        <button
                          type="button"
                          style={removeItemButtonStyle}
                          onClick={() => removeRow(index)}
                          aria-label={`Remove item row ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </LineItemsGridRow>
              </Fragment>
            );
          })}
        </LineItemsGrid>
        {canEdit ? (
          <div style={addRowWrapStyle}>
            <button type="button" style={addItemButtonStyle} onClick={addRow}>
              <Plus size={14} />
              Add Another Item
            </button>
          </div>
        ) : null}
      </div>

      <div
        style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}
      >
        <ActionButtons actions={pageActions} />
      </div>
      <style jsx global>{`
        @media (max-width: 1100px) {
          .inventory-doc-fields {
            grid-template-columns: repeat(2, minmax(220px, 360px)) !important;
            justify-content: start;
          }
        }

        @media (max-width: 720px) {
          .inventory-doc-fields {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

export function InventoryDocumentDetail({
  title,
  subtitle,
  breadcrumbs,
  status,
  summary,
  items,
  itemColumns,
  approvalHistory = [],
  documentHistory = [],
  auditTrail = [],
  compactHeader = false,
  recordKind,
  summaryTitle = "Summary",
  itemsTitle = "Items",
  showAuditTrail = true,
  editHref,
  postEndpoint,
  approveEndpoint,
  rejectEndpoint,
  cancelEndpoint,
  generateIssueEndpoint,
  relatedActionHref,
  relatedActionLabel,
  afterActionHref,
}: InventoryDocumentDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<ApprovalActionKey | null>(
    null,
  );
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [, startTransition] = useTransition();
  const isPending = pendingAction != null;
  const isActionLoading = (key: ApprovalActionKey) => pendingAction === key;
  const documentLabel = title.includes(":")
    ? title.slice(0, title.indexOf(":")).trim()
    : title;

  function closeDialogs() {
    if (isPending) return;
    setDialog(null);
    setCancelOpen(false);
    setDialogError("");
  }

  function runAction(endpoint: string, body?: { comment?: string }) {
    const actionKey = approvalActionKeyFromEndpoint(endpoint);
    setMessage("");
    setDialogError("");
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const result = await response.json();
        if (!response.ok) {
          const error = result.error ?? "Action failed";
          setMessage(error);
          setDialogError(error);
          notifyActionError(error);
          return;
        }
        setDialog(null);
        setCancelOpen(false);
        notifyFromEndpoint(endpoint);
        router.push(afterActionHref ?? pathname);
        router.refresh();
      } finally {
        setPendingAction(null);
      }
    });
  }

  const actions: Action[] = [
    ...(relatedActionHref && relatedActionLabel
      ? [
          {
            label: relatedActionLabel,
            href: relatedActionHref,
            variant: "secondary" as const,
            disabled: isPending,
          },
        ]
      : []),
    ...(editHref
      ? [
          {
            label: "Edit",
            icon: <Pencil size={16} />,
            variant: "secondary" as const,
            onClick: () => router.push(editHref),
            disabled: isPending,
          },
        ]
      : []),
    ...(approveEndpoint
      ? [
          {
            label: "Approve",
            icon: <CircleCheck size={16} />,
            variant: "success" as const,
            onClick: () => {
              setDialogError("");
              setDialog("approve");
            },
            disabled: isPending,
          },
        ]
      : []),
    ...(rejectEndpoint
      ? [
          {
            label: "Reject",
            icon: <X size={16} />,
            variant: "danger" as const,
            onClick: () => {
              setDialogError("");
              setDialog("reject");
            },
            disabled: isPending,
          },
        ]
      : []),
    ...(cancelEndpoint
      ? [
          {
            label: "Cancel Doc",
            icon: <Ban size={16} />,
            variant: "warning" as const,
            onClick: () => setCancelOpen(true),
            disabled: isPending,
          },
        ]
      : []),
    ...(postEndpoint
      ? [
          {
            label: "Post",
            variant: "primary" as const,
            onClick: () => runAction(postEndpoint),
            loading: isActionLoading("post"),
            disabled: isPending,
          },
        ]
      : []),
    ...(generateIssueEndpoint
      ? [
          {
            label: "Generate Issue",
            variant: "primary" as const,
            onClick: () => runAction(generateIssueEndpoint),
            loading: isActionLoading("generate-issue"),
            disabled: isPending,
          },
        ]
      : []),
  ];

  const backHref = breadcrumbs.find(
    (crumb, index) => crumb.href && index === breadcrumbs.length - 2,
  )?.href;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      {compactHeader ? (
        <div
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "start",
            columnGap: 12,
            rowGap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              minWidth: 0,
            }}
          >
            {recordKind ? <RecordDetailIcon kind={recordKind} /> : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                  flexWrap: "wrap",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: typography.sizes.h4.fontSize,
                    fontWeight: typography.weights.bold,
                    color: colors.text.primary,
                    lineHeight: 1.15,
                    whiteSpace: "normal",
                    overflow: "visible",
                    textOverflow: "clip",
                    wordBreak: "break-word",
                  }}
                >
                  {title}
                </h1>
                <StatusBadge status={badgeForStatus(status) as never} />
              </div>
              {subtitle ? (
                <p
                  style={{
                    margin: 0,
                    color: colors.text.secondary,
                    fontSize: typography.sizes.small.fontSize,
                  }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {backHref ? (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: 36,
                padding: "0 14px",
                borderRadius: 10,
                border: `1px solid ${colors.inputBorder}`,
                backgroundColor: colors.surface,
                color: colors.text.primary,
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.small.fontSize,
                fontWeight: typography.weights.semibold,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : null}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <ActionButtons actions={actions} />
          </div>
        </div>
      ) : (
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          recordKind={recordKind}
          actions={<ActionButtons actions={actions} />}
        />
      )}

      <div style={cardStyle}>
        <SectionHeading
          icon={<FileText size={16} />}
          title={summaryTitle}
          extra={
            !compactHeader ? (
              <StatusBadge status={badgeForStatus(status) as never} />
            ) : null
          }
        />
        {message ? (
          <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p>
        ) : null}
        <div
          className="inventory-summary-grid"
          style={
            compactHeader
              ? {
                  ...fieldGridStyle,
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                }
              : fieldGridStyle
          }
        >
          {summary.map((entry) => (
            <div key={entry.label} style={fieldStyle}>
              <span style={labelStyle}>{entry.label}</span>
              <strong>{entry.value || "-"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading
          icon={<Package size={16} />}
          title={itemsTitle ?? "Items"}
          extra={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: colors.secondary[100],
                color: colors.text.primary,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 700,
              }}
            >
              {items.length} {items.length === 1 ? "record" : "records"}
            </span>
          }
        />
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: itemColumns.some((column) => column.width != null)
                ? "fixed"
                : "auto",
              minWidth: Math.max(
                48 +
                  itemColumns.reduce(
                    (sum, column) =>
                      sum +
                      (typeof column.width === "number"
                        ? column.width
                        : column.width
                          ? 140
                          : 140),
                    0,
                  ),
                720,
              ),
            }}
          >
            <colgroup>
              <col style={{ width: 48 }} />
              {itemColumns.map((column) => (
                <col
                  key={column.key}
                  style={
                    column.width
                      ? {
                          width: column.width,
                          maxWidth: column.width,
                        }
                      : undefined
                  }
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 10px",
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: colors.secondary[50],
                    fontSize: typography.sizes.caption.fontSize,
                    whiteSpace: "nowrap",
                  }}
                >
                  #
                </th>
                {itemColumns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      textAlign: column.align ?? "left",
                      padding:
                        column.key === "uom" || column.key === "quantity"
                          ? "12px 4px"
                          : column.key === "remarks"
                            ? "12px 10px 12px 8px"
                            : "12px 8px",
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: colors.secondary[50],
                      fontSize: typography.sizes.caption.fontSize,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td
                    style={{
                      padding: "12px 10px",
                      borderBottom: `1px solid ${colors.border}`,
                      textAlign: "center",
                      color: colors.text.secondary,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {index + 1}
                  </td>
                  {itemColumns.map((column) => {
                    const rawValue = item[column.key];
                    const content =
                      rawValue == null || rawValue === ""
                        ? "-"
                        : column.format === "qty" || column.format === "money"
                          ? Number(rawValue).toLocaleString("en-KE")
                          : String(rawValue);
                    return (
                      <td
                        key={column.key}
                        style={{
                          padding:
                            column.key === "uom" || column.key === "quantity"
                              ? "12px 4px"
                              : column.key === "remarks"
                                ? "12px 10px 12px 8px"
                                : "12px 8px",
                          borderBottom: `1px solid ${colors.border}`,
                          textAlign: column.align ?? "left",
                          whiteSpace: column.wrap ? "normal" : "nowrap",
                          overflow: column.wrap ? "visible" : "hidden",
                          textOverflow: column.wrap ? "clip" : "ellipsis",
                          wordBreak: column.wrap ? "break-word" : "normal",
                          fontVariantNumeric:
                            column.align === "right"
                              ? "tabular-nums"
                              : undefined,
                          fontWeight: column.emphasis ? 700 : 400,
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading
          icon={<CircleCheck size={16} />}
          title={compactHeader ? "Approval Trail" : "Approval History"}
        />
        {approvalHistory.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>
            No approval history recorded yet.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {approvalHistory.map((entry, index) => (
              <div
                key={`${entry.status}-${entry.createdAt}-${index}`}
                style={{
                  paddingBottom: "10px",
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <HistoryActionBadge action={entry.status} />
                <div
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.sizes.small.fontSize,
                  }}
                >
                  Requested by {entry.requestedBy}
                  {entry.assignedApprover
                    ? `, assigned to ${entry.assignedApprover}`
                    : ""}
                  {entry.approvedBy ? `, action by ${entry.approvedBy}` : ""}
                </div>
                <div
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.sizes.small.fontSize,
                  }}
                >
                  {new Date(entry.createdAt).toLocaleString("en-KE")}
                </div>
                {entry.comment ? <div>{entry.comment}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <SectionHeading
          icon={<Clock3 size={16} />}
          title="Document History"
        />
        {documentHistory.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>
            No document history recorded yet.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {documentHistory.map((entry, index) => (
              <div
                key={`${entry.action}-${entry.createdAt}-${index}`}
                style={{
                  paddingBottom: "10px",
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <HistoryActionBadge action={entry.action} />
                <div
                  style={{
                    color: colors.text.secondary,
                    fontSize: typography.sizes.small.fontSize,
                  }}
                >
                  {entry.performedBy ? `By ${entry.performedBy}` : "System"} on{" "}
                  {new Date(entry.createdAt).toLocaleString("en-KE")}
                </div>
                {entry.comment ? <div>{entry.comment}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAuditTrail ? (
        <div style={cardStyle}>
          <SectionHeading
            icon={<FileText size={16} />}
            title="Audit Trail"
          />
          {auditTrail.length === 0 ? (
            <p style={{ margin: 0, color: colors.text.secondary }}>
              No audit entries recorded yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {auditTrail.map((entry, index) => (
                <div
                  key={`${entry.action}-${entry.timestamp}-${index}`}
                  style={{
                    paddingBottom: "10px",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <HistoryActionBadge action={entry.action} />
                  <div
                    style={{
                      color: colors.text.secondary,
                      fontSize: typography.sizes.small.fontSize,
                    }}
                  >
                    {entry.user ? `By ${entry.user}` : "System"} on{" "}
                    {new Date(entry.timestamp).toLocaleString("en-KE")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .inventory-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .inventory-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      <ApprovalDialog
        open={dialog !== null}
        onClose={closeDialogs}
        intent={dialog ?? "approve"}
        title={dialog === "reject" ? `Reject ${documentLabel}` : `Approve ${documentLabel}`}
        recordInfo={title}
        pendingAction={
          pendingAction === "approve" || pendingAction === "reject"
            ? pendingAction
            : null
        }
        error={dialogError || undefined}
        approveLabel="Approve"
        rejectLabel="Reject"
        onApprove={
          dialog === "approve" && approveEndpoint
            ? (comment) => runAction(approveEndpoint, comment ? { comment } : undefined)
            : undefined
        }
        onReject={
          dialog === "reject" && rejectEndpoint
            ? (comment) => runAction(rejectEndpoint, comment ? { comment } : undefined)
            : undefined
        }
      />

      <ConfirmDialog
        open={cancelOpen}
        onClose={closeDialogs}
        onConfirm={() => {
          if (cancelEndpoint) runAction(cancelEndpoint);
        }}
        title={`Cancel ${documentLabel}`}
        message={`Cancel ${title}? This stops the document workflow and cannot be undone.`}
        confirmLabel="Cancel Document"
        confirmColor="danger"
        loading={isActionLoading("cancel")}
      />
    </div>
  );
}
