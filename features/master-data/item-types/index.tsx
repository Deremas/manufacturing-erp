"use client";

// Re-export the new page components
export { default as ItemTypesListPage } from "./ItemTypesListPage";
export { default as ItemTypeFormPage } from "./ItemTypeFormPage";
export { default as ItemTypeDetailPage } from "./ItemTypeDetailPage";

// Default export for backward compatibility with route files
export { default } from "./ItemTypesListPage";
