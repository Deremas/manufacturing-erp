"use client";

import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader, SectionHeading } from "@/components/shared";
import { useAccess } from "@/lib/auth/use-access";

type Option = { id: string; code: string; name: string };
type Parameter = { parameterName: string; dataType: string; minimumValue: string; maximumValue: string; expectedText: string; unitId: string; required: boolean };

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 };
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const input: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1px solid #94a3b8", borderRadius: 10, boxSizing: "border-box" };
const label: React.CSSProperties = { color: "#475569", fontSize: 13, fontWeight: 700 };
const button: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 10, padding: "11px 16px", background: "#00897b", color: "white", fontWeight: 700, cursor: "pointer" };
const emptyParameter = (): Parameter => ({ parameterName: "", dataType: "NUMBER", minimumValue: "", maximumValue: "", expectedText: "", unitId: "", required: true });

export function QcSetupPage({ stages, testTypes, templates, units, locations = [], stageRecords = [], testTypeRecords = [], templateRecords = [] }: {
  stages: Option[];
  testTypes: Array<Option & { requiresApproval: boolean }>;
  templates: Array<Option & { testTypeId: string; productionStageId: string | null; parameterCount: number }>;
  units: Array<{ id: string; code: string | null; name: string }>;
  locations?: Array<Option & { isQcHoldLocation: boolean; isFinishedGoodsLocation: boolean }>;
  stageRecords?: Array<Option & { sequence: number; isActive: boolean; isArchived: boolean }>;
  testTypeRecords?: Array<Option & { isActive: boolean; isArchived: boolean }>;
  templateRecords?: Array<Option & { version: number; status: string; isActive: boolean; isArchived: boolean; usageCount: number }>;
}) {
  const router = useRouter();
  const { canAction } = useAccess();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState({ code: "", name: "", sequence: 1, description: "" });
  const [testType, setTestType] = useState({ code: "", name: "", productionStageId: "", requiresBatch: true, requiresMachine: false, requiresApproval: true, blocksReleaseOnFail: true });
  const [template, setTemplate] = useState({ code: "", name: "", testTypeId: "", productionStageId: "" });
  const [parameters, setParameters] = useState<Parameter[]>([emptyParameter()]);
  const [mapping, setMapping] = useState({ productionStageId: "", testTypeId: "", templateId: "", required: true, sequence: 1, blocksNextStageOnFail: true });
  const [editing, setEditing] = useState<{ entity: "stage" | "test-type" | "template"; id: string; code: string; name: string; sequence?: number } | null>(null);
  const [locationPolicy, setLocationPolicy] = useState({ holdLocationId: locations.find((row) => row.isQcHoldLocation)?.id ?? "", finishedGoodsLocationId: locations.find((row) => row.isFinishedGoodsLocation)?.id ?? "" });

  function submit(payload: Record<string, unknown>, reset?: () => void) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/qc/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Unable to save QC setup");
      reset?.();
      setMessage("QC setup saved.");
      router.refresh();
    });
  }

  function lifecycle(entity: string, id: string, action: string) {
    setMessage("");
    startTransition(async () => {
      const url = action === "version" || action === "approve" ? `/api/qc/setup/templates/${id}/${action}` : `/api/qc/setup/${entity}/${id}`;
      const response = await fetch(url, { method: action === "version" || action === "approve" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Unable to update QC setup");
      setMessage("QC setup saved."); router.refresh();
    });
  }

  function saveEdit() {
    if (!editing) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/qc/setup/${editing.entity}/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Unable to update QC setup");
      setEditing(null);
      setMessage("QC setup saved.");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <PageHeader title="QC Setup" subtitle="Configure production stages, test types, versioned templates, parameter limits, and release-blocking mappings." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Setup" }]} />
      {message ? <div style={{ ...card, padding: 14, color: message.includes("saved") ? "#047857" : "#b91c1c" }}>{message}</div> : null}

      <section style={card}>
        <SectionHeading title="Setup Lifecycle" />
        <p style={{ color: "#64748b" }}>Deactivate records without losing history. Used templates are immutable; create and approve a new version instead.</p>
        {editing ? <div style={{ ...grid, padding: 14, marginBottom: 16, background: "#f8fafc", borderRadius: 12 }}>
          <label style={field}><span style={label}>Code</span><input style={input} value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value.toUpperCase() })} /></label>
          <label style={field}><span style={label}>Name</span><input style={input} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
          {editing.entity === "stage" ? <label style={field}><span style={label}>Sequence</span><input type="number" min={0} style={input} value={editing.sequence ?? 0} onChange={(event) => setEditing({ ...editing, sequence: Number(event.target.value) })} /></label> : null}
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}><button disabled={pending} onClick={saveEdit} style={button}><Save size={16} /> Save Changes</button><button onClick={() => setEditing(null)} style={{ ...button, background: "white", color: "#475569", border: "1px solid #cbd5e1" }}>Cancel</button></div>
        </div> : null}
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}><thead><tr>{["Type", "Code", "Name", "Version", "Status", "Usage", "Actions"].map((value) => <th key={value} style={{ textAlign: "left", padding: 10, background: "#f8fafc" }}>{value}</th>)}</tr></thead><tbody>
          {[...stageRecords.map((row) => ({ ...row, entity: "stage", type: "Stage", version: "-", status: row.isArchived ? "ARCHIVED" : row.isActive ? "ACTIVE" : "INACTIVE", usageCount: "-" })), ...testTypeRecords.map((row) => ({ ...row, entity: "test-type", type: "Test Type", version: "-", status: row.isArchived ? "ARCHIVED" : row.isActive ? "ACTIVE" : "INACTIVE", usageCount: "-" })), ...templateRecords.map((row) => ({ ...row, entity: "template", type: "Template" }))].map((row) => <tr key={`${row.entity}-${row.id}`}><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.type}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.code}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.name}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.version}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.status}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{row.usageCount}</td><td style={{ padding: 10, borderTop: "1px solid #e2e8f0", display: "flex", gap: 6 }}>
            {!row.isArchived && canAction("Edit") && <button onClick={() => setEditing({ entity: row.entity as "stage" | "test-type" | "template", id: row.id, code: row.code, name: row.name, sequence: "sequence" in row ? Number(row.sequence) : undefined })} style={{ ...button, padding: "7px 9px", background: "white", color: "#334155", border: "1px solid #cbd5e1" }}>Edit</button>}
            {!row.isArchived && canAction("Edit") && <button onClick={() => lifecycle(row.entity, row.id, row.isActive ? "deactivate" : "activate")} style={{ ...button, padding: "7px 9px", background: "#e0f2f1", color: "#0f766e" }}>{row.isActive ? "Deactivate" : "Activate"}</button>}
            {!row.isArchived && canAction("Delete") && <button onClick={() => lifecycle(row.entity, row.id, "archive")} style={{ ...button, padding: "7px 9px", background: "#fff1f2", color: "#be123c" }}>Archive</button>}
            {row.entity === "template" && canAction("Create") && <button onClick={() => lifecycle(row.entity, row.id, "version")} style={{ ...button, padding: "7px 9px", background: "#eff6ff", color: "#1d4ed8" }}>New Version</button>}
            {row.entity === "template" && row.status === "DRAFT" && canAction("Approve") && <button onClick={() => lifecycle(row.entity, row.id, "approve")} style={{ ...button, padding: "7px 9px" }}>Approve</button>}
          </td></tr>)}
        </tbody></table></div>
      </section>

      <section style={card}>
        <SectionHeading title="Operational Stock Locations" />
        <div style={grid}>
          <label style={field}><span style={label}>QC Hold / Quarantine</span><select style={input} value={locationPolicy.holdLocationId} onChange={(e) => setLocationPolicy({ ...locationPolicy, holdLocationId: e.target.value })}><option value="">Select ...</option>{locations.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
          <label style={field}><span style={label}>Released Finished Goods</span><select style={input} value={locationPolicy.finishedGoodsLocationId} onChange={(e) => setLocationPolicy({ ...locationPolicy, finishedGoodsLocationId: e.target.value })}><option value="">Select ...</option>{locations.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
        </div>
        <button disabled={pending} style={{ ...button, marginTop: 16 }} onClick={() => submit({ entity: "locations", ...locationPolicy })}><Save size={16} /> Save Location Controls</button>
      </section>

      <section style={card}>
        <SectionHeading title="1. Production Stage" />
        <div style={grid}>
          <label style={field}><span style={label}>Code</span><input style={input} value={stage.code} onChange={(e) => setStage({ ...stage, code: e.target.value.toUpperCase() })} /></label>
          <label style={field}><span style={label}>Name</span><input style={input} value={stage.name} onChange={(e) => setStage({ ...stage, name: e.target.value })} /></label>
          <label style={field}><span style={label}>Sequence</span><input type="number" min={0} style={input} value={stage.sequence} onChange={(e) => setStage({ ...stage, sequence: Number(e.target.value) })} /></label>
          <label style={field}><span style={label}>Description</span><input style={input} value={stage.description} onChange={(e) => setStage({ ...stage, description: e.target.value })} /></label>
        </div>
        <button disabled={pending} style={{ ...button, marginTop: 16 }} onClick={() => submit({ entity: "stage", ...stage }, () => setStage({ code: "", name: "", sequence: stages.length + 1, description: "" }))}><Save size={16} /> Save Stage</button>
      </section>

      <section style={card}>
        <SectionHeading title="2. Test Type" />
        <div style={grid}>
          <label style={field}><span style={label}>Code</span><input style={input} value={testType.code} onChange={(e) => setTestType({ ...testType, code: e.target.value.toUpperCase() })} /></label>
          <label style={field}><span style={label}>Name</span><input style={input} value={testType.name} onChange={(e) => setTestType({ ...testType, name: e.target.value })} /></label>
          <label style={field}><span style={label}>Default Stage</span><select style={input} value={testType.productionStageId} onChange={(e) => setTestType({ ...testType, productionStageId: e.target.value })}><option value="">Any stage</option>{stages.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
          {[["requiresBatch", "Requires Batch"], ["requiresMachine", "Requires Machine"], ["requiresApproval", "Requires Approval"], ["blocksReleaseOnFail", "Blocks Release on Failure"]].map(([key, title]) => <label key={key} style={{ ...field, flexDirection: "row", alignItems: "center", marginTop: 25 }}><input type="checkbox" checked={Boolean(testType[key as keyof typeof testType])} onChange={(e) => setTestType({ ...testType, [key]: e.target.checked })} /> <span style={label}>{title}</span></label>)}
        </div>
        <button disabled={pending} style={{ ...button, marginTop: 16 }} onClick={() => submit({ entity: "test-type", ...testType })}><Save size={16} /> Save Test Type</button>
      </section>

      <section style={card}>
        <SectionHeading title="3. Test Template and Parameters" />
        <div style={grid}>
          <label style={field}><span style={label}>Template Code</span><input style={input} value={template.code} onChange={(e) => setTemplate({ ...template, code: e.target.value.toUpperCase() })} /></label>
          <label style={field}><span style={label}>Template Name</span><input style={input} value={template.name} onChange={(e) => setTemplate({ ...template, name: e.target.value })} /></label>
          <label style={field}><span style={label}>Test Type</span><select style={input} value={template.testTypeId} onChange={(e) => setTemplate({ ...template, testTypeId: e.target.value })}><option value="">Select ...</option>{testTypes.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
          <label style={field}><span style={label}>Production Stage</span><select style={input} value={template.productionStageId} onChange={(e) => setTemplate({ ...template, productionStageId: e.target.value })}><option value="">Any stage</option>{stages.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
        </div>
        <div style={{ overflowX: "auto", marginTop: 18 }}>
          <div style={{ minWidth: 940, display: "flex", flexDirection: "column", gap: 10 }}>
            {parameters.map((row, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr .8fr .8fr 1fr 1fr .5fr", gap: 8 }}>
              <input aria-label="Parameter name" placeholder="Parameter name" style={input} value={row.parameterName} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, parameterName: e.target.value } : value))} />
              <select style={input} value={row.dataType} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, dataType: e.target.value } : value))}><option>NUMBER</option><option>TEXT</option><option>BOOLEAN</option></select>
              <input type="number" placeholder="Min" style={input} value={row.minimumValue} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, minimumValue: e.target.value } : value))} />
              <input type="number" placeholder="Max" style={input} value={row.maximumValue} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, maximumValue: e.target.value } : value))} />
              <input placeholder="Expected text" style={input} value={row.expectedText} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, expectedText: e.target.value } : value))} />
              <select style={input} value={row.unitId} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, unitId: e.target.value } : value))}><option value="">No UOM</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code ? `${unit.code} - ` : ""}{unit.name}</option>)}</select>
              <label style={{ display: "flex", alignItems: "center", gap: 5 }}><input type="checkbox" checked={row.required} onChange={(e) => setParameters(parameters.map((value, i) => i === index ? { ...value, required: e.target.checked } : value))} /> Req.</label>
            </div>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" style={{ ...button, background: "#e0f2f1", color: "#00796b" }} onClick={() => setParameters([...parameters, emptyParameter()])}><Plus size={16} /> Add Parameter</button>
          <button disabled={pending} style={button} onClick={() => submit({ entity: "template", ...template, parameters: parameters.map((row) => ({ ...row, minimumValue: row.minimumValue === "" ? null : Number(row.minimumValue), maximumValue: row.maximumValue === "" ? null : Number(row.maximumValue) })) })}><Save size={16} /> Save Template</button>
        </div>
      </section>

      <section style={card}>
        <SectionHeading title="4. Stage Test Mapping" />
        <div style={grid}>
          <label style={field}><span style={label}>Stage</span><select style={input} value={mapping.productionStageId} onChange={(e) => setMapping({ ...mapping, productionStageId: e.target.value })}><option value="">Select ...</option>{stages.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
          <label style={field}><span style={label}>Test Type</span><select style={input} value={mapping.testTypeId} onChange={(e) => setMapping({ ...mapping, testTypeId: e.target.value, templateId: "" })}><option value="">Select ...</option>{testTypes.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></label>
          <label style={field}><span style={label}>Template</span><select style={input} value={mapping.templateId} onChange={(e) => setMapping({ ...mapping, templateId: e.target.value })}><option value="">Select ...</option>{templates.filter((row) => !mapping.testTypeId || row.testTypeId === mapping.testTypeId).map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name} ({row.parameterCount})</option>)}</select></label>
          <label style={field}><span style={label}>Sequence</span><input type="number" min={0} style={input} value={mapping.sequence} onChange={(e) => setMapping({ ...mapping, sequence: Number(e.target.value) })} /></label>
        </div>
        <button disabled={pending} style={{ ...button, marginTop: 16 }} onClick={() => submit({ entity: "mapping", ...mapping })}><Save size={16} /> Save Mapping</button>
      </section>
    </div>
  );
}
