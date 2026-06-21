"use client";

// Re-export the new page components
export { default as UnitsListPage } from "./UnitsListPage";
export { default as UnitFormPage } from "./UnitFormPage";
export { default as UnitDetailPage } from "./UnitDetailPage";

// Default export for backward compatibility with route files
export { default } from "./UnitsListPage";
