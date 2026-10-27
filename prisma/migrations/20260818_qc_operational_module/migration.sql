ALTER TABLE "QCTestType"
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'PRODUCTION',
  ADD COLUMN IF NOT EXISTS "requiresDate" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "requiresShift" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresItem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresSupplier" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresSamplePoint" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresLocation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowsMultipleReadings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowsMultipleSamples" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "documentPrefix" TEXT,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "QCTestType_slug_key" ON "QCTestType"(slug) WHERE slug IS NOT NULL;

ALTER TABLE "QCNonconformity"
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS "shiftCode" TEXT,
  ADD COLUMN IF NOT EXISTS "batchNo" TEXT,
  ADD COLUMN IF NOT EXISTS "immediateCorrection" TEXT,
  ADD COLUMN IF NOT EXISTS "preventiveAction" TEXT,
  ADD COLUMN IF NOT EXISTS "effectivenessReview" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

CREATE TABLE IF NOT EXISTS "QCTestFrequency" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "intervalMinutes" INTEGER,
  "intervalHours" INTEGER,
  "intervalDays" INTEGER,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCTestFrequency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCTestFrequency_code_key" ON "QCTestFrequency"("code");

CREATE TABLE IF NOT EXISTS "QCSamplePoint" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupName" TEXT NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "locationId" TEXT,
  "itemId" TEXT,
  "defaultFrequencyId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCSamplePoint_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCSamplePoint_code_key" ON "QCSamplePoint"("code");
CREATE INDEX IF NOT EXISTS "QCSamplePoint_group_idx" ON "QCSamplePoint"("groupName", "isActive", "displayOrder");

CREATE TABLE IF NOT EXISTS "QCParameter" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "dataType" TEXT NOT NULL DEFAULT 'NUMBER',
  "unitId" TEXT,
  "methodReference" TEXT,
  "technique" TEXT,
  "incubation" TEXT,
  "media" TEXT,
  "qualitativeOptions" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCParameter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCParameter_code_key" ON "QCParameter"("code");

CREATE TABLE IF NOT EXISTS "QCControlledForm" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "testTypeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "frequencyId" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCControlledForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCControlledForm_code_key" ON "QCControlledForm"("code");
CREATE INDEX IF NOT EXISTS "QCControlledForm_testType_idx" ON "QCControlledForm"("testTypeId", "isActive", "isArchived");

CREATE TABLE IF NOT EXISTS "QCFormSection" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sectionType" TEXT NOT NULL DEFAULT 'PARAMETER_TABLE',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "repeatable" BOOLEAN NOT NULL DEFAULT false,
  "minRows" INTEGER NOT NULL DEFAULT 1,
  "maxRows" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCFormSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCFormSection_formId_code_key" ON "QCFormSection"("formId", "code");

CREATE TABLE IF NOT EXISTS "QCParameterSpecification" (
  "id" TEXT NOT NULL,
  "controlledFormId" TEXT NOT NULL,
  "parameterId" TEXT NOT NULL,
  "unitId" TEXT,
  "methodReference" TEXT,
  "minValue" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "targetValue" DOUBLE PRECISION,
  "limitText" TEXT,
  "qualitativeCriterion" TEXT,
  "frequencyId" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCParameterSpecification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCParameterSpecification_form_parameter_key" ON "QCParameterSpecification"("controlledFormId", "parameterId");

CREATE TABLE IF NOT EXISTS "QCFormItemApplicability" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "itemId" TEXT,
  "itemTypeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCFormItemApplicability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCItemSpecification" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT,
  "gramMin" DOUBLE PRECISION,
  "gramMax" DOUBLE PRECISION,
  "tolerance" DOUBLE PRECISION,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCItemSpecification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCItemSpecification_itemId_kind_key" ON "QCItemSpecification"("itemId", "kind");

CREATE TABLE IF NOT EXISTS "QCTestRecord" (
  "id" TEXT NOT NULL,
  "recordNo" TEXT NOT NULL,
  "testTypeId" TEXT NOT NULL,
  "controlledFormId" TEXT NOT NULL,
  "recordDate" TIMESTAMP(3) NOT NULL,
  "shiftCode" TEXT,
  "itemId" TEXT,
  "supplierId" TEXT,
  "samplePointId" TEXT,
  "batchNo" TEXT,
  "locationId" TEXT,
  "assetId" TEXT,
  "quantity" DOUBLE PRECISION,
  "formVersion" INTEGER NOT NULL DEFAULT 1,
  "formCodeSnapshot" TEXT NOT NULL,
  "formTitleSnapshot" TEXT NOT NULL,
  "frequencySnapshot" TEXT,
  "specificationSnapshot" JSONB,
  "extraFields" JSONB,
  "result" TEXT NOT NULL DEFAULT 'PENDING',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "operationalStatus" TEXT,
  "testedById" TEXT NOT NULL,
  "submittedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "checkedById" TEXT,
  "checkedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "backdated" BOOLEAN NOT NULL DEFAULT false,
  "backdateReason" TEXT,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCTestRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCTestRecord_recordNo_key" ON "QCTestRecord"("recordNo");
CREATE INDEX IF NOT EXISTS "QCTestRecord_type_date_idx" ON "QCTestRecord"("testTypeId", "recordDate", "status");
CREATE INDEX IF NOT EXISTS "QCTestRecord_location_date_idx" ON "QCTestRecord"("locationId", "recordDate");
CREATE INDEX IF NOT EXISTS "QCTestRecord_item_date_idx" ON "QCTestRecord"("itemId", "recordDate");

CREATE TABLE IF NOT EXISTS "QCTestRecordLine" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "sectionCode" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL DEFAULT 0,
  "lineType" TEXT NOT NULL DEFAULT 'PARAMETER',
  "timeValue" TEXT,
  "parameterId" TEXT,
  "parameterNameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT,
  "methodSnapshot" TEXT,
  "limitSnapshot" TEXT,
  "numericValue" DOUBLE PRECISION,
  "textValue" TEXT,
  "result" TEXT NOT NULL DEFAULT 'PENDING',
  "remarks" TEXT,
  "extra" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCTestRecordLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QCTestRecordLine_record_idx" ON "QCTestRecordLine"("recordId", "sectionCode", "rowIndex");

CREATE TABLE IF NOT EXISTS "QCTestRecordHistory" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCTestRecordHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCCipRecord" (
  "id" TEXT NOT NULL,
  "recordNo" TEXT NOT NULL,
  "recordDate" TIMESTAMP(3) NOT NULL,
  "shiftCode" TEXT,
  "locationId" TEXT,
  "assetId" TEXT,
  "cycleNo" TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  "operatorId" TEXT,
  "verifiedById" TEXT,
  "approvedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "readings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCCipRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCCipRecord_recordNo_key" ON "QCCipRecord"("recordNo");

CREATE TABLE IF NOT EXISTS "QCRetentionSample" (
  "id" TEXT NOT NULL,
  "sampleNo" TEXT NOT NULL,
  "recordDate" TIMESTAMP(3) NOT NULL,
  "itemId" TEXT,
  "batchNo" TEXT,
  "shiftCode" TEXT,
  "quantity" DOUBLE PRECISION,
  "storageLocation" TEXT,
  "retainUntil" TIMESTAMP(3),
  "storedById" TEXT,
  "condition" TEXT,
  "disposalDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'STORED',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCRetentionSample_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCRetentionSample_sampleNo_key" ON "QCRetentionSample"("sampleNo");

CREATE TABLE IF NOT EXISTS "QCHoldDecision" (
  "id" TEXT NOT NULL,
  "decisionNo" TEXT NOT NULL,
  "recordDate" TIMESTAMP(3) NOT NULL,
  "itemId" TEXT,
  "batchNo" TEXT,
  "shiftCode" TEXT,
  "locationId" TEXT,
  "quantity" DOUBLE PRECISION,
  "qcRecordId" TEXT,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "requestedById" TEXT,
  "checkedById" TEXT,
  "approvedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCHoldDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCHoldDecision_decisionNo_key" ON "QCHoldDecision"("decisionNo");

CREATE TABLE IF NOT EXISTS "QCManagementReview" (
  "id" TEXT NOT NULL,
  "minuteNo" TEXT NOT NULL,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "duration" TEXT,
  "place" TEXT,
  "preparedById" TEXT,
  "gmRemark" TEXT,
  "draftAgenda" TEXT,
  "approvedAgenda" TEXT,
  "rejectReason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCManagementReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCManagementReview_minuteNo_key" ON "QCManagementReview"("minuteNo");

CREATE TABLE IF NOT EXISTS "QCManagementReviewParticipant" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "contribution" TEXT,
  CONSTRAINT "QCManagementReviewParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCManagementReviewResult" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "agenda" TEXT NOT NULL,
  "resolution" TEXT,
  "responsible" TEXT,
  "timeFrame" TEXT,
  CONSTRAINT "QCManagementReviewResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCInternalAudit" (
  "id" TEXT NOT NULL,
  "auditNo" TEXT NOT NULL,
  "auditDate" TIMESTAMP(3) NOT NULL,
  "scope" TEXT,
  "auditArea" TEXT,
  "leadAuditorId" TEXT,
  "auditee" TEXT,
  "preparedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCInternalAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCInternalAudit_auditNo_key" ON "QCInternalAudit"("auditNo");

CREATE TABLE IF NOT EXISTS "QCInternalAuditFinding" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "findingNo" TEXT,
  "nonconformity" TEXT NOT NULL,
  "rootCause" TEXT,
  "correction" TEXT,
  "correctiveAction" TEXT,
  "preventiveAction" TEXT,
  "responsibleId" TEXT,
  "targetDate" TIMESTAMP(3),
  "effectiveness" TEXT,
  "evaluatedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  CONSTRAINT "QCInternalAuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QCCorrectiveAction" (
  "id" TEXT NOT NULL,
  "planNo" TEXT NOT NULL,
  "planDate" TIMESTAMP(3) NOT NULL,
  "functionName" TEXT,
  "preparedById" TEXT,
  "approvedById" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QCCorrectiveAction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QCCorrectiveAction_planNo_key" ON "QCCorrectiveAction"("planNo");

CREATE TABLE IF NOT EXISTS "QCCorrectiveActionLine" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "nonconformity" TEXT,
  "ncrNo" TEXT,
  "rootCause" TEXT,
  "actions" TEXT,
  "realizationDate" TIMESTAMP(3),
  "followUpDates" TEXT,
  "responsibility" TEXT,
  CONSTRAINT "QCCorrectiveActionLine_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCSamplePoint_defaultFrequencyId_fkey') THEN
    ALTER TABLE "QCSamplePoint" ADD CONSTRAINT "QCSamplePoint_defaultFrequencyId_fkey" FOREIGN KEY ("defaultFrequencyId") REFERENCES "QCTestFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCControlledForm_testTypeId_fkey') THEN
    ALTER TABLE "QCControlledForm" ADD CONSTRAINT "QCControlledForm_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCControlledForm_frequencyId_fkey') THEN
    ALTER TABLE "QCControlledForm" ADD CONSTRAINT "QCControlledForm_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "QCTestFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCFormSection_formId_fkey') THEN
    ALTER TABLE "QCFormSection" ADD CONSTRAINT "QCFormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "QCControlledForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCParameterSpecification_controlledFormId_fkey') THEN
    ALTER TABLE "QCParameterSpecification" ADD CONSTRAINT "QCParameterSpecification_controlledFormId_fkey" FOREIGN KEY ("controlledFormId") REFERENCES "QCControlledForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCParameterSpecification_parameterId_fkey') THEN
    ALTER TABLE "QCParameterSpecification" ADD CONSTRAINT "QCParameterSpecification_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "QCParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCTestRecord_testTypeId_fkey') THEN
    ALTER TABLE "QCTestRecord" ADD CONSTRAINT "QCTestRecord_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "QCTestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCTestRecord_controlledFormId_fkey') THEN
    ALTER TABLE "QCTestRecord" ADD CONSTRAINT "QCTestRecord_controlledFormId_fkey" FOREIGN KEY ("controlledFormId") REFERENCES "QCControlledForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCTestRecordLine_recordId_fkey') THEN
    ALTER TABLE "QCTestRecordLine" ADD CONSTRAINT "QCTestRecordLine_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "QCTestRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCTestRecordHistory_recordId_fkey') THEN
    ALTER TABLE "QCTestRecordHistory" ADD CONSTRAINT "QCTestRecordHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "QCTestRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCManagementReviewParticipant_reviewId_fkey') THEN
    ALTER TABLE "QCManagementReviewParticipant" ADD CONSTRAINT "QCManagementReviewParticipant_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "QCManagementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCManagementReviewResult_reviewId_fkey') THEN
    ALTER TABLE "QCManagementReviewResult" ADD CONSTRAINT "QCManagementReviewResult_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "QCManagementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCInternalAuditFinding_auditId_fkey') THEN
    ALTER TABLE "QCInternalAuditFinding" ADD CONSTRAINT "QCInternalAuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "QCInternalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QCCorrectiveActionLine_planId_fkey') THEN
    ALTER TABLE "QCCorrectiveActionLine" ADD CONSTRAINT "QCCorrectiveActionLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "QCCorrectiveAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "DocumentNumbering" (
  id, prefix, description, "prefixFormat", separator, "yearFormat", "monthFormat", "dayFormat",
  "sequenceLength", "currentSequence", "isActive", "isArchived"
)
SELECT id, prefix, description, prefix, '-', 'YYYY', 'MM', 'DD', 4, 0, true, false
FROM (VALUES
  ('docnum-qc-wat', 'QC-WAT', 'QC Water Test'),
  ('docnum-qc-clr', 'QC-CLR', 'QC Chlorine Residual'),
  ('docnum-qc-trt', 'QC-TRT', 'QC Treatment Monitoring'),
  ('docnum-qc-phy', 'QC-PHY', 'QC Physico-Chemical'),
  ('docnum-qc-mic', 'QC-MIC', 'QC Microbial Test'),
  ('docnum-qc-pre', 'QC-PRE', 'QC Preform Inspection'),
  ('docnum-qc-hnd', 'QC-HND', 'QC Handle Inspection'),
  ('docnum-qc-cap', 'QC-CAP', 'QC Cap Inspection'),
  ('docnum-qc-pkg', 'QC-PKG', 'QC Packaging Inspection'),
  ('docnum-qc-cip', 'QC-CIP', 'QC CIP Record'),
  ('docnum-qc-ret', 'QC-RET', 'QC Retention Sample'),
  ('docnum-qc-hld', 'QC-HLD', 'QC Hold Decision'),
  ('docnum-qc-ncr', 'QC-NCR', 'QC Nonconformity'),
  ('docnum-qc-mrv', 'QC-MRV', 'QC Management Review'),
  ('docnum-qc-aud', 'QC-AUD', 'QC Internal Audit'),
  ('docnum-qc-cpl', 'QC-CAPLAN', 'QC Corrective Action Plan')
) AS rows(id, prefix, description)
ON CONFLICT (prefix) DO NOTHING;

INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived")
SELECT id, module, action, label, false
FROM (VALUES
  ('qc.dashboard.view', 'qc', 'dashboard.view', 'QC Dashboard View'),
  ('qc.daily.view', 'qc', 'daily.view', 'QC Daily Records View'),
  ('qc.daily.export', 'qc', 'daily.export', 'QC Daily Records Export'),
  ('qc.setup.view', 'qc', 'setup.view', 'QC Master Data View'),
  ('qc.setup.create', 'qc', 'setup.create', 'QC Master Data Create'),
  ('qc.setup.update', 'qc', 'setup.update', 'QC Master Data Update'),
  ('qc.setup.deactivate', 'qc', 'setup.deactivate', 'QC Master Data Deactivate'),
  ('qc.record.backdate', 'qc', 'record.backdate', 'QC Backdate Records'),
  ('qc.water.view', 'qc', 'water.view', 'QC Water View'),
  ('qc.water.create', 'qc', 'water.create', 'QC Water Create'),
  ('qc.water.update', 'qc', 'water.update', 'QC Water Update'),
  ('qc.water.submit', 'qc', 'water.submit', 'QC Water Submit'),
  ('qc.water.check', 'qc', 'water.check', 'QC Water Check'),
  ('qc.water.approve', 'qc', 'water.approve', 'QC Water Approve'),
  ('qc.water.reject', 'qc', 'water.reject', 'QC Water Reject'),
  ('qc.water.print', 'qc', 'water.print', 'QC Water Print'),
  ('qc.chlorine.view', 'qc', 'chlorine.view', 'QC Chlorine View'),
  ('qc.chlorine.create', 'qc', 'chlorine.create', 'QC Chlorine Create'),
  ('qc.chlorine.update', 'qc', 'chlorine.update', 'QC Chlorine Update'),
  ('qc.chlorine.submit', 'qc', 'chlorine.submit', 'QC Chlorine Submit'),
  ('qc.chlorine.check', 'qc', 'chlorine.check', 'QC Chlorine Check'),
  ('qc.chlorine.approve', 'qc', 'chlorine.approve', 'QC Chlorine Approve'),
  ('qc.chlorine.print', 'qc', 'chlorine.print', 'QC Chlorine Print'),
  ('qc.treatment.view', 'qc', 'treatment.view', 'QC Treatment View'),
  ('qc.treatment.create', 'qc', 'treatment.create', 'QC Treatment Create'),
  ('qc.treatment.update', 'qc', 'treatment.update', 'QC Treatment Update'),
  ('qc.treatment.submit', 'qc', 'treatment.submit', 'QC Treatment Submit'),
  ('qc.treatment.approve', 'qc', 'treatment.approve', 'QC Treatment Approve'),
  ('qc.treatment.print', 'qc', 'treatment.print', 'QC Treatment Print'),
  ('qc.physicochemical.view', 'qc', 'physicochemical.view', 'QC Physico-Chemical View'),
  ('qc.physicochemical.create', 'qc', 'physicochemical.create', 'QC Physico-Chemical Create'),
  ('qc.physicochemical.update', 'qc', 'physicochemical.update', 'QC Physico-Chemical Update'),
  ('qc.physicochemical.submit', 'qc', 'physicochemical.submit', 'QC Physico-Chemical Submit'),
  ('qc.physicochemical.approve', 'qc', 'physicochemical.approve', 'QC Physico-Chemical Approve'),
  ('qc.physicochemical.print', 'qc', 'physicochemical.print', 'QC Physico-Chemical Print'),
  ('qc.microbial.view', 'qc', 'microbial.view', 'QC Microbial View'),
  ('qc.microbial.create', 'qc', 'microbial.create', 'QC Microbial Create'),
  ('qc.microbial.update', 'qc', 'microbial.update', 'QC Microbial Update'),
  ('qc.microbial.submit', 'qc', 'microbial.submit', 'QC Microbial Submit'),
  ('qc.microbial.approve', 'qc', 'microbial.approve', 'QC Microbial Approve'),
  ('qc.microbial.print', 'qc', 'microbial.print', 'QC Microbial Print'),
  ('qc.preform.view', 'qc', 'preform.view', 'QC Preform View'),
  ('qc.preform.create', 'qc', 'preform.create', 'QC Preform Create'),
  ('qc.preform.update', 'qc', 'preform.update', 'QC Preform Update'),
  ('qc.preform.submit', 'qc', 'preform.submit', 'QC Preform Submit'),
  ('qc.preform.approve', 'qc', 'preform.approve', 'QC Preform Approve'),
  ('qc.handle.view', 'qc', 'handle.view', 'QC Handle View'),
  ('qc.handle.create', 'qc', 'handle.create', 'QC Handle Create'),
  ('qc.handle.update', 'qc', 'handle.update', 'QC Handle Update'),
  ('qc.handle.submit', 'qc', 'handle.submit', 'QC Handle Submit'),
  ('qc.handle.approve', 'qc', 'handle.approve', 'QC Handle Approve'),
  ('qc.cap.view', 'qc', 'cap.view', 'QC Cap View'),
  ('qc.cap.create', 'qc', 'cap.create', 'QC Cap Create'),
  ('qc.cap.update', 'qc', 'cap.update', 'QC Cap Update'),
  ('qc.cap.submit', 'qc', 'cap.submit', 'QC Cap Submit'),
  ('qc.cap.approve', 'qc', 'cap.approve', 'QC Cap Approve'),
  ('qc.packaging.view', 'qc', 'packaging.view', 'QC Packaging View'),
  ('qc.packaging.create', 'qc', 'packaging.create', 'QC Packaging Create'),
  ('qc.packaging.update', 'qc', 'packaging.update', 'QC Packaging Update'),
  ('qc.packaging.submit', 'qc', 'packaging.submit', 'QC Packaging Submit'),
  ('qc.cip.view', 'qc', 'cip.view', 'QC CIP View'),
  ('qc.cip.create', 'qc', 'cip.create', 'QC CIP Create'),
  ('qc.cip.update', 'qc', 'cip.update', 'QC CIP Update'),
  ('qc.cip.submit', 'qc', 'cip.submit', 'QC CIP Submit'),
  ('qc.retention.view', 'qc', 'retention.view', 'QC Retention View'),
  ('qc.retention.create', 'qc', 'retention.create', 'QC Retention Create'),
  ('qc.retention.update', 'qc', 'retention.update', 'QC Retention Update'),
  ('qc.hold.view', 'qc', 'hold.view', 'QC Hold Decision View'),
  ('qc.hold.create', 'qc', 'hold.create', 'QC Hold Decision Create'),
  ('qc.hold.update', 'qc', 'hold.update', 'QC Hold Decision Update'),
  ('qc.hold.approve', 'qc', 'hold.approve', 'QC Hold Decision Approve'),
  ('qc.nc.view', 'qc', 'nc.view', 'QC Nonconformity View'),
  ('qc.nc.create', 'qc', 'nc.create', 'QC Nonconformity Create'),
  ('qc.nc.update', 'qc', 'nc.update', 'QC Nonconformity Update'),
  ('qc.nc.close', 'qc', 'nc.close', 'QC Nonconformity Close'),
  ('qc.review.view', 'qc', 'review.view', 'QC Management Review View'),
  ('qc.review.create', 'qc', 'review.create', 'QC Management Review Create'),
  ('qc.review.update', 'qc', 'review.update', 'QC Management Review Update'),
  ('qc.review.approve', 'qc', 'review.approve', 'QC Management Review Approve'),
  ('qc.audit.view', 'qc', 'audit.view', 'QC Internal Audit View'),
  ('qc.audit.create', 'qc', 'audit.create', 'QC Internal Audit Create'),
  ('qc.audit.update', 'qc', 'audit.update', 'QC Internal Audit Update'),
  ('qc.capa.view', 'qc', 'capa.view', 'QC Corrective Action View'),
  ('qc.capa.create', 'qc', 'capa.create', 'QC Corrective Action Create'),
  ('qc.capa.update', 'qc', 'capa.update', 'QC Corrective Action Update'),
  ('qc.capa.approve', 'qc', 'capa.approve', 'QC Corrective Action Approve')
) AS rows(id, module, action, label)
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label", "isArchived" = false;

INSERT INTO "RolePermission" ("id", "roleId", "permission", "module", "action", "isArchived")
SELECT role.id || ':' || permission.id, role.id, permission.id, permission.module, permission.action, false
FROM "Role" role
JOIN "Permission" permission ON permission.module = 'qc' AND permission.id LIKE 'qc.%'
WHERE role.name = 'Super Admin'
ON CONFLICT ("id") DO NOTHING;
