import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { reconcileBankAccount } from "@/services/finance/bank-reconciliation.service";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const { id } = await context.params; return NextResponse.json({ item: await reconcileBankAccount({ id, reconciledById: user.id }) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to reconcile account" }, { status: 400 }); } }
