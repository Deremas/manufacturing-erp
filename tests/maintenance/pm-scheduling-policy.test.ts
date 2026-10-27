import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePreventiveMaintenanceDue } from "@/services/maintenance/pm-policy";

const now = new Date("2026-08-11T00:00:00.000Z");

test("calendar PM becomes due inside its configured lead window", () => {
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "ACTIVE", triggerType: "CALENDAR", nextDueDate: "2026-08-20T00:00:00.000Z", leadTimeDays: 10, now }), "CALENDAR");
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "ACTIVE", triggerType: "CALENDAR", nextDueDate: "2026-08-22T00:00:00.000Z", leadTimeDays: 10, now }), null);
});

test("meter PM is driven by the DB-backed asset reading", () => {
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "ACTIVE", triggerType: "METER", currentMeterReading: 1000, nextMeterReading: 1000, now }), "METER");
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "ACTIVE", triggerType: "METER", currentMeterReading: 999.9, nextMeterReading: 1000, now }), null);
});

test("hybrid PM reports both causes and paused plans never become due", () => {
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "ACTIVE", triggerType: "HYBRID", nextDueDate: "2026-08-12T00:00:00.000Z", leadTimeDays: 2, currentMeterReading: 50, nextMeterReading: 50, now }), "CALENDAR + METER");
  assert.equal(evaluatePreventiveMaintenanceDue({ status: "PAUSED", triggerType: "HYBRID", nextDueDate: "2026-08-12T00:00:00.000Z", leadTimeDays: 2, currentMeterReading: 50, nextMeterReading: 50, now }), null);
});
