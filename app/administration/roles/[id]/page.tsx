import { notFound } from "next/navigation";
import { RoleDetailPage } from "@/features/administration/roles";
import { getRoleById } from "@/lib/administration-db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewRolePage({ params }: PageProps) {
  const { id } = await params;
  const role = await getRoleById(id);
  if (!role) {
    notFound();
  }
  return <RoleDetailPage role={role} />;
}
