import { HoldReleaseLivePage } from "@/features/qc/live-pages";
import { listHoldReleases } from "@/services/qc/hold-release.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await listHoldReleases();
  return <HoldReleaseLivePage rows={rows} />;
}
