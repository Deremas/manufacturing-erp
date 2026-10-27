import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { sql } from "@/lib/db";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { createEmployee, listEmployees, type EmployeePayload } from "@/services/hr/hr.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listEmployees();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as EmployeePayload;
    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.hireDate) {
      return NextResponse.json(
        { error: "First name, last name, and hire date are required." },
        { status: 400 },
      );
    }

    const id = await createEmployee(body, user.id);
    if (!id) {
      return NextResponse.json({ error: "Failed to create employee." }, { status: 500 });
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.CREATE,
      module: "HR_EMPLOYEE",
      recordId: id,
      newValue: {
        employeeNo: body.employeeNo,
        firstName: body.firstName,
        lastName: body.lastName,
        departmentId: body.departmentId,
        locationId: body.locationId,
        status: body.status,
        isActive: body.isActive,
      },
    });

    const [created] = await sql<Array<{ publicId: number }>>`
      SELECT "publicId" FROM "Employee" WHERE id = ${id} LIMIT 1
    `;

    return NextResponse.json({ id, publicId: created?.publicId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create employee.",
      },
      { status: 500 },
    );
  }
}
