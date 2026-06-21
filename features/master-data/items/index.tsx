"use client";

// Re-export the new page components
export { default as ItemsListPage } from "./ItemsListPage";
export { default as ItemFormPage } from "./ItemFormPage";
export { default as ItemDetailPage } from "./ItemDetailPage";

// Default export for backward compatibility with route files
export { default } from "./ItemsListPage";
