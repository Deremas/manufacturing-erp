import { getCurrentUser } from "@/lib/auth/auth";
import {
  getShiftDefinitions,
  listFinishedGoods,
  listProductionComponents,
  listProductionLocations,
  listUnits,
  listUsers,
} from "@/services/production/production-shared.service";

export async function getProductionReferenceData() {
  const [currentUser, finishedGoods, components, productionLocations, users, units, shiftDefinitions] = await Promise.all([
    getCurrentUser(),
    listFinishedGoods(),
    listProductionComponents(),
    listProductionLocations(),
    listUsers(),
    listUnits(),
    getShiftDefinitions(),
  ]);

  return {
    currentUser,
    finishedGoods,
    components,
    productionLocations,
    users,
    units,
    shiftDefinitions,
  };
}
