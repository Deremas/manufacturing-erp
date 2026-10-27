"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Plus } from "lucide-react";

import { ActionButtons, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicViewUrl, type PublicRouteKey } from "@/lib/routing";
import { QCAddRowButton, QCRowActions } from "./QCRepeatableRows";
import { QCStatusBadge } from "./QCStatusBadge";
import { QCSearchSelect } from "./QCSearchSelect";
import { QCWideTable, qcInputStyle, qcTableStyle, qcTdStyle, qcThStyle } from "./QCWideTable";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="qc-field" style={{ display: "grid", gap: 6 }}>
      <span className="qc-field-label" style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>{label}</span>
      {children}
    </div>
  );
}

export function QCSimpleList({
  title,
  createHref,
  columns,
  rows,
  viewBase,
  routeKey,
}: {
  title: string;
  createHref: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
  viewBase: string;
  routeKey?: PublicRouteKey;
}) {
  const router = useRouter();
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1400 }}>
      <PageHeader title={title} breadcrumbs={[{ label: "QC", href: "/qc" }, { label: title }]} actions={<ActionButtons actions={[{ label: "New Record", icon: <Plus size={16} />, onClick: () => router.push(createHref) }]} />} />
      <div className="qc-wide-table-scroll" style={{ overflowX: "auto", background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, minWidth: 0 }}>
        <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
          <thead>
            <tr>{[...columns.map((col) => col.label), "Status", "Actions"].map((label) => <th key={label} style={{ textAlign: "left", padding: 12, background: "#f8fafc" }}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                {columns.map((col) => <td key={col.key} style={{ padding: 12 }}>{String(row[col.key] ?? "—")}</td>)}
                <td style={{ padding: 12 }}><QCStatusBadge status={String(row.status ?? "")} /></td>
                <td style={{ padding: 12 }}><Link aria-label="View" href={routeKey && row.publicId != null ? publicViewUrl(routeKey, Number(row.publicId)) : `${viewBase}/${row.id}`}><Eye size={16} color={colors.primary[700]} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QCQualityForm({
  title,
  endpoint,
  fields,
  grids,
  initial,
  redirectTo,
}: {
  title: string;
  endpoint: string;
  fields: Array<{ key: string; label: string; type?: string; options?: Array<{ value: string; label: string }> }>;
  grids?: Array<{ key: string; title: string; minWidth: number; columns: Array<{ key: string; label: string; type?: string }>; seed: Record<string, string> }>;
  initial?: Record<string, unknown>;
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const field of fields) next[field.key] = String(initial?.[field.key] ?? (field.type === "date" ? new Date().toISOString().slice(0, 10) : ""));
    return next;
  });
  const [gridState, setGridState] = useState<Record<string, Array<Record<string, string>>>>(() => {
    const next: Record<string, Array<Record<string, string>>> = {};
    for (const grid of grids ?? []) {
      const existing = Array.isArray(initial?.[grid.key]) ? initial[grid.key] as Array<Record<string, unknown>> : [];
      next[grid.key] = existing.length ? existing.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "")]))) : [{ ...grid.seed }];
    }
    return next;
  });

  function save(submit = false) {
    startTransition(async () => {
      const payload: Record<string, unknown> = { ...values };
      for (const grid of grids ?? []) payload[grid.key] = gridState[grid.key];
      const response = await fetch(endpoint, { method: initial?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Save failed");
        return;
      }
      if (submit && body.id) await fetch(`${endpoint.split("?")[0]}/${body.id}/submit`, { method: "POST" }).catch(() => undefined);
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 1400, minWidth: 0 }}>
      <PageHeader recordKind={initial?.id ? "qc.record" : undefined} title={title} breadcrumbs={[{ label: "QC", href: "/qc" }, { label: title }]} actions={<ActionButtons actions={[{ label: "Back", variant: "secondary", onClick: () => router.push(redirectTo) }]} />} />
      {message ? <p style={{ color: colors.danger[700] }}>{message}</p> : null}
      <div style={{ background: "white", borderRadius: 10, padding: 14, border: `1px solid ${colors.border}`, display: "grid", gap: 12, minWidth: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, overflow: "visible" }}>
          {fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.options ? (
                <QCSearchSelect
                  value={values[field.key]}
                  placeholder="Select ..."
                  options={field.options}
                  onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                />
              ) : field.type === "textarea" ? (
                <textarea style={{ ...qcInputStyle, minHeight: 80 }} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
              ) : (
                <input type={field.type ?? "text"} style={qcInputStyle} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
              )}
            </Field>
          ))}
        </div>
        {(grids ?? []).map((grid) => (
          <section key={grid.key} style={{ minWidth: 0 }}>
            <h3>{grid.title}</h3>
            <QCWideTable minWidth={grid.minWidth}>
              <table style={qcTableStyle}>
                <thead>
                  <tr>{[...grid.columns.map((col) => col.label), ""].map((label) => <th key={label} style={qcThStyle}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {(gridState[grid.key] ?? []).map((row, index) => (
                    <tr key={index}>
                      {grid.columns.map((col) => (
                        <td key={col.key} style={qcTdStyle}>
                          {col.type === "textarea" ? (
                            <textarea style={{ ...qcInputStyle, minWidth: 220, minHeight: 64 }} value={row[col.key] ?? ""} onChange={(event) => setGridState((current) => ({ ...current, [grid.key]: current[grid.key].map((item, rowIndex) => rowIndex === index ? { ...item, [col.key]: event.target.value } : item) }))} />
                          ) : (
                            <input style={qcInputStyle} value={row[col.key] ?? ""} onChange={(event) => setGridState((current) => ({ ...current, [grid.key]: current[grid.key].map((item, rowIndex) => rowIndex === index ? { ...item, [col.key]: event.target.value } : item) }))} />
                          )}
                        </td>
                      ))}
                      <td style={qcTdStyle}><QCRowActions index={index} count={gridState[grid.key].length} onRemove={(removeIndex) => setGridState((current) => ({ ...current, [grid.key]: blankOrRemoveRow(current[grid.key], removeIndex, { ...grid.seed }) }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </QCWideTable>
            <div style={{ marginTop: 10 }}>
              <QCAddRowButton onClick={() => setGridState((current) => ({ ...current, [grid.key]: [...current[grid.key], { ...grid.seed }] }))} />
            </div>
          </section>
        ))}
        <div className="qc-save-row no-print">
          <ActionButtons
            actions={[
              { label: "Cancel", variant: "secondary", onClick: () => router.push(redirectTo), disabled: pending },
              { label: "Save", variant: "primary", onClick: () => save(false), disabled: pending, loading: pending },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
