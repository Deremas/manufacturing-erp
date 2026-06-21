import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { deleteAdministrationRecord } from "@/lib/server/record-delete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (entity === "users" && currentUser.id === id) {
    return NextResponse.json(
      { error: "You cannot delete your own user account." },
      { status: 409 },
    );
  }

  const result = await deleteAdministrationRecord(entity, id);
  return NextResponse.json(result.body, { status: result.status });
}
