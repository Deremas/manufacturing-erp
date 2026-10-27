/**
 * Patch lib/administration-db.ts, lib/master-data-db.ts, lib/server/item-data.ts
 * and related services for publicId + dual lookup.
 */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content.replace(/\r?\n/g, "\n"), "utf8");
  console.log("patched", rel);
}

// ── administration-db ────────────────────────────────────────
{
  let s = read("lib/administration-db.ts");
  if (!s.includes('from "@/lib/routing/public-id"')) {
    s = s.replace(
      'import { sql } from "@/lib/db";',
      'import { sql } from "@/lib/db";\nimport { isPublicIdParam } from "@/lib/routing/public-id";',
    );
  }

  // getRoles SELECT add publicId
  s = s.replace(
    /SELECT\s+r\.id,\s+r\.name,/m,
    'SELECT\n        r.id,\n        r."publicId",\n        r.name,',
  );
  // map roles
  s = s.replace(
    /return rows\.map\(\(row\) => \(\{\s+id: row\.id,\s+name: row\.name,/g,
    (m) => m.replace("id: row.id,", 'id: row.id,\n      publicId: row.publicId,'),
  );

  // Ensure role row type includes publicId in getRoles and getRoleById
  s = s.replace(
    /Array<\{\s+id: string;\s+name: string;\s+description: string \| null;/g,
    'Array<{\n        id: string;\n        publicId: number;\n        name: string;\n        description: string | null;',
  );

  // getRoleById WHERE
  s = s.replace(
    /WHERE r\.id = \$\{id\} AND r\."isArchived" = false/,
    'WHERE ${isPublicIdParam(id) ? sql`r."publicId" = ${Number(id)}` : sql`r.id = ${id}`} AND r."isArchived" = false',
  );

  // getUsers SELECT
  s = s.replace(
    /SELECT\s+u\.id,\s+u\.name,\s+u\.email,/m,
    'SELECT\n        u.id,\n        u."publicId",\n        u.name,\n        u.email,',
  );
  // getUserById similar - might double-replace first occurrence only for list; do carefully

  // Fix getUserById WHERE
  s = s.replace(
    /WHERE u\.id = \$\{id\} AND u\."isArchived" = false/,
    'WHERE ${isPublicIdParam(id) ? sql`u."publicId" = ${Number(id)}` : sql`u.id = ${id}`} AND u."isArchived" = false',
  );

  write("lib/administration-db.ts", s);
}

// Manual finer patches via targeted replacements for admin mapping
{
  let s = read("lib/administration-db.ts");

  // getRoles map - add publicId if missing in map return
  if (!s.includes("publicId: row.publicId") && !s.includes("publicId: Number(row.publicId")) {
    s = s.replace(
      /return rows\.map\(\(row\) => \(\{\n      id: row\.id,\n      name: row\.name,\n      description: row\.description \?\? "",\n      isSystem: row\.isSystem,/g,
      `return rows.map((row) => ({\n      id: row.id,\n      publicId: row.publicId,\n      name: row.name,\n      description: row.description ?? "",\n      isSystem: row.isSystem,`,
    );
  }

  // getRoleById return object
  s = s.replace(
    /return \{\n      id: role\.id,\n      name: role\.name,\n      description: role\.description \?\? "",/g,
    `return {\n      id: role.id,\n      publicId: role.publicId,\n      name: role.name,\n      description: role.description ?? "",`,
  );

  // Users map - find return of getUsers
  s = s.replace(
    /id: row\.id,\n        name: row\.name,\n        email: row\.email,/g,
    `id: row.id,\n        publicId: (row as { publicId?: number }).publicId ?? 0,\n        name: row.name,\n        email: row.email,`,
  );

  write("lib/administration-db.ts", s);
}

console.log("admin partial done — applying master-data patches");

// ── BaseEntity + feature types ───────────────────────────────
{
  let s = read("types/master-data.ts");
  if (!s.includes("publicId")) {
    s = s.replace(
      `export interface BaseEntity {
  id: string;
  isActive: boolean;`,
      `export interface BaseEntity {
  id: string;
  publicId: number;
  isActive: boolean;`,
    );
    write("types/master-data.ts", s);
  }
}

{
  let s = read("features/administration/types.ts");
  if (!s.includes("publicId")) {
    s = s.replace(
      `export interface User {
  id: string;
  name: string;`,
      `export interface User {
  id: string;
  publicId: number;
  name: string;`,
    );
    s = s.replace(
      `export interface Role {
  id: string;
  name: string;`,
      `export interface Role {
  id: string;
  publicId: number;
  name: string;`,
    );
    s = s.replace(
      `export interface Location {
  id: string;
  locationCode: string;`,
      `export interface Location {
  id: string;
  publicId: number;
  locationCode: string;`,
    );
    write("features/administration/types.ts", s);
  }
}

{
  let s = read("features/master-data/types.ts");
  const entities = [
    ["Item", "itemCode"],
    ["Category", "name"],
    ["Unit", "code?"],
    ["Customer", "customerCode"],
    ["Supplier", "supplierCode"],
  ];
  if (!s.includes("publicId")) {
    s = s.replace(/export interface (\w+) \{\n  id: string;/g, "export interface $1 {\n  id: string;\n  publicId: number;");
    write("features/master-data/types.ts", s);
  }
}

console.log("types done");
