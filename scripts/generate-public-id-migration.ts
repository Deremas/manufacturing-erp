/**
 * Adds publicId SERIAL column to every entity table in the public route registry.
 * Safe to re-run: uses IF NOT EXISTS.
 */
import { PUBLIC_ROUTE_REGISTRY } from "../lib/routing/registry";

const tables = [
  ...new Set(Object.values(PUBLIC_ROUTE_REGISTRY).map((def) => def.model)),
];

const statements = tables.flatMap((table) => [
  `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "publicId" SERIAL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_publicId_key" ON "${table}"("publicId");`,
]);

console.log(statements.join("\n"));
