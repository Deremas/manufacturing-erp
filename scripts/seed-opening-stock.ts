import { sql } from "../lib/db";
import { seedOpeningStock } from "../lib/server/stock-seed";

function parseArgs(argv: string[]) {
  const options: {
    force?: boolean;
    quantityPerItem?: number;
    itemLimit?: number;
    locationLimit?: number;
  } = {};

  for (const arg of argv) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg.startsWith("--qty=")) {
      options.quantityPerItem = Number(arg.slice("--qty=".length));
      continue;
    }
    if (arg.startsWith("--items=")) {
      options.itemLimit = Number(arg.slice("--items=".length));
      continue;
    }
    if (arg.startsWith("--locations=")) {
      options.locationLimit = Number(arg.slice("--locations=".length));
    }
  }

  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await seedOpeningStock({
    force: args.force,
    quantityPerItem: args.quantityPerItem,
    itemLimit: args.itemLimit,
    locationLimit: args.locationLimit,
  });

  if (result.skipped) {
    console.log("Skipped opening stock seed because stock already exists. Use --force to add more.");
    return;
  }

  console.log(
    JSON.stringify(
      {
        message: "Opening stock seeded successfully",
        result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Opening stock seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
