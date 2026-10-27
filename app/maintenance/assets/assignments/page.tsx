import { AssetAssignmentsPage } from "@/features/maintenance/AssetLifecyclePages";
import { listAssetAssignments } from "@/services/maintenance/asset-lifecycle.service";
export const dynamic = "force-dynamic";
export default async function Page() { return <AssetAssignmentsPage assignments={await listAssetAssignments()} />; }
