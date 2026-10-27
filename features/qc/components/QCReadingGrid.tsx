"use client";

import { QCAddRowButton, QCRowActions } from "./QCRepeatableRows";
import { QCWideTable, qcInputStyle, qcTableStyle, qcTdStyle, qcThStyle } from "./QCWideTable";

function splitHeading(name: string) {
  const match = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!match) return { label: name, extra: "" };
  return { label: match[1], extra: match[2] };
}

const headingStyle: React.CSSProperties = {
  ...qcThStyle,
  textAlign: "center",
  whiteSpace: "normal",
  verticalAlign: "bottom",
};

export function QCReadingGrid({
  minWidth = 1300,
  parameters,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  minWidth?: number;
  parameters: Array<{ parameterCode: string; parameterName: string; dataType: string }>;
  rows: Array<{ timeValue: string; remark: string; values: Record<string, string> }>;
  onChange: (index: number, patch: Partial<{ timeValue: string; remark: string; values: Record<string, string> }>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const columns = parameters.filter((parameter) => parameter.parameterCode !== "TIME");

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <QCWideTable minWidth={minWidth}>
        <table style={qcTableStyle}>
          <thead>
            <tr>
              <th style={{ ...headingStyle, minWidth: 48 }}>#</th>
              <th style={{ ...headingStyle, minWidth: 120 }}>Time</th>
              {columns.map((parameter) => {
                const heading = splitHeading(parameter.parameterName);
                return (
                  <th key={parameter.parameterCode} style={{ ...headingStyle, minWidth: parameter.dataType === "NUMBER" ? 130 : 160 }}>
                    <span style={{ display: "block", fontWeight: 500 }}>{heading.label}</span>
                    {heading.extra ? (
                      <span style={{ display: "block", marginTop: 2, fontSize: 10, fontWeight: 500 }}>
                        ({heading.extra})
                      </span>
                    ) : null}
                  </th>
                );
              })}
              <th style={{ ...headingStyle, minWidth: 220 }}>Remark</th>
              <th style={{ ...headingStyle, minWidth: 52 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td style={{ ...qcTdStyle, textAlign: "center" }}>{index + 1}</td>
                <td style={qcTdStyle}>
                  <input
                    type="time"
                    style={{ ...qcInputStyle, minWidth: 120 }}
                    value={row.timeValue}
                    onChange={(event) => onChange(index, { timeValue: event.target.value })}
                  />
                </td>
                {columns.map((parameter) => (
                  <td key={parameter.parameterCode} style={qcTdStyle}>
                    <input
                      style={{ ...qcInputStyle, minWidth: parameter.dataType === "NUMBER" ? 110 : 150 }}
                      value={row.values[parameter.parameterCode] ?? ""}
                      onChange={(event) =>
                        onChange(index, {
                          values: { ...row.values, [parameter.parameterCode]: event.target.value },
                        })
                      }
                    />
                  </td>
                ))}
                <td style={qcTdStyle}>
                  <input
                    style={{ ...qcInputStyle, minWidth: 220 }}
                    value={row.remark}
                    onChange={(event) => onChange(index, { remark: event.target.value })}
                  />
                </td>
                <td style={{ ...qcTdStyle, textAlign: "center" }}>
                  <QCRowActions index={index} count={rows.length} onRemove={onRemove} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </QCWideTable>
      <div>
        <QCAddRowButton onClick={onAdd} label="Add Reading" />
      </div>
    </div>
  );
}
