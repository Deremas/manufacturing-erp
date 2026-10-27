const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

function patchFile(rel, transform) {
  const full = path.join(root, rel);
  const before = fs.readFileSync(full, "utf8");
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(full, after.replace(/\r?\n/g, "\n"), "utf8");
    console.log("patched", rel);
  } else {
    console.log("unchanged", rel);
  }
}

// Patch master-data feature types: add publicId after id on all interfaces missing it
patchFile("features/master-data/types.ts", (s) => {
  return s.replace(
    /export interface (\w+) \{\n  id: string;\n(?!  publicId)/g,
    "export interface $1 {\n  id: string;\n  publicId: number;\n",
  );
});

// Patch document numbering service
patchFile("services/administration/documentNumberingService.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }
  s = s.replace(
    /type DocumentNumberingRow = \{\n  id: string;/,
    'type DocumentNumberingRow = {\n  id: string;\n  publicId: number;',
  );
  // SELECT lists - add publicId after id
  s = s.replace(
    /SELECT\n      id,\n      prefix,/g,
    'SELECT\n      id,\n      "publicId",\n      prefix,',
  );
  s = s.replace(
    /WHERE id = \$\{id\}\n      AND "isArchived" = false/,
    'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`}\n      AND "isArchived" = false',
  );
  s = s.replace(
    /function mapRow\(row: DocumentNumberingRow\): DocumentNumberingConfig \{\n  return \{\n    id: row\.id,/,
    'function mapRow(row: DocumentNumberingRow): DocumentNumberingConfig {\n  return {\n    id: row.id,\n    publicId: row.publicId,',
  );
  return s;
});

// Patch item-data
patchFile("lib/server/item-data.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }
  s = s.replace(
    /type ItemRow = \{\n  id: string;/,
    "type ItemRow = {\n  id: string;\n  publicId: number;",
  );
  s = s.replace(
    /function mapItemRow\(row: ItemRow\): Item \{\n  return \{\n    id: row\.id,/,
    "function mapItemRow(row: ItemRow): Item {\n  return {\n    id: row.id,\n    publicId: row.publicId,",
  );
  // Add publicId to SELECTs that start with i.id,
  s = s.replace(/SELECT\n      i\.id,\n      i\."itemCode",/g, 'SELECT\n      i.id,\n      i."publicId",\n      i."itemCode",');
  s = s.replace(
    /WHERE i\.id = \$\{id\} AND i\."isArchived" = false/,
    'WHERE ${isPublicIdParam(id) ? sql`i."publicId" = ${Number(id)}` : sql`i.id = ${id}`} AND i."isArchived" = false',
  );
  return s;
});

// Patch master-data-db comprehensively
patchFile("lib/master-data-db.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }

  // Dual-lookup WHERE patterns for various aliases
  const wherePatterns = [
    [/WHERE c\.id = \$\{id\} AND c\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`c."publicId" = ${Number(id)}` : sql`c.id = ${id}`} AND c."isArchived" = false'],
    [/WHERE l\.id = \$\{id\} AND l\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`l."publicId" = ${Number(id)}` : sql`l.id = ${id}`} AND l."isArchived" = false'],
    [/WHERE it\.id = \$\{id\} AND it\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`it."publicId" = ${Number(id)}` : sql`it.id = ${id}`} AND it."isArchived" = false'],
    [/WHERE u\.id = \$\{id\} AND u\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`u."publicId" = ${Number(id)}` : sql`u.id = ${id}`} AND u."isArchived" = false'],
    [/WHERE cust\.id = \$\{id\} AND cust\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`cust."publicId" = ${Number(id)}` : sql`cust.id = ${id}`} AND cust."isArchived" = false'],
    [/WHERE s\.id = \$\{id\} AND s\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`s."publicId" = ${Number(id)}` : sql`s.id = ${id}`} AND s."isArchived" = false'],
    [/WHERE b\.id = \$\{id\} AND b\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`b."publicId" = ${Number(id)}` : sql`b.id = ${id}`} AND b."isArchived" = false'],
    [/WHERE ba\.id = \$\{id\} AND ba\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`ba."publicId" = ${Number(id)}` : sql`ba.id = ${id}`} AND ba."isArchived" = false'],
    [/WHERE d\.id = \$\{id\} AND d\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`d."publicId" = ${Number(id)}` : sql`d.id = ${id}`} AND d."isArchived" = false'],
    [/WHERE tc\.id = \$\{id\} AND tc\."isArchived" = false/g, 'WHERE ${isPublicIdParam(id) ? sql`tc."publicId" = ${Number(id)}` : sql`tc.id = ${id}`} AND tc."isArchived" = false'],
  ];
  for (const [re, rep] of wherePatterns) {
    s = s.replace(re, rep);
  }

  // Add publicId to SELECT clauses for common aliases - carefully
  const selectAdds = [
    [/SELECT\n        c\.id,\n        c\.name,/g, 'SELECT\n        c.id,\n        c."publicId",\n        c.name,'],
    [/SELECT\n        l\.id,\n        l\."locationCode",/g, 'SELECT\n        l.id,\n        l."publicId",\n        l."locationCode",'],
    [/SELECT\n        it\.id,\n        it\.code,/g, 'SELECT\n        it.id,\n        it."publicId",\n        it.code,'],
    [/SELECT\n        u\.id,\n        u\.code,/g, 'SELECT\n        u.id,\n        u."publicId",\n        u.code,'],
    [/SELECT\n        cust\.id,\n        cust\."customerCode",/g, 'SELECT\n        cust.id,\n        cust."publicId",\n        cust."customerCode",'],
    [/SELECT\n        s\.id,\n        s\."supplierCode",/g, 'SELECT\n        s.id,\n        s."publicId",\n        s."supplierCode",'],
    [/SELECT\n        b\.id,\n        b\.code,/g, 'SELECT\n        b.id,\n        b."publicId",\n        b.code,'],
    [/SELECT\n        ba\.id,\n        ba\."accountCode",/g, 'SELECT\n        ba.id,\n        ba."publicId",\n        ba."accountCode",'],
    [/SELECT\n        d\.id,\n        d\.code,/g, 'SELECT\n        d.id,\n        d."publicId",\n        d.code,'],
    [/SELECT\n        tc\.id,\n        tc\."taxCode",/g, 'SELECT\n        tc.id,\n        tc."publicId",\n        tc."taxCode",'],
  ];
  for (const [re, rep] of selectAdds) {
    s = s.replace(re, rep);
  }

  // Add publicId to map returns - pattern id: row.id,
  s = s.replace(
    /return \{\n        id: row\.id,\n(?!        publicId)/g,
    'return {\n        id: row.id,\n        publicId: Number((row as { publicId?: number }).publicId ?? 0),\n',
  );
  s = s.replace(
    /return \{\n      id: row\.id,\n(?!      publicId)/g,
    'return {\n      id: row.id,\n      publicId: Number((row as { publicId?: number }).publicId ?? 0),\n',
  );

  return s;
});

// Patch priceListService
patchFile("services/master-data/priceListService.ts", (s) => {
  if (!s.includes("isPublicIdParam")) {
    const marker = 'from "@/lib/db"';
    const idx = s.indexOf(marker);
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
    /WHERE id = \$\{id\} AND "isArchived"/g,
    'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived"',
  );

  s = s.replace(
    /SELECT\n\s+pl\.id,\n\s+pl\.name,/g,
    'SELECT\n      pl.id,\n      pl."publicId",\n      pl.name,',
  );

  return s;
});

// Dual lookup for client-facing APIs
const apiFiles = [
  "app/api/master-data/customers/[id]/route.ts",
  "app/api/master-data/suppliers/[id]/route.ts",
  "app/api/master-data/categories/[id]/route.ts",
  "app/api/master-data/units/[id]/route.ts",
  "app/api/master-data/item-types/[id]/route.ts",
];

for (const rel of apiFiles) {
  patchFile(rel, (s) => {
    if (!s.includes("isPublicIdParam")) {
      s = s.replace(
        'import { sql } from "@/lib/db";',
        'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
      );
    }
    // Add publicId to SELECT if starts with id,
    s = s.replace(
      /SELECT\n        id,\n        "/g,
      'SELECT\n        id,\n        "publicId",\n        "',
    );
    s = s.replace(
      /WHERE id = \$\{id\} AND "isArchived" = false/g,
      'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false',
    );
    return s;
  });
}

console.log("done");
