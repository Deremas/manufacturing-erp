import { getCurrentUser } from "@/lib/auth/auth";
import { getUsers } from "@/lib/administration-db";
import {
  getBankAccounts,
  getDepartments,
  getLocations,
  getSuppliers,
  getTaxCodes,
} from "@/lib/master-data-db";
import { formatItemOptionLabel, formatUomLabel, getItemRows } from "@/lib/server/item-data";
import { isPlaceholderItem } from "@/lib/item-display";
import { isPurchasableItem } from "@/lib/item-class";

export async function getProcurementReferenceData() {
  const [items, suppliers, locations, departments, taxCodes, bankAccounts, users, currentUser] = await Promise.all([
    getItemRows(),
    getSuppliers(),
    getLocations(),
    getDepartments(),
    getTaxCodes(),
    getBankAccounts(),
    getUsers(),
    getCurrentUser(),
  ]);

  return {
    currentUser,
    items: items
      .filter((item) => item.isActive && !isPlaceholderItem(item.itemName, item.itemCode) && isPurchasableItem(item))
      .map((item) => ({
        value: item.id,
        label: formatItemOptionLabel(item),
        itemCode: item.itemCode,
        itemName: item.itemName,
        uomId: item.uomId ?? "",
        uomName: formatUomLabel({ uomCode: item.uomCode, uomName: item.uomName }),
        unitCost: item.standardCost ?? 0,
      })),
    suppliers: suppliers.map((supplier) => ({
      value: supplier.id,
      label: `${supplier.supplierCode} - ${supplier.name}`,
      paymentTerms: supplier.paymentTerms ?? "",
    })),
    locations: locations.map((location) => ({
      value: location.id,
      label: location.locationName,
    })),
    departments: departments.map((department) => ({
      value: department.id,
      label: `${department.code} - ${department.name}`,
    })),
    taxCodes: taxCodes.map((taxCode) => ({
      value: taxCode.id,
      label: `${taxCode.taxName} (${Number(taxCode.rate ?? 0).toFixed(2)}%)`,
      rate: Number(taxCode.rate ?? 0),
    })),
    bankAccounts: bankAccounts.map((account) => ({
      value: account.id,
      label: `${account.accountCode} - ${account.accountName}`,
    })),
    users: users.map((user) => ({
      value: user.id,
      label: user.name,
    })),
  };
}
