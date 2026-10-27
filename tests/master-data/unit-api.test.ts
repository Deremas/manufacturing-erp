import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { POST } from "@/app/api/master-data/units/route";
import { closeTestDatabase } from "../inventory/_helpers";

after(closeTestDatabase);

test("unit API uppercases code and abbreviation on create", async () => {
  const code = `ut${Date.now().toString().slice(-4)}`;
  const request = new Request("http://localhost/api/master-data/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      name: `Unit ${code}`,
      abbreviation: "pc",
      type: "Quantity",
      decimalPrecision: 0,
      isActive: true,
    }),
  });

  const response = await POST(request);
  const payload = (await response.json()) as { id?: string; error?: string };

  assert.equal(response.status, 200);
  assert.equal(payload.error, undefined);

  const rows = await sql<Array<{ code: string | null; abbreviation: string }>>`
    SELECT code, abbreviation
    FROM "Unit"
    WHERE UPPER(COALESCE(code, '')) = ${code.toUpperCase()}
      AND "isArchived" = false
    LIMIT 1
  `;

  assert.equal(rows[0]?.code, code.toUpperCase());
  assert.equal(rows[0]?.abbreviation, "PC");

  await sql`
    UPDATE "Unit"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE UPPER(COALESCE(code, '')) = ${code.toUpperCase()}
  `;
});

test("unit API rejects duplicate code", async () => {
  const code = `du${Date.now().toString().slice(-4)}`.toUpperCase();

  await sql`
    INSERT INTO "Unit" (
      id, code, name, abbreviation, type, "decimalPrecision", "isActive", "isArchived", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${code},
      ${`Existing ${code}`},
      'EA',
      'Quantity',
      0,
      true,
      false,
      NOW(),
      NOW()
    )
  `;

  const request = new Request("http://localhost/api/master-data/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code.toLowerCase(),
      name: `Duplicate ${code}`,
      abbreviation: "ea",
      type: "Quantity",
      decimalPrecision: 0,
      isActive: true,
    }),
  });

  const response = await POST(request);
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.match(payload.error ?? "", /already exists/i);

  await sql`
    UPDATE "Unit"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE UPPER(COALESCE(code, '')) = ${code}
  `;
});
