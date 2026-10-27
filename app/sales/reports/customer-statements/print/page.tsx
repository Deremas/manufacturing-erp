import { requireAuth } from "@/lib/auth/auth";
import { getCustomers } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get } from "@/services/administration/companySettingsService";
import { getCustomerStatement } from "@/services/sales/accounts-receivable.service";

export default async function CustomerStatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const customerId = typeof params.customerId === "string" ? params.customerId : null;

  const [company, preferences, statement, customers] = await Promise.all([
    get(),
    getSystemPreferences(),
    customerId ? getCustomerStatement(customerId, { accessibleLocationIds: user.accessibleLocationIds }) : Promise.resolve(null),
    getCustomers(),
  ]);

  const customerName = statement
    ? `${statement.customerCode} - ${statement.customerName}`
    : customers.find((customer) => customer.id === customerId)?.name ?? "Customer Statement";
  const companySettings = company.success ? company.data : null;

  return (
    <div className="print-content" style={{ padding: 32, background: "#fff", color: "#101828" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{companySettings?.companyName || "NEW ERP"}</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{companySettings?.address || "Company address not set"}</div>
          <div style={{ color: "#475467" }}>{companySettings?.phone || "-"} | {companySettings?.email || "-"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Customer Statement</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{customerName}</div>
          <div style={{ color: "#475467" }}>Currency: {preferences.currencyCode}</div>
        </div>
      </div>

      {!statement ? (
        <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 24 }}>No statement data available.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Total Invoiced</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{preferences.currencyCode} {statement.totalInvoiced.toFixed(2)}</div>
            </div>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Total Received</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{preferences.currencyCode} {statement.totalReceived.toFixed(2)}</div>
            </div>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Outstanding</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{preferences.currencyCode} {statement.outstandingBalance.toFixed(2)}</div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                {["Date", "Type", "Document", "Due", "Location", "Debit", "Credit", "Balance"].map((label) => (
                  <th key={label} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #d0d5dd", color: "#667085" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statement.entries.map((entry) => (
                <tr key={`${entry.entryType}-${entry.documentId}`}>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{entry.entryDate.slice(0, 10)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{entry.entryType}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{entry.documentNo}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{entry.dueDate?.slice(0, 10) ?? "-"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{entry.locationCode} - {entry.locationName}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{preferences.currencyCode} {entry.debit.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{preferences.currencyCode} {entry.credit.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{preferences.currencyCode} {entry.runningBalance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
