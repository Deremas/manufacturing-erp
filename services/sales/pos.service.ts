import {
  createPostedSale,
  getPointOfSaleCatalog,
  type CreateSaleInput,
} from "@/services/sales/sales.service";

export async function getPosCatalog(input: {
  saleDate: string;
  locationId: string;
  channel?: string | null;
  customerId?: string | null;
  agentId?: string | null;
  customerGroup?: string | null;
}) {
  return getPointOfSaleCatalog(input);
}

export async function postPointOfSaleSale(
  input: CreateSaleInput,
  actor: { userId: string; userName: string },
) {
  return createPostedSale(input, actor);
}
