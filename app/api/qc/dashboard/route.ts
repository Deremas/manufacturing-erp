import { withQcUser } from "@/app/api/qc/helpers";
import { getQcDashboard } from "@/services/qc/qc-dashboard.service";

export async function GET() {
  return withQcUser(async (user) => getQcDashboard({ accessibleLocationIds: user.accessibleLocationIds }), "qc.dashboard.view");
}
