import { HoldReleaseLivePage } from "@/features/qc/live-pages";
import { listHoldReleases } from "@/services/qc/hold-release.service";

export default async function HoldReleasePage() {
  const rows = await listHoldReleases();
  return <HoldReleaseLivePage rows={rows} />;
}
