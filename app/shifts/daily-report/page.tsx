import { ShiftReportPage } from "@/features/shift/live-pages";
import { getShiftDailyReport } from "@/services/shift/shift-report.service";

export default async function DailyReportPage() {
  const rows = (await getShiftDailyReport()).map((row) => ({
    ...row,
    productionDate: new Date(String(row.productionDate)).toLocaleDateString("en-KE"),
  }));
  return <ShiftReportPage title="Shift Daily Report" subtitle="Daily production performance by session, shift, and product." rows={rows} columns={[
    { key: "productionDate", label: "Date" },
    { key: "sessionNo", label: "Session No" },
    { key: "shiftCode", label: "Shift" },
    { key: "locationName", label: "Location" },
    { key: "productName", label: "Product" },
    { key: "producedQty", label: "Produced" },
    { key: "acceptedQty", label: "Accepted" },
    { key: "rejectedQty", label: "Rejected" },
    { key: "wastageQty", label: "Wastage" },
    { key: "downtimeMinutes", label: "Downtime (min)" },
    { key: "efficiencyPercent", label: "Efficiency %" },
  ]} />;
}
