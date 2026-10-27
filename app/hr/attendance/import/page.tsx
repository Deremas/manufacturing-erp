import AttendanceImportPage from "@/features/hr/AttendanceImportPage";
import { requireAuth } from "@/lib/auth/auth";

export default async function AttendanceImportRoute() {
  await requireAuth();
  return <AttendanceImportPage />;
}
