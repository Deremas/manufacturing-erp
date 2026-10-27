"use client";

import { AlertTriangle, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { FormCard, PageHeader } from "@/components/shared";
import { QCSearchSelect } from "@/features/qc/components/QCSearchSelect";

type References = Awaited<ReturnType<typeof import("@/services/qc/nonconformity.service").getNonconformityReferenceData>>;

const inputStyle: React.CSSProperties = { width: "100%", minHeight: 46, border: "1px solid #94a3b8", borderRadius: 10, padding: "10px 12px", background: "white", font: "inherit" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#334155", fontWeight: 600 };

export function NonconformityCreatePage({ references, initialTestId = "", initialBatchId = "" }: {
  references: References; initialTestId?: string; initialBatchId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const selectedTest = references.tests.find((row) => row.id === initialTestId);
  const [form, setForm] = useState({
    qcTestId: initialTestId,
    productionBatchId: selectedTest?.productionBatchId ?? initialBatchId,
    itemId: selectedTest?.itemId ?? "",
    locationId: selectedTest?.locationId ?? "",
    assetId: selectedTest?.assetId ?? "",
    responsiblePersonId: "",
    severity: "MAJOR",
    dueDate: "",
    issueDescription: "",
    rootCause: "",
    correctiveAction: "",
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selectTest = (id: string) => {
    const test = references.tests.find((row) => row.id === id);
    setForm((current) => ({ ...current, qcTestId: id, productionBatchId: test?.productionBatchId ?? current.productionBatchId,
      itemId: test?.itemId ?? current.itemId, locationId: test?.locationId ?? current.locationId, assetId: test?.assetId ?? current.assetId }));
  };
  const selectBatch = (id: string) => {
    const batch = references.batches.find((row) => row.id === id);
    setForm((current) => ({ ...current, productionBatchId: id, itemId: batch?.finishedGoodId ?? current.itemId, locationId: batch?.locationId ?? current.locationId }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/qc/nonconformities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error ?? "Unable to create nonconformity");
      router.push(`/qc/nonconformity/${result.id}`);
      router.refresh();
    });
  };
  return <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
    <PageHeader title="Create Nonconformity" subtitle="Record a quality exception against a test, batch, machine, item, or location." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Nonconformity", href: "/qc/nonconformity" }, { label: "Create" }]} />
    <FormCard title="Source and Responsibility" icon={<AlertTriangle size={19} />} variant="teal-header">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
        <label style={labelStyle}>QC Test
          <QCSearchSelect
            value={form.qcTestId}
            placeholder="No test reference"
            options={references.tests.map((row) => ({ value: row.id, label: `${row.testNo} - ${row.result}` }))}
            onChange={(value) => selectTest(value)}
          />
        </label>
        <label style={labelStyle}>Production Batch
          <QCSearchSelect
            value={form.productionBatchId}
            placeholder="No batch reference"
            options={references.batches.map((row) => ({ value: row.id, label: row.batchNo }))}
            onChange={(value) => selectBatch(value)}
          />
        </label>
        <label style={labelStyle}>Item
          <QCSearchSelect
            value={form.itemId}
            placeholder="Select ..."
            options={references.items.map((row) => ({ value: row.id, label: row.itemName }))}
            onChange={(value) => set("itemId", value)}
          />
        </label>
        <label style={labelStyle}>Location
          <QCSearchSelect
            value={form.locationId}
            placeholder="Select ..."
            options={references.locations.map((row) => ({ value: row.id, label: `${row.locationCode} - ${row.locationName}` }))}
            onChange={(value) => set("locationId", value)}
          />
        </label>
        <label style={labelStyle}>Machine / Asset
          <QCSearchSelect
            value={form.assetId}
            placeholder="No machine reference"
            options={references.assets.map((row) => ({ value: row.id, label: `${row.assetCode} - ${row.assetName}` }))}
            onChange={(value) => set("assetId", value)}
          />
        </label>
        <label style={labelStyle}>Responsible User
          <QCSearchSelect
            value={form.responsiblePersonId}
            placeholder="Assign later"
            options={references.users.map((row) => ({ value: row.id, label: row.name }))}
            onChange={(value) => set("responsiblePersonId", value)}
          />
        </label>
        <label style={labelStyle}>Severity<select style={inputStyle} value={form.severity} onChange={(event) => set("severity", event.target.value)}><option value="MINOR">Minor</option><option value="MAJOR">Major</option><option value="CRITICAL">Critical</option></select></label>
        <label style={labelStyle}>Corrective Action Due<input style={inputStyle} type="date" value={form.dueDate} onChange={(event) => set("dueDate", event.target.value)} /></label>
      </div>
    </FormCard>
    <FormCard title="Issue and Corrective Action">
      <div style={{ display: "grid", gap: 16 }}>
        <label style={labelStyle}>Issue Description *<textarea required rows={4} style={inputStyle} value={form.issueDescription} onChange={(event) => set("issueDescription", event.target.value)} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Initial Root Cause<textarea rows={3} style={inputStyle} value={form.rootCause} onChange={(event) => set("rootCause", event.target.value)} /></label>
          <label style={labelStyle}>Immediate Corrective Action<textarea rows={3} style={inputStyle} value={form.correctiveAction} onChange={(event) => set("correctiveAction", event.target.value)} /></label>
        </div>
        {message ? <p style={{ margin: 0, color: "#b91c1c" }}>{message}</p> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={() => router.push("/qc/nonconformity")} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}><X size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Cancel</button>
          <button disabled={pending} type="submit" style={{ ...inputStyle, width: "auto", background: "#00897b", color: "white", borderColor: "#00897b", cursor: "pointer", fontWeight: 700 }}><Save size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />{pending ? "Creating..." : "Create Nonconformity"}</button>
        </div>
      </div>
    </FormCard>
  </form>;
}
