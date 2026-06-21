"use client";

// Re-export the new page components
export { default as BanksListPage } from "./BanksListPage";
export { default as BankFormPage } from "./BankFormPage";
export { default as BankDetailPage } from "./BankDetailPage";

// Default export for backward compatibility with route files
export { default } from "./BanksListPage";
