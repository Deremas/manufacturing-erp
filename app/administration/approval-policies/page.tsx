import { ApprovalPoliciesPage } from "@/features/administration/approval-policies/ApprovalPoliciesPage";
import { listApprovalPolicies } from "@/services/approval/approval-policy.service";

export const dynamic = "force-dynamic";
export default async function Page() {
  return <ApprovalPoliciesPage initialItems={await listApprovalPolicies()} />;
}
