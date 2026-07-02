import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";

export default function SalesHistoryPage() {
  return (
    <div style={{ padding: spacing.page.padding, display: "flex", flexDirection: "column", gap: spacing.page.gap }}>
      <PageHeader title="Sales History / Invoices" subtitle="Sales to inventory integration checkpoint" />
      <div style={{ padding: 24, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, backgroundColor: colors.surface }}>
        <p>This screen is now positioned to issue finished goods through the inventory posting engine.</p>
        <ul>
          <li>Invoice posting should call `issueForSales()`.</li>
          <li>Sales returns should call `receiveSalesReturn()`.</li>
          <li>Sales must read/store the selected location before posting stock movement.</li>
        </ul>
      </div>
    </div>
  );
}
