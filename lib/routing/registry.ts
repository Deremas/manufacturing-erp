export type RouteAction = "view" | "edit" | "print";

export type PublicRouteDef = {
  /** Module segment, e.g. "procurement" */
  module: string;
  /** Short doc code, e.g. "pr" */
  code: string;
  /** Human label */
  label: string;
  /** List page path */
  list: string;
  /** Prisma model / table name */
  model: string;
};

/**
 * Central registry of all ERP documents/records that use publicId URLs.
 * Pattern: /{module}/{code}/view/{publicId}
 */
export const PUBLIC_ROUTE_REGISTRY = {
  // ── Procurement ──────────────────────────────────────────────
  "procurement.pr": {
    module: "procurement",
    code: "pr",
    label: "Purchase Requisition",
    list: "/procurement/requisitions",
    model: "PurchaseRequisition",
  },
  "procurement.po": {
    module: "procurement",
    code: "po",
    label: "Purchase Order",
    list: "/procurement/purchase-orders",
    model: "PurchaseOrder",
  },
  "procurement.grn": {
    module: "procurement",
    code: "grn",
    label: "Goods Receipt",
    list: "/procurement/grn",
    model: "GoodsReceipt",
  },
  "procurement.invoice": {
    module: "procurement",
    code: "invoice",
    label: "Supplier Invoice",
    list: "/procurement/supplier-invoices",
    model: "SupplierInvoice",
  },
  "procurement.payment": {
    module: "procurement",
    code: "payment",
    label: "Supplier Payment",
    list: "/procurement/payments",
    model: "SupplierPayment",
  },
  "procurement.return": {
    module: "procurement",
    code: "return",
    label: "Supplier Return",
    list: "/procurement/supplier-returns",
    model: "SupplierReturn",
  },

  // ── Inventory ────────────────────────────────────────────────
  "inventory.transfer": {
    module: "inventory",
    code: "transfers",
    label: "Stock Transfer",
    list: "/inventory/transfers",
    model: "StockTransfer",
  },
  "inventory.adjustment": {
    module: "inventory",
    code: "adj",
    label: "Stock Adjustment",
    list: "/inventory/adjustments",
    model: "StockAdjustment",
  },
  "inventory.issue": {
    module: "inventory",
    code: "iss",
    label: "Stock Issue",
    list: "/inventory/issues",
    model: "StockIssue",
  },
  "inventory.return": {
    module: "inventory",
    code: "returns",
    label: "Stock Return",
    list: "/inventory/returns",
    model: "StockReturn",
  },
  "inventory.requisition": {
    module: "inventory",
    code: "requisitions",
    label: "Store Requisition",
    list: "/inventory/requisitions",
    model: "StoreRequisition",
  },

  // ── HR ───────────────────────────────────────────────────────
  "hr.employee": {
    module: "hr",
    code: "emp",
    label: "Employee",
    list: "/hr/employees",
    model: "Employee",
  },
  "hr.leave": {
    module: "hr",
    code: "leave",
    label: "Leave Request",
    list: "/hr/leave",
    model: "LeaveRequest",
  },
  "hr.overtime": {
    module: "hr",
    code: "ot",
    label: "Overtime Request",
    list: "/hr/overtime",
    model: "OvertimeRequest",
  },
  "hr.payroll": {
    module: "hr",
    code: "pay",
    label: "Payroll Run",
    list: "/hr/payroll",
    model: "PayrollRun",
  },

  // ── Maintenance ──────────────────────────────────────────────
  "maintenance.asset": {
    module: "maintenance",
    code: "asset",
    label: "Asset",
    list: "/maintenance/assets",
    model: "Asset",
  },
  "maintenance.assignment": {
    module: "maintenance",
    code: "asn",
    label: "Asset Assignment",
    list: "/maintenance/assets/assignments",
    model: "AssetAssignment",
  },
  "maintenance.transfer": {
    module: "maintenance",
    code: "xfr",
    label: "Asset Transfer",
    list: "/maintenance/assets/transfers",
    model: "AssetTransfer",
  },
  "maintenance.ticket": {
    module: "maintenance",
    code: "tkt",
    label: "Maintenance Ticket",
    list: "/maintenance/tickets",
    model: "MaintenanceTicket",
  },
  "maintenance.work-order": {
    module: "maintenance",
    code: "wo",
    label: "Work Order",
    list: "/maintenance/work-orders",
    model: "MaintenanceWorkOrder",
  },
  "maintenance.pm": {
    module: "maintenance",
    code: "pm",
    label: "Preventive Maintenance",
    list: "/maintenance/pm",
    model: "PreventiveMaintenancePlan",
  },

  // ── Sales ────────────────────────────────────────────────────
  "sales.order": {
    module: "sales",
    code: "ord",
    label: "Sales Order",
    list: "/sales/orders",
    model: "SalesOrder",
  },
  "sales.quotation": {
    module: "sales",
    code: "quo",
    label: "Sales Quotation",
    list: "/sales/quotations",
    model: "SalesQuotation",
  },
  "sales.invoice": {
    module: "sales",
    code: "inv",
    label: "Sales Invoice",
    list: "/sales/invoices",
    model: "SalesInvoice",
  },
  "sales.dispatch": {
    module: "sales",
    code: "dsp",
    label: "Sales Dispatch",
    list: "/sales/dispatch",
    model: "SalesDispatch",
  },
  "sales.loading": {
    module: "sales",
    code: "ldg",
    label: "Loading Order",
    list: "/sales/loading",
    model: "LoadingOrder",
  },
  "sales.receipt": {
    module: "sales",
    code: "rcpt",
    label: "Customer Receipt",
    list: "/sales/receipts",
    model: "CustomerReceipt",
  },
  "sales.credit-note": {
    module: "sales",
    code: "cn",
    label: "Credit Note",
    list: "/sales/credit-notes",
    model: "SalesCreditNote",
  },
  "sales.return": {
    module: "sales",
    code: "ret",
    label: "Sales Return",
    list: "/sales/returns",
    model: "SalesReturn",
  },
  "sales.sale": {
    module: "sales",
    code: "sale",
    label: "Sale",
    list: "/sales/history",
    model: "Sale",
  },
  "sales.follow-up": {
    module: "sales",
    code: "fup",
    label: "Collection Follow-up",
    list: "/sales/collections/follow-ups",
    model: "CollectionFollowUp",
  },

  // ── Production ───────────────────────────────────────────────
  "production.batch": {
    module: "production",
    code: "bat",
    label: "Production Batch",
    list: "/production/batches",
    model: "ProductionBatch",
  },
  "production.bom": {
    module: "production",
    code: "bom",
    label: "Bill of Materials",
    list: "/production/bom",
    model: "BOM",
  },
  "shifts.session": {
    module: "shifts",
    code: "sess",
    label: "Shift Session",
    list: "/production/shift-sessions",
    model: "ShiftSession",
  },

  // ── QC ───────────────────────────────────────────────────────
  "qc.record": {
    module: "qc",
    code: "rec",
    label: "QC Test Record",
    list: "/qc",
    model: "QCTestRecord",
  },
  "qc.test": {
    module: "qc",
    code: "tst",
    label: "QC Test",
    list: "/qc",
    model: "QCTest",
  },
  "qc.task": {
    module: "qc",
    code: "task",
    label: "QC Task",
    list: "/qc/tasks",
    model: "QCTask",
  },
  "qc.hold": {
    module: "qc",
    code: "hold",
    label: "Inventory Hold",
    list: "/qc/inventory-holds",
    model: "QCHoldRelease",
  },
  "qc.hold-decision": {
    module: "qc",
    code: "hld",
    label: "Hold Decision",
    list: "/qc/hold-release",
    model: "QCHoldDecision",
  },
  "qc.nc": {
    module: "qc",
    code: "nc",
    label: "Nonconformity",
    list: "/qc/nonconformity",
    model: "QCNonconformity",
  },
  "qc.cip": {
    module: "qc",
    code: "cip",
    label: "CIP Record",
    list: "/qc/cip",
    model: "QCCipRecord",
  },
  "qc.sample": {
    module: "qc",
    code: "sam",
    label: "Retention Sample",
    list: "/qc/retention-samples",
    model: "QCRetentionSample",
  },
  "qc.mgmt-review": {
    module: "qc",
    code: "mr",
    label: "Management Review",
    list: "/qc/management-review",
    model: "QCManagementReview",
  },
  "qc.audit": {
    module: "qc",
    code: "aud",
    label: "Internal Audit",
    list: "/qc/internal-audit",
    model: "QCInternalAudit",
  },
  "qc.capa": {
    module: "qc",
    code: "capa",
    label: "Corrective Action",
    list: "/qc/corrective-action",
    model: "QCCorrectiveAction",
  },

  // ── Master data ──────────────────────────────────────────────
  "master-data.item": {
    module: "master-data",
    code: "item",
    label: "Item",
    list: "/master-data/items",
    model: "Item",
  },
  "master-data.customer": {
    module: "master-data",
    code: "cust",
    label: "Customer",
    list: "/master-data/customers",
    model: "Customer",
  },
  "master-data.supplier": {
    module: "master-data",
    code: "sup",
    label: "Supplier",
    list: "/master-data/suppliers",
    model: "Supplier",
  },
  "master-data.category": {
    module: "master-data",
    code: "cat",
    label: "Category",
    list: "/master-data/categories",
    model: "Category",
  },
  "master-data.unit": {
    module: "master-data",
    code: "unit",
    label: "Unit",
    list: "/master-data/units",
    model: "Unit",
  },
  "master-data.department": {
    module: "master-data",
    code: "dept",
    label: "Department",
    list: "/master-data/departments",
    model: "Department",
  },
  "master-data.bank": {
    module: "master-data",
    code: "bank",
    label: "Bank",
    list: "/master-data/banks",
    model: "Bank",
  },
  "master-data.bank-account": {
    module: "master-data",
    code: "bacct",
    label: "Bank Account",
    list: "/master-data/bank-accounts",
    model: "BankAccount",
  },
  "master-data.tax-code": {
    module: "master-data",
    code: "tax",
    label: "Tax Code",
    list: "/master-data/tax-codes",
    model: "TaxCode",
  },
  "master-data.item-type": {
    module: "master-data",
    code: "itype",
    label: "Item Type",
    list: "/master-data/item-types",
    model: "ItemType",
  },
  "master-data.price-list": {
    module: "master-data",
    code: "pl",
    label: "Price List",
    list: "/master-data/price-lists",
    model: "PriceList",
  },

  // ── Administration ─────────────────────────────────────────
  "administration.user": {
    module: "administration",
    code: "user",
    label: "User",
    list: "/administration/users",
    model: "User",
  },
  "administration.role": {
    module: "administration",
    code: "role",
    label: "Role",
    list: "/administration/roles",
    model: "Role",
  },
  "administration.location": {
    module: "administration",
    code: "loc",
    label: "Location",
    list: "/administration/locations",
    model: "Location",
  },
  "administration.docnum": {
    module: "administration",
    code: "docnum",
    label: "Document Numbering",
    list: "/administration/document-numbering",
    model: "DocumentNumbering",
  },

  // ── Fleet ────────────────────────────────────────────────────
  "fleet.trip": {
    module: "fleet",
    code: "trip",
    label: "Fleet Trip",
    list: "/fleet/trips",
    model: "FleetTrip",
  },

  // ── Finance ─────────────────────────────────────────────────
  "finance.transfer": {
    module: "finance",
    code: "xfr",
    label: "Bank Transfer",
    list: "/finance/bank-transfers",
    model: "BankTransfer",
  },
  "finance.reconciliation": {
    module: "finance",
    code: "rec",
    label: "Bank Reconciliation",
    list: "/finance/bank-reconciliation",
    model: "BankReconciliation",
  },

  // ── Accounting ───────────────────────────────────────────────
  "accounting.journal": {
    module: "accounting",
    code: "jrn",
    label: "Journal Entry",
    list: "/accounting/journals",
    model: "JournalEntry",
  },
} as const satisfies Record<string, PublicRouteDef>;

export type PublicRouteKey = keyof typeof PUBLIC_ROUTE_REGISTRY;

export function getPublicRouteDef(key: PublicRouteKey): PublicRouteDef {
  return PUBLIC_ROUTE_REGISTRY[key];
}
