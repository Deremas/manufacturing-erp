import { ProductionMaterialReturnEditor } from "@/features/shift/document-pages";
import {
  listProductionComponents,
  listStoreLocations,
} from "@/services/production/production-shared.service";
import { loadShift, shiftPublicPath } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export default async function ReturnMaterialsRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/materials/returns");
  const [storeLocations, components] = await Promise.all([
    listStoreLocations(),
    listProductionComponents(),
  ]);

  return (
    <ProductionMaterialReturnEditor
      sessionNo={session.sessionNo}
      productionLocationId={session.locationId}
      productionLocationName={session.locationName}
      apiBasePath={`/api/shifts/sessions/${session.id}/materials/return`}
      cancelHref={shiftPublicPath(session.publicId)}
      storeLocations={storeLocations}
      components={components}
    />
  );
}
