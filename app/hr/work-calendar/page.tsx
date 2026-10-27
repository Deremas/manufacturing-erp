import { requireAuth } from "@/lib/auth/auth";
import WorkCalendarPage from "@/features/hr/WorkCalendarPage";
import { getWorkCalendarSettings } from "@/services/hr/attendance.service";

export default async function HrWorkCalendarRoute() {
  await requireAuth();
  const settings = await getWorkCalendarSettings();
  return <WorkCalendarPage settings={settings} />;
}
