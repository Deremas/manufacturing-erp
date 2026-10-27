"use client";

import { Plus, Trash2 } from "lucide-react";

import { colors } from "@/components/ui/colors";

export function QCRowActions({
  index,
  count,
  onRemove,
}: {
  index: number;
  count: number;
  onRemove: (index: number) => void;
}) {
  const clears = count <= 1 || index === 0;
  return (
    <button
      type="button"
      aria-label={clears ? "Clear row" : "Remove row"}
      title={clears ? "Clear this line" : "Remove row"}
      onClick={() => onRemove(index)}
      style={{
        border: "none",
        background: "transparent",
        color: colors.danger[600],
        cursor: "pointer",
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

export function QCAddRowButton({ onClick, label = "Add row" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="qc-add-row"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        width: "fit-content",
        justifySelf: "start",
        height: 32,
        padding: "0 12px",
        border: "none",
        borderRadius: 6,
        background: colors.primary[600],
        color: "white",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

export function QCRepeatableRows({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 12 }}>{children}</div>;
}
