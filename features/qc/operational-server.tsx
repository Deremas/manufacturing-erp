import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";
import { QCCapFormPage, QCCapListPage } from "@/features/qc/components/QCCap";
import { QCChlorineResidualFormPage, QCChlorineResidualListPage } from "@/features/qc/components/QCChlorineResidual";
import { QCHandleFormPage, QCHandleListPage } from "@/features/qc/components/QCHandle";
import { QCMicrobialFormPage, QCMicrobialListPage } from "@/features/qc/components/QCMicrobial";
import { QCPhysicoChemicalFormPage, QCPhysicoChemicalListPage } from "@/features/qc/components/QCPhysicoChemical";
import { QCPackagingFormPage, QCPackagingListPage } from "@/features/qc/components/QCPackaging";
import { QCPreformFormPage, QCPreformListPage } from "@/features/qc/components/QCPreform";
import { QCRawWaterFormPage, QCRawWaterListPage } from "@/features/qc/components/QCRawWater";
import { QCRecordFormPage, QCRecordListPage, QCRecordPrintPage } from "@/features/qc/components/QCRecordPages";
import { QCTreatmentMonitoringFormPage, QCTreatmentMonitoringListPage } from "@/features/qc/components/QCTreatmentMonitoring";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { getOperationalQcContext } from "@/services/qc/qc-context.service";
import { getQcTestRecord, listQcTestRecords } from "@/services/qc/qc-record.service";
import { mergeQcRecordSpecs } from "@/services/qc/qc-record-specs";

function scope(user: { accessibleLocationIds?: string[]; permissions?: string[] } | null) {
  return { accessibleLocationIds: user?.accessibleLocationIds, permissions: user?.permissions };
}

export async function OperationalListScreen({ slug }: { slug: string }) {
  if (!getQcCatalogEntry(slug)) notFound();
  const user = await getCurrentUser();
  const [rows, context] = await Promise.all([
    listQcTestRecords(slug, {}, scope(user)),
    getOperationalQcContext(slug, null, user?.accessibleLocationIds).catch(() => null),
  ]);
  if (slug === "treatment-monitoring") {
    return <QCTreatmentMonitoringListPage rows={rows} />;
  }
  if (slug === "raw-water") {
    return <QCRawWaterListPage rows={rows} />;
  }
  if (slug === "chlorine-residual") {
    return <QCChlorineResidualListPage rows={rows} />;
  }
  if (slug === "physicochemical") {
    return (
      <QCPhysicoChemicalListPage
        rows={rows}
        filterOptions={{
          shifts: context?.shifts,
          items: context?.items,
          samplePoints: context?.samplePoints,
          forms: context?.forms,
        }}
      />
    );
  }
  if (slug === "microbial") {
    return (
      <QCMicrobialListPage
        rows={rows}
        filterOptions={{
          shifts: context?.shifts,
          samplePoints: context?.samplePoints,
        }}
      />
    );
  }
  if (slug === "preform") {
    return <QCPreformListPage rows={rows} />;
  }
  if (slug === "handle") {
    return (
      <QCHandleListPage
        rows={rows}
        filterOptions={{
          items: context?.items,
          suppliers: context?.suppliers,
        }}
      />
    );
  }
  if (slug === "cap") {
    return <QCCapListPage rows={rows} />;
  }
  if (slug === "packaging") {
    return <QCPackagingListPage rows={rows} />;
  }
  return (
    <QCRecordListPage
      slug={slug}
      rows={rows}
      filterOptions={{
        shifts: context?.shifts,
        items: context?.items,
        samplePoints: context?.samplePoints,
        suppliers: context?.suppliers,
      }}
    />
  );
}

export async function OperationalFormScreen({ slug, id, mode }: { slug: string; id?: string; mode: "create" | "edit" | "view" }) {
  if (!getQcCatalogEntry(slug)) notFound();
  const user = await getCurrentUser();
  const record = id ? await getQcTestRecord(id, scope(user)) : null;
  if (id && !record) notFound();
  const context = await getOperationalQcContext(slug, record?.controlledFormId ? String(record.controlledFormId) : null, user?.accessibleLocationIds);
  const formContext = {
    ...context,
    specs: mergeQcRecordSpecs(record, context.specs),
  };
  if (slug === "treatment-monitoring") {
    return <QCTreatmentMonitoringFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "raw-water") {
    return <QCRawWaterFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "chlorine-residual") {
    return <QCChlorineResidualFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "physicochemical") {
    return <QCPhysicoChemicalFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "microbial") {
    return <QCMicrobialFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "preform") {
    return <QCPreformFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "handle") {
    return <QCHandleFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "cap") {
    return <QCCapFormPage mode={mode} context={formContext} record={record} />;
  }
  if (slug === "packaging") {
    return <QCPackagingFormPage mode={mode} context={formContext} record={record} />;
  }
  return <QCRecordFormPage slug={slug} mode={mode} context={formContext} record={record} />;
}

export async function OperationalPrintScreen({ slug, id }: { slug: string; id: string }) {
  if (!getQcCatalogEntry(slug)) notFound();
  const user = await getCurrentUser();
  const record = await getQcTestRecord(id, scope(user));
  if (!record) notFound();
  return <QCRecordPrintPage record={record} />;
}
