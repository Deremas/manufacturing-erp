import { redirect } from "next/navigation";

import InventoryPoliciesPage from "@/features/administration/inventory-policies/InventoryPoliciesPage";
import { getCurrentUser } from "@/lib/auth/auth";
import { listInventoryApprovalPolicies } from "@/services/inventory/inventory-policy.service";

export default async function AdministrationInventoryPoliciesPage() {
  const [user, policies] = await Promise.all([
    getCurrentUser(),
    listInventoryApprovalPolicies(),
  ]);

  if (!user) {
    redirect("/auth/login");
  }

  return <InventoryPoliciesPage policies={policies} />;
}
