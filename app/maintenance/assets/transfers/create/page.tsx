import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { AssetTransferFormPage } from "@/features/maintenance/AssetLifecyclePages";
export const dynamic = "force-dynamic";
export default async function Page() { const data = await getMaintenanceReferenceData(); return <AssetTransferFormPage assets={data.assets} locations={data.locations} />; }
