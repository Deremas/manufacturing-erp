import { PageHeader } from "@/components/shared";

export default function PointOfSalePage() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Point of Sale" subtitle="Sales to inventory integration checkpoint" />
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #dbe3ea",
          borderRadius: 16,
          padding: 20,
          color: "#1f2937",
        }}
      >
        <p>POS posting should issue finished goods through the inventory stock engine instead of changing stock directly.</p>
        <ul style={{ margin: "12px 0 0 20px" }}>
          <li>Posted POS sale should call `issueForSales()` for each line item.</li>
          <li>Returned POS sale should call `receiveSalesReturn()`.</li>
          <li>Sales location must come from the selected POS store or dispatch location.</li>
          <li>Audit trail and document history should commit together with the posted sale.</li>
        </ul>
      </div>
    </div>
  );
}
