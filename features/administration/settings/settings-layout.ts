import { spacing } from "@/components/ui/spacing";

export const settingsPageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
  padding: `${spacing.page.padding}px`,
  maxWidth: 960,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
};

export const settingsFormShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
  width: "100%",
};

export const settingsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  maxWidth: 880,
};

export const settingsStickyFooterStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 10,
  backgroundColor: "#f8fafc",
  borderTop: "1px solid #e4e7ec",
  padding: "16px 0",
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  maxWidth: 960,
  margin: "0 auto",
  width: "100%",
};
