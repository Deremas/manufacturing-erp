import { getUsers } from "@/lib/administration-db";
import { getCurrentUser } from "@/lib/auth/auth";
import { getLocations } from "@/lib/master-data-db";
import { formatItemOptionLabel, getItemRows } from "@/lib/server/item-data";
import { listProductionBatches } from "@/services/production/production-batch.service";
import { getQcOptions } from "@/services/qc/qc.service";

export async function getQcReferenceData() {
  const [currentUser, items, locations, users, qcOptions, batches] = await Promise.all([
    getCurrentUser(),
    getItemRows(),
    getLocations(),
    getUsers(),
    getQcOptions(),
    listProductionBatches(),
  ]);

  return {
    currentUser,
    items: items.map((item) => ({
      value: item.id,
      label: formatItemOptionLabel(item),
    })),
    locations: locations.map((location) => ({
      value: location.id,
      label: location.locationName,
    })),
    users: users.map((user) => ({
      value: user.id,
      label: user.name,
    })),
    batches: batches.map((batch) => ({
      value: batch.id,
      label: `${batch.batchNo} - ${batch.finishedGoodCode} - ${batch.finishedGoodName}`,
    })),
    qcOptions,
  };
}
