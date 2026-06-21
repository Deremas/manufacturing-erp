"use client";

// Re-export the new page components
export { default as CategoriesListPage } from "./CategoriesListPage";
export { default as CategoryFormPage } from "./CategoryFormPage";
export { default as CategoryDetailPage } from "./CategoryDetailPage";

// Default export for backward compatibility with route files
export { default } from "./CategoriesListPage";
