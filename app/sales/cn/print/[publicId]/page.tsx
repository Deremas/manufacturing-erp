import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get } from "@/services/administration/companySettingsService";
import { getSalesCreditNoteById } from "@/services/sales/credit-note.service";

export default async function SalesCreditNotePrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const [company, preferences, item] = await Promise.all([
    get(),
    getSystemPreferences(),
    getSalesCreditNoteById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
  ]);

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
          <div style={{ fontSize: 24, fontWeight: 800 }}>Credit Note</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{item?.creditNoteNo ?? "Unknown document"}</div>
          <div style={{ color: "#475467" }}>Currency: {preferences.currencyCode}</div>
        </div>
      </div>

      {!item ? (
        <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 24 }}>Credit note not found.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Customer</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>
                {item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : "Walk-in customer"}
              </div>
            </div>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Sales Return</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>{item.returnNo}</div>
            </div>
            <div style={{ border: "1px solid #e4e7ec", borderRadius: 16, padding: 16 }}>
              <div style={{ color: "#667085", fontSize: 13, fontWeight: 700 }}>Total Credit</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{preferences.currencyCode} {item.totalAmount.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            <div><strong>Credit Date:</strong> {item.creditDate.slice(0, 10)}</div>
            <div><strong>Channel:</strong> {item.channel}</div>
            <div><strong>Location:</strong> {item.locationCode} - {item.locationName}</div>
            <div><strong>Status:</strong> {item.status}</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                {["Item", "UOM", "Qty", `Unit Price (${preferences.currencyCode})`, `Line Total (${preferences.currencyCode})`, "Reason"].map((label) => (
                  <th key={label} style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #d0d5dd", color: "#667085" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id}>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.itemCode} - {line.itemName}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "-"}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.quantity.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.lineTotal.toFixed(2)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eaecf0" }}>{line.reason ?? item.reason ?? "Sales return credit"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
