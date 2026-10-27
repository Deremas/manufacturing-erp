import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { listApprovalPolicies, saveApprovalPolicy } from "@/services/approval/approval-policy.service";

export async function GET() {
  return withApiAuthorization("administration.approvalPolicy.view", async () => ({ items: await listApprovalPolicies() }));
}

export async function POST(request: Request) {
  return withApiAuthorization("administration.approvalPolicy.manage", async () => ({ item: await saveApprovalPolicy(await request.json()) }));
}
