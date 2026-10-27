import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getSalesDispatchById } from "@/services/sales/sales-dispatch.service";

export default async function SalesDispatchPrintPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences, companyResult] = await Promise.all([
    getSalesDispatchById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
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
          <div style={{ fontSize: 26, fontWeight: 800 }}>Sales Dispatch</div>
          <div style={{ color: "#475467", marginTop: 8 }}>{item.dispatchNo}</div>
          <div style={{ color: "#475467" }}>{item.dispatchDate.slice(0, 10)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          ["Channel", item.channel],
          ["Status", item.status],
          ["From Location", `${item.locationCode} - ${item.locationName}`],
          ["Destination", item.destinationLocationCode ? `${item.destinationLocationCode} - ${item.destinationLocationName}` : "Not assigned"],
          ["Loading Order", item.loadingNo],
          ["Sale", item.saleNo ?? "Not linked"],
          ["Trip", item.tripLabel ?? "Not assigned"],
          ["Truck", item.truckLabel ?? item.truckId ?? "Not assigned"],
          ["Driver", item.driverName ?? item.driverId ?? "Not assigned"],
          ["Customer", item.customerName ?? "Not assigned"],
          ["Agent", item.agentName ?? "Not assigned"],
          ["Route", item.routeName ?? "Not assigned"],
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
              {["Item", "UOM", "Qty", "Unit Price", "Line Total", "Price List"].map((label) => (
                <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#667085" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.items.map((line) => (
              <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                <td style={{ padding: "14px 10px" }}>{line.itemCode} - {line.itemName}</td>
                <td style={{ padding: "14px 10px" }}>{line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "UOM"}</td>
                <td style={{ padding: "14px 10px" }}>{line.quantity}</td>
                <td style={{ padding: "14px 10px" }}>{money.format(line.unitPrice)}</td>
                <td style={{ padding: "14px 10px" }}>{money.format(line.lineTotal)}</td>
                <td style={{ padding: "14px 10px" }}>{line.priceListCode ?? "Saved snapshot"}</td>
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
