import FinanceExceptionsPage from "@/features/finance/FinanceExceptionsPage";
import { requireAuth } from "@/lib/auth/auth";
import { getFinanceExceptions } from "@/services/finance/finance-exception.service";

export const dynamic = "force-dynamic";

export default async function FinanceExceptionsRoute() {
  await requireAuth();
  return <FinanceExceptionsPage rows={await getFinanceExceptions()} />;
}
