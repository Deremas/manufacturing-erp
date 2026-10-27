"use client";

import { QCWideTable, qcTableStyle, qcTdStyle, qcThStyle } from "./QCWideTable";

export function QCSpecificationTable({
  rows,
}: {
  rows: Array<{
    parameterName: string;
    unitName?: string | null;
    methodReference?: string | null;
    acceptableLimit: string;
    frequencyName?: string | null;
    configured?: boolean;
  }>;
}) {
  return (
    <QCWideTable minWidth={900}>
      <table style={qcTableStyle}>
        <thead>
          <tr>
            <th style={qcThStyle}>Parameter</th>
            <th style={qcThStyle}>Unit</th>
            <th style={qcThStyle}>Method Reference</th>
            <th style={qcThStyle}>Acceptable Limit</th>
            <th style={qcThStyle}>Frequency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.parameterName}>
              <td style={{ ...qcTdStyle, minWidth: 200 }}>{row.parameterName}</td>
              <td style={qcTdStyle}>{row.unitName || "—"}</td>
              <td style={qcTdStyle}>{row.methodReference || "—"}</td>
              <td style={{ ...qcTdStyle, minWidth: 220, color: row.configured === false ? "#b91c1c" : undefined }}>
                {row.acceptableLimit || "Not configured"}
              </td>
              <td style={qcTdStyle}>{row.frequencyName || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </QCWideTable>
  );
}
