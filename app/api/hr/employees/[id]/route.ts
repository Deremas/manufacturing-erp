import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import { getEmployeeById, updateEmployee, type EmployeePayload } from "@/services/hr/hr.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getEmployeeById(id);
  if (!item) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await getEmployeeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const body = (await request.json()) as EmployeePayload;
    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.hireDate) {
      return NextResponse.json(
        { error: "First name, last name, and hire date are required." },
        { status: 400 },
      );
    }

    await updateEmployee(id, body, user.id);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: AuditAction.UPDATE,
      module: "HR_EMPLOYEE",
      recordId: id,
      oldValue: {
        employeeNo: existing.employeeNo,
        firstName: existing.firstName,
        lastName: existing.lastName,
        departmentId: existing.departmentId,
        locationId: existing.locationId,
        status: existing.status,
        isActive: existing.isActive,
      },
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

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update employee.",
      },
      { status: 500 },
    );
  }
}
