import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { CompanySettingsPage, DocumentNumberingPage, SystemSettingsPage } from "@/features/administration";
import { ApprovalPoliciesPage } from "@/features/administration/approval-policies/ApprovalPoliciesPage";
import InventoryPoliciesPage from "@/features/administration/inventory-policies/InventoryPoliciesPage";
import ProcurementSettingsPage from "@/features/administration/procurement-settings/ProcurementSettingsPage";
import { SalesPoliciesPage } from "@/features/administration/sales-policies/SalesPoliciesPage";
import {
  AdministrationSettingsTabs,
} from "@/features/administration/settings/AdministrationSettingsTabs";
import { isAdministrationSettingsTab, type AdministrationSettingsTab } from "@/features/administration/settings/settings-config";
import { getDocumentNumberings, getRoleById, getRoles, getUserById, getUsers } from "@/lib/administration-db";
import { getCurrentUser } from "@/lib/auth/auth";
import { listApprovalPolicies } from "@/services/approval/approval-policy.service";
import { getPendingApprovals } from "@/services/approval/approvalService";
import { listInventoryApprovalPolicies } from "@/services/inventory/inventory-policy.service";

export const dynamic = "force-dynamic";

function resolveApprovalHref(referenceType: string, referenceId: string) {
  const map: Record<string, string> = {
    "inventory.transfer": `/inventory/transfers/${referenceId}`,
    "inventory.adjustment": `/inventory/adjustments/${referenceId}`,
    "inventory.issue": `/inventory/issues/${referenceId}`,
    "inventory.return": `/inventory/returns/${referenceId}`,
    "inventory.requisition": `/inventory/srv/${referenceId}`,
  };
  return map[referenceType] ?? "#";
}

async function renderSettingsContent(activeTab: AdministrationSettingsTab) {
  if (activeTab === "company") return <CompanySettingsPage />;
  if (activeTab === "system") return <SystemSettingsPage />;
  if (activeTab === "inventory") {
    const [user, policies] = await Promise.all([getCurrentUser(), listInventoryApprovalPolicies()]);
    if (!user) redirect("/auth/login");
    return <InventoryPoliciesPage policies={policies} />;
  }
  if (activeTab === "approvals") return <ApprovalPoliciesPage initialItems={await listApprovalPolicies()} />;
  if (activeTab === "sales") {
    const [baseRoles, baseUsers] = await Promise.all([getRoles(), getUsers()]);
    const [roles, users] = await Promise.all([
      Promise.all(baseRoles.map(async (role) => (await getRoleById(role.id)) ?? role)),
      Promise.all(baseUsers.map(async (user) => (await getUserById(user.id)) ?? user)),
    ]);
    return <SalesPoliciesPage roles={roles} users={users} />;
  }
  if (activeTab === "procurement") return <ProcurementSettingsPage />;
  if (activeTab === "numbering") return <DocumentNumberingPage initialData={await getDocumentNumberings()} />;

  const approvals = await getPendingApprovals();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px`, padding: `${spacing.page.padding}px` }}>
      <PageHeader title="Approval Queue" subtitle="Pending approvals assigned across inventory workflows." breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Settings", href: "/administration/settings" }, { label: "Approval Queue" }]} />
      <div style={{ display: "grid", gap: 12 }}>
        {approvals.length === 0 ? (
          <div style={{ padding: 20, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, background: colors.surface }}>All approvals are up to date.</div>
        ) : approvals.map((approval) => (
          <Link key={approval.id} href={resolveApprovalHref(approval.referenceType, approval.referenceId)} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 16, textDecoration: "none", color: colors.text.primary, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, backgroundColor: colors.surface }}>
            <strong>{approval.referenceType}</strong>
            <span>Reference: {approval.referenceId}</span>
            <span>Requested By: {approval.requestedByName}</span>
            <span>Assigned Approver: {approval.assignedApproverName ?? "Unassigned"}</span>
            <span>Created: {new Date(approval.createdAt).toLocaleString("en-KE")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function AdministrationSettingsWorkspace({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab: AdministrationSettingsTab = isAdministrationSettingsTab(requestedTab) ? requestedTab : "company";
  return (
    <div style={{ minHeight: "100%", background: "#f8fafc" }}>
      <AdministrationSettingsTabs activeTab={activeTab} />
      {await renderSettingsContent(activeTab)}
    </div>
  );
}
