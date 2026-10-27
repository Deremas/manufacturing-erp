import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getPayrollRunById } from "@/services/hr/payroll.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getPayrollRunById(id, {
    accessibleLocationIds: user.accessibleLocationIds,
  });
  if (!item) {
    return NextResponse.json({ error: "Payroll run not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}
