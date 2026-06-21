import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { generateItemCode, getItemRows, resolveItemTypeId } from "@/lib/server/item-data";

export async function GET() {
  try {
    return NextResponse.json(await getItemRows());
  } catch (error) {
    console.error("Failed to load items", error);
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itemName = String(body.itemName ?? "").trim();
    if (!itemName) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
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

    const itemCode = String(body.itemCode ?? "").trim() || (await generateItemCode());
    const itemId = String(body.id ?? "").trim() || randomUUID();

    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO "Item" (
        id,
        "itemCode",
        "itemName",
        sku,
        description,
        "categoryId",
        "itemTypeId",
        "uomId",
        "reorderPoint",
        "standardCost",
        "sellingPrice",
        "batchTracking",
        "expiryTracking",
        "serialTracking",
        "purchaseTaxCodeId",
        "vatApplicable",
        "exciseApplicable",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${itemId},
        ${itemCode},
        ${itemName},
        ${String(body.sku ?? "").trim() || null},
        ${String(body.description ?? "").trim() || null},
        ${categoryId},
        ${itemTypeId},
        ${uomId},
        ${Number(body.reorderPoint ?? 0)},
        ${Number(body.standardCost ?? 0)},
        ${Number(body.sellingPrice ?? 0)},
        ${body.batchTracking ?? false},
        ${body.expiryTracking ?? false},
        ${body.serialTracking ?? false},
        ${String(body.purchaseTaxCodeId ?? "").trim() || null},
        ${body.vatApplicable ?? true},
        ${body.exciseApplicable ?? false},
        ${body.isActive ?? true},
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error("Failed to create item", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
