import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { getHrAttendanceReport } from "@/services/reports/hr-report.service";
import { closeTestDatabase } from "@/tests/inventory/_helpers";
import { runWithTransientDbRetry } from "@/tests/sales/_helpers";

after(closeTestDatabase);

test("HR attendance report respects accessible location scope", async () => {
  await runWithTransientDbRetry(async () => {
    const [users, locations] = await Promise.all([
      sql<Array<{ id: string }>>`
        SELECT id
        FROM "User"
        WHERE "isArchived" = false
        ORDER BY "createdAt" ASC
        LIMIT 2
      `,
      sql<Array<{ id: string; "locationCode": string }>>`
        SELECT id, "locationCode"
        FROM "Location"
        WHERE "isArchived" = false
        ORDER BY "createdAt" ASC
        LIMIT 2
      `,
    ]);

    if (users.length < 2 || locations.length < 2) {
      throw new Error("Report scope test requires at least two users and two locations");
    }

    const employeeOneId = randomUUID();
    const employeeTwoId = randomUUID();
    const attendanceOneId = randomUUID();
    const attendanceTwoId = randomUUID();

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO "Employee" (
          id, "employeeNo", "firstName", "lastName", "hireDate", "locationId",
          "userId", "baseSalary", status, "isActive", "isArchived", "createdAt", "updatedAt"
        )
        VALUES
        (
          ${employeeOneId},
          ${`RPT-EMP-${Date.now()}-A`},
          'Scoped',
          'Included',
          NOW(),
          ${locations[0]!.id},
          ${users[0]!.id},
          0,
          'ACTIVE'::"EmployeeStatus",
          true,
          false,
          NOW(),
          NOW()
        ),
        (
          ${employeeTwoId},
          ${`RPT-EMP-${Date.now()}-B`},
          'Scoped',
          'Excluded',
          NOW(),
          ${locations[1]!.id},
          ${users[1]!.id},
          0,
          'ACTIVE'::"EmployeeStatus",
          true,
          false,
          NOW(),
          NOW()
        )
      `;

      await tx`
        INSERT INTO "DailyAttendance" (
          id, "employeeId", "attendanceDate", "locationId", "userId", "shiftCode",
          status, "sourceType", "hoursWorked", "overtimeHours", remarks, "isArchived",
          "createdById", "updatedById", "createdAt", "updatedAt"
        )
        VALUES
        (
          ${attendanceOneId},
          ${employeeOneId},
          NOW(),
          ${locations[0]!.id},
          ${users[0]!.id},
          'DAY',
          'PRESENT'::"DailyAttendanceStatus",
          'SHIFT'::"AttendanceSourceType",
          1,
          0,
          'Scope included'
          ,
          false,
          ${users[0]!.id},
          ${users[0]!.id},
          NOW(),
          NOW()
        ),
        (
          ${attendanceTwoId},
          ${employeeTwoId},
          NOW(),
          ${locations[1]!.id},
          ${users[1]!.id},
          'NIGHT',
          'ABSENT'::"DailyAttendanceStatus",
          'SHIFT'::"AttendanceSourceType",
          0,
          0,
          'Scope excluded'
          ,
          false,
          ${users[1]!.id},
          ${users[1]!.id},
          NOW(),
          NOW()
        )
      `;
    });

    const scopedRows = await getHrAttendanceReport({
      accessibleLocationIds: [locations[0]!.id],
    });

    assert.ok(scopedRows.some((row) => row.attendanceId === attendanceOneId));
    assert.equal(scopedRows.some((row) => row.attendanceId === attendanceTwoId), false);

    await sql`DELETE FROM "DailyAttendance" WHERE id IN ${sql([attendanceOneId, attendanceTwoId])}`;
    await sql`DELETE FROM "Employee" WHERE id IN ${sql([employeeOneId, employeeTwoId])}`;
  });
});
