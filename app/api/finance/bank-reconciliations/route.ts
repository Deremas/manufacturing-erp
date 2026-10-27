import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { createBankReconciliation, listBankReconciliations } from "@/services/finance/bank-reconciliation.service";

export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ items: await listBankReconciliations() }); }
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const body = await request.json(); return NextResponse.json({ item: await createBankReconciliation({ ...body, statementOpeningBalance: Number(body.statementOpeningBalance), statementClosingBalance: Number(body.statementClosingBalance), createdById: user.id }) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create reconciliation" }, { status: 400 }); } }
