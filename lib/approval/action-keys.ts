export type ApprovalActionKey = "approve" | "reject" | "submit" | "post" | "cancel" | "generate-issue";

export function approvalActionKeyFromEndpoint(endpoint: string): ApprovalActionKey | null {
  if (endpoint.includes("/approve")) return "approve";
  if (endpoint.includes("/reject")) return "reject";
  if (endpoint.includes("/submit")) return "submit";
  if (endpoint.includes("/generate-issue")) return "generate-issue";
  if (endpoint.includes("/post")) return "post";
  if (endpoint.includes("/cancel")) return "cancel";
  return null;
}
