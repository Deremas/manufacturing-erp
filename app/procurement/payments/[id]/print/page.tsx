import { notFound } from "next/navigation";

import { getSupplierPaymentById } from "@/services/procurement/supplier-payment.service";
import { getProcurementPrintContext } from "@/services/procurement/procurement-print.service";

const pageStyle: React.CSSProperties = {
  padding: "32px",
  background: "#ffffff",
  color: "#0f172a",
  fontFamily: "Georgia, serif",
};

export default async function SupplierPaymentPrintPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [payment, printContext] = await Promise.all([
    getSupplierPaymentById(id),
    getProcurementPrintContext(),
  ]);

  if (!payment) {
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
          <h2 style={{ margin: 0 }}>Supplier Payment Voucher</h2>
          <div>{payment.paymentNo}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div>Supplier: {payment.supplierName}</div>
        <div>Invoice No: {payment.invoiceNo}</div>
        <div>Payment Date: {new Date(payment.paymentDate).toLocaleDateString("en-KE")}</div>
        <div>Method: {payment.paymentMethod}</div>
        <div>Bank Account: {payment.bankAccountName ?? "-"}</div>
        <div>Reference No: {payment.referenceNo || "-"}</div>
        <div>Invoice Balance Before: {payment.invoiceBalanceBefore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr>
            {["Payment No", "Invoice No", "Method", "Reference", "Amount"].map((label) => (
              <th key={label} style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", padding: "8px" }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{payment.paymentNo}</td>
            <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{payment.invoiceNo}</td>
            <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{payment.paymentMethod}</td>
            <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{payment.referenceNo || "-"}</td>
            <td style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "48px" }}>
        <div style={{ minWidth: "280px" }}>
          <div>Currency: {printContext.currency}</div>
          <div>Payment Amount: {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
