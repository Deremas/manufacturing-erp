"use client";

// Re-export the new page components
export { default as RolesListPage } from "./RolesListPage";
export { default as RoleFormPage } from "./RoleFormPage";
export { default as RoleDetailPage } from "./RoleDetailPage";

// Default export for backward compatibility with route files
export { default } from "./RolesListPage";
