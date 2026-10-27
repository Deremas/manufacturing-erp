import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getCustomerReceiptById } from "@/services/sales/accounts-receivable.service";

export default async function CustomerReceiptPrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences, companyResult] = await Promise.all([
    getCustomerReceiptById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
    getCompanySettings(),
  ]);

  if (!item) {
    notFound();
  }

  const company = companyResult.success ? companyResult.data : null;
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: preferences.currencyCode,
    minimumFractionDigits: 2,
  });

  return (
    <section className="print-content" style={{ background: "#fff", color: "#0f172a", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{company?.companyName ?? "NEW ERP"}</div>
          <div style={{ color: "#475467", marginTop: 8, display: "grid", gap: 4 }}>
            {company?.address ? <span>{company.address}</span> : null}
            {company?.phone ? <span>{company.phone}</span> : null}
            {company?.email ? <span>{company.email}</span> : null}
            {company?.tinNumber ? <span>TIN: {company.tinNumber}</span> : null}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Customer Receipt</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{item.receiptNo}</div>
          <div style={{ color: "#475467" }}>{item.receiptDate.slice(0, 10)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          ["Customer", item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : item.customerId],
          ["Location", `${item.locationCode} - ${item.locationName}`],
          ["Payment Method", item.paymentMethod],
          ["Bank Account", item.bankAccountName ?? "Not required"],
          ["Reference No", item.referenceNo ?? "Direct receipt"],
          ["Status", item.status],
          ["Posted At", item.postedAt ? item.postedAt.slice(0, 19).replace("T", " ") : "Not posted"],
          ["Currency", `${preferences.currencyCode} (${preferences.currencyLabel})`],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ border: "1px solid #e4e7ec", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#667085" }}>{label}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #e4e7ec", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc" }}>
              {["Invoice", "Date", "Due Date", "Channel", "Location", "Allocated Amount"].map((label) => (
                <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#667085" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.allocations.map((line) => (
              <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                <td style={{ padding: "14px 10px" }}>{line.invoiceNo}</td>
                <td style={{ padding: "14px 10px" }}>{line.invoiceDate.slice(0, 10)}</td>
                <td style={{ padding: "14px 10px" }}>{line.dueDate ? line.dueDate.slice(0, 10) : "Not set"}</td>
                <td style={{ padding: "14px 10px" }}>{line.channel}</td>
                <td style={{ padding: "14px 10px" }}>{line.locationCode} - {line.locationName}</td>
                <td style={{ padding: "14px 10px" }}>{money.format(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", gap: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#667085" }}>Remarks</div>
          <div style={{ marginTop: 8 }}>{item.remarks ?? "No remarks"}</div>
        </div>
        <div style={{ minWidth: 260, border: "1px solid #e4e7ec", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Allocated Amount</span>
            <strong>{money.format(item.amountReceived - item.unappliedAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Unapplied Amount</span>
            <strong>{money.format(item.unappliedAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Receipt Amount</span>
            <strong>{money.format(item.amountReceived)}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 64, marginTop: 64 }}>
        <div>
          <div style={{ borderTop: "1px solid #0f172a", paddingTop: 8 }}>Prepared By</div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #0f172a", paddingTop: 8 }}>Approved / Received By</div>
        </div>
      </div>
    </section>
  );
}
