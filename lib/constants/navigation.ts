export interface NavItem {
  title: string;
  href?: string;
  icon: string;
  section?: string;
  children?: { title: string; href: string; matchPrefixes?: string[]; exact?: boolean }[];
}

export const navigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Approval Inbox", href: "/approval-inbox", icon: "Inbox" },
  {
    section: "PROCUREMENT",
    title: "Procurement",
    icon: "ShoppingCart",
    children: [
      {
        title: "Purchase Requisitions",
        href: "/procurement/requisitions",
        matchPrefixes: ["/procurement/pr"],
      },
      {
        title: "Purchase Orders",
        href: "/procurement/purchase-orders",
        matchPrefixes: ["/procurement/po"],
      },
      { title: "Goods Receipts / GRN", href: "/procurement/grn" },
      {
        title: "Supplier Returns",
        href: "/procurement/supplier-returns",
        matchPrefixes: ["/procurement/return"],
      },
      {
        title: "Supplier Invoices",
        href: "/procurement/supplier-invoices",
        matchPrefixes: ["/procurement/invoice"],
      },
      {
        title: "Supplier Payments",
        href: "/procurement/payments",
        matchPrefixes: ["/procurement/payment"],
      },
    ],
  },
  {
    section: "INVENTORY",
    title: "Inventory",
    icon: "Package2",
    children: [
      {
        title: "Stock Overview",
        href: "/inventory/stock",
        matchPrefixes: ["/public/inventory/stock/view"],
      },
      { title: "Stock Movements", href: "/inventory/movements" },
      {
        title: "Bin Cards",
        href: "/inventory/bin-cards",
        matchPrefixes: ["/inventory/bin-card"],
      },
      { title: "Low Stock", href: "/inventory/low-stock" },
      {
        title: "Stock Transfers",
        href: "/inventory/transfers",
        matchPrefixes: ["/inventory/xfr"],
      },
      {
        title: "Stock Adjustments",
        href: "/inventory/adjustments",
        matchPrefixes: ["/inventory/adj"],
      },
      { title: "Store Requisitions", href: "/inventory/requisitions" },
      {
        title: "Stock Issues",
        href: "/inventory/issues",
        matchPrefixes: ["/inventory/iss"],
      },
      {
        title: "Stock Returns",
        href: "/inventory/returns",
        matchPrefixes: ["/inventory/returns"],
      },
      {
        title: "SRV Card",
        href: "/inventory/srv",
        matchPrefixes: ["/inventory/srv-card"],
      },
    ],
  },
  { title: "Production Bin Cards", href: "/production-bin-cards", icon: "Factory" },
  {
    section: "PRODUCTION",
    title: "Production",
    icon: "Factory",
    children: [
      {
        title: "Shift Sessions",
        href: "/production/shift-sessions",
        matchPrefixes: ["/shifts/sess", "/shifts/sessions"],
      },
      { title: "Production Stock Balance (WIP)", href: "/production/wip" },
      { title: "Rejected / Reusable Materials", href: "/production/rejected-materials" },
      { title: "Damage History", href: "/production/damage-history" },
      { title: "Daily Report", href: "/production/reports/daily", matchPrefixes: ["/shifts/daily-report", "/shifts/reports/daily"] },
      { title: "Efficiency Report", href: "/production/reports/efficiency", matchPrefixes: ["/shifts/efficiency", "/shifts/reports/efficiency"] },
      { title: "Downtime Report", href: "/production/reports/downtime", matchPrefixes: ["/shifts/downtime", "/shifts/reports/downtime"] },
      { title: "Bill of Materials", href: "/production/bom" },
      { title: "Cost Settings", href: "/production/cost-settings" },
      { title: "Cost Reports (Batch)", href: "/production/reports/batch-cost", matchPrefixes: ["/production/cost-reports/batch-report"] },
      { title: "Cost Report (Main Factory)", href: "/production/reports/factory-cost", matchPrefixes: ["/production/cost-reports/daily-summary"] },
      { title: "Machine Checkup & Handover", href: "/production/machine-checkups" },
      { title: "Targets Calendar", href: "/production/targets", exact: true },
      { title: "Set Targets", href: "/production/targets/set" },
      { title: "Daily View", href: "/production/targets/daily" },
      { title: "Log Production", href: "/production/log-production", matchPrefixes: ["/production/batches", "/production/bat"] },
      { title: "Production Reports", href: "/production/reports", exact: true },
    ],
  },
  {
    section: "SALES",
    title: "Sales",
    icon: "ShoppingBag",
    children: [
      {
        title: "Quotations",
        href: "/sales/quotations",
        matchPrefixes: ["/sales/quo"],
      },
      {
        title: "Sales Orders",
        href: "/sales/orders",
        matchPrefixes: ["/sales/ord"],
      },
      { title: "Point of Sale", href: "/sales/pos" },
      {
        title: "Loading Orders",
        href: "/sales/loading",
        matchPrefixes: ["/sales/ldg"],
      },
      {
        title: "Dispatch Register",
        href: "/sales/dispatch",
        matchPrefixes: ["/sales/dsp"],
      },
      {
        title: "Sales Invoices",
        href: "/sales/invoices",
        matchPrefixes: ["/sales/inv"],
      },
      {
        title: "Credit Notes",
        href: "/sales/credit-notes",
        matchPrefixes: ["/sales/cn"],
      },
      { title: "Accounts Receivable", href: "/sales/receivables" },
      {
        title: "Sales History",
        href: "/sales/history",
        matchPrefixes: ["/sales/sale"],
      },
      {
        title: "Sales Returns",
        href: "/sales/returns",
        matchPrefixes: ["/sales/ret"],
      },
      {
        title: "Customer Receipts",
        href: "/sales/receipts",
        matchPrefixes: ["/sales/rcpt"],
      },
      { title: "Collections", href: "/sales/collections" },
      { title: "Overdue Customers", href: "/sales/collections/overdue" },
      {
        title: "Collections Follow-ups",
        href: "/sales/collections/follow-ups",
        matchPrefixes: ["/sales/fup"],
      },
    ],
  },
  { title: "Orders", href: "/orders", icon: "ShoppingCart" },
  {
    section: "QUALITY CHECK",
    title: "QC Tests",
    href: "/qc",
    icon: "ClipboardCheck",
    children: [
      {
        title: "Water Test",
        href: "/qc/water",
        matchPrefixes: ["/qc/water-test", "/qc/raw-water"],
      },
      { title: "Chlorine Residual", href: "/qc/chlorine-residual" },
      { title: "Treatment Monitoring", href: "/qc/treatment-monitoring" },
      { title: "Physico-Chemical", href: "/qc/physicochemical" },
      { title: "QC Master Data", href: "/qc/master-data" },
      {
        title: "Production Output QC",
        href: "/qc/production-output",
        matchPrefixes: ["/qc/tasks", "/qc/setup"],
      },
      {
        title: "Microbial Test",
        href: "/qc/microbial",
        matchPrefixes: ["/qc/microbial-test"],
      },
      {
        title: "Preform Inspection",
        href: "/qc/preform",
        matchPrefixes: ["/qc/preform-inspection"],
      },
      {
        title: "Handle Inspection",
        href: "/qc/handle",
        matchPrefixes: ["/qc/handle-inspection"],
      },
      {
        title: "Cap Inspection",
        href: "/qc/cap",
        matchPrefixes: ["/qc/cap-inspection"],
      },
      { title: "Management Review", href: "/qc/management-review" },
      { title: "Internal Audit", href: "/qc/internal-audit" },
      { title: "Corrective Action", href: "/qc/corrective-action" },
    ],
  },
  {
    section: "HUMAN RESOURCES",
    title: "HR Management",
    icon: "Users",
    children: [
      { title: "Employees", href: "/hr/employees", matchPrefixes: ["/hr/emp"] },
      { title: "Shift Definitions", href: "/hr/shifts" },
      { title: "Attendance", href: "/hr/attendance" },
      { title: "Work Calendar", href: "/hr/work-calendar" },
      { title: "Overtime", href: "/hr/overtime", matchPrefixes: ["/hr/ot"] },
      { title: "Leave Management", href: "/hr/leave" },
      { title: "Leave Types", href: "/hr/leave-types" },
      { title: "Payroll", href: "/hr/payroll", matchPrefixes: ["/hr/pay"] },
      { title: "Payroll Components", href: "/hr/payroll-components" },
      { title: "Payroll Assignments", href: "/hr/payroll-assignments" },
      { title: "Payroll Settings", href: "/hr/payroll-settings" },
    ],
  },
  {
    section: "FINANCE",
    title: "Finance",
    icon: "Landmark",
    children: [
      { title: "Bank Accounts", href: "/finance/banks" },
      {
        title: "Bank Transfers",
        href: "/finance/bank-transfers",
        matchPrefixes: ["/finance/xfr"],
      },
      {
        title: "Bank Reconciliation",
        href: "/finance/bank-reconciliation",
        matchPrefixes: ["/finance/rec"],
      },
      { title: "Cash Book", href: "/finance/cashbook" },
      { title: "Expenses", href: "/finance/expenses" },
      { title: "Finance Settings", href: "/finance/settings" },
    ],
  },
  {
    section: "FINANCE",
    title: "Accounting",
    icon: "Calculator",
    children: [
      { title: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
      {
        title: "Journal Entries",
        href: "/accounting/journals",
        matchPrefixes: ["/accounting/jrn"],
      },
      { title: "General Ledger", href: "/accounting/general-ledger" },
      { title: "Trial Balance", href: "/accounting/trial-balance" },
    ],
  },
  {
    section: "OPERATIONS",
    title: "Maintenance",
    icon: "Wrench",
    children: [
      {
        title: "Asset Register",
        href: "/assets",
        matchPrefixes: ["/maintenance/asset"],
      },
      {
        title: "Assignments",
        href: "/assets/assignments",
        matchPrefixes: ["/maintenance/asn"],
      },
      {
        title: "Transfers",
        href: "/assets/transfers",
        matchPrefixes: ["/maintenance/xfr"],
      },
      { title: "Types", href: "/assets/types" },
      { title: "Categories", href: "/assets/categories" },
      {
        title: "Tickets",
        href: "/maintenance/tickets",
        matchPrefixes: ["/maintenance/tkt"],
      },
      {
        title: "Work Orders",
        href: "/maintenance/work-orders",
        matchPrefixes: ["/maintenance/wo"],
      },
      { title: "PM Schedule", href: "/maintenance/pm" },
    ],
  },
  {
    title: "Fleet",
    icon: "Truck",
    children: [
      { title: "Vehicles", href: "/fleet/vehicles" },
      { title: "Drivers", href: "/fleet/drivers" },
      { title: "Trips", href: "/fleet/trips" },
      { title: "Fuel Records", href: "/fleet/fuel" },
    ],
  },
  {
    section: "MASTER DATA",
    title: "Master Data",
    icon: "Database",
    children: [
      {
        title: "Items",
        href: "/master-data/items",
        matchPrefixes: ["/master-data/item"],
      },
      {
        title: "Categories",
        href: "/master-data/categories",
        matchPrefixes: ["/master-data/cat"],
      },
      {
        title: "Item Types",
        href: "/master-data/item-types",
        matchPrefixes: ["/master-data/itype"],
      },
      {
        title: "Units",
        href: "/master-data/units",
        matchPrefixes: ["/master-data/unit"],
      },
      {
        title: "Customers",
        href: "/master-data/customers",
        matchPrefixes: ["/master-data/cust"],
      },
      {
        title: "Suppliers",
        href: "/master-data/suppliers",
        matchPrefixes: ["/master-data/sup"],
      },
      {
        title: "Departments",
        href: "/master-data/departments",
        matchPrefixes: ["/master-data/dept"],
      },
      {
        title: "Banks",
        href: "/master-data/banks",
        matchPrefixes: ["/master-data/bank"],
      },
      {
        title: "Bank Accounts",
        href: "/master-data/bank-accounts",
        matchPrefixes: ["/master-data/bacct"],
      },
      {
        title: "Price Lists",
        href: "/master-data/price-lists",
        matchPrefixes: ["/master-data/pl"],
      },
      {
        title: "Tax Codes",
        href: "/master-data/tax-codes",
        matchPrefixes: ["/master-data/tax"],
      },
    ],
  },
  { title: "Reports", href: "/reports", icon: "BarChart4" },
  {
    section: "SYSTEM",
    title: "Administration",
    icon: "Shield",
    children: [
      {
        title: "Users",
        href: "/administration/users",
        matchPrefixes: ["/administration/user"],
      },
      {
        title: "Roles",
        href: "/administration/roles",
        matchPrefixes: ["/administration/role"],
      },
      { title: "Permissions", href: "/administration/permissions" },
      {
        title: "Locations",
        href: "/administration/locations",
        matchPrefixes: ["/administration/loc"],
      },
      {
        title: "Settings",
        href: "/administration/settings",
        matchPrefixes: [
          "/administration/company-settings",
          "/administration/system-settings",
          "/administration/inventory-policies",
          "/administration/approval-policies",
          "/administration/sales-policies",
          "/administration/document-numbering",
          "/administration/docnum",
          "/administration/approvals",
        ],
      },
      { title: "Audit Logs", href: "/administration/audit-logs" },
    ],
  },
];
