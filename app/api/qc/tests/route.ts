import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { createQcTest } from "@/services/qc/qc.service";

export async function POST(request: NextRequest) {
  return withQcAction(async (userId) => {
    const body = await request.json();
    return createQcTest({
      taskId: body.taskId ? String(body.taskId) : null,
      testType: String(body.testType ?? ""),
      productionBatchId: body.productionBatchId ? String(body.productionBatchId) : null,
      itemId: body.itemId ? String(body.itemId) : null,
      locationId: body.locationId ? String(body.locationId) : null,
      sampleDate: String(body.sampleDate ?? ""),
      result: body.result ? String(body.result) : "PENDING",
      status: body.status ? String(body.status) : "PENDING",
      testedById: body.testedById ? String(body.testedById) : userId,
      approvedById: body.approvedById ? String(body.approvedById) : null,
      remarks: body.remarks ? String(body.remarks) : "",
      parameters: Array.isArray(body.parameters)
        ? body.parameters.map((parameter: Record<string, unknown>) => ({
          parameterName: String(parameter.parameterName ?? ""),
            templateParameterId: parameter.templateParameterId ? String(parameter.templateParameterId) : null,
            expectedValue: parameter.expectedValue ? String(parameter.expectedValue) : "",
            actualValue: parameter.actualValue ? String(parameter.actualValue) : "",
            unit: parameter.unit ? String(parameter.unit) : "",
            result: parameter.result ? String(parameter.result) : "PENDING",
            remarks: parameter.remarks ? String(parameter.remarks) : "",
          }))
        : [],
    });
  }, "qc.test.create");
}
