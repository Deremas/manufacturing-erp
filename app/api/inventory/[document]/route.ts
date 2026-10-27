import { listDocument, createDocument, withInventoryDocument } from "@/app/api/inventory/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ document: string }> },
) {
  const { document } = await params;
  return withInventoryDocument(document, async (key) => listDocument(key), "view");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ document: string }> },
) {
  const { document } = await params;
  const body = await request.json();
  return withInventoryDocument(document, async (key, userId) => createDocument(key, body, userId), "create", {
    locationId: String(body.locationId ?? body.fromLocationId ?? body.fromStoreLocationId ?? "") || null,
    departmentId: String(body.departmentId ?? body.requestingDepartmentId ?? "") || null,
  });
}
