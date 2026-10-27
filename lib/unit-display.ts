export function formatUomLabel(input: {
  uomCode?: string | null;
  uomName?: string | null;
  abbreviation?: string | null;
}) {
  const code = String(input.uomCode ?? input.abbreviation ?? "")
    .trim()
    .toUpperCase();
  const name = String(input.uomName ?? "").trim();

  if (code && name) {
    return `${code} - ${name}`;
  }

  return name || code || "";
}
