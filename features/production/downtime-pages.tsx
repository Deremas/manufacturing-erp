"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Square, Wrench } from "lucide-react";
import { RecordDetailIcon } from "@/components/shared";

type Row = Record<string, any>;
type RefData = { reasons: Row[]; shifts: Row[]; machines: Row[]; users: Row[] };
const shell: React.CSSProperties = { padding: 24, display: "grid", gap: 20, background: "#f8fafc", minHeight: "100%" };
const card: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20, overflowX: "auto" };
const input: React.CSSProperties = { width: "100%", padding: "11px 13px", border: "1px solid #94a3b8", borderRadius: 12, background: "white" };
const button: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: 0, borderRadius: 12, background: "#0f766e", color: "white", fontWeight: 700, cursor: "pointer", textDecoration: "none" };

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
function Header({ title, subtitle, action, recordKind }: { title: string; subtitle: string; action?: React.ReactNode; recordKind?: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}>{recordKind ? <RecordDetailIcon kind={recordKind} /> : null}<div><h1 style={{ margin: 0, fontSize: 28 }}>{title}</h1><p style={{ margin: "6px 0 0", color: "#64748b" }}>{subtitle}</p></div></div>{action}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#475569" }}>{label}{children}</label>;
}
function Status({ value }: { value: any }) {
  const background = ["CLOSED", "RESTORED"].includes(value) ? "#dcfce7" : value === "OPEN" ? "#fee2e2" : "#fef3c7";
  return <span style={{ padding: "5px 9px", borderRadius: 999, background, fontSize: 12, fontWeight: 800 }}>{String(value).replaceAll("_", " ")}</span>;
}

export function DowntimeListPage() {
  const [items, setItems] = useState<Row[]>([]); const [q, setQ] = useState(""); const [error, setError] = useState("");
  useEffect(() => { json("/api/production/downtime").then((x) => setItems(x.items)).catch((e) => setError(e.message)); }, []);
  const rows = useMemo(() => items.filter((x) => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())), [items, q]);
  return <main style={shell}>
    <Header title="Machine Downtime" subtitle="Live production interruptions, maintenance links, loss, and restoration." action={<Link href="/production/downtime/create" style={button}><Plus size={17}/>Start downtime</Link>}/>
    {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
    <section style={card}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search downtime, machine, shift, batch, or failure..." style={{ ...input, maxWidth: 430, marginBottom: 16 }}/>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}><thead><tr>{["No", "Machine", "Location", "Shift", "Failure", "Start", "Duration", "Lost Qty", "Ticket / WO", "Status", "Actions"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((x) => <tr key={x.id}>{[x.downtimeNo || "-", x.machine || "-", x.locationName, x.sessionNo, x.reasonName, x.startTime ? new Date(x.startTime).toLocaleString() : "-", `${x.durationMinutes || 0} min`, x.actualLostQty ?? x.estimatedLostQty ?? "-", [x.maintenanceTicketNo, x.workOrderNo].filter(Boolean).join(" / ") || "-"].map((v, i) => <td key={i} style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{v}</td>)}<td><Status value={x.status}/></td><td style={{ whiteSpace: "nowrap" }}><Link title="View" href={`/production/downtime/${x.id}`} style={{ marginRight: 12, color: "#0f766e" }}><Eye size={18}/></Link>{x.status === "OPEN" && <Link title="Stop" href={`/production/downtime/${x.id}/stop`} style={{ color: "#b91c1c" }}><Square size={18}/></Link>}</td></tr>)}</tbody></table>
      {!rows.length && <p style={{ color: "#64748b" }}>No downtime records found.</p>}
    </section>
  </main>;
}

export function DowntimeCreatePage() {
  const router = useRouter(); const [refs, setRefs] = useState<RefData>({ reasons: [], shifts: [], machines: [], users: [] });
  const [form, setForm] = useState<Row>({ shiftSessionId: "", assetId: "", reasonId: "", startTime: new Date().toISOString().slice(0, 16), failureCause: "", description: "", remarks: "" }); const [error, setError] = useState("");
  useEffect(() => { json("/api/production/downtime/reference-data").then(setRefs).catch((e) => setError(e.message)); }, []);
  const shift = refs.shifts.find((x) => x.id === form.shiftSessionId); const machines = refs.machines.filter((x) => !shift || x.locationId === shift.locationId); const reason = refs.reasons.find((x) => x.id === form.reasonId);
  const set = (key: string, value: any) => setForm((state: Row) => ({ ...state, [key]: value }));
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); try { const result = await json("/api/production/downtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, maintenanceRequired: Boolean(reason?.requiresMaintenance) }) }); router.push(`/production/downtime/${result.item.id}`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } }
  return <main style={shell}><Header title="Start Machine Downtime" subtitle="Open a live, DB-backed downtime event."/><form onSubmit={submit} style={card}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
    <Field label="Shift Session"><select required style={input} value={form.shiftSessionId} onChange={(e) => { set("shiftSessionId", e.target.value); set("assetId", ""); }}><option value="">Select ...</option>{refs.shifts.map((x) => <option key={x.id} value={x.id}>{x.sessionNo} - {x.shiftCode} - {x.locationName}</option>)}</select></Field>
    <Field label="Machine / Asset"><select required={Boolean(reason?.requiresMaintenance)} style={input} value={form.assetId} onChange={(e) => set("assetId", e.target.value)}><option value="">Select ...</option>{machines.map((x) => <option key={x.id} value={x.id}>{x.assetCode} - {x.assetName}</option>)}</select></Field>
    <Field label="Failure Reason"><select required style={input} value={form.reasonId} onChange={(e) => set("reasonId", e.target.value)}><option value="">Select ...</option>{refs.reasons.map((x) => <option key={x.id} value={x.id}>{x.categoryName} - {x.name}</option>)}</select></Field>
    <Field label="Start Time"><input required type="datetime-local" style={input} value={form.startTime} onChange={(e) => set("startTime", e.target.value)}/></Field>
    <Field label="Failure Cause"><input style={input} value={form.failureCause} onChange={(e) => set("failureCause", e.target.value)}/></Field>
    <Field label="Expected Rate / hour"><input type="number" min="0" step="any" style={input} value={form.plannedProductionRate || ""} onChange={(e) => set("plannedProductionRate", e.target.value === "" ? null : Number(e.target.value))}/></Field>
    <Field label="Description"><textarea style={input} value={form.description} onChange={(e) => set("description", e.target.value)}/></Field><Field label="Remarks"><textarea style={input} value={form.remarks} onChange={(e) => set("remarks", e.target.value)}/></Field>
  </div>{reason?.requiresMaintenance && <p style={{ color: "#b45309" }}>This reason requires maintenance. A ticket can be created after downtime starts.</p>}{error && <p style={{ color: "#b91c1c" }}>{error}</p>}<button style={{ ...button, marginTop: 18 }} type="submit">Start downtime</button></form></main>;
}

export function DowntimeDetailPage({ action }: { action?: "stop" | "ticket" | "edit" | "close" }) {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const [item, setItem] = useState<Row | null>(null); const [error, setError] = useState(""); const [form, setForm] = useState<Row>({ endTime: new Date().toISOString().slice(0, 16), actualLostQty: "", remarks: "" });
  useEffect(() => { json(`/api/production/downtime/${id}`).then((x) => { setItem(x.item); if(action==="edit")setForm((current:Row)=>({...current,failureCause:x.item.failureCause||"",description:x.item.description||"",plannedProductionRate:x.item.plannedProductionRate??"",actualLostQty:x.item.actualLostQty??"",remarks:x.item.remarks||""})); }).catch((e) => setError(e.message)); }, [action,id]);
  async function post(path: string) { setError(""); try { await json(`/api/production/downtime/${id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); router.push(`/production/downtime/${id}`); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } }
  async function update(){setError("");try{await json(`/api/production/downtime/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});router.push(`/production/downtime/${id}`);router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Failed");}}
  if (!item) return <main style={shell}><p>{error || "Loading..."}</p></main>;
  if (action) return <main style={shell}><Header title={action === "stop" ? "Stop Downtime" : action === "ticket" ? "Create Maintenance Ticket" : action === "close" ? "Close Downtime" : "Edit Downtime"} subtitle={`${item.downtimeNo} - ${item.machine || "No machine"}`}/><section style={card}>
    {action === "stop" && <><Field label="End Time"><input type="datetime-local" style={input} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}/></Field><Field label="Actual Lost Quantity"><input type="number" min="0" step="any" style={input} value={form.actualLostQty} onChange={(e) => setForm({ ...form, actualLostQty: e.target.value })}/></Field></>}
    {action === "edit" && <><Field label="Failure Cause"><input style={input} value={form.failureCause||""} onChange={(e)=>setForm({...form,failureCause:e.target.value})}/></Field><Field label="Description"><textarea style={input} value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})}/></Field><Field label="Expected Rate / hour"><input type="number" min="0" step="any" style={input} value={form.plannedProductionRate||""} onChange={(e)=>setForm({...form,plannedProductionRate:e.target.value===""?null:Number(e.target.value)})}/></Field><Field label="Actual Lost Quantity"><input type="number" min="0" step="any" style={input} value={form.actualLostQty||""} onChange={(e)=>setForm({...form,actualLostQty:e.target.value===""?null:Number(e.target.value)})}/></Field></>}
    <Field label="Remarks"><textarea style={input} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}/></Field>{error && <p style={{ color: "#b91c1c" }}>{error}</p>}<button style={{ ...button, marginTop: 18 }} onClick={() => action==="edit"?update():post(action === "stop" ? "stop" : action === "close" ? "close" : "create-ticket")}>{action === "stop" ? <Square size={17}/> : <Wrench size={17}/>}Confirm</button>
  </section></main>;
  const facts: Record<string, unknown> = { Status: item.status, Shift: item.sessionNo, Batch: item.batchNo || "-", Stage: item.productionStageName || "-", Failure: item.reasonName, Cause: item.failureCause || "-", Start: item.startTime ? new Date(item.startTime).toLocaleString() : "-", End: item.endTime ? new Date(item.endTime).toLocaleString() : "Active", Duration: `${item.durationMinutes || 0} min`, "Lost Production": item.actualLostQty ?? item.estimatedLostQty ?? "-", Ticket: item.maintenanceTicketNo || "-", "Work Order": item.workOrderNo || "-" };
  return <main style={shell}><Header recordKind="production" title={item.downtimeNo || "Downtime"} subtitle={`${item.machine || "Production interruption"} - ${item.locationName}`} action={<div style={{ display: "flex", gap: 10 }}>{item.status === "OPEN" && <Link style={button} href={`/production/downtime/${id}/stop`}><Square size={17}/>Stop</Link>}{item.maintenanceRequired && !item.maintenanceTicketId && <Link style={button} href={`/production/downtime/${id}/create-ticket`}><Wrench size={17}/>Create ticket</Link>}{item.status==="RESTORED"&&<Link style={button} href={`/production/downtime/${id}/close`}><Square size={17}/>Close</Link>}{item.status==="OPEN"&&<Link style={{ ...button, background: "#475569" }} href={`/production/downtime/${id}/edit`}><Pencil size={17}/>Edit</Link>}</div>}/>{error && <p style={{ color: "#b91c1c" }}>{error}</p>}<section style={card}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>{Object.entries(facts).map(([key, value]) => <div key={key}><small style={{ color: "#64748b", fontWeight: 700 }}>{key}</small><div style={{ marginTop: 5, fontWeight: 700 }}>{key === "Status" ? <Status value={value}/> : String(value)}</div></div>)}</div></section></main>;
}
