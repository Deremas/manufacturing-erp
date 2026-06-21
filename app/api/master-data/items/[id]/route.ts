import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getItemById, resolveItemTypeId } from "@/lib/server/item-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await getItemById(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to load item", error);
    return NextResponse.json({ error: "Failed to load item" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const itemName = String(body.itemName ?? "").trim();
    if (!itemName) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const existingRows = await sql<Array<{ itemCode: string }>>`
      SELECT "itemCode"
      FROM "Item"
      WHERE id = ${id}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const itemTypeId = await resolveItemTypeId(String(body.itemType ?? body.itemTypeId ?? ""));
    if (!itemTypeId) {
      return NextResponse.json({ error: "Item type is required" }, { status: 400 });
    }

    const categoryId = String(body.categoryId ?? "").trim() || null;
    const uomId = String(body.uomId ?? "").trim() || null;
    if (!categoryId || !uomId) {
      return NextResponse.json(
        { error: "Category and UOM are required" },
        { status: 400 },
      );
    }

    const rows = await sql<Array<{ id: string }>>`
      UPDATE "Item"
      SET
        "itemCode" = ${String(body.itemCode ?? "").trim() || existing.itemCode},
        "itemName" = ${itemName},
        sku = ${String(body.sku ?? "").trim() || null},
        description = ${String(body.description ?? "").trim() || null},
        "categoryId" = ${categoryId},
        "itemTypeId" = ${itemTypeId},
        "uomId" = ${uomId},
        "reorderPoint" = ${Number(body.reorderPoint ?? 0)},
        "standardCost" = ${Number(body.standardCost ?? 0)},
        "sellingPrice" = ${Number(body.sellingPrice ?? 0)},
        "batchTracking" = ${body.batchTracking ?? false},
        "expiryTracking" = ${body.expiryTracking ?? false},
        "serialTracking" = ${body.serialTracking ?? false},
        "purchaseTaxCodeId" = ${String(body.purchaseTaxCodeId ?? "").trim() || null},
        "vatApplicable" = ${body.vatApplicable ?? true},
        "exciseApplicable" = ${body.exciseApplicable ?? false},
        "isActive" = ${body.isActive ?? true},
        "isArchived" = ${body.isArchived ?? false},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Failed to update item", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
