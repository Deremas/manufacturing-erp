import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { closeTestDatabase } from "@/tests/inventory/_helpers";
import { runWithTransientDbRetry } from "@/tests/sales/_helpers";
import {
  generateHolidayCalendarForYear,
  getWorkCalendarSettings,
  listDailyAttendance,
  updateWorkCalendarSettings,
  upsertManualDailyAttendance,
} from "@/services/hr/attendance.service";
import {
  createEmployeePayrollAssignment,
  listEmployeePayrollAssignments,
} from "@/services/hr/payroll-assignment.service";

after(closeTestDatabase);

async function getBaseUserAndLocation() {
  const [userRows, locationRows] = await Promise.all([
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE "isArchived" = false
      ORDER BY "createdAt" ASC
      LIMIT 1
    `,
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "Location"
      WHERE "isArchived" = false
        AND "isActive" = true
      ORDER BY "createdAt" ASC
      LIMIT 1
    `,
  ]);

  if (!userRows[0]?.id || !locationRows[0]?.id) {
    throw new Error("HR tests require one active user and one active location.");
  }

  return {
    userId: userRows[0].id,
    locationId: locationRows[0].id,
  };
}

test("daily attendance listing respects employee scope", async () => {
  await runWithTransientDbRetry(async () => {
    const { userId, locationId } = await getBaseUserAndLocation();
    const employeeOneId = randomUUID();
    const employeeTwoId = randomUUID();

    try {
      await sql`
        INSERT INTO "Employee" (
          id, "employeeNo", "firstName", "lastName", "hireDate", "locationId", "baseSalary",
          status, "isActive", "isArchived", "createdAt", "updatedAt"
        )
        VALUES
        (${employeeOneId}, ${`EMP-SCP-${randomUUID().slice(0, 4).toUpperCase()}`}, 'Scope', 'One', ${new Date("2026-01-01")}, ${locationId}, 2000, 'ACTIVE'::"EmployeeStatus", true, false, NOW(), NOW()),
        (${employeeTwoId}, ${`EMP-SCP-${randomUUID().slice(0, 4).toUpperCase()}`}, 'Scope', 'Two', ${new Date("2026-01-01")}, ${locationId}, 2200, 'ACTIVE'::"EmployeeStatus", true, false, NOW(), NOW())
      `;

      await upsertManualDailyAttendance({
        employeeId: employeeOneId,
        attendanceDate: "2026-07-10",
        locationId,
        status: "PRESENT",
        hoursWorked: 1,
        overtimeHours: 0,
      }, userId, { accessibleLocationIds: [locationId] });

      await upsertManualDailyAttendance({
        employeeId: employeeTwoId,
        attendanceDate: "2026-07-10",
        locationId,
        status: "ABSENT",
        hoursWorked: 0,
        overtimeHours: 0,
      }, userId, { accessibleLocationIds: [locationId] });

      const scopedRows = await listDailyAttendance({
        accessibleLocationIds: [locationId],
        employeeId: employeeOneId,
      });

      assert.equal(scopedRows.length, 1);
      assert.equal(scopedRows[0]?.employeeId, employeeOneId);
      assert.equal(scopedRows[0]?.status, "PRESENT");
    } finally {
      await sql`DELETE FROM "DailyAttendance" WHERE "employeeId" IN ${sql([employeeOneId, employeeTwoId])}`;
      await sql`DELETE FROM "Employee" WHERE id IN ${sql([employeeOneId, employeeTwoId])}`;
    }
  });
});

test("employee payroll assignments reject overlapping active date ranges", async () => {
  await runWithTransientDbRetry(async () => {
    const { locationId } = await getBaseUserAndLocation();
    const employeeId = randomUUID();
    const componentId = randomUUID();

    try {
      await sql`
        INSERT INTO "Employee" (
          id, "employeeNo", "firstName", "lastName", "hireDate", "locationId", "baseSalary",
          status, "isActive", "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${employeeId},
          ${`EMP-ASG-${randomUUID().slice(0, 4).toUpperCase()}`},
          'Assign',
          'History',
          ${new Date("2026-01-01")},
          ${locationId},
          2400,
          'ACTIVE'::"EmployeeStatus",
          true,
          false,
          NOW(),
          NOW()
        )
      `;

      await sql`
        INSERT INTO "PayrollComponent" (
          id, code, name, type, taxable, recurring, "defaultAmount",
          "isActive", "isArchived", "createdAt", "updatedAt"
        )
        VALUES (
          ${componentId},
          ${`ALW-${randomUUID().slice(0, 4).toUpperCase()}`},
          'Transport Allowance',
          'ALLOWANCE'::"PayrollComponentType",
          true,
          true,
          100,
          true,
          false,
          NOW(),
          NOW()
        )
      `;

      await createEmployeePayrollAssignment({
        employeeId,
        payrollComponentId: componentId,
        amount: 150,
        effectiveFrom: "2026-07-01",
        effectiveTo: "2026-07-31",
        isActive: true,
      }, { accessibleLocationIds: [locationId] });

      await assert.rejects(
        () => createEmployeePayrollAssignment({
          employeeId,
          payrollComponentId: componentId,
          amount: 175,
          effectiveFrom: "2026-07-15",
          effectiveTo: "2026-08-15",
          isActive: true,
        }, { accessibleLocationIds: [locationId] }),
        /overlaps/i,
      );

      const items = await listEmployeePayrollAssignments({
        accessibleLocationIds: [locationId],
        employeeId,
      });
      assert.equal(items.length, 1);
    } finally {
      await sql`DELETE FROM "EmployeePayrollAssignment" WHERE "employeeId" = ${employeeId}`;
      await sql`DELETE FROM "PayrollComponent" WHERE id = ${componentId}`;
      await sql`DELETE FROM "Employee" WHERE id = ${employeeId}`;
    }
  });
});

test("holiday generation builds dated holiday entries from yearly templates", async () => {
  await runWithTransientDbRetry(async () => {
    const current = await getWorkCalendarSettings();

    try {
      await updateWorkCalendarSettings({
        ...current,
        holidayEntries: [],
        holidayDates: [],
        holidayTemplates: [
          {
            id: randomUUID(),
            name: "Labour Day",
            month: 5,
            day: 1,
            isActive: true,
          },
        ],
      });

      const generated = await generateHolidayCalendarForYear(2027);
      assert.ok(generated.holidayEntries?.some((entry) => entry.name === "Labour Day" && entry.date === "2027-05-01"));
      assert.ok(generated.holidayDates.includes("2027-05-01"));
    } finally {
      await updateWorkCalendarSettings(current);
    }
  });
});
