export const administrationSettingsTabs = [
  { key: "company", label: "Company", description: "Identity and business profile" },
  { key: "system", label: "System", description: "Application-wide defaults" },
  { key: "inventory", label: "Inventory", description: "Inventory workflow policies" },
  { key: "approvals", label: "Approvals", description: "Approval policy rules" },
  { key: "sales", label: "Sales", description: "Sales control policies" },
  { key: "procurement", label: "Procurement", description: "Payment terms and purchase defaults" },
  { key: "numbering", label: "Numbering", description: "Document sequences" },
  { key: "queue", label: "Approval Queue", description: "Pending approvals" },
] as const;

export type AdministrationSettingsTab = (typeof administrationSettingsTabs)[number]["key"];

export function isAdministrationSettingsTab(value: string | undefined): value is AdministrationSettingsTab {
  return administrationSettingsTabs.some((tab) => tab.key === value);
}
