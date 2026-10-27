import { notFound } from "next/navigation";

import { DocumentNumberingFormPage } from "@/features/administration/document-numbering";
import { getById } from "@/services/administration/documentNumberingService";

function parseDescription(description: string | null | undefined, fallback: string) {
  const parts = String(description ?? "").split(" :: ");
  if (parts.length >= 2) {
    return {
      module: parts[0] || "General",
      documentType: parts.slice(1).join(" :: ") || fallback,
    };
  }
  return {
    module: "General",
    documentType: String(description ?? fallback),
  };
}

export default async function AdministrationDocnumEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const result = await getById(publicId);
  if (!result.success || !result.data) notFound();

  const meta = parseDescription(result.data.description, result.data.prefix);

  return (
    <DocumentNumberingFormPage
      isCreating={false}
      initialData={{
        id: result.data.id,
        module: meta.module,
        documentType: meta.documentType,
        prefix: result.data.prefix,
        currentNumber: result.data.currentSequence,
        padding: result.data.sequenceLength,
        resetRule:
          result.data.prefixFormat === "PREFIX_YEAR_MONTH_DAY"
            ? "Daily"
            : result.data.prefixFormat === "PREFIX_YEAR_MONTH"
              ? "Monthly"
              : result.data.prefixFormat === "PREFIX_YEAR"
                ? "Yearly"
                : "Never",
        includeYear: Boolean(result.data.yearFormat),
        includeMonth: Boolean(result.data.monthFormat),
        includeLocation: result.data.dayFormat === "LOC",
        isActive: result.data.isActive ?? true,
      }}
    />
  );
}
