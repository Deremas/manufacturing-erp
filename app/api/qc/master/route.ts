import { withQcUser } from "@/app/api/qc/helpers";
import {
  listQcControlledForms,
  listQcFrequencies,
  listQcItemSpecifications,
  listQcParameters,
  listQcSamplePoints,
} from "@/services/qc/qc-master.service";

export async function GET() {
  return withQcUser(async () => ({
    forms: await listQcControlledForms(),
    parameters: await listQcParameters(),
    samplePoints: await listQcSamplePoints(),
    frequencies: await listQcFrequencies(),
    itemSpecs: await listQcItemSpecifications(),
  }), "qc.setup.view");
}
