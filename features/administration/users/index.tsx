"use client";

// Re-export the new page components
export { default as UsersListPage } from "./UsersListPage";
export { default as UserFormPage } from "./UserFormPage";
export { default as UserDetailPage } from "./UserDetailPage";

// Default export for backward compatibility with route files
export { default } from "./UsersListPage";
