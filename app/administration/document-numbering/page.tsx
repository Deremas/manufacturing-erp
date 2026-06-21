import { DocumentNumberingPage } from "@/features/administration";
import { getDocumentNumberings } from "@/lib/administration-db";

export default async function AdministrationDocumentNumberingPage() {
  const configs = await getDocumentNumberings();
  return <DocumentNumberingPage initialData={configs} />;
}
