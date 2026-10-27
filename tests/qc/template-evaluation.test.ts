import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOverallQcResult, evaluateQcValue } from "@/services/qc/qc-evaluation.service";

test("QC numeric template limits pass inside the configured range", () => {
  assert.deepEqual(evaluateQcValue({ parameterName: "pH", dataType: "NUMBER", minimumValue: 6.5, maximumValue: 8.5, expectedText: null, required: true }, "7.2"), { rawValue: "7.2", numericValue: 7.2, result: "PASSED" });
});
test("QC numeric template limits fail outside the configured range", () => {
  assert.equal(evaluateQcValue({ parameterName: "TDS", dataType: "NUMBER", minimumValue: 0, maximumValue: 50, expectedText: null, required: true }, "63").result, "FAILED");
});
test("QC required values and overall result enforce blocking semantics", () => {
  assert.throws(() => evaluateQcValue({ parameterName: "Seal", dataType: "TEXT", minimumValue: null, maximumValue: null, expectedText: "PASS", required: true }, ""), /required/i);
  assert.equal(evaluateOverallQcResult(["PASSED", "FAILED", "PASSED"]), "FAILED");
  assert.equal(evaluateOverallQcResult(["PASSED", "PENDING"]), "PENDING");
});
