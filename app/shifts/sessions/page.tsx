import { ShiftSessionsLivePage } from "@/features/shift/live-pages";
import { listShiftSessions } from "@/services/shift/shift-session.service";

export default async function ShiftSessionsPage() {
  const rows = await listShiftSessions();
  return <ShiftSessionsLivePage rows={rows} />;
}
