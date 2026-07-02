import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";

export default function FuelRecordsPage() {
  return (
    <div style={{ padding: spacing.page.padding, display: "flex", flexDirection: "column", gap: spacing.page.gap }}>
      <PageHeader title="Fuel Records" subtitle="Fleet to inventory integration checkpoint" />
      <div style={{ padding: 24, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, backgroundColor: colors.surface }}>
        <p>Fleet-managed fuel and spares can now route through inventory issue/return helpers.</p>
        <ul>
          <li>Fuel issues should call inventory store issue logic if fuel is tracked as inventory.</li>
          <li>Tyres and spares should follow the same controlled issue path.</li>
          <li>Fleet should not update stock balances directly.</li>
        </ul>
      </div>
    </div>
  );
}
