import { redirect } from "next/navigation";

export default async function AgentSalesIndexPage() {
  redirect("/sales/agents/sales");
}
