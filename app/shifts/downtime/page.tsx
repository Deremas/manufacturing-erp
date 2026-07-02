import { ShiftReportPage } from "@/features/shift/live-pages";
import { getShiftDowntimeReport } from "@/services/shift/shift-report.service";

export default async function DowntimeReportPage() {
  const rows = (await getShiftDowntimeReport()).map((row) => ({
    ...row,
    productionDate: new Date(String(row.productionDate)).toLocaleDateString("en-KE"),
  }));
  return <ShiftReportPage title="Downtime Report" subtitle="Tracked production stoppages by machine, reason, and duration." rows={rows} columns={[
    { key: "productionDate", label: "Date" },
    { key: "sessionNo", label: "Session No" },
    { key: "shiftCode", label: "Shift" },
    { key: "machine", label: "Machine" },
    { key: "reason", label: "Reason" },
    { key: "durationMinutes", label: "Duration (min)" },
    { key: "remarks", label: "Remarks" },
  ]} />;
}
