import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

async function main() {
  const expectedPassword = process.env.SEED_LOGIN_PASSWORD;
  if (!expectedPassword) throw new Error("SEED_LOGIN_PASSWORD is required");

  const users = await sql<Array<{ username: string | null; password: string | null }>>`
    SELECT username, password
    FROM "User"
    WHERE username IN ('admin', 'manager', 'clerk')
    ORDER BY username
  `;
  const results = await Promise.all(users.map(async (user) => ({
    username: user.username,
    passwordMatches: Boolean(user.password && await bcrypt.compare(expectedPassword, user.password)),
  })));
  console.log(results);
  if (results.length !== 3 || results.some((result) => !result.passwordMatches)) {
    throw new Error("One or more seeded login credentials are not synchronized");
  }
}

main().finally(() => sql.end());
