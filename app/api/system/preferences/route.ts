import { NextResponse } from "next/server";

import { getSystemPreferences } from "@/lib/server/system-preferences";

export async function GET() {
  try {
    const preferences = await getSystemPreferences();
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to load system preferences", error);
    return NextResponse.json(
      {
        currencyCode: "ETB",
        currencyLabel: "Ethiopian Birr",
        dateFormat: "DD/MM/YYYY",
      },
      { status: 200 },
    );
  }
}
