import { sql } from "../lib/db";

async function main() {
  await sql.unsafe(`
    DROP TABLE IF EXISTS "PayrollEmployee" CASCADE;
    DROP TABLE IF EXISTS "PayrollRun" CASCADE;
    DROP TABLE IF EXISTS "PayrollComponent" CASCADE;
    DROP TABLE IF EXISTS "OvertimeRequest" CASCADE;
  `);

  console.log("Dropped empty HR rollout tables.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
