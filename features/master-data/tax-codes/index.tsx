"use client";

// Re-export the new page components
export { default as TaxCodesListPage } from "./TaxCodesListPage";
export { default as TaxCodeFormPage } from "./TaxCodeFormPage";
export { default as TaxCodeDetailPage } from "./TaxCodeDetailPage";

// Default export for backward compatibility with route files
export { default } from "./TaxCodesListPage";
