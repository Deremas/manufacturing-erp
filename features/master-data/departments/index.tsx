"use client";

// Re-export the new page components
export { default as DepartmentsListPage } from "./DepartmentsListPage";
export { default as DepartmentFormPage } from "./DepartmentFormPage";
export { default as DepartmentDetailPage } from "./DepartmentDetailPage";

// Default export for backward compatibility with route files
export { default } from "./DepartmentsListPage";
