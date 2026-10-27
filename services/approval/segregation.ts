export function assertSegregation(input: { actorId: string; makerId?: string | null; checkerId?: string | null; approverId?: string | null; action: "CHECK" | "APPROVE" | "POST"; policy?: Record<string, unknown> | null }) {
  if (input.action === "CHECK" && input.policy?.makerCannotCheckOwn !== false && input.actorId === input.makerId) throw new Error("Segregation of duties: maker cannot check their own document");
  if (input.action === "APPROVE" && input.policy?.checkerCannotApproveOwn !== false && input.actorId === input.checkerId) throw new Error("Segregation of duties: checker cannot approve their own document");
  if (input.action === "POST" && input.policy?.approverCannotPostOwn !== false && input.actorId === input.approverId) throw new Error("Segregation of duties: approver cannot post their own document");
}
