const fs = require("fs");
const path = require("path");

function patch(rel, fn) {
  const full = path.join(__dirname, "..", rel);
  let s = fs.readFileSync(full, "utf8");
  const next = fn(s);
  fs.writeFileSync(full, next.replace(/\r?\n/g, "\n"), "utf8");
  console.log("patched", rel);
}

patch("lib/master-data-db.ts", (s) => {
  const pairs = [
    [
      'SELECT id, "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"',
      'SELECT id, "publicId", "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"',
    ],
    [
      'SELECT id, "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"',
      'SELECT id, "publicId", "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"',
    ],
  ];
  for (const [a, b] of pairs) {
    if (s.includes(a) && !s.includes(b)) s = s.split(a).join(b);
  }
  // banks / departments / tax / bank accounts - broader replace of leading SELECT id,
  s = s.replace(
    /SELECT\n        ba\.id,\n        ba\."accountCode",/g,
    'SELECT\n        ba.id,\n        ba."publicId",\n        ba."accountCode",',
  );
  s = s.replace(
    /SELECT\n        d\.id,\n        d\.code,/g,
    'SELECT\n        d.id,\n        d."publicId",\n        d.code,',
  );
  return s;
});

patch("lib/server/item-data.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }
  if (!s.includes("publicId: number")) {
    s = s.replace(
      "type ItemRow = {\n  id: string;\n  itemCode: string;",
      "type ItemRow = {\n  id: string;\n  publicId: number;\n  itemCode: string;",
    );
  }
  if (!s.includes("publicId: row.publicId")) {
    s = s.replace(
      "return {\n    id: row.id,\n    itemCode: row.itemCode,",
      "return {\n    id: row.id,\n    publicId: row.publicId,\n    itemCode: row.itemCode,",
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
});

patch("services/administration/documentNumberingService.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }
  if (!s.includes("publicId: number")) {
    s = s.replace(
      "type DocumentNumberingRow = {\n  id: string;\n  prefix: string;",
      "type DocumentNumberingRow = {\n  id: string;\n  publicId: number;\n  prefix: string;",
    );
  }
  s = s.replace(
    /SELECT\n      id,\n      prefix,/g,
    'SELECT\n      id,\n      "publicId",\n      prefix,',
  );
  s = s.replace(
    'WHERE id = ${id}\n      AND "isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`}\n      AND "isArchived" = false',
  );
  if (!s.includes("publicId: row.publicId")) {
    s = s.replace(
      "return {\n    id: row.id,\n    prefix: row.prefix,",
      "return {\n    id: row.id,\n    publicId: row.publicId,\n    prefix: row.prefix,",
    );
  }
  return s;
});

patch("services/master-data/priceListService.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    const idx = s.indexOf('from "@/lib/db"');
    if (idx >= 0) {
      const lineEnd = s.indexOf("\n", idx);
      s =
        s.slice(0, lineEnd + 1) +
        'import { isPublicIdParam } from "@/lib/routing/public-id";\n' +
        s.slice(lineEnd + 1);
    }
  }
  s = s.replace(
    /WHERE pl\.id = \$\{id\}/g,
    'WHERE ${isPublicIdParam(id) ? sql`pl."publicId" = ${Number(id)}` : sql`pl.id = ${id}`}',
  );
  s = s.replace(
    /SELECT\n\s+pl\.id,\n\s+pl\.name,/g,
    'SELECT\n      pl.id,\n      pl."publicId",\n      pl.name,',
  );
  return s;
});

const apis = [
  "app/api/master-data/customers/[id]/route.ts",
  "app/api/master-data/suppliers/[id]/route.ts",
  "app/api/master-data/categories/[id]/route.ts",
  "app/api/master-data/units/[id]/route.ts",
  "app/api/master-data/item-types/[id]/route.ts",
];
for (const rel of apis) {
  patch(rel, (s) => {
    if (!s.includes("isPublicIdParam")) {
      s = s.replace(
        'import { sql } from "@/lib/db";',
        'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
      );
    }
    s = s.replace(
      /WHERE id = \$\{id\} AND "isArchived" = false/g,
      'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false',
    );
    s = s.replace(
      /SELECT\n        id,\n        "/g,
      'SELECT\n        id,\n        "publicId",\n        "',
    );
    return s;
  });
}

console.log("all service patches done");
