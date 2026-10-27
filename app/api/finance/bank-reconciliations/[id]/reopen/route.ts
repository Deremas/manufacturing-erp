import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { reopenBankReconciliation } from "@/services/finance/bank-reconciliation.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const { id } = await context.params; const body = await request.json(); return NextResponse.json({ item: await reopenBankReconciliation({ id, reason: String(body.reason ?? ""), reopenedById: user.id }) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to reopen reconciliation" }, { status: 400 }); } }
