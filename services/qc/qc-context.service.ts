import { getUsers } from "@/lib/administration-db";
import { getLocations, getSuppliers } from "@/lib/master-data-db";
import { getItemRows } from "@/lib/server/item-data";
import { getShiftDefinitions } from "@/services/production/production-shared.service";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { formatItemOptionLabel } from "@/lib/item-display";
import {
  getDefaultFormForSlug,
  getFormSections,
  getFormSpecifications,
  listFormItems,
  listQcFrequencies,
  listQcSamplePoints,
  seedOperationalQcMaster,
  seedQcSamplePoints,
} from "@/services/qc/qc-master.service";
import { listControlledFormsForSlug } from "@/services/qc/qc-record.service";
import { sql } from "@/lib/db";

export async function getOperationalQcContext(slug: string, controlledFormId?: string | null, locationIds?: string[] | null) {
  const catalog = getQcCatalogEntry(slug);
  if (!catalog) throw new Error("Unknown QC test type");
  let form = controlledFormId
    ? (await sql<Array<{
        id: string; code: string; title: string; version: number; testTypeId: string; frequencyName: string | null;
        requiresShift: boolean; requiresItem: boolean; requiresSupplier: boolean; requiresSamplePoint: boolean; requiresLocation: boolean;
        allowsMultipleReadings: boolean; allowsMultipleSamples: boolean; documentPrefix: string | null;
      }>>`
        SELECT form.id, form.code, form.title, form.version, form."testTypeId", frequency.name AS "frequencyName",
          type."requiresShift", type."requiresItem", type."requiresSupplier", type."requiresSamplePoint", type."requiresLocation",
          type."allowsMultipleReadings", type."allowsMultipleSamples", type."documentPrefix"
        FROM "QCControlledForm" form
        INNER JOIN "QCTestType" type ON type.id = form."testTypeId"
        LEFT JOIN "QCTestFrequency" frequency ON frequency.id = form."frequencyId"
        WHERE form.id = ${controlledFormId}
        LIMIT 1
      `)[0]
    : await getDefaultFormForSlug(slug);
  if (!form && !controlledFormId) {
    await seedOperationalQcMaster();
    form = await getDefaultFormForSlug(slug);
  }
  if (!form) {
    throw new Error("No active controlled form is configured for this test. Open QC Master Data and activate a default form.");
  }

  await seedQcSamplePoints();

  const scopedLocationIds = (locationIds ?? []).filter(Boolean);
  const [specs, sections, forms, samplePoints, frequencies, items, allItems, locations, users, suppliers, shifts, assets, itemSpecs] = await Promise.all([
    getFormSpecifications(form.id),
    getFormSections(form.id),
    listControlledFormsForSlug(slug),
    listQcSamplePoints(),
    listQcFrequencies(),
    listFormItems(form.id, catalog.slug === "preform" ? "PREFORM" : catalog.slug === "handle" ? "HANDLE" : catalog.slug === "cap" ? "CAP" : null),
    getItemRows(),
    getLocations(),
    getUsers(),
    getSuppliers(),
    getShiftDefinitions(),
    sql<Array<{ id: string; assetCode: string; assetName: string }>>`SELECT id, "assetCode", "assetName" FROM "Asset" WHERE "isArchived" = false ORDER BY "assetName"`,
    sql<Array<{ itemId: string; kind: string; gramMin: number | null; gramMax: number | null; tolerance: number | null; label: string | null }>>`
      SELECT "itemId", kind, "gramMin", "gramMax", tolerance, label FROM "QCItemSpecification" WHERE "isActive" = true
    `,
  ]);

  const locationOptions = locations
    .filter((location) => scopedLocationIds.length === 0 || scopedLocationIds.includes(location.id))
    .map((location) => ({ value: location.id, label: location.locationName }));

  return {
    catalog,
    form,
    specs,
    sections,
    forms,
    samplePoints: samplePoints.filter((point) => point.isActive),
    frequencies: frequencies.filter((row) => row.isActive),
    items: (items.length ? items : allItems).map((item) => ({
      value: item.id,
      label: formatItemOptionLabel(item),
    })),
    locations: locationOptions,
    users: users.map((user) => ({ value: user.id, label: user.name })),
    suppliers: suppliers.filter((row) => row.isActive).map((row) => ({ value: row.id, label: `${row.supplierCode} — ${row.name}` })),
    shifts: shifts.map((shift) => ({ value: shift.code, label: shift.name })),
    assets: assets.map((asset) => ({ value: asset.id, label: `${asset.assetCode} — ${asset.assetName}` })),
    itemSpecs,
  };
}
