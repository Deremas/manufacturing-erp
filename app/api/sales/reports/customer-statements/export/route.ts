import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getCustomerStatement } from "@/services/sales/accounts-receivable.service";

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const statement = await getCustomerStatement(customerId, {
      accessibleLocationIds: user.accessibleLocationIds,
    });

    if (!statement) {
      return NextResponse.json({ error: "Customer statement not found" }, { status: 404 });
    }

    const lines = [
      ["Document No", "Date", "Type", "Due Date", "Channel", "Location", "Debit", "Credit", "Running Balance", "Status", "Reference"].join(","),
      ...statement.entries.map((entry) => [
        escapeCsv(entry.documentNo),
        escapeCsv(entry.entryDate.slice(0, 10)),
        escapeCsv(entry.entryType),
        escapeCsv(entry.dueDate?.slice(0, 10) ?? ""),
        escapeCsv(entry.channel ?? ""),
        escapeCsv(`${entry.locationCode} - ${entry.locationName}`),
        escapeCsv(entry.debit.toFixed(2)),
        escapeCsv(entry.credit.toFixed(2)),
        escapeCsv(entry.runningBalance.toFixed(2)),
        escapeCsv(entry.status),
        escapeCsv(entry.reference ?? ""),
      ].join(",")),
    ].join("\n");

    return new NextResponse(lines, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customer-statement-${statement.customerCode}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export customer statement",
      },
      { status: 400 },
    );
  }
}
