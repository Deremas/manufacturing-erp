/** Guide option for native &lt;select&gt; fields — empty value, not a real selection. */
export function SelectPlaceholderOption({ label }: { label: string }) {
  return (
    <option value="" disabled>
      {label}
    </option>
  );
}
