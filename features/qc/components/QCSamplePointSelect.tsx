"use client";

import { QCSearchSelect } from "./QCSearchSelect";

export function QCSamplePointSelect({
  value,
  onChange,
  points,
  required,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  points: Array<{ id: string; name: string; groupName: string }>;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <QCSearchSelect
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      placeholder="— select —"
      grouped
      options={points.map((point) => ({
        value: point.id,
        label: point.name,
        group: point.groupName,
      }))}
    />
  );
}
