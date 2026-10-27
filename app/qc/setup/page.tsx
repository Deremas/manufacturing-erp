import { QcSetupPage } from "@/features/qc/setup-page";
import { getQcSetupData } from "@/services/qc/qc-setup.service";

export const dynamic = "force-dynamic";

export default async function QcSetupRoute() {
  return <QcSetupPage {...await getQcSetupData()} />;
}
