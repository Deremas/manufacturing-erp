import { sql } from "@/lib/db";
export { assertSegregation } from "@/services/approval/segregation";

export interface ApprovalPolicyInput {
  module: string; resource: string; requireCheck?: boolean; requireApproval?: boolean; requirePosting?: boolean;
  checkerRoleId?: string | null; approverRoleId?: string | null; posterRoleId?: string | null;
  amountThreshold?: number | null; quantityThreshold?: number | null; makerCannotCheckOwn?: boolean;
  checkerCannotApproveOwn?: boolean; approverCannotPostOwn?: boolean; isActive?: boolean;
}

export async function getApprovalPolicy(module: string, resource: string) {
  const rows = await sql<Array<Record<string, unknown>>>`SELECT * FROM "ApprovalPolicy" WHERE module = ${module} AND resource = ${resource} AND "isActive" = true LIMIT 1`;
  return rows[0] ?? null;
}

export async function listApprovalPolicies() {
  return sql<Array<Record<string, unknown>>>`SELECT * FROM "ApprovalPolicy" ORDER BY module, resource`;
}

export async function saveApprovalPolicy(input: ApprovalPolicyInput) {
  if (!input.module.trim() || !input.resource.trim()) throw new Error("Approval policy module and resource are required");
  const rows = await sql<Array<Record<string, unknown>>>`
    INSERT INTO "ApprovalPolicy" (id, module, resource, "requireCheck", "requireApproval", "requirePosting", "checkerRoleId", "approverRoleId", "posterRoleId", "amountThreshold", "quantityThreshold", "makerCannotCheckOwn", "checkerCannotApproveOwn", "approverCannotPostOwn", "isActive", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${input.module.trim()}, ${input.resource.trim()}, ${input.requireCheck ?? false}, ${input.requireApproval ?? true}, ${input.requirePosting ?? false}, ${input.checkerRoleId ?? null}, ${input.approverRoleId ?? null}, ${input.posterRoleId ?? null}, ${input.amountThreshold ?? null}, ${input.quantityThreshold ?? null}, ${input.makerCannotCheckOwn ?? true}, ${input.checkerCannotApproveOwn ?? true}, ${input.approverCannotPostOwn ?? true}, ${input.isActive ?? true}, NOW(), NOW())
    ON CONFLICT (module, resource) DO UPDATE SET "requireCheck" = EXCLUDED."requireCheck", "requireApproval" = EXCLUDED."requireApproval", "requirePosting" = EXCLUDED."requirePosting", "checkerRoleId" = EXCLUDED."checkerRoleId", "approverRoleId" = EXCLUDED."approverRoleId", "posterRoleId" = EXCLUDED."posterRoleId", "amountThreshold" = EXCLUDED."amountThreshold", "quantityThreshold" = EXCLUDED."quantityThreshold", "makerCannotCheckOwn" = EXCLUDED."makerCannotCheckOwn", "checkerCannotApproveOwn" = EXCLUDED."checkerCannotApproveOwn", "approverCannotPostOwn" = EXCLUDED."approverCannotPostOwn", "isActive" = EXCLUDED."isActive", "updatedAt" = NOW()
    RETURNING *`;
  return rows[0];
}
