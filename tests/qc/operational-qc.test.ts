import assert from "node:assert/strict";
import test from "node:test";

import { evaluateOperationalOverall, evaluateOperationalValue, formatSpecificationLimit } from "@/services/qc/qc-evaluation.service";
import { CONDUCTIVITY_METHOD, formatIncubation, isUnconfirmedMethod, microResultTypeId, parseIncubation, physicoParameterSlug, physicoResultTypeId, preformGramDefault, QC_FORM_SPEC_DEFAULTS, QC_PARAMETER_SEED } from "@/services/qc/qc-catalog";
import { assertReadingRowsValid, canRemoveRepeatableRow, classifyReadingRow } from "@/services/qc/qc-record.helpers";
import { getRequiredPermission, hasRouteAccess } from "@/lib/auth/route-access";

test("missing numeric specification is not evaluated and never auto-passes", () => {
  const result = evaluateOperationalValue({
    parameterName: "pH",
    dataType: "NUMBER",
    minValue: null,
    maxValue: null,
    required: true,
    numericValue: 7.1,
    textValue: "7.1",
  });
  assert.equal(result, "NOT_EVALUATED");
  assert.equal(formatSpecificationLimit({}), "Not configured");
});

test("numeric min/max pass and fail independently of workflow", () => {
  assert.equal(evaluateOperationalValue({
    parameterName: "pH",
    dataType: "NUMBER",
    minValue: 6.5,
    maxValue: 8,
    required: true,
    numericValue: 7,
  }), "PASS");
  assert.equal(evaluateOperationalValue({
    parameterName: "pH",
    dataType: "NUMBER",
    minValue: 6.5,
    maxValue: 8,
    required: true,
    numericValue: 5,
  }), "FAIL");
});

test("overall required fail wins, missing required result is incomplete", () => {
  assert.equal(evaluateOperationalOverall(["PASS", "FAIL"], [true, true]), "FAIL");
  assert.equal(evaluateOperationalOverall(["PASS", "INCOMPLETE"], [true, true]), "INCOMPLETE");
  assert.equal(evaluateOperationalOverall(["PASS", "NOT_EVALUATED"], [true, true]), "NOT_EVALUATED");
  assert.equal(evaluateOperationalOverall(["PASS", "PASS"], [true, true]), "PASS");
});

test("empty reading rows are ignored and the last row cannot be deleted", () => {
  assert.equal(classifyReadingRow({ timeValue: "", values: { POINT: "Ozone generator" } }), "empty");
  assert.equal(classifyReadingRow({ timeValue: "08:00", values: { POINT: "Ozone generator" } }), "complete");
  const kept = assertReadingRowsValid([
    { timeValue: "", values: {} },
    { timeValue: "08:00", values: { CHLORINE_PPM: "0.3" } },
  ], false);
  assert.equal(kept.length, 1);
  assert.equal(canRemoveRepeatableRow(1), false);
  assert.equal(canRemoveRepeatableRow(2), true);
});

test("QC operational pages map to granular permissions and APIs do not fall back", () => {
  assert.equal(getRequiredPermission("/qc", "GET"), "qc.dashboard.view");
  assert.equal(getRequiredPermission("/qc/chlorine-residual", "GET"), "qc.chlorine.view");
  assert.equal(getRequiredPermission("/qc/chlorine-residual/create", "GET"), "qc.chlorine.create");
  assert.equal(getRequiredPermission("/qc/microbial/abc/print", "GET"), "qc.microbial.print");
  assert.equal(getRequiredPermission("/qc/master-data", "GET"), "qc.setup.view");
  assert.equal(getRequiredPermission("/qc/production-output", "GET"), "qc.task.view");
  assert.equal(getRequiredPermission("/qc/microbial-test", "GET"), "qc.microbial.view");
  assert.equal(getRequiredPermission("/api/qc/dashboard", "GET"), "qc.dashboard.view");
  assert.equal(getRequiredPermission("/api/qc/records", "POST"), null);
  assert.equal(hasRouteAccess(["qc.view"], "/qc/chlorine-residual", "GET"), true);
  assert.equal(hasRouteAccess(["qc.view"], "/api/qc/dashboard", "GET"), false);
  assert.equal(hasRouteAccess(["qc.dashboard.view"], "/api/qc/dashboard", "GET"), true);
});

test("physico-chemical master slugs, result types and max-only limits match the create form", () => {
  assert.equal(physicoParameterSlug("CONDUCTIVITY"), "electrical_conductivity");
  assert.equal(physicoParameterSlug("ALKALINITY"), "total_alkalinity");
  assert.equal(physicoParameterSlug("CAUSTIC_RESIDUAL"), "caustic_soda_residual");
  assert.equal(physicoResultTypeId("NUMBER"), "NUMERIC");
  assert.equal(physicoResultTypeId("TEXT"), "QUALITATIVE");
  assert.equal(formatSpecificationLimit({ maxValue: 500, limitText: "<= 500" }), "<= 500");
  assert.equal(evaluateOperationalValue({
    parameterName: "TDS",
    dataType: "NUMBER",
    minValue: null,
    maxValue: 500,
    required: true,
    numericValue: 400,
  }), "PASS");
  assert.equal(evaluateOperationalValue({
    parameterName: "TDS",
    dataType: "NUMBER",
    minValue: null,
    maxValue: 500,
    required: true,
    numericValue: 501,
  }), "FAIL");
  assert.equal(evaluateOperationalValue({
    parameterName: "Odor",
    dataType: "TEXT",
    qualitativeCriterion: null,
    required: true,
    textValue: "Acceptable",
  }), "NOT_EVALUATED");
});

test("placeholder ISO methods count as unconfirmed", () => {
  assert.equal(isUnconfirmedMethod(""), true);
  assert.equal(isUnconfirmedMethod("e.g. BS/ISO 5887-2:201"), true);
  assert.equal(isUnconfirmedMethod("ES ISO 7888"), false);
  assert.equal(isUnconfirmedMethod(CONDUCTIVITY_METHOD), false);
});

test("conductivity uses ISO 7888 electrical conductivity, not a placeholder", () => {
  const seed = QC_PARAMETER_SEED.find((row) => row.code === "CONDUCTIVITY");
  assert.equal(seed?.method, "ES ISO 7888:1985");
  assert.equal(QC_FORM_SPEC_DEFAULTS.physicochemical?.CONDUCTIVITY?.method, "ES ISO 7888:1985");
  assert.equal(QC_FORM_SPEC_DEFAULTS.physicochemical?.CONDUCTIVITY?.max, 1500);
  assert.equal(QC_FORM_SPEC_DEFAULTS.physicochemical?.CONDUCTIVITY?.limitText, "<= 1500");
  assert.notEqual(QC_FORM_SPEC_DEFAULTS["raw-water"]?.TDS?.method, CONDUCTIVITY_METHOD);
});

test("microbial incubation splits into temperature and hours", () => {
  assert.deepEqual(parseIncubation("35°C / 48 hrs"), { temp: "35", hours: "48" });
  assert.equal(formatIncubation("22", "72"), "22°C / 72 hrs");
  assert.equal(microResultTypeId("NUMBER", null), "NUMERIC");
  assert.equal(microResultTypeId("TEXT", "ABSENT"), "ABSENT");
  assert.equal(microResultTypeId("TEXT", "UNDETECTED"), "UNDETECTABLE");
});

test("preform gram defaults match Nova bottle sizes and ignore labels", () => {
  assert.equal(preformGramDefault("PET Preform 0.25L", "PACK-013")?.min, 11);
  assert.equal(preformGramDefault("PET Preform 0.25L", "PACK-013")?.max, 12);
  assert.equal(preformGramDefault("PET Preform 1L", "PACK-015")?.min, 27);
  assert.equal(preformGramDefault("PET Preform 5L", "PACK-017")?.min, 48);
  assert.equal(preformGramDefault("PET Preform 18.5g", "PACK-001")?.min, 18);
  assert.equal(preformGramDefault("PET Preform 28g", "PACK-006")?.max, 28);
  assert.equal(preformGramDefault("PET Preform 10L", "PACK-018")?.min, 90);
  assert.equal(preformGramDefault("PET Preform 15L", "PACK-019")?.min, 140);
  assert.equal(preformGramDefault("20L Empty Bottle", "PACK-012")?.min, 750);
  assert.equal(preformGramDefault("1.5L Bottle Label", "PACK-008"), null);
  assert.equal(preformGramDefault("20L Bottle Handle", "PACK-003"), null);
});
