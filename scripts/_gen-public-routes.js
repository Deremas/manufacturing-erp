const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/\r?\n/g, "\n"), "utf8");
  console.log("wrote", rel);
}

function legacyRedirect(routeKey, action) {
  return `import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("${routeKey}", id, "${action}");
}
`;
}

// ── HR ───────────────────────────────────────────────────────

write(
  "app/hr/emp/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import EmployeeDetailPage from "@/features/hr/EmployeeDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getEmployeeById } from "@/services/hr/hr.service";
import { listEmployeePayrollAssignments } from "@/services/hr/payroll-assignment.service";

export default async function HrEmployeeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const employee = await getEmployeeById(publicId);
  if (!employee) notFound();

  const payrollAssignments = await listEmployeePayrollAssignments({
    accessibleLocationIds: user.accessibleLocationIds,
    employeeId: employee.id,
  });

  return <EmployeeDetailPage employee={employee} payrollAssignments={payrollAssignments} />;
}
`,
);

write(
  "app/hr/emp/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import EmployeeFormPage from "@/features/hr/EmployeeFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getEmployeeById, getEmployeeFormOptions } from "@/services/hr/hr.service";

export default async function HrEmployeeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [employee, options] = await Promise.all([
    getEmployeeById(publicId),
    getEmployeeFormOptions(),
  ]);
  if (!employee) notFound();

  return (
    <EmployeeFormPage
      initialData={employee}
      departments={options.departments}
      locations={options.locations}
      banks={options.banks}
      users={options.users}
      shiftDefinitions={options.shiftDefinitions}
      submitEndpoint={\`/api/hr/employees/\${employee.id}\`}
      successHref={publicViewUrl("hr.employee", employee.publicId)}
      isEdit
    />
  );
}
`,
);

write(
  "app/hr/leave/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import LeaveRequestDetailPage from "@/features/hr/LeaveRequestDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getLeaveRequestById } from "@/services/hr/leave.service";

export default async function HrLeaveViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const request = await getLeaveRequestById(publicId);
  if (!request) notFound();
  return <LeaveRequestDetailPage request={request} />;
}
`,
);

write(
  "app/hr/leave/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import LeaveRequestFormPage from "@/features/hr/LeaveRequestFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getLeaveReferenceData, getLeaveRequestById } from "@/services/hr/leave.service";

export default async function HrLeaveEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [request, referenceData] = await Promise.all([
    getLeaveRequestById(publicId),
    getLeaveReferenceData(),
  ]);
  if (!request) notFound();

  return (
    <LeaveRequestFormPage
      initialData={request}
      employees={referenceData.employees}
      leaveTypes={referenceData.leaveTypes}
      submitEndpoint={\`/api/hr/leave/\${request.id}\`}
      successHref={publicViewUrl("hr.leave", request.publicId)}
      isEdit
    />
  );
}
`,
);

write(
  "app/hr/ot/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import OvertimeRequestDetailPage from "@/features/hr/OvertimeRequestDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getOvertimeRequestById } from "@/services/hr/overtime.service";

export default async function HrOvertimeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const overtime = await getOvertimeRequestById(publicId);
  if (!overtime) notFound();
  return <OvertimeRequestDetailPage overtime={overtime} />;
}
`,
);

write(
  "app/hr/ot/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import OvertimeRequestFormPage from "@/features/hr/OvertimeRequestFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getOvertimeReferenceData, getOvertimeRequestById } from "@/services/hr/overtime.service";

export default async function HrOvertimeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [referenceData, overtime] = await Promise.all([
    getOvertimeReferenceData(),
    getOvertimeRequestById(publicId),
  ]);
  if (!overtime) notFound();

  return (
    <OvertimeRequestFormPage
      initialData={overtime}
      employees={referenceData.employees}
      reasons={referenceData.reasons}
      shifts={referenceData.shifts}
      submitEndpoint={\`/api/hr/overtime/\${overtime.id}\`}
      successHref={publicViewUrl("hr.overtime", overtime.publicId)}
      isEdit
    />
  );
}
`,
);

write(
  "app/hr/pay/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import PayrollRunDetailPage from "@/features/hr/PayrollRunDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getPayrollRunById, listPayrollPaymentBankAccounts } from "@/services/hr/payroll.service";

export default async function HrPayrollViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const [payroll, bankAccounts] = await Promise.all([
    getPayrollRunById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    listPayrollPaymentBankAccounts({ accessibleLocationIds: user.accessibleLocationIds }),
  ]);
  if (!payroll) notFound();

  return (
    <PayrollRunDetailPage
      payroll={payroll}
      employees={payroll.employees}
      bankAccounts={bankAccounts}
    />
  );
}
`,
);

write("app/hr/employees/[id]/page.tsx", legacyRedirect("hr.employee", "view"));
write("app/hr/employees/[id]/edit/page.tsx", legacyRedirect("hr.employee", "edit"));
write("app/hr/leave/[id]/page.tsx", legacyRedirect("hr.leave", "view"));
write("app/hr/leave/[id]/edit/page.tsx", legacyRedirect("hr.leave", "edit"));
write("app/hr/overtime/[id]/page.tsx", legacyRedirect("hr.overtime", "view"));
write("app/hr/overtime/[id]/edit/page.tsx", legacyRedirect("hr.overtime", "edit"));
write("app/hr/payroll/[id]/page.tsx", legacyRedirect("hr.payroll", "view"));

// ── Administration ───────────────────────────────────────────

write(
  "app/administration/user/view/[publicId]/page.tsx",
  `import Link from "next/link";
import { Users } from "lucide-react";

import { UserDetailPage } from "@/features/administration/users";
import { getUserById } from "@/lib/administration-db";
import { getAuditLogsForRecord } from "@/services/audit/auditLog";

export default async function AdministrationUserViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await getUserById(publicId);
  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "24px" }}>
        <div style={{ maxWidth: "560px", width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Users size={36} strokeWidth={1.8} />
          <h2 style={{ margin: "16px 0 8px", fontSize: "28px" }}>User not found</h2>
          <p style={{ margin: 0, color: "#6b7280" }}>The user record could not be loaded.</p>
          <div style={{ marginTop: "24px" }}>
            <Link href="/administration/users" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 18px", borderRadius: "12px", background: "#008c7a", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const auditEntries = await getAuditLogsForRecord("USER", user.id);
  return (
    <UserDetailPage
      user={user}
      auditEntries={auditEntries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        userName: entry.userName,
        timestamp: entry.timestamp,
      }))}
    />
  );
}
`,
);

write(
  "app/administration/user/edit/[publicId]/page.tsx",
  `import Link from "next/link";
import { Users } from "lucide-react";

import { UserFormPage } from "@/features/administration/users";
import { getLocations, getRoles, getUserById } from "@/lib/administration-db";
import { sql } from "@/lib/db";
import { publicViewUrl } from "@/lib/routing/urls";

export default async function AdministrationUserEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await getUserById(publicId);
  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "24px" }}>
        <div style={{ maxWidth: "560px", width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Users size={36} strokeWidth={1.8} />
          <h2 style={{ margin: "16px 0 8px", fontSize: "28px" }}>User not found</h2>
          <div style={{ marginTop: "24px" }}>
            <Link href="/administration/users" style={{ display: "inline-flex", padding: "12px 18px", borderRadius: "12px", background: "#008c7a", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [roles, locations, departments, userDepartments] = await Promise.all([
    getRoles(),
    getLocations(),
    sql<Array<{ id: string; code: string; name: string }>>\`SELECT id, code, name FROM "Department" WHERE "isActive" = true AND "isArchived" = false ORDER BY name\`,
    sql<Array<{ departmentId: string }>>\`SELECT "departmentId" FROM "UserDepartment" WHERE "userId" = \${user.id}\`,
  ]);

  return (
    <UserFormPage
      initialData={{ ...user, accessibleDepartmentIds: userDepartments.map((row) => row.departmentId) }}
      isCreating={false}
      submitEndpoint={\`/api/administration/users/\${user.id}\`}
      successHref={publicViewUrl("administration.user", user.publicId)}
      roles={roles.map((role) => ({ label: role.name, value: role.id }))}
      locations={locations.map((location) => ({
        label: \`\${location.locationName} (\${location.locationCode})\`,
        value: location.id,
      }))}
      departments={departments.map((department) => ({
        label: \`\${department.name} (\${department.code})\`,
        value: department.id,
      }))}
    />
  );
}
`,
);

write(
  "app/administration/role/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { RoleDetailPage } from "@/features/administration/roles";
import { getRoleById } from "@/lib/administration-db";

export default async function AdministrationRoleViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const role = await getRoleById(publicId);
  if (!role) notFound();
  return <RoleDetailPage role={role} />;
}
`,
);

write(
  "app/administration/role/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { RoleFormPage } from "@/features/administration/roles";
import { getPermissionGroups, getRoleById } from "@/lib/administration-db";

export default async function AdministrationRoleEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [role, permissionGroups] = await Promise.all([
    getRoleById(publicId),
    getPermissionGroups(),
  ]);
  if (!role) notFound();

  return (
    <RoleFormPage
      initialData={role}
      isCreating={false}
      permissionGroups={permissionGroups}
    />
  );
}
`,
);

write(
  "app/administration/loc/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { LocationDetailPage } from "@/features/administration/locations";
import { getLocationById } from "@/lib/master-data-db";

export default async function AdministrationLocationViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const location = await getLocationById(publicId);
  if (!location) notFound();
  return <LocationDetailPage location={location} />;
}
`,
);

write(
  "app/administration/docnum/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { DocumentNumberingFormPage } from "@/features/administration/document-numbering";
import { getById } from "@/services/administration/documentNumberingService";

function parseDescription(description: string | null | undefined, fallback: string) {
  const parts = String(description ?? "").split(" :: ");
  if (parts.length >= 2) {
    return {
      module: parts[0] || "General",
      documentType: parts.slice(1).join(" :: ") || fallback,
    };
  }
  return {
    module: "General",
    documentType: String(description ?? fallback),
  };
}

export default async function AdministrationDocnumEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const result = await getById(publicId);
  if (!result.success || !result.data) notFound();

  const meta = parseDescription(result.data.description, result.data.prefix);

  return (
    <DocumentNumberingFormPage
      isCreating={false}
      initialData={{
        id: result.data.id,
        module: meta.module,
        documentType: meta.documentType,
        prefix: result.data.prefix,
        currentNumber: result.data.currentSequence,
        padding: result.data.sequenceLength,
        resetRule:
          result.data.prefixFormat === "PREFIX_YEAR_MONTH_DAY"
            ? "Daily"
            : result.data.prefixFormat === "PREFIX_YEAR_MONTH"
              ? "Monthly"
              : result.data.prefixFormat === "PREFIX_YEAR"
                ? "Yearly"
                : "Never",
        includeYear: Boolean(result.data.yearFormat),
        includeMonth: Boolean(result.data.monthFormat),
        includeLocation: result.data.dayFormat === "LOC",
        isActive: result.data.isActive ?? true,
      }}
    />
  );
}
`,
);

write("app/administration/users/[id]/page.tsx", legacyRedirect("administration.user", "view"));
write("app/administration/users/[id]/edit/page.tsx", legacyRedirect("administration.user", "edit"));
write("app/administration/roles/[id]/page.tsx", legacyRedirect("administration.role", "view"));
write("app/administration/roles/[id]/edit/page.tsx", legacyRedirect("administration.role", "edit"));
write("app/administration/locations/[id]/page.tsx", legacyRedirect("administration.location", "view"));
write("app/administration/document-numbering/[id]/edit/page.tsx", legacyRedirect("administration.docnum", "edit"));

// ── Master data helpers ──────────────────────────────────────

function mdViewPage({
  routeKey,
  getImport,
  getFn,
  detailImport,
  detailComponent,
  titleExpr,
  listLabel,
  listHref,
  codeExpr,
  extraProps = "",
}) {
  return `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ${detailImport} } from "@/features/master-data/components";
import { ${getImport} } from "@/lib/master-data-db";
import { publicEditUrl } from "@/lib/routing/urls";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await ${getFn}(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={${titleExpr}}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "${listLabel}", href: "${listHref}" },
          { label: ${codeExpr} },
        ]}
        ${extraProps}
      />
      <${detailComponent} ${detailComponent.toLowerCase().includes("customer") ? "customer={record}" : detailComponent.toLowerCase().includes("supplier") ? "supplier={record}" : detailComponent.toLowerCase().includes("category") ? "category={record}" : detailComponent.toLowerCase().includes("unit") && !detailComponent.toLowerCase().includes("account") ? "unit={record}" : detailComponent.toLowerCase().includes("department") ? "department={record}" : detailComponent.toLowerCase().includes("bankaccount") ? "account={record}" : detailComponent.toLowerCase().includes("bank") ? "bank={record}" : detailComponent.toLowerCase().includes("tax") ? "taxCode={record}" : "record={record}"} />
    </div>
  );
}
`;
}

// Item view/edit (special - uses ItemDetailPage / ItemFormPage)
write(
  "app/master-data/item/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { ItemDetailPage } from "@/features/master-data/items";
import { publicEditUrl } from "@/lib/routing/urls";
import { getItemById } from "@/lib/server/item-data";

export default async function MasterDataItemViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const item = await getItemById(publicId);
  if (!item) notFound();

  return (
    <ItemDetailPage
      item={item}
      editHref={publicEditUrl("master-data.item", item.publicId)}
      backHref="/master-data/items"
    />
  );
}
`,
);

write(
  "app/master-data/item/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { ItemFormPage } from "@/features/master-data/items";
import { publicViewUrl } from "@/lib/routing/urls";
import { getItemById } from "@/lib/server/item-data";

export default async function MasterDataItemEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const item = await getItemById(publicId);
  if (!item) notFound();

  return (
    <ItemFormPage
      initialData={item}
      isEdit
      submitEndpoint={\`/api/master-data/items/\${item.id}\`}
      successHref={publicViewUrl("master-data.item", item.publicId)}
    />
  );
}
`,
);

write("app/master-data/items/[id]/page.tsx", legacyRedirect("master-data.item", "view"));
write("app/master-data/items/[id]/edit/page.tsx", legacyRedirect("master-data.item", "edit"));

// Generic master-data entities with server detail pages
const mdEntities = [
  {
    code: "cust",
    key: "master-data.customer",
    legacy: "customers",
    getFn: "getCustomerById",
    detail: "CustomerDetail",
    prop: "customer",
    title: "record.name",
    label: "Customers",
    codeField: "record.customerCode",
    clientEdit: true,
  },
  {
    code: "sup",
    key: "master-data.supplier",
    legacy: "suppliers",
    getFn: "getSupplierById",
    detail: "SupplierDetail",
    prop: "supplier",
    title: "record.name",
    label: "Suppliers",
    codeField: "record.supplierCode",
    clientEdit: true,
  },
  {
    code: "cat",
    key: "master-data.category",
    legacy: "categories",
    getFn: "getCategoryById",
    detail: "CategoryDetail",
    prop: "category",
    title: "record.name",
    label: "Categories",
    codeField: "record.name",
    clientEdit: true,
  },
  {
    code: "unit",
    key: "master-data.unit",
    legacy: "units",
    getFn: "getUnitById",
    detail: "UnitDetail",
    prop: "unit",
    title: "record.name",
    label: "Units",
    codeField: "record.code || record.name",
    clientEdit: true,
  },
  {
    code: "dept",
    key: "master-data.department",
    legacy: "departments",
    getFn: "getDepartmentById",
    detail: "DepartmentDetail",
    prop: "department",
    title: "record.name",
    label: "Departments",
    codeField: "record.code",
    clientEdit: false,
  },
  {
    code: "bank",
    key: "master-data.bank",
    legacy: "banks",
    getFn: "getBankById",
    detail: "BankDetail",
    prop: "bank",
    title: "record.name",
    label: "Banks",
    codeField: "record.code || record.name",
    clientEdit: false,
  },
  {
    code: "bacct",
    key: "master-data.bank-account",
    legacy: "bank-accounts",
    getFn: "getBankAccountById",
    detail: "BankAccountDetail",
    prop: "bankAccount",
    title: "record.accountName",
    label: "Bank Accounts",
    codeField: "record.accountCode",
    clientEdit: false,
  },
  {
    code: "tax",
    key: "master-data.tax-code",
    legacy: "tax-codes",
    getFn: "getTaxCodeById",
    detail: "TaxCodeDetail",
    prop: "taxCode",
    title: "record.taxName",
    label: "Tax Codes",
    codeField: "record.taxCode",
    clientEdit: false,
  },
];

for (const ent of mdEntities) {
  write(
    `app/master-data/${ent.code}/view/[publicId]/page.tsx`,
    `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ${ent.detail} } from "@/features/master-data/components";
import { ${ent.getFn} } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await ${ent.getFn}(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={${ent.title}}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "${ent.label}", href: "/master-data/${ent.legacy}" },
          { label: ${ent.codeField} },
        ]}
      />
      <${ent.detail} ${ent.prop}={record} />
    </div>
  );
}
`,
  );

  write(`app/master-data/${ent.legacy}/[id]/page.tsx`, legacyRedirect(ent.key, "view"));
  write(`app/master-data/${ent.legacy}/[id]/edit/page.tsx`, legacyRedirect(ent.key, "edit"));
}

// Client-edit short routes: thin wrappers that load via dual-lookup API
function clientEditPage(apiPath, formImport, formComponent, listLabel, listHref, titleFn, codeFn, formProp) {
  return `"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ${formImport} } from "@/features/master-data/components";

export default function MasterDataEditPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = String(params.publicId ?? "");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(\`${apiPath}/\${publicId}\`);
        if (!response.ok) {
          setData(null);
          return;
        }
        setData(await response.json());
      } finally {
        setLoading(false);
      }
    };
    if (publicId) load();
  }, [publicId]);

  const handleSubmit = async (formData: unknown) => {
    const id = String(data?.id ?? publicId);
    const response = await fetch(\`${apiPath}/\${id}\`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error("Failed to update");
    router.push("${listHref}");
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;
  if (!data) return <div style={{ padding: "24px" }}>Record not found</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={\`Edit: \${${titleFn}}\`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "${listLabel}", href: "${listHref}" },
          { label: String(${codeFn}) },
          { label: "Edit" },
        ]}
      />
      <${formComponent} ${formProp}={data as never} onSubmit={handleSubmit} />
    </div>
  );
}
`;
}

write(
  "app/master-data/cust/edit/[publicId]/page.tsx",
  clientEditPage(
    "/api/master-data/customers",
    "CustomerForm",
    "CustomerForm",
    "Customers",
    "/master-data/customers",
    "data.name",
    "data.customerCode",
    "initialData",
  ),
);
write(
  "app/master-data/sup/edit/[publicId]/page.tsx",
  clientEditPage(
    "/api/master-data/suppliers",
    "SupplierForm",
    "SupplierForm",
    "Suppliers",
    "/master-data/suppliers",
    "data.name",
    "data.supplierCode",
    "initialData",
  ),
);
write(
  "app/master-data/cat/edit/[publicId]/page.tsx",
  clientEditPage(
    "/api/master-data/categories",
    "CategoryForm",
    "CategoryForm",
    "Categories",
    "/master-data/categories",
    "data.name",
    "data.name",
    "initialData",
  ),
);
write(
  "app/master-data/unit/edit/[publicId]/page.tsx",
  clientEditPage(
    "/api/master-data/units",
    "UnitForm",
    "UnitForm",
    "Units",
    "/master-data/units",
    "data.name",
    "data.code ?? data.name",
    "initialData",
  ),
);

write(
  "app/master-data/dept/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";
import { getDepartmentById } from "@/lib/master-data-db";

export default async function MasterDataDepartmentEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const department = await getDepartmentById(publicId);
  if (!department) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={\`Edit: \${department.name}\`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: department.code },
          { label: "Edit" },
        ]}
      />
      <DepartmentForm initialData={department} />
    </div>
  );
}
`,
);

write(
  "app/master-data/bank/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { BankForm } from "@/features/master-data/components";
import { getBankById } from "@/lib/master-data-db";

export default async function MasterDataBankEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const bank = await getBankById(publicId);
  if (!bank) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={\`Edit: \${bank.name}\`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: bank.shortName },
          { label: "Edit" },
        ]}
      />
      <BankForm initialData={bank} />
    </div>
  );
}
`,
);

write(
  "app/master-data/bacct/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { BankAccountForm } from "@/features/master-data/components";
import { getBankAccountById, getBanks } from "@/lib/master-data-db";

export default async function MasterDataBankAccountEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [bankAccount, banks] = await Promise.all([
    getBankAccountById(publicId),
    getBanks(),
  ]);
  if (!bankAccount) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={\`Edit: \${bankAccount.accountName}\`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: bankAccount.accountCode },
          { label: "Edit" },
        ]}
      />
      <BankAccountForm initialData={bankAccount} banks={banks} />
    </div>
  );
}
`,
);

write(
  "app/master-data/tax/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";
import { getTaxCodeById, getTaxTypes } from "@/lib/master-data-db";

export default async function MasterDataTaxCodeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [taxCode, taxTypes] = await Promise.all([
    getTaxCodeById(publicId),
    getTaxTypes(),
  ]);
  if (!taxCode) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={\`Edit: \${taxCode.taxName}\`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: taxCode.taxName },
          { label: "Edit" },
        ]}
      />
      <TaxCodeForm initialData={taxCode} taxTypes={taxTypes} />
    </div>
  );
}
`,
);

write(
  "app/master-data/itype/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ItemTypeDetailPage } from "@/features/master-data/item-types";
import { getItemTypeById } from "@/lib/master-data-db";

export default async function MasterDataItemTypeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const itemType = await getItemTypeById(publicId);
  if (!itemType) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={itemType.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Item Types", href: "/master-data/item-types" },
          { label: itemType.name },
        ]}
      />
      <ItemTypeDetailPage itemType={itemType} />
    </div>
  );
}
`,
);

write(
  "app/master-data/itype/edit/[publicId]/page.tsx",
  `"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ItemTypeFormPage } from "@/features/master-data/item-types";

export default function MasterDataItemTypeEditPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = String(params.publicId ?? "");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(\`/api/master-data/item-types/\${publicId}\`);
        if (!response.ok) {
          setData(null);
          return;
        }
        setData(await response.json());
      } finally {
        setLoading(false);
      }
    };
    if (publicId) load();
  }, [publicId]);

  if (loading) return <div style={{ padding: "24px" }}>Loading...</div>;
  if (!data) return <div style={{ padding: "24px" }}>Item type not found</div>;

  return (
    <ItemTypeFormPage
      initialData={data as never}
      isEdit
      submitEndpoint={\`/api/master-data/item-types/\${String(data.id)}\`}
      successHref="/master-data/item-types"
    />
  );
}
`,
);

write("app/master-data/item-types/[id]/page.tsx", legacyRedirect("master-data.item-type", "view"));
write("app/master-data/item-types/[id]/edit/page.tsx", legacyRedirect("master-data.item-type", "edit"));

write(
  "app/master-data/pl/view/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListDetail } from "@/features/master-data/components";
import {
  getPriceListById,
  getPriceListUsage,
} from "@/services/master-data/priceListService";

export default async function MasterDataPriceListViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const priceList = await getPriceListById(publicId);
  if (!priceList) notFound();

  const [usage, preferences] = await Promise.all([
    getPriceListUsage(priceList.id),
    getSystemPreferences(),
  ]);

  return (
    <PriceListDetail
      priceList={priceList}
      usage={usage}
      currencyCode={preferences.currencyCode}
    />
  );
}
`,
);

write(
  "app/master-data/pl/edit/[publicId]/page.tsx",
  `import { notFound } from "next/navigation";

import { getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListForm } from "@/features/master-data/components";
import {
  getCustomerGroups,
  getPriceListById,
  getSaleableItems,
} from "@/services/master-data/priceListService";

export default async function MasterDataPriceListEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const priceList = await getPriceListById(publicId);
  if (!priceList) notFound();

  const [saleableItems, customers, locations, customerGroups, preferences] =
    await Promise.all([
      getSaleableItems(),
      getCustomers(),
      getLocations(),
      getCustomerGroups(),
      getSystemPreferences(),
    ]);

  return (
    <PriceListForm
      mode="edit"
      initialData={priceList}
      saleableItems={saleableItems}
      customers={customers}
      locations={locations}
      customerGroups={customerGroups}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}
`,
);

write("app/master-data/price-lists/[id]/page.tsx", legacyRedirect("master-data.price-list", "view"));
write("app/master-data/price-lists/[id]/edit/page.tsx", legacyRedirect("master-data.price-list", "edit"));

console.log("All routes generated");
