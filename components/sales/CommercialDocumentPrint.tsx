type PrintLine = {
  id: string;
  itemCode: string;
  itemName: string;
  uomCode?: string;
  uomName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function CommercialDocumentPrint({
  company,
  documentTitle,
  documentNo,
  documentDate,
  currencyCode,
  customer,
  channel,
  location,
  status,
  remarks,
  lines,
  totalAmount,
}: {
  company?: { companyName?: string; address?: string; phone?: string; email?: string; tinNumber?: string } | null;
  documentTitle: string;
  documentNo: string;
  documentDate: string;
  currencyCode: string;
  customer: string;
  channel: string;
  location: string;
  status: string;
  remarks?: string;
  lines: PrintLine[];
  totalAmount: number;
}) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, minimumFractionDigits: 2 });
  return <section className="print-content" style={{ background: "#fff", color: "#0f172a", padding: 24 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{company?.companyName ?? "NEW ERP"}</div>
        <div style={{ color: "#475467", marginTop: 8, display: "grid", gap: 4 }}>
          {company?.address ? <span>{company.address}</span> : null}
          {company?.phone ? <span>{company.phone}</span> : null}
          {company?.email ? <span>{company.email}</span> : null}
          {company?.tinNumber ? <span>TIN: {company.tinNumber}</span> : null}
        </div>
      </div>
      <div style={{ textAlign: "right" }}><div style={{ fontSize: 26, fontWeight: 800 }}>{documentTitle}</div><div style={{ marginTop: 8 }}>{documentNo}</div><div>{documentDate.slice(0, 10)}</div></div>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
      {[["Customer", customer], ["Channel", channel], ["Location", location], ["Status", status]].map(([label, value]) => <div key={label} style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: 12 }}><div style={{ color: "#667085", fontSize: 12, textTransform: "uppercase" }}>{label}</div><strong>{value}</strong></div>)}
    </div>
    <div style={{ border: "1px solid #e4e7ec", borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#f8fafc", textAlign: "left" }}>{["Item", "UOM", "Quantity", "Unit Price", "Line Total"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead><tbody>{lines.map((line) => <tr key={line.id} style={{ borderTop: "1px solid #e4e7ec" }}><td style={{ padding: 12 }}>{line.itemCode} - {line.itemName}</td><td style={{ padding: 12 }}>{line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "UOM"}</td><td style={{ padding: 12 }}>{line.quantity.toFixed(2)}</td><td style={{ padding: 12 }}>{money.format(line.unitPrice)}</td><td style={{ padding: 12 }}>{money.format(line.lineTotal)}</td></tr>)}</tbody></table>
    </div>
    <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 24 }}><div><div style={{ color: "#667085", fontSize: 12, textTransform: "uppercase" }}>Remarks</div><div style={{ marginTop: 6 }}>{remarks ?? "No remarks"}</div></div><div style={{ minWidth: 230, border: "1px solid #e4e7ec", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between" }}><span>Total</span><strong>{money.format(totalAmount)}</strong></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, marginTop: 70 }}>{["Prepared By", "Approved By", "Customer Signature"].map((label) => <div key={label} style={{ borderTop: "1px solid #98a2b3", paddingTop: 8, textAlign: "center", color: "#475467" }}>{label}</div>)}</div>
  </section>;
}
