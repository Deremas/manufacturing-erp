const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "lib", "master-data-db.ts");
let s = fs.readFileSync(file, "utf8");

if (!s.includes('isPublicIdParam')) {
  s = s.replace(
    'import { sql } from "@/lib/db";',
    'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
  );
}

const replacements = [
  [
    'WHERE c.id = ${id} AND c."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`c."publicId" = ${Number(id)}` : sql`c.id = ${id}`} AND c."isArchived" = false',
  ],
  [
    'WHERE id = ${id} AND "isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false',
  ],
  [
    'WHERE it.id = ${id} AND it."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`it."publicId" = ${Number(id)}` : sql`it.id = ${id}`} AND it."isArchived" = false',
  ],
  [
    'WHERE u.id = ${id} AND u."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`u."publicId" = ${Number(id)}` : sql`u.id = ${id}`} AND u."isArchived" = false',
  ],
  [
    'WHERE s.id = ${id} AND s."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`s."publicId" = ${Number(id)}` : sql`s.id = ${id}`} AND s."isArchived" = false',
  ],
  [
    'WHERE b.id = ${id} AND b."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`b."publicId" = ${Number(id)}` : sql`b.id = ${id}`} AND b."isArchived" = false',
  ],
  [
    'WHERE ba.id = ${id} AND ba."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`ba."publicId" = ${Number(id)}` : sql`ba.id = ${id}`} AND ba."isArchived" = false',
  ],
  [
    'WHERE d.id = ${id} AND d."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`d."publicId" = ${Number(id)}` : sql`d.id = ${id}`} AND d."isArchived" = false',
  ],
  [
    'WHERE tc.id = ${id} AND tc."isArchived" = false',
    'WHERE ${isPublicIdParam(id) ? sql`tc."publicId" = ${Number(id)}` : sql`tc.id = ${id}`} AND tc."isArchived" = false',
  ],
];

for (const [from, to] of replacements) {
  if (s.includes(from)) {
    s = s.split(from).join(to);
    console.log("replaced:", from.slice(0, 40));
  } else if (s.includes(to)) {
    console.log("already:", from.slice(0, 40));
  } else {
    console.log("MISSING:", from.slice(0, 60));
  }
}

// Ensure list/detail SELECTs include publicId for common patterns (idempotent-ish)
const selectPairs = [
  ['SELECT\n        c.id,\n        c.name,', 'SELECT\n        c.id,\n        c."publicId",\n        c.name,'],
  ['SELECT id, "locationCode"', 'SELECT id, "publicId", "locationCode"'],
  ['SELECT id, code, name, description, "isActive"\n      FROM "ItemType"', 'SELECT id, "publicId", code, name, description, "isActive"\n      FROM "ItemType"'],
  ['SELECT id, code, name, abbreviation', 'SELECT id, "publicId", code, name, abbreviation'],
];

for (const [from, to] of selectPairs) {
  if (s.includes(from) && !s.includes(to)) {
    s = s.split(from).join(to);
    console.log("select patched");
  }
}

// Inject publicId into simple map returns that lack it
s = s.replace(
  /id: row\.id,\n(?!\s*publicId)/g,
  'id: row.id,\n      publicId: Number((row as { publicId?: number }).publicId ?? 0),\n',
);

fs.writeFileSync(file, s.replace(/\r?\n/g, "\n"), "utf8");
console.log("wrote master-data-db.ts");
