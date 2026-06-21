import { NextResponse } from "next/server";
import { deleteMasterDataRecord } from "@/lib/server/record-delete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;
  const result = await deleteMasterDataRecord(entity, id);
  return NextResponse.json(result.body, { status: result.status });
}
