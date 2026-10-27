import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getLoadingOrderById } from "@/services/sales/loading-order.service";

export default async function LoadingOrderPrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences, companyResult] = await Promise.all([
    getLoadingOrderById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
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
          <div style={{ fontSize: 26, fontWeight: 800 }}>Loading Order</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{item.loadingNo}</div>
          <div style={{ color: "#475467" }}>{item.loadingDate.slice(0, 10)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          ["Channel", item.channel],
          ["Status", item.status],
          ["From Location", `${item.fromLocationCode} - ${item.fromLocationName}`],
          ["Destination", item.destinationLocationCode ? `${item.destinationLocationCode} - ${item.destinationLocationName}` : "Not assigned"],
          ["Trip", item.tripLabel ?? "Not assigned"],
          ["Agent", item.agentName ?? "Not assigned"],
          ["Customer", item.customerName ?? "Walk-in / none"],
          ["Truck", item.truckLabel ?? item.truckId ?? "Not assigned"],
          ["Driver", item.driverName ?? item.driverId ?? "Not assigned"],
          ["Route", item.routeName ?? "Not assigned"],
          ["Reserved At", item.reservedAt ? item.reservedAt.slice(0, 19).replace("T", " ") : "Not posted"],
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
              {["Item", "UOM", "Qty", "Reserved", "Issued", "Unit Price", "Line Total"].map((label) => (
                <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#667085" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.items.map((line) => (
              <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                <td style={{ padding: "14px 10px" }}>{line.itemCode} - {line.itemName}</td>
                <td style={{ padding: "14px 10px" }}>{line.uomCode ?? line.uomName ?? "Not assigned"}</td>
                <td style={{ padding: "14px 10px" }}>{line.quantity}</td>
                <td style={{ padding: "14px 10px" }}>{line.reservedQty}</td>
                <td style={{ padding: "14px 10px" }}>{line.issuedQty}</td>
                <td style={{ padding: "14px 10px" }}>{money.format(line.unitPrice)}</td>
                <td style={{ padding: "14px 10px" }}>{money.format(line.lineTotal)}</td>
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
        <div style={{ minWidth: 240, border: "1px solid #e4e7ec", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Total Quantity</span>
            <strong>{item.totalQuantity}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total Value</span>
            <strong>{money.format(item.totalAmount)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
