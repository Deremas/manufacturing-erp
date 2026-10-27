import HrShiftsPage from "@/features/hr/HrShiftsPage";
import { requireAuth } from "@/lib/auth/auth";
import { getShiftDefinitions } from "@/services/production/production-shared.service";

export default async function HrShiftsRoute() {
  await requireAuth();
  return <HrShiftsPage initialShifts={await getShiftDefinitions()} />;
}
