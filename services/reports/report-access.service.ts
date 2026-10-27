import { checkPermission } from "@/lib/permissions/permissions";
import type { User } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export type ReportModuleKey =
  | "inventory"
  | "procurement"
  | "production"
  | "shifts"
  | "qc"
  | "sales"
  | "ar"
  | "accounting"
  | "fleet"
  | "finance"
  | "hr"
  | "maintenance"
  | "executive";

export interface ReportLinkDefinition {
  title: string;
  href: string;
  description: string;
  permission?: string;
  channelPermission?: string;
}

export interface ReportGroupDefinition {
  key: ReportModuleKey;
  title: string;
  description: string;
  icon: string;
  permission?: string;
  links: ReportLinkDefinition[];
}

export interface AccessibleReportGroup extends ReportGroupDefinition {
  reportCount: number;
}

const reportRegistry: ReportGroupDefinition[] = [
  {
    key: "inventory",
    title: "Inventory",
    description: "Warehouse, stock, valuation, and reservation reporting.",
    icon: "Package2",
    permission: "reports.inventory.view",
    links: [
      { title: "Stock Status", href: "/reports/inventory/stock-status", description: "Current stock by item and location." },
      { title: "Stock Movements", href: "/reports/inventory/stock-movements", description: "Inventory ledger and transaction flow." },
      { title: "Bin Card", href: "/reports/inventory/bin-card", description: "Running item movement ledger by location." },
      { title: "Low Stock", href: "/reports/inventory/low-stock", description: "Items at or below reorder point." },
      { title: "Production Bin Card", href: "/reports/inventory/production-bin-card", description: "Production-facing stock movement view." },
    ],
  },
  {
    key: "procurement",
    title: "Procurement",
    description: "Supplier, commitments, and purchasing analysis.",
    icon: "ShoppingCart",
    permission: "reports.procurement.view",
    links: [
      { title: "Supplier Performance", href: "/reports/procurement/supplier-performance", description: "Supplier performance from live procurement activity." },
      { title: "Commitment Register", href: "/reports/procurement/commitment-register", description: "Outstanding procurement commitments and payable exposure." },
    ],
  },
  {
    key: "production",
    title: "Production",
    description: "Costing, output, and manufacturing performance.",
    icon: "FlaskConical",
    permission: "reports.production.view",
    links: [
      { title: "Batch Cost", href: "/reports/production/batch-cost", description: "Actual production batch cost from posted records." },
      { title: "Daily Cost Summary", href: "/reports/production/daily-cost-summary", description: "Daily production cost rollup." },
    ],
  },
  {
    key: "shifts",
    title: "Shifts",
    description: "Shift performance, output, and downtime.",
    icon: "CalendarClock",
    permission: "reports.production.view",
    links: [
      { title: "Shift Daily", href: "/reports/shifts/daily", description: "Shift output, downtime, and efficiency summary." },
      { title: "Efficiency", href: "/reports/shifts/efficiency", description: "Planned versus actual production efficiency." },
      { title: "Downtime", href: "/reports/shifts/downtime", description: "Downtime by session, line, and reason." },
    ],
  },
  {
    key: "qc",
    title: "Quality Control",
    description: "Quality assurance and rejection visibility.",
    icon: "CheckCircle2",
    permission: "reports.qc.view",
    links: [
      { title: "Water Tests", href: "/reports/qc/water-tests", description: "Water test register and outcome trend." },
      { title: "Chlorine Residual", href: "/qc/chlorine-residual", description: "Chlorine residual checklists by date and shift." },
      { title: "Treatment Monitoring", href: "/qc/treatment-monitoring", description: "Treatment process monitoring sheets." },
      { title: "Physico-Chemical", href: "/qc/physicochemical", description: "Hourly physico-chemical readings." },
      { title: "Microbial Tests", href: "/qc/microbial", description: "Microbial analysis with delayed results." },
      { title: "Preform Inspection", href: "/qc/preform", description: "Incoming preform inspections." },
      { title: "Handle Inspection", href: "/qc/handle", description: "Handle inspection register." },
      { title: "Cap Inspection", href: "/qc/cap", description: "Cap inspection register." },
      { title: "Packaging Inspection", href: "/qc/packaging", description: "Finished packaging inspection." },
      { title: "CIP Records", href: "/qc/cip", description: "Cleaning-in-place verification records." },
      { title: "Retention Samples", href: "/qc/retention-samples", description: "Retain-until and disposal log." },
      { title: "Product Hold / Release", href: "/qc/hold-release", description: "Standalone QC hold decisions (no stock posting)." },
      { title: "Inventory Holds", href: "/qc/inventory-holds", description: "Held, released, rejected, and scrapped stock controls." },
      { title: "Nonconformity", href: "/reports/qc/nonconformity", description: "Open and closed quality nonconformities." },
      { title: "Management Review", href: "/qc/management-review", description: "Management review minutes and resolutions." },
      { title: "Internal Audit", href: "/qc/internal-audit", description: "Audit findings and effectiveness." },
      { title: "Corrective Action", href: "/qc/corrective-action", description: "Corrective action plans and follow-up." },
      { title: "Daily Summary", href: "/qc/daily-records", description: "Operational daily QC records by shift and test type." },
      { title: "Task Status / Overdue", href: "/reports/qc/task-status", description: "QC assignment, due date, priority, and overdue control." },
      { title: "Parameter Trends", href: "/reports/qc/parameter-trends", description: "Measured parameter results and limit trends." },
      { title: "Batch Release", href: "/reports/qc/batch-release", description: "Held, released, reworked, rejected, and scrapped batch quantities." },
      { title: "Hold Aging", href: "/reports/qc/hold-aging", description: "Open quarantine quantities and aging." },
      { title: "Disposition Cost", href: "/reports/qc/disposition-cost", description: "Rejection, rework, and scrap cost exposure." },
      { title: "Machine Quality Failures", href: "/reports/qc/machine-failures", description: "Machine-linked QC failures and maintenance response." },
    ],
  },
  {
    key: "sales",
    title: "Sales",
    description: "Commercial, loading, dispatch, and channel reporting.",
    icon: "ShoppingBag",
    permission: "reports.sales.view",
    links: [
      { title: "Daily Sales", href: "/reports/sales/daily-sales", description: "Daily revenue and quantity from posted sales." },
      { title: "Product Sales", href: "/reports/sales/product-sales", description: "Sales by product using snapshot prices." },
      { title: "Channel Sales", href: "/reports/sales/channel-sales", description: "Performance by FACTORY, BRANCH, TRUCK, and AGENT channels." },
      { title: "Loading Orders", href: "/reports/sales/loading-orders", description: "Reserve-only loading flow and confirmation status." },
      { title: "Branch Sales", href: "/reports/sales/branch-sales", description: "Branch-channel sales in allowed locations." },
      { title: "Truck Sales", href: "/reports/sales/truck-sales", description: "Truck-channel sales and trip context." },
      { title: "Agent Sales", href: "/reports/sales/agent-sales", description: "Agent-channel sales and fulfillment." },
    ],
  },
  {
    key: "ar",
    title: "Accounts Receivable",
    description: "Receivable balances, statements, and collection views.",
    icon: "Wallet",
    permission: "reports.sales.view",
    links: [
      { title: "AR Summary", href: "/reports/ar/summary", description: "Customer-level receivable exposure." },
      { title: "AR Aging", href: "/reports/ar/aging", description: "Receivable aging buckets." },
      { title: "Customer Statement", href: "/reports/ar/customer-statement", description: "Statement, export, and print workflow." },
      { title: "Overdue Customers", href: "/reports/ar/overdue-customers", description: "Customers requiring collection attention." },
      { title: "Collections Follow-up", href: "/reports/ar/collections-follow-up", description: "Collector notes and payment promises." },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    description: "Cash, expense, aging, financial statement, and finance posting visibility.",
    icon: "Landmark",
    permission: "reports.finance.view",
    links: [
      { title: "Cashbook", href: "/reports/finance/cashbook", description: "Posted cash and bank account journal movements." },
      { title: "Expenses", href: "/reports/finance/expenses", description: "Posted expense register with source drill-down." },
      { title: "Customer Aging", href: "/reports/finance/customer-aging", description: "Customer receivable exposure by aging bucket." },
      { title: "Supplier Aging", href: "/reports/finance/supplier-aging", description: "Outstanding supplier payables by aging bucket." },
      { title: "Procurement Finance Register", href: "/reports/finance/procurement-register", description: "Procurement finance postings from supplier invoices and payments." },
      { title: "Finance Exceptions", href: "/reports/finance/exceptions", description: "Missing journals, imbalances, and unallocated receipts requiring action." },
      { title: "Financial Statements", href: "/reports/finance/financial-statements", description: "Profit and loss and balance sheet from posted journals." },
    ],
  },
  {
    key: "accounting",
    title: "Accounting",
    description: "Ledger and journal-based accounting reports.",
    icon: "Calculator",
    permission: "reports.accounting.view",
    links: [
      { title: "Chart of Accounts", href: "/reports/accounting/chart-of-accounts", description: "Chart of accounts reference report." },
      { title: "Journal Register", href: "/reports/accounting/journal-register", description: "Journal register and source reference." },
      { title: "General Ledger", href: "/reports/accounting/general-ledger", description: "Account movement and ledger balance." },
      { title: "Trial Balance", href: "/reports/accounting/trial-balance", description: "Trial balance from posted journal lines." },
    ],
  },
  {
    key: "maintenance",
    title: "Maintenance",
    description: "Assets, tickets, work orders, preventive maintenance, and downtime-linked maintenance visibility.",
    icon: "Wrench",
    permission: "reports.maintenance.view",
    links: [
      { title: "Asset Register", href: "/reports/maintenance/asset-register", description: "Maintenance asset register and ownership context." },
      { title: "Work Orders", href: "/reports/maintenance/work-orders", description: "Maintenance work order execution, labor, and cost visibility." },
      { title: "Breakdowns", href: "/reports/maintenance/breakdowns", description: "Breakdown and corrective maintenance ticket register." },
      { title: "Preventive Maintenance", href: "/reports/maintenance/preventive-maintenance", description: "Preventive schedule register and due visibility." },
      { title: "Downtime", href: "/reports/maintenance/downtime", description: "Maintenance-linked production downtime review." },
      { title: "Spare Parts Usage", href: "/reports/maintenance/spare-parts-usage", description: "Spare part consumption through maintenance work orders." },
      { title: "Asset Maintenance Cost", href: "/reports/maintenance/asset-maintenance-cost", description: "Asset-level maintenance cost review." },
      { title: "Open Tickets", href: "/reports/maintenance/open-tickets", description: "Maintenance tickets still awaiting assignment or closure." },
      { title: "Open Work Orders", href: "/reports/maintenance/open-work-orders", description: "Work orders not yet closed, cancelled, or rejected." },
      { title: "Overdue Work Orders", href: "/reports/maintenance/overdue-work-orders", description: "Open work orders past their scheduled finish." },
      { title: "PM Compliance", href: "/reports/maintenance/pm-compliance", description: "Scheduled versus completed preventive maintenance." },
      { title: "Spare Damage", href: "/reports/maintenance/spare-damage", description: "Spare parts recorded as damaged during work." },
      { title: "Direct Issues", href: "/reports/maintenance/direct-issues", description: "Spare issues raised directly against a work order." },
      { title: "Warranty Expiry", href: "/reports/maintenance/warranty-expiry", description: "Assets approaching or past warranty end dates." },
      { title: "Department Cost", href: "/reports/maintenance/department-cost", description: "Maintenance cost rolled up by owning department." },
      { title: "Repeat Failures", href: "/reports/maintenance/repeat-failures", description: "Assets with more than one breakdown or corrective ticket." },
    ],
  },
  {
    key: "hr",
    title: "HR",
    description: "Attendance visibility from live workforce participation in shift operations.",
    icon: "Users",
    permission: "reports.hr.view",
    links: [
      { title: "Attendance", href: "/reports/hr/attendance", description: "Location-scoped attendance from shift attendance records." },
      { title: "Leave", href: "/reports/hr/leave", description: "Approved and pending employee leave register." },
      { title: "Overtime", href: "/reports/hr/overtime", description: "Overtime hours, day type, multiplier, and approval status." },
      { title: "Payroll", href: "/reports/hr/payroll", description: "Payroll period totals and posting status." },
    ],
  },
  {
    key: "fleet",
    title: "Fleet",
    description: "Vehicle, driver, trip, and fuel visibility from live fleet records.",
    icon: "Truck",
    permission: "reports.fleet.view",
    links: [
      { title: "Vehicles", href: "/reports/fleet/vehicles", description: "Registered operational fleet vehicles." },
      { title: "Drivers", href: "/reports/fleet/drivers", description: "Assigned fleet drivers and status." },
      { title: "Trips", href: "/reports/fleet/trips", description: "Trip lifecycle, route, and dispatch context." },
      { title: "Fuel", href: "/reports/fleet/fuel", description: "Fuel record register." },
    ],
  },
];

function canAccessPermission(user: User, permission?: string) {
  if (!permission) {
    return true;
  }

  if (user.isSystem || user.permissions.includes("*")) {
    return true;
  }

  return checkPermission(user, permission);
}

export function getReportRegistry() {
  return reportRegistry;
}

export function getModuleReportLinks(key: ReportModuleKey) {
  return reportRegistry.find((group) => group.key === key)?.links.map((link) => ({
    title: link.title,
    href: link.href,
    description: link.description,
    icon: "BarChart3",
  })) ?? [];
}

export function getAccessibleReportGroups(user: User): AccessibleReportGroup[] {
  return reportRegistry
    .filter((group) => canAccessPermission(user, group.permission))
    .map((group) => {
      const links = group.links.filter((link) => {
        if (!canAccessPermission(user, link.permission)) {
          return false;
        }

        if (link.channelPermission && !checkPermission(user, link.channelPermission)) {
          const hasScopedChannelPermission = user.permissions.some((permission) =>
            permission.startsWith("sales.") && permission.endsWith(".use"),
          );
          if (hasScopedChannelPermission) {
            return false;
          }
        }

        return true;
      });

      return {
        ...group,
        links,
        reportCount: links.length,
      };
    })
    .filter((group) => group.reportCount > 0);
}

function findReportGroup(key: string) {
  return reportRegistry.find((group) => group.key === key);
}

export function userCanViewReportGroup(user: User, key: string) {
  const group = findReportGroup(key);
  if (!group) {
    return false;
  }

  return canAccessPermission(user, group.permission);
}

export function requireReportGroupAccess(user: User, key: string) {
  if (!userCanViewReportGroup(user, key)) {
    redirect("/reports");
  }
}
