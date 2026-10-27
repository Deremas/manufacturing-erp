const fs = require("fs");
const path = require("path");

function withRetry(fn, label, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e) {
      if (i === attempts - 1) throw e;
      const start = Date.now();
      while (Date.now() - start < 250 * (i + 1)) {}
      console.log("retry", label, i + 1, e.message);
    }
  }
}

function patchFile(rel, transform) {
  const full = path.join(__dirname, "..", rel);
  withRetry(() => {
    const before = fs.readFileSync(full, "utf8");
    const after = transform(before);
    if (after === before) {
      console.log("noop", rel);
      return;
    }
    fs.writeFileSync(full, after.replace(/\r?\n/g, "\n"), "utf8");
    console.log("ok", rel);
  }, rel);
}

function ensureImport(s) {
  if (s.includes("@/lib/routing/urls")) return s;
  const idx = s.indexOf("\n");
  return (
    s.slice(0, idx + 1) +
    'import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";\n' +
    s.slice(idx + 1)
  );
}

const files = {
  "features/administration/roles/RolesListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/administration/roles/${record.id}`)",
      'router.push(publicViewUrl("administration.role", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/administration/roles/${record.id}/edit`)",
      'router.push(publicEditUrl("administration.role", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/administration/locations/LocationsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/administration/locations/${record.id}`)",
      'router.push(publicViewUrl("administration.location", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/administration/users/UserDetailPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/administration/users/${user.id}/edit`)",
      'router.push(publicEditUrl("administration.user", user.publicId))',
    );
    return s;
  },
  "features/administration/roles/RoleDetailPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/administration/roles/${role.id}/edit`)",
      'router.push(publicEditUrl("administration.role", role.publicId))',
    );
    return s;
  },
  "features/master-data/items/ItemsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/items/${record.id}`)",
      'router.push(publicViewUrl("master-data.item", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/items/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.item", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/customers/CustomersListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/customers/${record.id}`)",
      'router.push(publicViewUrl("master-data.customer", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/customers/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.customer", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/suppliers/SuppliersListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/suppliers/${record.id}`)",
      'router.push(publicViewUrl("master-data.supplier", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/suppliers/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.supplier", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/categories/CategoriesListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/categories/${record.id}`)",
      'router.push(publicViewUrl("master-data.category", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/categories/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.category", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/units/UnitsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/units/${record.id}`)",
      'router.push(publicViewUrl("master-data.unit", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/units/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.unit", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/departments/DepartmentsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/departments/${record.id}`)",
      'router.push(publicViewUrl("master-data.department", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/departments/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.department", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/banks/BanksListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/banks/${record.id}`)",
      'router.push(publicViewUrl("master-data.bank", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/banks/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.bank", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/bank-accounts/BankAccountsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/bank-accounts/${record.id}`)",
      'router.push(publicViewUrl("master-data.bank-account", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/bank-accounts/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.bank-account", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/tax-codes/TaxCodesListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/tax-codes/${record.id}`)",
      'router.push(publicViewUrl("master-data.tax-code", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/tax-codes/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.tax-code", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/item-types/ItemTypesListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/item-types/${record.id}`)",
      'router.push(publicViewUrl("master-data.item-type", (record as { publicId: number }).publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/item-types/${record.id}/edit`)",
      'router.push(publicEditUrl("master-data.item-type", (record as { publicId: number }).publicId))',
    );
    return s;
  },
  "features/master-data/price-lists/PriceListsListPage.tsx": (s) => {
    s = ensureImport(s);
    s = s.replace(
      "router.push(`/master-data/price-lists/${priceList.id}`)",
      'router.push(publicViewUrl("master-data.price-list", priceList.publicId))',
    );
    s = s.replace(
      "router.push(`/master-data/price-lists/${priceList.id}/edit`)",
      'router.push(publicEditUrl("master-data.price-list", priceList.publicId))',
    );
    return s;
  },
  "features/master-data/types.ts": (s) =>
    s.replace(
      /export interface (\w+) \{\n  id: string;\n(?!  publicId)/g,
      "export interface $1 {\n  id: string;\n  publicId: number;\n",
    ),
  "lib/administration-db.ts": (s) => {
    if (s.includes('publicId: number;\n    module: string;\n    documentType')) return s;
    return s
      .replace(
        "Array<{\n    id: string;\n    module: string;\n    documentType: string;",
        "Array<{\n    id: string;\n    publicId: number;\n    module: string;\n    documentType: string;",
      )
      .replace(
        "Array<{\n        id: string;\n        prefix: string;\n        description: string | null;\n        prefixFormat: string;",
        "Array<{\n        id: string;\n        publicId: number;\n        prefix: string;\n        description: string | null;\n        prefixFormat: string;",
      )
      .replace(
        'SELECT\n        id,\n        prefix,\n        description,\n        "prefixFormat",',
        'SELECT\n        id,\n        "publicId",\n        prefix,\n        description,\n        "prefixFormat",',
      )
      .replace(
        "return rows.map((row) => ({\n      id: row.id,\n      module: \"General\",",
        'return rows.map((row) => ({\n      id: row.id,\n      publicId: row.publicId,\n      module: "General",',
      );
  },
  "lib/server/item-data.ts": (s) => {
    if (!s.includes("publicId: number")) {
      s = s.replace(
        "type ItemRow = {\n  id: string;\n  itemCode: string;",
        "type ItemRow = {\n  id: string;\n  publicId: number;\n  itemCode: string;",
      );
    }
    s = s.replace(
      /SELECT\n      i\.id,\n      i\."itemCode",/g,
      'SELECT\n      i.id,\n      i."publicId",\n      i."itemCode",',
    );
    s = s.replace(
      'WHERE i.id = ${id} AND i."isArchived" = false',
      'WHERE ${isPublicIdParam(id) ? sql`i."publicId" = ${Number(id)}` : sql`i.id = ${id}`} AND i."isArchived" = false',
    );
    return s;
  },
};

for (const [rel, fn] of Object.entries(files)) {
  try {
    patchFile(rel, fn);
  } catch (e) {
    console.error("FAIL", rel, e.message);
  }
}

console.log("finished");
