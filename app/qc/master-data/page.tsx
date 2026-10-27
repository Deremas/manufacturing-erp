import { QCMasterDataPage } from "@/features/qc/components/QCMasterDataPage";
import { getItemRows } from "@/lib/server/item-data";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import {
  alignMicrobialMaster,
  alignPhysicoChemicalMaster,
  getDefaultFormForSlug,
  getFormSpecifications,
  listPreformTypeRows,
  listQcFrequencies,
  listQcSamplePoints,
  seedOperationalQcMaster,
} from "@/services/qc/qc-master.service";

export const dynamic = "force-dynamic";

async function specsForSlug(slug: string) {
  if (slug === "microbial") await alignMicrobialMaster();
  if (slug === "physicochemical") await alignPhysicoChemicalMaster();
  let form = await getDefaultFormForSlug(slug);
  if (!form) {
    await seedOperationalQcMaster();
    form = await getDefaultFormForSlug(slug);
  }
  return {
    form: form ? { id: form.id, code: form.code, title: form.title } : null,
    specs: form ? await getFormSpecifications(form.id) : [],
  };
}

export default async function Page() {
  const [physico, microbial, preformTypes, samplePoints, frequencies, items] = await Promise.all([
    specsForSlug("physicochemical"),
    specsForSlug("microbial"),
    listPreformTypeRows(),
    listQcSamplePoints(),
    listQcFrequencies(),
    getItemRows(),
  ]);
  return (
    <QCMasterDataPage
      physico={{
        catalog: getQcCatalogEntry("physicochemical")!,
        form: physico.form,
        specs: physico.specs,
      }}
      microbial={{
        catalog: getQcCatalogEntry("microbial")!,
        form: microbial.form,
        specs: microbial.specs,
      }}
      preformTypes={preformTypes}
      items={items.map((item) => ({ id: item.id, itemCode: item.itemCode, itemName: item.itemName }))}
      samplePoints={samplePoints}
      frequencies={frequencies}
    />
  );
}
