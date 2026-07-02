import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

export type InventoryPolicyDocumentType =
  | "transfer"
  | "adjustment"
  | "issue"
  | "return"
  | "requisition";

export interface InventoryApprovalPolicy {
  documentType: InventoryPolicyDocumentType;
  title: string;
  requireApproval: boolean;
  minimumValueThreshold: number;
  minimumQuantityThreshold: number;
  requiredRole: string;
  autoApproveForAdmin: boolean;
  isActive: boolean;
}

export interface InventoryPolicyRequirementInput {
  documentType: InventoryPolicyDocumentType;
  totalQuantity?: number;
  totalValue?: number;
  fromLocationId?: string | null;
  userId?: string | null;
}

const POLICY_TITLES: Record<InventoryPolicyDocumentType, string> = {
  transfer: "Transfer Approval",
  adjustment: "Adjustment Approval",
  issue: "Issue Approval",
  return: "Return Approval",
  requisition: "Store Requisition Approval",
};

const POLICY_KEYS: Record<InventoryPolicyDocumentType, string> = {
  transfer: "inventory_policy_transfer",
  adjustment: "inventory_policy_adjustment",
  issue: "inventory_policy_issue",
  return: "inventory_policy_return",
  requisition: "inventory_policy_requisition",
};

const LEGACY_REQUIREMENT_KEYS: Partial<Record<InventoryPolicyDocumentType, string>> = {
  adjustment: "inventory_require_adjustment_approval",
  issue: "inventory_require_issue_approval",
  return: "inventory_require_return_approval",
  requisition: "inventory_require_requisition_approval",
};

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function defaultPolicy(documentType: InventoryPolicyDocumentType): InventoryApprovalPolicy {
  return {
    documentType,
    title: POLICY_TITLES[documentType],
    requireApproval: false,
    minimumValueThreshold: 0,
    minimumQuantityThreshold: 0,
    requiredRole: "",
    autoApproveForAdmin: false,
    isActive: true,
  };
}

function parsePolicyValue(documentType: InventoryPolicyDocumentType, rawValue?: string | null) {
  const fallback = defaultPolicy(documentType);
  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<InventoryApprovalPolicy>;
    return {
      ...fallback,
      requireApproval: toBoolean(parsed.requireApproval, fallback.requireApproval),
      minimumValueThreshold: toNumber(parsed.minimumValueThreshold, fallback.minimumValueThreshold),
      minimumQuantityThreshold: toNumber(parsed.minimumQuantityThreshold, fallback.minimumQuantityThreshold),
      requiredRole: String(parsed.requiredRole ?? fallback.requiredRole).trim(),
      autoApproveForAdmin: toBoolean(parsed.autoApproveForAdmin, fallback.autoApproveForAdmin),
      isActive: toBoolean(parsed.isActive, fallback.isActive),
    } satisfies InventoryApprovalPolicy;
  } catch {
    return fallback;
  }
}

async function getUserRole(userId?: string | null) {
  if (!userId) {
    return "";
  }

  const rows = await sql<Array<{ role: string | null; roleName: string | null }>>`
    SELECT u.role, r.name AS "roleName"
    FROM "User" u
    LEFT JOIN "Role" r ON r.id = u."roleId"
    WHERE u.id = ${userId}
      AND u."isArchived" = false
    LIMIT 1
  `;

  return String(rows[0]?.roleName ?? rows[0]?.role ?? "").trim();
}

async function locationRequiresTransferApproval(fromLocationId?: string | null) {
  if (!fromLocationId) {
    return false;
  }

  const rows = await sql<Array<{ requireTransferApproval: boolean }>>`
    SELECT COALESCE("requireTransferApproval", false) AS "requireTransferApproval"
    FROM "Location"
    WHERE id = ${fromLocationId}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0]?.requireTransferApproval ?? false;
}

export async function getInventoryApprovalPolicy(documentType: InventoryPolicyDocumentType) {
  const key = POLICY_KEYS[documentType];
  const [policyRow] = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = ${key}
      AND "isArchived" = false
    LIMIT 1
  `;

  const policy = parsePolicyValue(documentType, policyRow?.value);
  if (documentType === "transfer" || policy.requireApproval) {
    return policy;
  }

  const legacyKey = LEGACY_REQUIREMENT_KEYS[documentType];
  if (!legacyKey) {
    return policy;
  }

  const [legacyRow] = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "SystemSetting"
    WHERE key = ${legacyKey}
      AND "isArchived" = false
    LIMIT 1
  `;

  return {
    ...policy,
    requireApproval: toBoolean(legacyRow?.value, policy.requireApproval),
  };
}

export async function listInventoryApprovalPolicies() {
  const documentTypes = Object.keys(POLICY_KEYS) as InventoryPolicyDocumentType[];
  return Promise.all(documentTypes.map((documentType) => getInventoryApprovalPolicy(documentType)));
}

export async function saveInventoryApprovalPolicies(policies: InventoryApprovalPolicy[]) {
  for (const policy of policies) {
    const normalized: InventoryApprovalPolicy = {
      ...defaultPolicy(policy.documentType),
      ...policy,
      title: POLICY_TITLES[policy.documentType],
      minimumValueThreshold: toNumber(policy.minimumValueThreshold),
      minimumQuantityThreshold: toNumber(policy.minimumQuantityThreshold),
      requiredRole: String(policy.requiredRole ?? "").trim(),
      requireApproval: toBoolean(policy.requireApproval),
      autoApproveForAdmin: toBoolean(policy.autoApproveForAdmin),
      isActive: toBoolean(policy.isActive, true),
    };

    await sql`
      INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
      VALUES (
        ${randomUUID()},
        ${POLICY_KEYS[policy.documentType]},
        ${JSON.stringify(normalized)},
        'inventory',
        false
      )
      ON CONFLICT ("key") DO UPDATE SET
        "value" = EXCLUDED."value",
        "category" = EXCLUDED."category",
        "isArchived" = false
    `;

    const legacyKey = LEGACY_REQUIREMENT_KEYS[policy.documentType];
    if (legacyKey) {
      await sql`
        INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
        VALUES (
          ${randomUUID()},
          ${legacyKey},
          ${normalized.requireApproval ? "true" : "false"},
          'inventory',
          false
        )
        ON CONFLICT ("key") DO UPDATE SET
          "value" = EXCLUDED."value",
          "category" = EXCLUDED."category",
          "isArchived" = false
      `;
    }
  }

  return listInventoryApprovalPolicies();
}

export async function evaluateInventoryApprovalRequirement(input: InventoryPolicyRequirementInput) {
  const policy = await getInventoryApprovalPolicy(input.documentType);
  const role = await getUserRole(input.userId);
  const totalQuantity = toNumber(input.totalQuantity);
  const totalValue = toNumber(input.totalValue);

  const locationRuleRequired =
    input.documentType === "transfer"
      ? await locationRequiresTransferApproval(input.fromLocationId)
      : false;

  const policyThresholdRequired =
    policy.isActive &&
    policy.requireApproval &&
    (
      policy.minimumQuantityThreshold <= 0 ||
      totalQuantity >= policy.minimumQuantityThreshold
    ) &&
    (
      policy.minimumValueThreshold <= 0 ||
      totalValue >= policy.minimumValueThreshold
    ) &&
    (
      !policy.requiredRole ||
      role.toLowerCase() !== policy.requiredRole.toLowerCase()
    );

  const approvalRequired = locationRuleRequired || policyThresholdRequired;
  const isAdmin =
    role.toLowerCase() === "admin" ||
    role.toLowerCase() === "super admin" ||
    role.toLowerCase() === "superadmin";

  return {
    policy,
    totalQuantity,
    totalValue,
    role,
    approvalRequired,
    autoApprovedForAdmin: approvalRequired && isAdmin && policy.autoApproveForAdmin,
  };
}
