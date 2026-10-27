"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Plus, Save } from "lucide-react";

import { colors } from "@/components/ui/colors";
import {
  formatIncubation,
  isUnconfirmedMethod,
  MICRO_RESULT_TYPES,
  microResultTypeId,
  parseIncubation,
  PHYSICO_RESULT_TYPES,
  physicoParameterSlug,
  physicoResultTypeId,
  QC_LAB_UNITS,
} from "@/services/qc/qc-catalog";
import { formatSpecificationLimit } from "@/services/qc/qc-evaluation.service";
import {
  qcInputStyle,
  qcPageTitleStyle,
  qcTdStyle,
  qcThStyle,
  qcToolbarButtonStyle,
} from "./QCWideTable";

type Spec = {
  id: string;
  parameterId: string;
  parameterCode: string;
  parameterName: string;
  dataType: string;
  unitName?: string | null;
  methodReference?: string | null;
  minValue: number | null;
  maxValue: number | null;
  limitText?: string | null;
  qualitativeCriterion?: string | null;
  technique?: string | null;
  incubation?: string | null;
  media?: string | null;
  qualitativeOptions?: string | null;
  configured?: boolean;
};

type PreformType = {
  id: string | null;
  itemId: string;
  itemCode: string;
  itemName: string;
  label: string | null;
  gramMin: number | null;
  gramMax: number | null;
  notes: string | null;
  isActive: boolean;
};

type Catalog = { formCode: string; formTitle: string };

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};
const headingStyle: React.CSSProperties = {
  ...qcThStyle,
  textAlign: "center",
  whiteSpace: "normal",
  verticalAlign: "bottom",
  fontWeight: 500,
};
const greyButtonStyle: React.CSSProperties = { ...qcToolbarButtonStyle, width: "fit-content" };
const primaryButtonStyle: React.CSSProperties = { ...qcToolbarButtonStyle, width: "fit-content", background: colors.primary[600] };
const warnInputStyle: React.CSSProperties = { ...qcInputStyle, background: "#fff7ed", borderColor: "#fdba74" };
const warnText = { fontSize: 11, color: "#c2410c", lineHeight: 1.35 };

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function rangeLimitText(minValue: number | null, maxValue: number | null) {
  const text = formatSpecificationLimit({ minValue, maxValue, limitText: null });
  return text === "Not configured" ? null : text;
}

function labUnitValue(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text || text === "—") return "";
  const match = QC_LAB_UNITS.find(
    (unit) =>
      unit.abbreviation.toLowerCase() === text.toLowerCase() ||
      unit.name.toLowerCase() === text.toLowerCase() ||
      unit.code.toLowerCase() === text.toLowerCase(),
  );
  return match?.abbreviation ?? text;
}

function UnitInput({
  value,
  listId,
  onChange,
}: {
  value?: string | null;
  listId: string;
  onChange: (value: string | null) => void;
}) {
  const selected = labUnitValue(value);
  return (
    <input
      style={qcInputStyle}
      list={listId}
      value={selected || "—"}
      onChange={(event) => {
        const next = event.target.value.trim();
        onChange(!next || next === "—" ? null : next);
      }}
    />
  );
}

function specNeedsAttention(spec: Spec, kind: "physico" | "micro" = "physico") {
  if (!spec.configured || isUnconfirmedMethod(spec.methodReference)) return true;
  if (kind === "micro" && (!String(spec.technique ?? "").trim() || !String(spec.media ?? "").trim())) return true;
  return false;
}

export function QCMasterDataPage({
  physico,
  microbial,
  preformTypes,
  items,
  samplePoints,
  frequencies,
}: {
  physico: { catalog: Catalog; form: { id: string; code: string; title: string } | null; specs: Spec[] };
  microbial: { catalog: Catalog; form: { id: string; code: string; title: string } | null; specs: Spec[] };
  preformTypes: PreformType[];
  items: Array<{ id: string; itemCode: string; itemName: string }>;
  samplePoints: Array<Record<string, unknown>>;
  frequencies: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [addItemId, setAddItemId] = useState("");
  const [physicoSpecs, setPhysicoSpecs] = useState(physico.specs);
  const [microSpecs, setMicroSpecs] = useState(microbial.specs);
  const [preforms, setPreforms] = useState(preformTypes);

  const awaiting = useMemo(() => {
    const rows: Array<{ title: string; detail: string }> = [];
    for (const spec of physicoSpecs) {
      if (!specNeedsAttention(spec, "physico")) continue;
      rows.push({
        title: `${spec.parameterName} (physico-chemical)`,
        detail: spec.configured
          ? "Method reference is missing. Confirm it against the controlled document."
          : isUnconfirmedMethod(spec.methodReference)
            ? "No legible method reference or acceptable limit on the supplied 10L / 15-20L forms. Confirm against the controlled original before relying on the compliance verdict."
            : "Acceptable limit is not confirmed against the controlled document.",
      });
    }
    for (const spec of microSpecs) {
      if (!specNeedsAttention(spec, "micro")) continue;
      rows.push({
        title: `${spec.parameterName} (microbiological)`,
        detail: "ISO method, technique, media or result type still need confirmation against the controlled document.",
      });
    }
    for (const row of preforms) {
      if (row.gramMin != null && row.gramMax != null) continue;
      rows.push({
        title: `${row.label || row.itemName} (preform)`,
        detail: "Approved gram range not supplied. Enter it from the controlled Preform Inspection specification.",
      });
    }
    return rows;
  }, [physicoSpecs, microSpecs, preforms]);

  function saveSpec(spec: Spec, group: "physico" | "micro") {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/qc/master/specifications/${spec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minValue: spec.minValue,
          maxValue: spec.maxValue,
          limitText: spec.limitText,
          qualitativeCriterion: group === "physico"
            ? spec.qualitativeCriterion
            : (spec.dataType === "NUMBER" ? spec.qualitativeCriterion : (spec.qualitativeCriterion || spec.limitText)),
          methodReference: spec.methodReference,
          technique: spec.technique,
          incubation: spec.incubation,
          media: spec.media,
          dataType: spec.dataType,
          qualitativeOptions: spec.qualitativeOptions,
          unitName: spec.unitName,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save specification");
        return;
      }
      const configured = spec.minValue != null || spec.maxValue != null || Boolean(String(spec.limitText ?? "").trim()) || Boolean(String(spec.qualitativeCriterion ?? "").trim());
      const next = { ...spec, configured };
      if (group === "physico") setPhysicoSpecs((current) => current.map((row) => row.id === spec.id ? next : row));
      else setMicroSpecs((current) => current.map((row) => row.id === spec.id ? next : row));
      setMessage("Specification saved.");
    });
  }

  function savePreform(row: PreformType) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/qc/master/item-specs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: row.itemId,
          kind: "PREFORM",
          label: row.label,
          gramMin: row.gramMin,
          gramMax: row.gramMax,
          notes: row.notes,
          isActive: row.isActive,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error ?? "Unable to save preform type");
        return;
      }
      setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...row, id: body.id ?? row.id } : entry));
      setMessage("Preform gram range saved.");
    });
  }

  function addPreformType() {
    const item = items.find((entry) => entry.id === addItemId);
    if (!item) return;
    if (preforms.some((row) => row.itemId === item.id)) {
      setMessage("That item is already in Preform Types.");
      return;
    }
    setPreforms((current) => [
      ...current,
      {
        id: null,
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        label: item.itemName,
        gramMin: null,
        gramMax: null,
        notes: "",
        isActive: true,
      },
    ]);
    setAddItemId("");
  }

  return (
    <div className="qc-raw-water-page" style={{ display: "grid", gap: 12, width: "100%", maxWidth: 1600, minWidth: 0 }}>
      <div className="qc-page-toolbar">
        <div>
          <h1 style={qcPageTitleStyle}>QC Controlled Master Data</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.text.secondary }}>
            Confirm limits against controlled documents. Missing values stay Not configured and never auto-pass.
          </p>
        </div>
        <button type="button" className="no-print" style={greyButtonStyle} onClick={() => router.push("/qc")}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
      {message ? <p style={{ margin: 0, fontSize: 12, color: colors.primary[700] }}>{message}</p> : null}

      {awaiting.length > 0 ? (
        <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderLeft: "4px solid #c2410c", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
            <AlertTriangle size={14} /> Awaiting confirmation against the controlled documents.
          </div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {awaiting.map((row) => (
              <div key={row.title}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>{row.title}</div>
                <div style={warnText}>{row.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <SpecTable
        title="Physico-Chemical Parameters"
        formCode={physico.form?.code || physico.catalog.formCode}
        formTitle={physico.form?.title || physico.catalog.formTitle}
        kind="physico"
        specs={physicoSpecs}
        pending={pending}
        onChange={setPhysicoSpecs}
        onSave={(spec) => saveSpec(spec, "physico")}
      />
      <SpecTable
        title="Microbiological Analyses"
        formCode={microbial.form?.code || microbial.catalog.formCode}
        formTitle={microbial.form?.title || microbial.catalog.formTitle}
        kind="micro"
        specs={microSpecs}
        pending={pending}
        onChange={setMicroSpecs}
        onSave={(spec) => saveSpec(spec, "micro")}
      />

      <section style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Preform Types</div>
            <div style={{ fontSize: 11, color: colors.text.muted }}>Approved gram ranges</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select style={{ ...qcInputStyle, minWidth: 220 }} value={addItemId} onChange={(event) => setAddItemId(event.target.value)}>
              <option value="">Add item as preform type</option>
              {items.filter((item) => !preforms.some((row) => row.itemId === item.id)).map((item) => (
                <option key={item.id} value={item.id}>{item.itemName}</option>
              ))}
            </select>
            <button type="button" className="qc-add-row" style={primaryButtonStyle} disabled={!addItemId} onClick={addPreformType}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        <div className="qc-raw-water-grid">
          <table style={{ minWidth: 980, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Code", "Label", "Gram Min", "Gram Max", "Active", "Note", ""].map((label) => (
                  <th key={label || "save"} style={headingStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preforms.map((row) => {
                const missing = row.gramMin == null || row.gramMax == null;
                return (
                  <tr key={row.itemId}>
                    <td style={qcTdStyle}>{row.itemCode}</td>
                    <td style={qcTdStyle}>
                      <input style={qcInputStyle} value={row.label ?? ""} onChange={(event) => setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...entry, label: event.target.value } : entry))} />
                    </td>
                    <td style={{ ...qcTdStyle, minWidth: 90 }}>
                      <input style={missing ? warnInputStyle : qcInputStyle} value={row.gramMin ?? ""} onChange={(event) => setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...entry, gramMin: toNumber(event.target.value) } : entry))} />
                    </td>
                    <td style={{ ...qcTdStyle, minWidth: 90 }}>
                      <input style={missing ? warnInputStyle : qcInputStyle} value={row.gramMax ?? ""} onChange={(event) => setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...entry, gramMax: toNumber(event.target.value) } : entry))} />
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "center" }}>
                      <input type="checkbox" checked={row.isActive} onChange={(event) => setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...entry, isActive: event.target.checked } : entry))} />
                    </td>
                    <td style={qcTdStyle}>
                      <input style={qcInputStyle} value={row.notes ?? ""} onChange={(event) => setPreforms((current) => current.map((entry) => entry.itemId === row.itemId ? { ...entry, notes: event.target.value } : entry))} />
                      {missing ? <div style={{ ...warnText, marginTop: 4 }}>Approved gram range not supplied, enter it from the controlled Preform Inspection specification.</div> : null}
                    </td>
                    <td style={{ ...qcTdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      {!missing ? <Check size={14} color="#15803d" style={{ marginRight: 8, verticalAlign: "middle" }} /> : null}
                      <button type="button" className="qc-add-row" style={primaryButtonStyle} disabled={pending} onClick={() => savePreform(row)}>
                        <Save size={14} /> Save
                      </button>
                    </td>
                  </tr>
                );
              })}
              {preforms.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: colors.text.muted, textAlign: "center" }}>
                    No preform items found. Create packaging / preform items in Master Data, then return here to enter gram min and gram max.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.text.muted, fontStyle: "italic" }}>
          Both ends of a range, or neither. A half-configured range would pass or fail every preform against one bound, which is worse than reporting that it is not configured.
        </p>
      </section>

      <section style={{ ...cardStyle, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Sample Points</div>
        <div style={{ fontSize: 12, color: colors.text.secondary }}>
          {samplePoints.map((point) => String(point.name)).join(" · ") || "No sample points configured."}
        </div>
      </section>
      <section style={{ ...cardStyle, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Test Frequencies</div>
        <div style={{ fontSize: 12, color: colors.text.secondary }}>
          {frequencies.map((frequency) => String(frequency.name)).join(" · ") || "No frequencies configured."}
        </div>
      </section>
    </div>
  );
}

function applyPhysicoResultType(resultTypeId: string): Partial<Spec> {
  const selected = PHYSICO_RESULT_TYPES.find((row) => row.id === resultTypeId) ?? PHYSICO_RESULT_TYPES[0];
  if (selected.dataType === "NUMBER") {
    return { dataType: "NUMBER" };
  }
  return {
    dataType: "TEXT",
    minValue: null,
    maxValue: null,
  };
}

function SpecTable({
  title,
  formCode,
  formTitle,
  kind,
  specs,
  pending,
  onChange,
  onSave,
}: {
  title: string;
  formCode: string;
  formTitle?: string;
  kind: "physico" | "micro";
  specs: Spec[];
  pending: boolean;
  onChange: (specs: Spec[]) => void;
  onSave: (spec: Spec) => void;
}) {
  const columns = kind === "micro"
    ? ["Parameter / Test", "Method Reference / ISO", "Technique", "Test Condition", "Media", "Result Type", "Unit", "Min", "Max", ""]
    : ["Parameter / Test", "Method Reference / ISO", "Result Type", "Unit", "Min", "Max", "Acceptable Limit", "Qualitative Criterion", ""];
  const compactInput = { ...qcInputStyle, width: 52, minWidth: 52, textAlign: "center" as const };
  return (
    <section style={{ ...cardStyle, padding: 14, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: colors.text.muted }}>— {formCode}{formTitle ? ` — ${formTitle}` : ""}</div>
      </div>
      <div className="qc-raw-water-grid">
        <datalist id={`qc-lab-unit-options-${kind}`}>
          {QC_LAB_UNITS.map((unit) => (
            <option key={unit.code} value={unit.abbreviation} />
          ))}
        </datalist>
        <table style={{ minWidth: kind === "micro" ? 1180 : 1280, width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((label) => (
                <th key={label || "save"} style={headingStyle}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map((spec) => {
              const missingLimits = !spec.configured;
              const missingMethod = isUnconfirmedMethod(spec.methodReference);
              const needsAttention = specNeedsAttention(spec, kind);
              const patch = (next: Partial<Spec>) => onChange(specs.map((row) => row.id === spec.id ? { ...row, ...next } : row));
              const condition = parseIncubation(spec.incubation);
              const numeric = spec.dataType === "NUMBER";
              return (
                <tr key={spec.id}>
                  <td style={qcTdStyle}>
                    <div>{spec.parameterName}</div>
                    <div style={{ marginTop: 2, fontSize: 10, color: colors.text.muted }}>
                      {kind === "physico" ? physicoParameterSlug(spec.parameterCode) : spec.parameterCode.toLowerCase()}
                    </div>
                    {needsAttention ? (
                      <div style={{ ...warnText, marginTop: 4 }}>
                        {kind === "physico" && missingLimits && missingMethod
                          ? "No legible method reference or acceptable limit on the supplied 10L / 15-20L forms. Confirm against the controlled original before relying on the compliance verdict."
                          : missingLimits
                            ? "Acceptable limit is not confirmed against the controlled document."
                            : missingMethod
                              ? "Method reference is missing."
                              : "Technique or media still needs confirmation."}
                      </div>
                    ) : null}
                  </td>
                  <td style={qcTdStyle}>
                    <input
                      style={missingMethod ? warnInputStyle : qcInputStyle}
                      placeholder="e.g. AS21567:2021"
                      value={spec.methodReference ?? ""}
                      onChange={(event) => patch({ methodReference: event.target.value })}
                    />
                  </td>
                  {kind === "micro" ? (
                    <>
                      <td style={qcTdStyle}>
                        <input style={!String(spec.technique ?? "").trim() ? warnInputStyle : qcInputStyle} value={spec.technique ?? ""} onChange={(event) => patch({ technique: emptyToNull(event.target.value) })} />
                      </td>
                      <td style={{ ...qcTdStyle, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            style={compactInput}
                            value={condition.temp}
                            onChange={(event) => patch({ incubation: formatIncubation(event.target.value, condition.hours) })}
                          />
                          <span style={{ fontSize: 11, color: colors.text.muted }}>°C</span>
                          <span style={{ fontSize: 11, color: colors.text.muted }}>/</span>
                          <input
                            style={compactInput}
                            value={condition.hours}
                            onChange={(event) => patch({ incubation: formatIncubation(condition.temp, event.target.value) })}
                          />
                          <span style={{ fontSize: 11, color: colors.text.muted }}>hrs</span>
                        </div>
                      </td>
                      <td style={qcTdStyle}>
                        <input style={!String(spec.media ?? "").trim() ? warnInputStyle : qcInputStyle} value={spec.media ?? ""} onChange={(event) => patch({ media: emptyToNull(event.target.value) })} />
                      </td>
                      <td style={qcTdStyle}>
                        <select
                          style={qcInputStyle}
                          value={microResultTypeId(spec.dataType, spec.qualitativeCriterion || spec.limitText)}
                          onChange={(event) => patch(applyMicroResultType(spec, event.target.value))}
                        >
                          {MICRO_RESULT_TYPES.map((row) => (
                            <option key={row.id} value={row.id}>{row.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={qcTdStyle}>
                        <UnitInput listId={`qc-lab-unit-options-${kind}`} value={spec.unitName} onChange={(unitName) => patch({ unitName })} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={qcTdStyle}>
                        <select
                          style={qcInputStyle}
                          value={physicoResultTypeId(spec.dataType)}
                          onChange={(event) => patch(applyPhysicoResultType(event.target.value))}
                        >
                          {PHYSICO_RESULT_TYPES.map((row) => (
                            <option key={row.id} value={row.id}>{row.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...qcTdStyle, minWidth: 110 }}>
                        <UnitInput listId={`qc-lab-unit-options-${kind}`} value={spec.unitName} onChange={(unitName) => patch({ unitName })} />
                      </td>
                    </>
                  )}
                  <td style={{ ...qcTdStyle, minWidth: 72 }}>
                    <input
                      style={numeric && missingLimits ? warnInputStyle : qcInputStyle}
                      value={spec.minValue ?? ""}
                      disabled={!numeric}
                      onChange={(event) => {
                        const minValue = toNumber(event.target.value);
                        patch({ minValue, limitText: numeric ? rangeLimitText(minValue, spec.maxValue) : spec.limitText });
                      }}
                    />
                  </td>
                  <td style={{ ...qcTdStyle, minWidth: 72 }}>
                    <input
                      style={numeric && missingLimits ? warnInputStyle : qcInputStyle}
                      value={spec.maxValue ?? ""}
                      disabled={!numeric}
                      onChange={(event) => {
                        const maxValue = toNumber(event.target.value);
                        patch({ maxValue, limitText: numeric ? rangeLimitText(spec.minValue, maxValue) : spec.limitText });
                      }}
                    />
                  </td>
                  {kind === "physico" ? (
                    <>
                      <td style={qcTdStyle}>
                        <input
                          style={missingLimits ? warnInputStyle : qcInputStyle}
                          placeholder="e.g. < 100 CFU/1ml"
                          value={spec.limitText ?? ""}
                          onChange={(event) => patch({ limitText: emptyToNull(event.target.value) })}
                        />
                      </td>
                      <td style={qcTdStyle}>
                        <input
                          style={qcInputStyle}
                          placeholder="Absent / Undetectable"
                          value={spec.qualitativeCriterion ?? ""}
                          onChange={(event) => patch({ qualitativeCriterion: emptyToNull(event.target.value) })}
                        />
                      </td>
                    </>
                  ) : null}
                  <td style={{ ...qcTdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                    {!needsAttention ? <Check size={14} color="#15803d" style={{ marginRight: 8, verticalAlign: "middle" }} /> : null}
                    <button type="button" className="qc-add-row" style={primaryButtonStyle} disabled={pending} onClick={() => onSave(spec)}>
                      <Save size={14} /> Save
                    </button>
                  </td>
                </tr>
              );
            })}
            {specs.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 16, color: colors.text.muted, textAlign: "center" }}>No specifications on the default controlled form.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.text.muted, fontStyle: "italic" }}>
        {kind === "physico"
          ? "These values are read by the Physico-Chemical create form. Result type, unit, limits and qualitative criterion control how hourly readings are entered and judged."
          : "These values are read by QC entry forms when a new test is opened. Correct a value here and the next test is judged against it."}
      </p>
    </section>
  );
}

function applyMicroResultType(spec: Spec, resultTypeId: string): Partial<Spec> {
  const selected = MICRO_RESULT_TYPES.find((row) => row.id === resultTypeId) ?? MICRO_RESULT_TYPES[0];
  if (selected.dataType === "NUMBER") {
    return {
      dataType: "NUMBER",
      qualitativeOptions: null,
      qualitativeCriterion: null,
      limitText: null,
    };
  }
  return {
    dataType: "TEXT",
    qualitativeOptions: selected.options,
    qualitativeCriterion: selected.qualitative,
    limitText: selected.qualitative,
    minValue: null,
    maxValue: null,
  };
}

