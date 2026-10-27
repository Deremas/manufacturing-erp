"use client";

import { QCResultBadge } from "./QCResultBadge";
import { QCWideTable, qcInputStyle, qcTableStyle, qcTdStyle, qcThStyle } from "./QCWideTable";

export function QCParameterResultGrid({
  minWidth = 1100,
  specs,
  values,
  onChange,
  readOnly,
}: {
  minWidth?: number;
  specs: Array<{
    parameterId: string;
    parameterName: string;
    dataType: string;
    methodReference?: string | null;
    technique?: string | null;
    incubation?: string | null;
    media?: string | null;
    acceptableLimit: string;
  }>;
  values: Record<string, { textValue: string; remarks: string; result?: string }>;
  onChange: (parameterId: string, patch: { textValue?: string; remarks?: string }) => void;
  readOnly?: boolean;
}) {
  const microbial = specs.some((spec) => spec.technique || spec.incubation || spec.media);
  return (
    <QCWideTable minWidth={minWidth}>
      <table style={qcTableStyle}>
        <thead>
          <tr>
            <th style={{ ...qcThStyle, minWidth: 260 }}>Parameter / Test</th>
            <th style={{ ...qcThStyle, minWidth: 180 }}>Method Reference</th>
            {microbial ? <th style={{ ...qcThStyle, minWidth: 150 }}>Technique</th> : null}
            {microbial ? <th style={{ ...qcThStyle, minWidth: 160 }}>Incubation / Condition</th> : null}
            {microbial ? <th style={{ ...qcThStyle, minWidth: 140 }}>Media</th> : null}
            <th style={{ ...qcThStyle, minWidth: 180 }}>Acceptable Limit</th>
            <th style={{ ...qcThStyle, minWidth: 150 }}>Result</th>
            <th style={{ ...qcThStyle, minWidth: 180 }}>Comment</th>
            <th style={qcThStyle}>Eval</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => {
            const value = values[spec.parameterId] ?? { textValue: "", remarks: "" };
            return (
              <tr key={spec.parameterId}>
                <td style={qcTdStyle}>{spec.parameterName}</td>
                <td style={qcTdStyle}>{spec.methodReference || "—"}</td>
                {microbial ? <td style={qcTdStyle}>{spec.technique || "—"}</td> : null}
                {microbial ? <td style={qcTdStyle}>{spec.incubation || "—"}</td> : null}
                {microbial ? <td style={qcTdStyle}>{spec.media || "—"}</td> : null}
                <td style={qcTdStyle}>{spec.acceptableLimit}</td>
                <td style={qcTdStyle}>
                  {readOnly ? (
                    value.textValue || "—"
                  ) : spec.dataType === "TEXT" ? (
                    <select
                      style={{ ...qcInputStyle, minWidth: 150 }}
                      value={value.textValue}
                      onChange={(event) => onChange(spec.parameterId, { textValue: event.target.value })}
                    >
                      <option value="">Select ...</option>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                      <option value="N/A">N/A</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="PRESENT">PRESENT</option>
                      <option value="DETECTED">DETECTED</option>
                      <option value="UNDETECTED">UNDETECTED</option>
                    </select>
                  ) : (
                    <input
                      style={{ ...qcInputStyle, minWidth: 130 }}
                      value={value.textValue}
                      onChange={(event) => onChange(spec.parameterId, { textValue: event.target.value })}
                    />
                  )}
                </td>
                <td style={qcTdStyle}>
                  {readOnly ? (
                    value.remarks || "—"
                  ) : (
                    <input
                      style={{ ...qcInputStyle, minWidth: 180 }}
                      value={value.remarks}
                      onChange={(event) => onChange(spec.parameterId, { remarks: event.target.value })}
                    />
                  )}
                </td>
                <td style={qcTdStyle}>{value.result ? <QCResultBadge result={value.result} /> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </QCWideTable>
  );
}
