export interface NavItem {
  label: string;
  href?: string;
  icon: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  {
    label: "Procurement",
    icon: "ShoppingCart",
    children: [
      {
        label: "Purchase Requisitions",
        href: "/procurement/requisitions",
        icon: "FileText",
      },
      {
        label: "Purchase Orders",
        href: "/procurement/purchase-orders",
        icon: "FileText",
      },
      {
        label: "Goods Receipts / GRN",
        href: "/procurement/grn",
        icon: "Package",
      },
      {
        label: "Supplier Invoices",
        href: "/procurement/supplier-invoices",
        icon: "Receipt",
      },
      {
        label: "Supplier Payments",
        href: "/procurement/payments",
        icon: "CreditCard",
      },
      {
        label: "Supplier Performance",
        href: "/procurement/supplier-performance",
        icon: "TrendingUp",
      },
      {
        label: "Commitment Register",
        href: "/procurement/commitments",
        icon: "BookOpen",
      },
    ],
  },
  {
    label: "Inventory",
    icon: "Package2",
    children: [
      { label: "Stock Overview", href: "/inventory/stock", icon: "Layers" },
      { label: "Bin Cards", href: "/inventory/bin-cards", icon: "CreditCard" },
      {
        label: "Store Requisitions",
        href: "/inventory/requisitions",
        icon: "FileInput",
      },
      { label: "Issue Vouchers", href: "/inventory/issues", icon: "LogOut" },
      { label: "Return Vouchers", href: "/inventory/returns", icon: "Undo2" },
      {
        label: "Stock Transfers",
        href: "/inventory/transfers",
        icon: "ArrowLeftRight",
      },
      {
        label: "Stock Adjustments",
        href: "/inventory/adjustments",
        icon: "Settings2",
      },
      { label: "SRV Card", href: "/inventory/srv-card", icon: "ScrollText" },
      {
        label: "Production Bin Cards",
        href: "/inventory/production-bin-cards",
        icon: "Factory",
      },
    ],
  },
  {
    label: "Production",
    icon: "FlaskConical",
    children: [
      {
        label: "Bill of Materials",
        href: "/production/bom",
        icon: "ClipboardList",
      },
      {
        label: "Cost Settings",
        href: "/production/cost-settings",
        icon: "Coins",
      },
      {
        label: "Cost Reports",
        href: "/production/cost-reports",
        icon: "BarChart3",
      },
    ],
  },
  {
    label: "Shifts",
    icon: "CalendarClock",
    children: [
      { label: "Shift Sessions", href: "/shifts/sessions", icon: "Clock" },
      {
        label: "Daily Report",
        href: "/shifts/daily-report",
        icon: "FileBarChart",
      },
      { label: "Efficiency Report", href: "/shifts/efficiency", icon: "Gauge" },
      { label: "Downtime Report", href: "/shifts/downtime", icon: "TimerOff" },
    ],
  },
  {
    label: "Sales",
    icon: "ShoppingBag",
    children: [
      { label: "Point of Sale", href: "/sales/pos", icon: "CreditCard" },
      {
        label: "Sales History / Invoices",
        href: "/sales/invoices",
        icon: "Receipt",
      },
      {
        label: "Container Tracking",
        href: "/sales/containers",
        icon: "Container",
      },
      { label: "Truck Sales", href: "/sales/truck", icon: "Truck" },
    ],
  },
  { label: "Orders", href: "/orders", icon: "ShoppingCart" },
  {
    label: "Quality Check",
    icon: "CheckCircle2",
    children: [
      { label: "Water Test", href: "/qc/water-test", icon: "Droplets" },
      {
        label: "Microbial Test",
        href: "/qc/microbial-test",
        icon: "Microscope",
      },
      {
        label: "Preform Inspection",
        href: "/qc/preform-inspection",
        icon: "Search",
      },
      {
        label: "Handle Inspection",
        href: "/qc/handle-inspection",
        icon: "Search",
      },
      { label: "Cap Inspection", href: "/qc/cap-inspection", icon: "Search" },
    ],
  },
  {
    label: "HR Management",
    icon: "Users",
    children: [
      { label: "Employees", href: "/hr/employees", icon: "UserCircle" },
      { label: "Attendance", href: "/hr/attendance", icon: "ClipboardCheck" },
      { label: "Overtime", href: "/hr/overtime", icon: "Clock" },
      { label: "Leave Management", href: "/hr/leave", icon: "CalendarOff" },
      { label: "Payroll", href: "/hr/payroll", icon: "DollarSign" },
      {
        label: "Payroll Settings",
        href: "/hr/payroll-settings",
        icon: "Settings",
      },
    ],
  },
  {
    label: "Finance",
    icon: "Landmark",
    children: [
      { label: "Bank Accounts", href: "/finance/banks", icon: "Building2" },
      { label: "Cash Book", href: "/finance/cashbook", icon: "BookOpen" },
      { label: "Expenses", href: "/finance/expenses", icon: "Receipt" },
      { label: "Aging Reports", href: "/finance/aging", icon: "Calendar" },
      {
        label: "Financial Statements",
        href: "/finance/statements",
        icon: "FilePieChart",
      },
      {
        label: "Finance Settings",
        href: "/finance/settings",
        icon: "Settings",
      },
    ],
  },
  {
    label: "Accounting",
    icon: "Calculator",
    children: [
      {
        label: "Chart of Accounts",
        href: "/accounting/chart-of-accounts",
        icon: "BookType",
      },
      {
        label: "Journal Entries",
        href: "/accounting/journals",
        icon: "NotebookPen",
      },
      {
        label: "General Ledger",
        href: "/accounting/general-ledger",
        icon: "BookOpen",
      },
      {
        label: "Trial Balance",
        href: "/accounting/trial-balance",
        icon: "Balance",
      },
    ],
  },
  {
    label: "Maintenance",
    icon: "Wrench",
    children: [
      {
        label: "Work Orders",
        href: "/maintenance/tickets",
        icon: "ClipboardList",
      },
      { label: "PM Schedule", href: "/maintenance/pm", icon: "Calendar" },
      {
        label: "Asset Register",
        href: "/maintenance/assets",
        icon: "Briefcase",
      },
    ],
  },
  {
    label: "Fleet",
    icon: "Truck",
    children: [
      { label: "Vehicles", href: "/fleet/vehicles", icon: "Car" },
      { label: "Drivers", href: "/fleet/drivers", icon: "User" },
      { label: "Trips", href: "/fleet/trips", icon: "Route" },
      { label: "Fuel Records", href: "/fleet/fuel", icon: "Fuel" },
    ],
  },
  {
    label: "Master Data",
    icon: "Database",
    children: [
      { label: "Items", href: "/master-data/items", icon: "Package" },
      {
        label: "Categories",
        href: "/master-data/categories",
        icon: "FolderTree",
      },
      { label: "Item Types", href: "/master-data/item-types", icon: "Tag" },
      { label: "Units", href: "/master-data/units", icon: "Ruler" },
      {
        label: "Unit Conversions",
        href: "/master-data/unit-conversions",
        icon: "ArrowLeftRight",
      },
      { label: "Customers", href: "/master-data/customers", icon: "Users" },
      { label: "Suppliers", href: "/master-data/suppliers", icon: "Truck" },
      {
        label: "Price Lists",
        href: "/master-data/price-lists",
        icon: "DollarSign",
      },
      { label: "Tax Codes", href: "/master-data/tax-codes", icon: "Percent" },
      { label: "Brands", href: "/master-data/brands", icon: "Trademark" },
      { label: "Colors", href: "/master-data/colors", icon: "Palette" },
      { label: "Sizes", href: "/master-data/sizes", icon: "Maximize" },
      {
        label: "Attributes",
        href: "/master-data/attributes",
        icon: "ListChecks",
      },
      {
        label: "Departments",
        href: "/master-data/departments",
        icon: "Building2",
      },
      { label: "Banks", href: "/master-data/banks", icon: "Landmark" },
      {
        label: "Bank Accounts",
        href: "/master-data/bank-accounts",
        icon: "CreditCard",
      },
    ],
  },
  { label: "Reports", href: "/reports", icon: "BarChart4" },
  {
    label: "Administration",
    icon: "Shield",
    children: [
      { label: "Users", href: "/administration/users", icon: "UserCircle" },
      { label: "Roles", href: "/administration/roles", icon: "UserCheck" },
      {
        label: "Permissions",
        href: "/administration/permissions",
        icon: "KeyRound",
      },
      { label: "Locations", href: "/administration/locations", icon: "MapPin" },
      {
        label: "Company Settings",
        href: "/administration/company-settings",
        icon: "Building2",
      },
      {
        label: "System Settings",
        href: "/administration/system-settings",
        icon: "Settings",
      },
      {
        label: "Module Settings",
        href: "/administration/module-settings",
        icon: "Sliders",
      },
      {
        label: "Document Numbering",
        href: "/administration/document-numbering",
        icon: "FileDigit",
      },
      {
        label: "Audit Logs",
        href: "/administration/audit-logs",
        icon: "ClipboardList",
      },
      {
        label: "Print Settings",
        href: "/administration/print-settings",
        icon: "Printer",
      },
    ],
  },
];
