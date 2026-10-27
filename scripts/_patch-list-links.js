const fs = require("fs");
const path = require("path");

function patch(rel, replacements) {
  const full = path.join(__dirname, "..", rel);
  let s = fs.readFileSync(full, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (s.includes(from)) {
      s = s.split(from).join(to);
      changed = true;
      console.log(rel, "->", from.slice(0, 50));
    }
  }
  if (!s.includes('from "@/lib/routing/urls"') && changed) {
    // add import after first import block if using publicViewUrl
    if (toUsesUrls(replacements)) {
      const m = s.match(/^import .+$/m);
      if (m) {
        const insertAt = s.indexOf(m[0]) + m[0].length;
        s =
          s.slice(0, insertAt) +
          '\nimport { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";' +
          s.slice(insertAt);
      }
    }
  }
  fs.writeFileSync(full, s.replace(/\r?\n/g, "\n"), "utf8");
}

function toUsesUrls(reps) {
  return reps.some(([, to]) => to.includes("publicViewUrl") || to.includes("publicEditUrl"));
}

const linkPatches = [
  [
    "features/administration/users/UsersListPage.tsx",
    [
      [
        "router.push(`/administration/users/${record.id}`)",
        'router.push(publicViewUrl("administration.user", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/administration/users/${record.id}/edit`)",
        'router.push(publicEditUrl("administration.user", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/administration/roles/RolesListPage.tsx",
    [
      [
        "router.push(`/administration/roles/${record.id}`)",
        'router.push(publicViewUrl("administration.role", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/administration/roles/${record.id}/edit`)",
        'router.push(publicEditUrl("administration.role", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/administration/locations/LocationsListPage.tsx",
    [
      [
        "router.push(`/administration/locations/${record.id}`)",
        'router.push(publicViewUrl("administration.location", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/administration/document-numbering/DocumentNumberingPage.tsx",
    [
      [
        "router.push(`/administration/document-numbering/${record.id}/edit`)",
        'router.push(publicEditUrl("administration.docnum", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/administration/users/UserDetailPage.tsx",
    [
      [
        "router.push(`/administration/users/${user.id}/edit`)",
        'router.push(publicEditUrl("administration.user", user.publicId))',
      ],
    ],
  ],
  [
    "features/administration/roles/RoleDetailPage.tsx",
    [
      [
        "router.push(`/administration/roles/${role.id}/edit`)",
        'router.push(publicEditUrl("administration.role", role.publicId))',
      ],
    ],
  ],
  [
    "features/master-data/items/ItemsListPage.tsx",
    [
      [
        "router.push(`/master-data/items/${record.id}`)",
        'router.push(publicViewUrl("master-data.item", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/items/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.item", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/customers/CustomersListPage.tsx",
    [
      [
        "router.push(`/master-data/customers/${record.id}`)",
        'router.push(publicViewUrl("master-data.customer", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/customers/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.customer", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/suppliers/SuppliersListPage.tsx",
    [
      [
        "router.push(`/master-data/suppliers/${record.id}`)",
        'router.push(publicViewUrl("master-data.supplier", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/suppliers/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.supplier", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/categories/CategoriesListPage.tsx",
    [
      [
        "router.push(`/master-data/categories/${record.id}`)",
        'router.push(publicViewUrl("master-data.category", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/categories/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.category", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/units/UnitsListPage.tsx",
    [
      [
        "router.push(`/master-data/units/${record.id}`)",
        'router.push(publicViewUrl("master-data.unit", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/units/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.unit", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/departments/DepartmentsListPage.tsx",
    [
      [
        "router.push(`/master-data/departments/${record.id}`)",
        'router.push(publicViewUrl("master-data.department", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/departments/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.department", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/banks/BanksListPage.tsx",
    [
      [
        "router.push(`/master-data/banks/${record.id}`)",
        'router.push(publicViewUrl("master-data.bank", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/banks/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.bank", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/bank-accounts/BankAccountsListPage.tsx",
    [
      [
        "router.push(`/master-data/bank-accounts/${record.id}`)",
        'router.push(publicViewUrl("master-data.bank-account", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/bank-accounts/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.bank-account", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/tax-codes/TaxCodesListPage.tsx",
    [
      [
        "router.push(`/master-data/tax-codes/${record.id}`)",
        'router.push(publicViewUrl("master-data.tax-code", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/tax-codes/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.tax-code", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/item-types/ItemTypesListPage.tsx",
    [
      [
        "router.push(`/master-data/item-types/${record.id}`)",
        'router.push(publicViewUrl("master-data.item-type", (record as { publicId: number }).publicId))',
      ],
      [
        "router.push(`/master-data/item-types/${record.id}/edit`)",
        'router.push(publicEditUrl("master-data.item-type", (record as { publicId: number }).publicId))',
      ],
    ],
  ],
  [
    "features/master-data/price-lists/PriceListsListPage.tsx",
    [
      [
        "router.push(`/master-data/price-lists/${priceList.id}`)",
        'router.push(publicViewUrl("master-data.price-list", priceList.publicId))',
      ],
      [
        "router.push(`/master-data/price-lists/${priceList.id}/edit`)",
        'router.push(publicEditUrl("master-data.price-list", priceList.publicId))',
      ],
    ],
  ],
];

for (const [rel, reps] of linkPatches) {
  try {
    patch(rel, reps);
  } catch (e) {
    console.error("fail", rel, e.message);
  }
}

// Ensure imports exist
for (const [rel] of linkPatches) {
  const full = path.join(__dirname, "..", rel);
  let s = fs.readFileSync(full, "utf8");
  if (
    (s.includes("publicViewUrl") || s.includes("publicEditUrl")) &&
    !s.includes("@/lib/routing/urls")
  ) {
    const firstImport = s.indexOf("import ");
    const lineEnd = s.indexOf("\n", firstImport);
    s =
      s.slice(0, lineEnd + 1) +
      'import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";\n' +
      s.slice(lineEnd + 1);
    fs.writeFileSync(full, s.replace(/\r?\n/g, "\n"), "utf8");
    console.log("import added", rel);
  }
}

console.log("list links done");
