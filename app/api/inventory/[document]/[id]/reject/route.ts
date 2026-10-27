import { rejectDocument, withInventoryDocument } from "@/app/api/inventory/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ document: string; id: string }> },
) {
  const { document, id } = await params;
  const body = await request.json().catch(() => ({}));
  const comment = String(body.comment ?? body.reason ?? "").trim() || undefined;
  return withInventoryDocument(document, async (key, userId) => rejectDocument(key, id, userId, comment), "reject");
}
