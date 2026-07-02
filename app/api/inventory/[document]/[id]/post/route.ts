import { postDocument, withInventoryDocument } from "@/app/api/inventory/helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ document: string; id: string }> },
) {
  const { document, id } = await params;
  return withInventoryDocument(document, async (key, userId) => postDocument(key, id, userId));
}
