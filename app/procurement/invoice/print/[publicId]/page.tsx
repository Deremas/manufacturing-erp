import { notFound } from "next/navigation";

import { getSupplierInvoiceById } from "@/services/procurement/supplier-invoice.service";
import { getProcurementPrintContext } from "@/services/procurement/procurement-print.service";

const pageStyle: React.CSSProperties = {
  padding: "32px",
  background: "#ffffff",
  color: "#0f172a",
  fontFamily: "Georgia, serif",
};

export default async function SupplierInvoicePrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [invoice, printContext] = await Promise.all([
    getSupplierInvoiceById(publicId),
    getProcurementPrintContext(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0 }}>{printContext.company.companyName}</h1>
          <div>{printContext.company.address ?? "-"}</div>
          <div>{printContext.company.phone ?? "-"}</div>
          <div>{printContext.company.email ?? "-"}</div>
          <div>TIN: {printContext.company.tinNumber ?? "-"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>Supplier Invoice</h2>
          <div>{invoice.invoiceNo}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div>Supplier: {invoice.supplierName}</div>
        <div>Supplier Invoice No: {invoice.supplierInvoiceNo}</div>
        <div>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-KE")}</div>
        <div>Due Date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-KE") : "-"}</div>
        <div>PO Reference: {invoice.poNo ?? "-"}</div>
        <div>GRN Reference: {invoice.grnNo ?? "-"}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr>
            {["Item", "UOM", "Qty", "Unit Price", "Tax", "Line Total"].map((label) => (
              <th key={label} style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", padding: "8px" }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.itemCode} - {item.itemName}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.uomName ?? "-"}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.quantity}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "48px" }}>
        <div style={{ minWidth: "280px" }}>
          <div>Currency: {printContext.currency}</div>
          <div>Total Amount: {invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div>Amount Paid: {invoice.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div>Balance Due: {invoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "64px", marginTop: "64px" }}>
        <div>
          <div style={{ borderTop: "1px solid #0f172a", paddingTop: "8px" }}>Prepared By</div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #0f172a", paddingTop: "8px" }}>Approved By</div>
        </div>
      </div>
    </div>
  );
}
