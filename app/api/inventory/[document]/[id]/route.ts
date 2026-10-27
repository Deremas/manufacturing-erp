import { getDocument, updateDocument, withInventoryDocument } from "@/app/api/inventory/helpers";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ document: string; id: string }> },
) {
  const { document, id } = await params;
  return withInventoryDocument(document, async (key) => {
    const record = await getDocument(key, id);
    if (!record) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return record;
  }, "view");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ document: string; id: string }> },
) {
  const { document, id } = await params;
  const body = await request.json();
  return withInventoryDocument(document, async (key, userId) => updateDocument(key, id, body, userId), "update", {
    locationId: String(body.locationId ?? body.fromLocationId ?? body.fromStoreLocationId ?? "") || null,
    departmentId: String(body.departmentId ?? body.requestingDepartmentId ?? "") || null,
  });
}
