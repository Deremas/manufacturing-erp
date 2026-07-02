import { ShiftReportPage } from "@/features/shift/live-pages";
import { getShiftEfficiencyReport } from "@/services/shift/shift-report.service";

export default async function EfficiencyReportPage() {
  const rows = (await getShiftEfficiencyReport()).map((row) => ({
    ...row,
    productionDate: new Date(String(row.productionDate)).toLocaleDateString("en-KE"),
  }));
  return <ShiftReportPage title="Efficiency Report" subtitle="Planned versus actual production output with downtime context." rows={rows} columns={[
    { key: "productionDate", label: "Date" },
    { key: "sessionNo", label: "Session No" },
    { key: "shiftCode", label: "Shift" },
    { key: "plannedOutput", label: "Planned Output" },
    { key: "actualOutput", label: "Actual Output" },
    { key: "efficiencyPercent", label: "Efficiency %" },
    { key: "downtimeMinutes", label: "Downtime (min)" },
  ]} />;
}
