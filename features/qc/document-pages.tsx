"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionButtons, PageHeader, SectionHeading } from "@/components/shared";
import type { Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { QCSearchSelect } from "@/features/qc/components/QCSearchSelect";

type Option = { value: string; label: string };

type ParameterRow = {
  templateParameterId?: string;
  parameterName: string;
  expectedValue: string;
  actualValue: string;
  unit: string;
  result: string;
  remarks: string;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const gridHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.9fr 1.4fr 32px",
  gap: "8px",
  alignItems: "center",
  marginBottom: "10px",
  padding: "0 4px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const scrollAreaStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const addButtonStyle: React.CSSProperties = {
  borderRadius: radius.components.input,
  border: `1px solid ${colors.primary[300]}`,
  backgroundColor: colors.primary[50],
  color: colors.primary[700],
  padding: "12px 18px",
  fontSize: typography.sizes.small.fontSize,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(0, 137, 123, 0.08)",
};

const removeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${colors.danger[200]}`,
  backgroundColor: colors.danger[50],
  color: colors.danger[700],
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  justifySelf: "center",
};

export function WaterTestEditor({
  items,
  locations,
  users,
  batches,
  samplePoints,
  initialTestedById,
  initialValue,
  task,
  moduleLabel = "Water Test",
  returnHref = "/qc/water/ledger",
}: {
  items: Option[];
  locations: Option[];
  users: Option[];
  batches: Option[];
  samplePoints: string[];
  initialTestedById: string;
  task?: {
    id: string;
    taskNo: string;
    testTypeCode: string;
    testTypeName: string;
    templateName: string;
    parameters: Array<{
      id: string;
      parameterName: string;
      dataType: string;
      minimumValue: number | null;
      maximumValue: number | null;
      expectedText: string | null;
      unitCode: string | null;
      unitName: string | null;
      required: boolean;
    }>;
  };
  moduleLabel?: string;
  returnHref?: string;
  initialValue?: {
    productionBatchId?: string;
    itemId?: string;
    locationId?: string;
    samplePoint?: string;
    remarks?: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    sampleDate: new Date().toISOString().slice(0, 10),
    samplePoint: initialValue?.samplePoint ?? samplePoints[0] ?? "",
    productionBatchId: initialValue?.productionBatchId ?? "",
    itemId: initialValue?.itemId ?? "",
    locationId: initialValue?.locationId ?? "",
    testedById: initialTestedById,
    result: "PENDING",
    remarks: initialValue?.remarks ?? "",
  });
  const [parameters, setParameters] = useState<ParameterRow[]>(
    task?.parameters.map((parameter) => ({
      templateParameterId: parameter.id,
      parameterName: parameter.parameterName,
      expectedValue: parameter.expectedText
        ?? [parameter.minimumValue, parameter.maximumValue].filter((value) => value !== null).join(" - "),
      actualValue: "",
      unit: [parameter.unitCode, parameter.unitName].filter(Boolean).join(" - "),
      result: "PENDING",
      remarks: "",
    })) ?? [{ parameterName: "", expectedValue: "", actualValue: "", unit: "", result: "PENDING", remarks: "" }],
  );

  function updateParameter(index: number, key: keyof ParameterRow, value: string) {
    setParameters((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/qc/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task?.id,
          testType: task?.testTypeCode ?? "water-test",
          sampleDate: header.sampleDate,
          productionBatchId: header.productionBatchId,
          itemId: header.itemId,
          locationId: header.locationId,
          testedById: header.testedById,
          result: header.result,
          status: "PENDING",
          remarks: [header.samplePoint, header.remarks].filter(Boolean).join(" | "),
          parameters,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create water test");
        return;
      }
      router.push(task ? `/qc/tasks/${task.id}` : returnHref);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={task ? `Execute ${task.testTypeName}` : "Create QC Test"}
        subtitle={task ? `${task.taskNo} uses ${task.templateName}; limits and results are controlled by the approved template.` : "Select a generated QC task to use configured test parameters."}
        breadcrumbs={[
          { label: "QC", href: "/qc" },
          { label: moduleLabel, href: returnHref },
          { label: "Create" },
        ]}
      />

      <div style={cardStyle}>
        <SectionHeading title="Test Details" />
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Test Date</label>
            <input type="date" style={inputStyle} value={header.sampleDate} onChange={(event) => setHeader((current) => ({ ...current, sampleDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Sample Point</label>
            <QCSearchSelect
              value={header.samplePoint}
              placeholder="Select ..."
              options={samplePoints.map((samplePoint) => ({ value: samplePoint, label: samplePoint }))}
              onChange={(value) => setHeader((current) => ({ ...current, samplePoint: value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Product Item</label>
            <QCSearchSelect
              value={header.itemId}
              placeholder="Select ..."
              options={items}
              onChange={(value) => setHeader((current) => ({ ...current, itemId: value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Production Batch</label>
            <QCSearchSelect
              value={header.productionBatchId}
              placeholder="Optional batch"
              options={batches}
              onChange={(value) => setHeader((current) => ({ ...current, productionBatchId: value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Location</label>
            <QCSearchSelect
              value={header.locationId}
              placeholder="Select ..."
              options={locations}
              onChange={(value) => setHeader((current) => ({ ...current, locationId: value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tested By</label>
            <QCSearchSelect
              value={header.testedById}
              placeholder="Select ..."
              options={users}
              onChange={(value) => setHeader((current) => ({ ...current, testedById: value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Overall Result</label>
            <select style={inputStyle} value={header.result} onChange={(event) => setHeader((current) => ({ ...current, result: event.target.value }))}>
              <option value="PENDING">Pending</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionHeading
          title="Parameters"
          extra={<span style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>Template-controlled</span>}
        />
          <div className="erp-table-scroll" style={scrollAreaStyle}>
            <div style={{ ...gridHeaderStyle, minWidth: "1080px" }}>
              {["Parameter", "Expected", "Actual", "Unit", "Result", "Remarks", ""].map((label, index) => <div key={`${label}-${index}`}>{label}</div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "1080px" }}>
              {parameters.map((parameter, index) => (
                <div key={`${parameter.parameterName}-${index}`} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 0.9fr 1.4fr 32px", gap: "8px", alignItems: "center" }}>
                  <input style={{ ...inputStyle, backgroundColor: colors.secondary[50] }} value={parameter.parameterName} readOnly />
                  <input style={{ ...inputStyle, backgroundColor: colors.secondary[50] }} value={parameter.expectedValue} readOnly />
                  <input style={inputStyle} value={parameter.actualValue} onChange={(event) => updateParameter(index, "actualValue", event.target.value)} />
                  <input style={{ ...inputStyle, backgroundColor: colors.secondary[50] }} value={parameter.unit} readOnly />
                  <input style={{ ...inputStyle, backgroundColor: colors.secondary[50] }} value="Auto" readOnly />
                  <input style={inputStyle} value={parameter.remarks} onChange={(event) => updateParameter(index, "remarks", event.target.value)} />
                  <span aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push("/qc/water/ledger"), disabled: isPending },
            { label: "Create Test", variant: "primary", onClick: save, loading: isPending },
          ]}
        />
      </div>
    </div>
  );
}
