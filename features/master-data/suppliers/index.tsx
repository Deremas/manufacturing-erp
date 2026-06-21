"use client";

// Re-export the new page components
export { default as SuppliersListPage } from "./SuppliersListPage";
export { default as SupplierFormPage } from "./SupplierFormPage";
export { default as SupplierDetailPage } from "./SupplierDetailPage";

// Default export for backward compatibility with route files
export { default } from "./SuppliersListPage";
