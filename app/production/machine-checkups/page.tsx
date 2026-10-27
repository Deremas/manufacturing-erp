import { MissingRulePage } from "@/features/production/factory/FactoryReferencePages";

export default function MachineCheckupPage() {
  return (
    <MissingRulePage
      title="Machine Checkup & Handover"
      subtitle="Machines already come from the asset register and can be assigned to a shift."
      rule="The checkup checklist, handover signatures, and whether a failed checkup blocks shift start are not defined. Recording a checkup before that rule exists would not be a reliable maintenance or production control."
    />
  );
}
