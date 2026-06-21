"use client";

// Re-export the new page components
export { default as BankAccountsListPage } from "./BankAccountsListPage";
export { default as BankAccountFormPage } from "./BankAccountFormPage";
export { default as BankAccountDetailPage } from "./BankAccountDetailPage";

// Default export for backward compatibility with route files
export { default } from "./BankAccountsListPage";
