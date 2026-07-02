import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";

export default function WorkOrdersPage() {
  return (
    <div style={{ padding: spacing.page.padding, display: "flex", flexDirection: "column", gap: spacing.page.gap }}>
      <PageHeader title="Work Orders" subtitle="Maintenance to inventory integration checkpoint" />
      <div style={{ padding: 24, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, backgroundColor: colors.surface }}>
        <p>Maintenance work orders can now reference inventory issue/return flows instead of changing stock directly.</p>
        <ul>
          <li>Spare part issues should call `postStockIssue()`.</li>
          <li>Unused spare returns should call `postStockReturn()`.</li>
          <li>Work orders should keep the resulting stock document ids for traceability.</li>
        </ul>
      </div>
    </div>
  );
}
