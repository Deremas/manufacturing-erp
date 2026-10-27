import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";

export default async function CreateCreditNotePage() {
  await requireAuth();
  // Credit notes are generated from posted returns so inventory and AR remain aligned.
  redirect("/sales/returns/create?createCreditNote=true");
}
