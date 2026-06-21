"use client";

// Re-export the new page components
export { default as CustomersListPage } from "./CustomersListPage";
export { default as CustomerFormPage } from "./CustomerFormPage";
export { default as CustomerDetailPage } from "./CustomerDetailPage";

// Default export for backward compatibility with route files
export { default } from "./CustomersListPage";
