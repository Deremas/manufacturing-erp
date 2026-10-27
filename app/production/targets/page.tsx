import { MissingRulePage } from "@/features/production/factory/FactoryReferencePages";

export default function TargetsCalendarPage() {
  return (
    <MissingRulePage
      title="Targets Calendar"
      subtitle="Daily production targets are not stored yet."
      rule="Target entry needs the product, factory, month, and whether a quantity applies to weekdays or every day. Efficiency currently compares recorded output with downtime, not with a saved daily target."
    />
  );
}
