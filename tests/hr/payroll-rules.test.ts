import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { getPayrollSettings, updatePayrollSettings, createPayrollRun, changePayrollRunStatus, payPayrollRun } from "@/services/hr/payroll.service";
import { createOvertimeRequest, getOvertimeRequestById } from "@/services/hr/overtime.service";
import { createLeaveRequest, changeLeaveRequestStatus } from "@/services/hr/leave.service";
import { closeTestDatabase } from "@/tests/inventory/_helpers";
import { runWithTransientDbRetry } from "@/tests/sales/_helpers";

after(closeTestDatabase);

type HrTestContext = {
  userId: string;
  locationId: string;
  employeeId: string;
  leaveTypeIds: string[];
  payrollComponentIds: string[];
  payrollAssignmentIds: string[];
  leaveRequestIds: string[];
  overtimeIds: string[];
  attendanceIds: string[];
  payrollRunIds: string[];
  bankIds: string[];
  bankAccountIds: string[];
};

async function createHrTestContext(baseSalary = 2600): Promise<HrTestContext> {
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

  const employeeId = randomUUID();
  const employeeNo = `EMP-TST-${Date.now().toString().slice(-5)}-${randomUUID().slice(0, 4).toUpperCase()}`;

  await sql`
    INSERT INTO "Employee" (
      id,
      "employeeNo",
      "firstName",
      "lastName",
      "hireDate",
      "locationId",
      "baseSalary",
      status,
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${employeeId},
      ${employeeNo},
      'Payroll',
      'Tester',
      ${new Date("2026-01-01")},
      ${locationRows[0].id},
      ${baseSalary},
      'ACTIVE'::"EmployeeStatus",
      true,
      false,
      NOW(),
      NOW()
    )
  `;

  return {
    userId: userRows[0].id,
    locationId: locationRows[0].id,
    employeeId,
    leaveTypeIds: [],
    payrollComponentIds: [],
    payrollAssignmentIds: [],
    leaveRequestIds: [],
    overtimeIds: [],
    attendanceIds: [],
    payrollRunIds: [],
    bankIds: [],
    bankAccountIds: [],
  };
}

async function cleanupHrTestContext(context: HrTestContext) {
  if (context.payrollRunIds.length) {
    await sql`
      DELETE FROM "JournalLine"
      WHERE "journalEntryId" IN (
        SELECT id
        FROM "JournalEntry"
        WHERE "sourceType" IN ('hr.payroll', 'hr.payroll.payment')
          AND "sourceId" IN ${sql(context.payrollRunIds)}
      )
    `;
    await sql`
      DELETE FROM "JournalEntry"
      WHERE "sourceType" IN ('hr.payroll', 'hr.payroll.payment')
        AND "sourceId" IN ${sql(context.payrollRunIds)}
    `;
    await sql`DELETE FROM "PayrollEmployee" WHERE "payrollRunId" IN ${sql(context.payrollRunIds)}`;
    await sql`DELETE FROM "PayrollRun" WHERE id IN ${sql(context.payrollRunIds)}`;
  }

  if (context.bankAccountIds.length) {
    await sql`DELETE FROM "BankAccount" WHERE id IN ${sql(context.bankAccountIds)}`;
  }
  if (context.bankIds.length) {
    await sql`DELETE FROM "Bank" WHERE id IN ${sql(context.bankIds)}`;
  }

  if (context.overtimeIds.length) {
    await sql`DELETE FROM "OvertimeRequest" WHERE id IN ${sql(context.overtimeIds)}`;
  }
  if (context.leaveRequestIds.length) {
    await sql`DELETE FROM "LeaveRequest" WHERE id IN ${sql(context.leaveRequestIds)}`;
  }
  if (context.leaveTypeIds.length) {
    await sql`DELETE FROM "LeaveType" WHERE id IN ${sql(context.leaveTypeIds)}`;
  }
  if (context.payrollAssignmentIds.length) {
    await sql`DELETE FROM "EmployeePayrollAssignment" WHERE id IN ${sql(context.payrollAssignmentIds)}`;
  }
  if (context.payrollComponentIds.length) {
    await sql`DELETE FROM "PayrollComponent" WHERE id IN ${sql(context.payrollComponentIds)}`;
  }
  if (context.attendanceIds.length) {
    await sql`DELETE FROM "DailyAttendance" WHERE id IN ${sql(context.attendanceIds)}`;
  }

  await sql`DELETE FROM "DailyAttendance" WHERE "employeeId" = ${context.employeeId}`;
  await sql`DELETE FROM "Employee" WHERE id = ${context.employeeId}`;
}

async function withPayrollSettingsOverride<T>(
  overrides: Partial<Awaited<ReturnType<typeof getPayrollSettings>>>,
  work: () => Promise<T>,
) {
  const current = await getPayrollSettings();
  await updatePayrollSettings({
    ...current,
    ...overrides,
  });

  try {
    return await work();
  } finally {
    await updatePayrollSettings(current);
  }
}

test("payroll reduces salary when attendance days are missing", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createHrTestContext(2600);

    try {
      await withPayrollSettingsOverride(
        {
          taxPercent: 0,
          employeePensionPercent: 0,
          employerPensionPercent: 0,
          standardWorkDaysPerMonth: 5,
          attendanceRequiredForSalary: true,
          weekendDays: [0, 6],
          holidayDates: [],
        },
        async () => {
          const attendanceRows = await sql<Array<{ id: string }>>`
            INSERT INTO "DailyAttendance" (
              id, "employeeId", "attendanceDate", "locationId", status, "sourceType",
              "hoursWorked", "overtimeHours", "isArchived", "createdById", "updatedById", "createdAt", "updatedAt"
            )
            VALUES
            (${randomUUID()}, ${context.employeeId}, ${new Date("2026-07-06")}, ${context.locationId}, 'PRESENT'::"DailyAttendanceStatus", 'MANUAL'::"AttendanceSourceType", 1, 0, false, ${context.userId}, ${context.userId}, NOW(), NOW()),
            (${randomUUID()}, ${context.employeeId}, ${new Date("2026-07-07")}, ${context.locationId}, 'PRESENT'::"DailyAttendanceStatus", 'MANUAL'::"AttendanceSourceType", 1, 0, false, ${context.userId}, ${context.userId}, NOW(), NOW()),
            (${randomUUID()}, ${context.employeeId}, ${new Date("2026-07-08")}, ${context.locationId}, 'PRESENT'::"DailyAttendanceStatus", 'MANUAL'::"AttendanceSourceType", 1, 0, false, ${context.userId}, ${context.userId}, NOW(), NOW())
            RETURNING id
          `;
          context.attendanceIds.push(...attendanceRows.map((row) => row.id));

          const payrollRunId = await createPayrollRun(
            {
              periodStart: "2026-07-06",
              periodEnd: "2026-07-10",
              paymentDate: "2026-07-11",
              locationId: context.locationId,
            },
            context.userId,
            { accessibleLocationIds: [context.locationId] },
          );
          context.payrollRunIds.push(payrollRunId);

          const rows = await sql<Array<{ baseSalary: number; netPay: number; remarks: string | null }>>`
            SELECT "baseSalary", "netPay", remarks
            FROM "PayrollEmployee"
            WHERE "payrollRunId" = ${payrollRunId}
              AND "employeeId" = ${context.employeeId}
            LIMIT 1
          `;

          assert.equal(Number(rows[0]?.baseSalary ?? 0), 1560);
          assert.equal(Number(rows[0]?.netPay ?? 0), 1560);
          assert.match(rows[0]?.remarks ?? "", /Payable days 3\/5/i);
        },
      );
    } finally {
      await cleanupHrTestContext(context);
    }
  });
});

test("paid leave counts while unpaid leave reduces payroll days", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createHrTestContext(2600);

    try {
      await withPayrollSettingsOverride(
        {
          taxPercent: 0,
          employeePensionPercent: 0,
          employerPensionPercent: 0,
          standardWorkDaysPerMonth: 5,
          attendanceRequiredForSalary: true,
          weekendDays: [0, 6],
          holidayDates: [],
        },
        async () => {
          const paidLeaveTypeId = randomUUID();
          const unpaidLeaveTypeId = randomUUID();
          context.leaveTypeIds.push(paidLeaveTypeId, unpaidLeaveTypeId);

          await sql`
            INSERT INTO "LeaveType" (
              id, code, name, paid, "entitlementDays", "requiresAttachment", "approvalLevel", "isActive", "isArchived", "createdAt", "updatedAt"
            )
            VALUES
            (${paidLeaveTypeId}, ${`PL-${randomUUID().slice(0, 6).toUpperCase()}`}, 'Paid Leave', true, 10, false, 1, true, false, NOW(), NOW()),
            (${unpaidLeaveTypeId}, ${`UL-${randomUUID().slice(0, 6).toUpperCase()}`}, 'Unpaid Leave', false, 10, false, 1, true, false, NOW(), NOW())
          `;

          const paidLeaveId = await createLeaveRequest({
            employeeId: context.employeeId,
            leaveTypeId: paidLeaveTypeId,
            startDate: "2026-07-06",
            endDate: "2026-07-07",
          }, context.userId);
          const unpaidLeaveId = await createLeaveRequest({
            employeeId: context.employeeId,
            leaveTypeId: unpaidLeaveTypeId,
            startDate: "2026-07-08",
            endDate: "2026-07-08",
          }, context.userId);
          context.leaveRequestIds.push(paidLeaveId ?? "", unpaidLeaveId ?? "");

          await changeLeaveRequestStatus({ id: paidLeaveId!, action: "submit", userId: context.userId });
          await changeLeaveRequestStatus({ id: paidLeaveId!, action: "approve", userId: context.userId });
          await changeLeaveRequestStatus({ id: unpaidLeaveId!, action: "submit", userId: context.userId });
          await changeLeaveRequestStatus({ id: unpaidLeaveId!, action: "approve", userId: context.userId });

          const payrollRunId = await createPayrollRun(
            {
              periodStart: "2026-07-06",
              periodEnd: "2026-07-10",
              paymentDate: "2026-07-11",
              locationId: context.locationId,
            },
            context.userId,
            { accessibleLocationIds: [context.locationId] },
          );
          context.payrollRunIds.push(payrollRunId);

          const rows = await sql<Array<{ baseSalary: number; netPay: number; remarks: string | null }>>`
            SELECT "baseSalary", "netPay", remarks
            FROM "PayrollEmployee"
            WHERE "payrollRunId" = ${payrollRunId}
              AND "employeeId" = ${context.employeeId}
            LIMIT 1
          `;

          assert.equal(Number(rows[0]?.baseSalary ?? 0), 1040);
          assert.equal(Number(rows[0]?.netPay ?? 0), 1040);
          assert.match(rows[0]?.remarks ?? "", /unpaid leave 1/i);
        },
      );
    } finally {
      await cleanupHrTestContext(context);
    }
  });
});

test("overtime uses different multipliers for normal, weekend, and holiday days", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createHrTestContext(3000);

    try {
      await withPayrollSettingsOverride(
        {
          normalDayOvertimeMultiplier: 1.5,
          weekendOvertimeMultiplier: 2,
          holidayOvertimeMultiplier: 3,
          weekendDays: [0, 6],
          holidayDates: ["2026-07-09"],
        },
        async () => {
          const normalId = await createOvertimeRequest({
            employeeId: context.employeeId,
            overtimeDate: "2026-07-08",
            hours: 2,
          }, context.userId);
          const holidayId = await createOvertimeRequest({
            employeeId: context.employeeId,
            overtimeDate: "2026-07-09",
            hours: 2,
          }, context.userId);
          const weekendId = await createOvertimeRequest({
            employeeId: context.employeeId,
            overtimeDate: "2026-07-11",
            hours: 2,
          }, context.userId);
          context.overtimeIds.push(normalId ?? "", holidayId ?? "", weekendId ?? "");

          const [normal, holiday, weekend] = await Promise.all([
            getOvertimeRequestById(normalId!),
            getOvertimeRequestById(holidayId!),
            getOvertimeRequestById(weekendId!),
          ]);

          assert.equal(normal?.dayType, "NORMAL");
          assert.equal(normal?.rateMultiplier, 1.5);
          assert.equal(holiday?.dayType, "HOLIDAY");
          assert.equal(holiday?.rateMultiplier, 3);
          assert.equal(weekend?.dayType, "WEEKEND");
          assert.equal(weekend?.rateMultiplier, 2);
          assert.ok(Number(holiday?.amount ?? 0) > Number(weekend?.amount ?? 0));
          assert.ok(Number(weekend?.amount ?? 0) > Number(normal?.amount ?? 0));
        },
      );
    } finally {
      await cleanupHrTestContext(context);
    }
  });
});

test("posted payroll creates a balanced payroll journal", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createHrTestContext(2600);

    try {
      await withPayrollSettingsOverride(
        {
          taxPercent: 0,
          employeePensionPercent: 0,
          employerPensionPercent: 0,
          standardWorkDaysPerMonth: 1,
          attendanceRequiredForSalary: true,
          weekendDays: [0, 6],
          holidayDates: [],
        },
        async () => {
          const attendanceRows = await sql<Array<{ id: string }>>`
            INSERT INTO "DailyAttendance" (
              id, "employeeId", "attendanceDate", "locationId", status, "sourceType",
              "hoursWorked", "overtimeHours", "isArchived", "createdById", "updatedById", "createdAt", "updatedAt"
            )
            VALUES (
              ${randomUUID()},
              ${context.employeeId},
              ${new Date("2026-07-10")},
              ${context.locationId},
              'PRESENT'::"DailyAttendanceStatus",
              'MANUAL'::"AttendanceSourceType",
              1,
              0,
              false,
              ${context.userId},
              ${context.userId},
              NOW(),
              NOW()
            )
            RETURNING id
          `;
          context.attendanceIds.push(...attendanceRows.map((row) => row.id));

          const payrollRunId = await createPayrollRun(
            {
              periodStart: "2026-07-10",
              periodEnd: "2026-07-10",
              paymentDate: "2026-07-11",
              locationId: context.locationId,
            },
            context.userId,
            { accessibleLocationIds: [context.locationId] },
          );
          context.payrollRunIds.push(payrollRunId);

          await changePayrollRunStatus({ id: payrollRunId, action: "approve", userId: context.userId });
          await changePayrollRunStatus({ id: payrollRunId, action: "post", userId: context.userId });

          const journalRows = await sql<Array<{ totalDebit: number; totalCredit: number }>>`
            SELECT "totalDebit", "totalCredit"
            FROM "JournalEntry"
            WHERE "sourceType" = 'hr.payroll'
              AND "sourceId" = ${payrollRunId}
            LIMIT 1
          `;

          assert.equal(Number(journalRows[0]?.totalDebit ?? 0), 2600);
          assert.equal(Number(journalRows[0]?.totalCredit ?? 0), 2600);
        },
      );
    } finally {
      await cleanupHrTestContext(context);
    }
  });
});

test("paying posted payroll reduces bank balance and creates one balanced settlement journal", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createHrTestContext(2600);

    try {
      await withPayrollSettingsOverride(
        {
          taxPercent: 0,
          employeePensionPercent: 0,
          employerPensionPercent: 0,
          standardWorkDaysPerMonth: 1,
          attendanceRequiredForSalary: true,
          weekendDays: [0, 6],
          holidayDates: [],
        },
        async () => {
          await sql`
            INSERT INTO "DailyAttendance" (
              id, "employeeId", "attendanceDate", "locationId", status, "sourceType",
              "hoursWorked", "overtimeHours", "isArchived", "createdById", "updatedById", "createdAt", "updatedAt"
            ) VALUES (
              ${randomUUID()}, ${context.employeeId}, ${new Date("2026-07-10")}, ${context.locationId},
              'PRESENT'::"DailyAttendanceStatus", 'MANUAL'::"AttendanceSourceType", 1, 0, false,
              ${context.userId}, ${context.userId}, NOW(), NOW()
            )
          `;

          const bankId = randomUUID();
          const bankAccountId = randomUUID();
          context.bankIds.push(bankId);
          context.bankAccountIds.push(bankAccountId);
          await sql`
            INSERT INTO "Bank" (id, code, name, "isActive", "isArchived", "createdAt", "updatedAt")
            VALUES (${bankId}, ${`TST-${randomUUID().slice(0, 6)}`}, 'Payroll Test Bank', true, false, NOW(), NOW())
          `;
          await sql`
            INSERT INTO "BankAccount" (
              id, "accountCode", "accountName", "bankId", "accountNumber", "locationId", currency,
              "openingBalance", "currentBalance", "allowPayments", "allowReceipts", "isActive", "isArchived", "createdAt", "updatedAt"
            ) VALUES (
              ${bankAccountId}, ${`PAY-TST-${randomUUID().slice(0, 6)}`}, 'Payroll Test Account', ${bankId},
              ${`100${Date.now()}`}, ${context.locationId}, 'ETB', 10000, 10000, true, true, true, false, NOW(), NOW()
            )
          `;

          const payrollRunId = await createPayrollRun({
            periodStart: "2026-07-10",
            periodEnd: "2026-07-10",
            paymentDate: "2026-07-11",
            locationId: context.locationId,
          }, context.userId, { accessibleLocationIds: [context.locationId] });
          context.payrollRunIds.push(payrollRunId);
          await changePayrollRunStatus({ id: payrollRunId, action: "approve", userId: context.userId });
          await changePayrollRunStatus({ id: payrollRunId, action: "post", userId: context.userId });

          const payment = await payPayrollRun({ id: payrollRunId, bankAccountId, userId: context.userId, accessibleLocationIds: [context.locationId] });
          const [accountRows, journalRows] = await Promise.all([
            sql<Array<{ currentBalance: number }>>`SELECT "currentBalance" FROM "BankAccount" WHERE id = ${bankAccountId}`,
            sql<Array<{ totalDebit: number; totalCredit: number }>>`
              SELECT "totalDebit", "totalCredit" FROM "JournalEntry"
              WHERE "sourceType" = 'hr.payroll.payment' AND "sourceId" = ${payrollRunId}
            `,
          ]);

          assert.ok(payment.journalId);
          assert.equal(Number(accountRows[0]?.currentBalance ?? 0), 7400);
          assert.equal(Number(journalRows[0]?.totalDebit ?? 0), 2600);
          assert.equal(Number(journalRows[0]?.totalCredit ?? 0), 2600);
          await assert.rejects(() => payPayrollRun({ id: payrollRunId, bankAccountId, userId: context.userId, accessibleLocationIds: [context.locationId] }), /already been paid/i);
        },
      );
    } finally {
      await cleanupHrTestContext(context);
    }
  });
});
