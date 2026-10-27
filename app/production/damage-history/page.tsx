import { MissingRulePage } from "@/features/production/factory/FactoryReferencePages";

export default function DamageHistoryPage() {
  return (
    <MissingRulePage
      title="Damage History"
      subtitle="Damage is not the same record as machine downtime or consumption waste."
      rule="A damage document needs its source (output or material), operator, machine, product, shift, reason, and whether a signature corrects stock. That rule is not in the current production tables, so this screen does not invent damage postings."
    />
  );
}
