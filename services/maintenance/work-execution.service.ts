import { randomUUID } from "crypto";
import { sql } from "@/lib/db";

type EventType = "CHECK_IN" | "DIAGNOSIS" | "WORK_STARTED" | "WORK_PAUSED" | "WORK_RESUMED" | "PARTS_REQUESTED" | "PARTS_RECEIVED" | "REPAIR_COMPLETED" | "TEST_STARTED" | "TEST_COMPLETED" | "CHECK_OUT";

async function audit(userId: string, action: string, id: string, value: unknown) {
  await sql`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", "isArchived", timestamp) VALUES (${randomUUID()}, ${userId}, ${action}, 'maintenance', ${id}, ${JSON.stringify(value)}, false, NOW())`;
}

async function assertTechnician(workOrderId: string, technicianId: string) {
  const rows = await sql<Array<{ status: string; assignedTechnicianId: string | null; supervisorId: string | null }>>`SELECT status::text AS status, "assignedTechnicianId", "supervisorId" FROM "MaintenanceWorkOrder" WHERE id=${workOrderId} LIMIT 1`;
  const wo = rows[0]; if (!wo) throw new Error("Maintenance work order not found");
  if (["CLOSED", "CANCELLED", "REJECTED"].includes(wo.status)) throw new Error("Closed, cancelled, or rejected work order cannot accept execution events");
  if (![wo.assignedTechnicianId, wo.supervisorId].includes(technicianId)) throw new Error("Only the assigned technician or supervisor can record execution events");
  return wo;
}

export async function getWorkOrderExecution(workOrderId: string) {
  const [logs, sessions, tests, setup] = await Promise.all([
    sql<Array<Record<string, unknown>>>`SELECT log.*, u.name AS "technicianName" FROM "MaintenanceWorkLog" log LEFT JOIN "User" u ON u.id=log."technicianId" WHERE log."workOrderId"=${workOrderId} ORDER BY log."eventDateTime", log."createdAt"`,
    sql<Array<Record<string, unknown>>>`SELECT s.*, u.name AS "technicianName" FROM "MaintenanceWorkSession" s LEFT JOIN "User" u ON u.id=s."technicianId" WHERE s."workOrderId"=${workOrderId} ORDER BY s."checkInAt" DESC`,
    sql<Array<Record<string, unknown>>>`SELECT t.*, u.name AS "testedByName", sup.name AS "supervisorName", pb."batchNo" AS "productionTrialBatchNo" FROM "MaintenanceWorkOrderTest" t LEFT JOIN "User" u ON u.id=t."testedById" LEFT JOIN "User" sup ON sup.id=t."supervisorId" LEFT JOIN "ProductionBatch" pb ON pb.id=t."productionTrialBatchId" WHERE t."workOrderId"=${workOrderId} ORDER BY t."testDate" DESC`,
    Promise.all([
      sql<Array<Record<string, unknown>>>`SELECT id, code, name FROM "FailureMode" WHERE "isActive"=true ORDER BY name`,
      sql<Array<Record<string, unknown>>>`SELECT id, code, name, category FROM "RootCause" WHERE "isActive"=true ORDER BY category, name`,
    ]),
  ]);
  return { logs, sessions, tests, failureModes: setup[0], rootCauses: setup[1] };
}

export async function checkInTechnician(input: { workOrderId: string; technicianId: string; notes?: string | null }) {
  const wo = await assertTechnician(input.workOrderId, input.technicianId);
  if (!["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"].includes(wo.status)) throw new Error("Work order must be approved before technician check-in");
  return sql.begin(async (tx) => {
    const active = await tx<Array<{ id: string }>>`SELECT id FROM "MaintenanceWorkSession" WHERE "technicianId"=${input.technicianId} AND status IN ('ACTIVE','PAUSED') LIMIT 1 FOR UPDATE`;
    if (active[0]) throw new Error("Technician already has an active maintenance session");
    const employee = await tx<Array<{ hourlyRate: number }>>`SELECT COALESCE("baseSalary",0)/208.0 AS "hourlyRate" FROM "Employee" WHERE "userId"=${input.technicianId} AND "isActive"=true AND "isArchived"=false LIMIT 1`;
    const sessionId=randomUUID(), logId=randomUUID(), hourlyRate=Number(employee[0]?.hourlyRate ?? 0);
    await tx`INSERT INTO "MaintenanceWorkSession" (id,"workOrderId","technicianId","checkInAt","hourlyRate",status,"createdAt","updatedAt") VALUES (${sessionId},${input.workOrderId},${input.technicianId},NOW(),${hourlyRate},'ACTIVE',NOW(),NOW())`;
    await tx`INSERT INTO "MaintenanceWorkLog" (id,"workOrderId","technicianId","eventType","eventDateTime",notes,"hourlyRate","sessionId","createdAt") VALUES (${logId},${input.workOrderId},${input.technicianId},'CHECK_IN',NOW(),${input.notes?.trim()||null},${hourlyRate},${sessionId},NOW())`;
    await tx`UPDATE "MaintenanceWorkOrder" SET status='IN_PROGRESS', "actualStart"=COALESCE("actualStart",NOW()), "updatedAt"=NOW() WHERE id=${input.workOrderId}`;
    await tx`UPDATE "Asset" a SET status='UNDER_MAINTENANCE', "updatedAt"=NOW() FROM "MaintenanceWorkOrder" wo WHERE wo.id=${input.workOrderId} AND a.id=wo."assetId"`;
    await tx`UPDATE "ProductionDowntime" SET status='WORK_IN_PROGRESS', "workOrderId"=${input.workOrderId}, "updatedAt"=NOW() WHERE id=(SELECT COALESCE(wo."productionDowntimeId",mt."productionDowntimeId") FROM "MaintenanceWorkOrder" wo LEFT JOIN "MaintenanceTicket" mt ON mt.id=wo."ticketId" WHERE wo.id=${input.workOrderId})`;
    return { sessionId, status:"ACTIVE", hourlyRate };
  }).then(async result => { await audit(input.technicianId,"TECHNICIAN_CHECK_IN",input.workOrderId,result); return result; });
}

export async function transitionTechnicianSession(input: { workOrderId: string; technicianId: string; action: "pause"|"resume"|"check-out"; notes?: string | null }) {
  await assertTechnician(input.workOrderId,input.technicianId);
  return sql.begin(async tx => {
    const rows=await tx<Array<{id:string;status:string;checkInAt:string;pausedAt:string|null;pauseMinutes:number;hourlyRate:number}>>`SELECT id,status,"checkInAt"::text AS "checkInAt","pausedAt"::text AS "pausedAt","pauseMinutes","hourlyRate" FROM "MaintenanceWorkSession" WHERE "workOrderId"=${input.workOrderId} AND "technicianId"=${input.technicianId} AND status IN ('ACTIVE','PAUSED') ORDER BY "checkInAt" DESC LIMIT 1 FOR UPDATE`;
    const s=rows[0]; if(!s) throw new Error("No active technician session found");
    let event:EventType, laborMinutes:number|null=null, laborCost:number|null=null;
    if(input.action==="pause") { if(s.status!=="ACTIVE") throw new Error("Only an active session can be paused"); event="WORK_PAUSED"; await tx`UPDATE "MaintenanceWorkSession" SET status='PAUSED',"pausedAt"=NOW(),"updatedAt"=NOW() WHERE id=${s.id}`; }
    else if(input.action==="resume") { if(s.status!=="PAUSED"||!s.pausedAt) throw new Error("Only a paused session can be resumed"); event="WORK_RESUMED"; const extra=Math.max(Math.round((Date.now()-new Date(s.pausedAt).getTime())/60000),0); await tx`UPDATE "MaintenanceWorkSession" SET status='ACTIVE',"pausedAt"=NULL,"pauseMinutes"="pauseMinutes"+${extra},"updatedAt"=NOW() WHERE id=${s.id}`; }
    else { event="CHECK_OUT"; const currentPause=s.status==="PAUSED"&&s.pausedAt?Math.max(Math.round((Date.now()-new Date(s.pausedAt).getTime())/60000),0):0; const total=Math.max(Math.round((Date.now()-new Date(s.checkInAt).getTime())/60000),0); laborMinutes=Math.max(total-Number(s.pauseMinutes)-currentPause,0); laborCost=(laborMinutes/60)*Number(s.hourlyRate); await tx`UPDATE "MaintenanceWorkSession" SET status='COMPLETED',"checkOutAt"=NOW(),"pausedAt"=NULL,"pauseMinutes"="pauseMinutes"+${currentPause},"activeMinutes"=${laborMinutes},"laborCost"=${laborCost},"updatedAt"=NOW() WHERE id=${s.id}`; await tx`INSERT INTO "MaintenanceLabor" (id,"workOrderId","employeeId",hours,"hourlyRate","totalCost",remarks,"createdAt","updatedAt") VALUES (${randomUUID()},${input.workOrderId},${input.technicianId},${laborMinutes/60},${Number(s.hourlyRate)},${laborCost},${input.notes?.trim()||'Calculated from technician session'},NOW(),NOW())`; await tx`UPDATE "MaintenanceWorkOrder" SET "totalLaborCost"=(SELECT COALESCE(SUM("totalCost"),0) FROM "MaintenanceLabor" WHERE "workOrderId"=${input.workOrderId}), "totalCost"="totalSpareCost"+"totalExternalCost"+(SELECT COALESCE(SUM("totalCost"),0) FROM "MaintenanceLabor" WHERE "workOrderId"=${input.workOrderId}),"updatedAt"=NOW() WHERE id=${input.workOrderId}`; }
    await tx`INSERT INTO "MaintenanceWorkLog" (id,"workOrderId","technicianId","eventType","eventDateTime",notes,"laborMinutes","hourlyRate","laborCost","sessionId","createdAt") VALUES (${randomUUID()},${input.workOrderId},${input.technicianId},${event},NOW(),${input.notes?.trim()||null},${laborMinutes},${Number(s.hourlyRate)},${laborCost},${s.id},NOW())`;
    return {sessionId:s.id,status:input.action==="pause"?"PAUSED":input.action==="resume"?"ACTIVE":"COMPLETED",laborMinutes,laborCost};
  }).then(async result=>{await audit(input.technicianId,`TECHNICIAN_${input.action.toUpperCase().replace('-','_')}`,input.workOrderId,result);return result;});
}

export async function recordDiagnosis(input:{workOrderId:string;technicianId:string;diagnosis:string;failureModeId?:string|null;rootCauseId?:string|null;rootCause?:string|null;immediateAction?:string|null;permanentAction?:string|null;correctiveAction:string;preventiveAction?:string|null;recommendation?:string|null}){
  await assertTechnician(input.workOrderId,input.technicianId); if(!input.diagnosis?.trim()||!input.correctiveAction?.trim()) throw new Error("Diagnosis and corrective action are required");
  await sql.begin(async tx=>{ await tx`UPDATE "MaintenanceWorkOrder" SET diagnosis=${input.diagnosis.trim()},"failureModeId"=${input.failureModeId||null},"rootCauseId"=${input.rootCauseId||null},"rootCause"=${input.rootCause?.trim()||null},"immediateAction"=${input.immediateAction?.trim()||null},"permanentAction"=${input.permanentAction?.trim()||null},"correctiveAction"=${input.correctiveAction.trim()},"preventiveAction"=${input.preventiveAction?.trim()||null},recommendation=${input.recommendation?.trim()||null},"updatedAt"=NOW() WHERE id=${input.workOrderId}`; await tx`INSERT INTO "MaintenanceWorkLog" (id,"workOrderId","technicianId","eventType","eventDateTime",notes,"createdAt") VALUES (${randomUUID()},${input.workOrderId},${input.technicianId},'DIAGNOSIS',NOW(),${input.diagnosis.trim()},NOW())`; });
  await audit(input.technicianId,"RECORD_DIAGNOSIS",input.workOrderId,{failureModeId:input.failureModeId,rootCauseId:input.rootCauseId}); return getWorkOrderExecution(input.workOrderId);
}

export async function testWorkOrder(input:{workOrderId:string;testedById:string;testDate?:string|null;testMethod:string;machineRunMinutes?:number;result:"PASS"|"FAIL"|"CONDITIONAL";observations?:string|null;productionTrialBatchId?:string|null;remarks?:string|null;supervisorApproval?:boolean}){
  if(!input.testMethod?.trim()) throw new Error("Test method or checklist is required"); if(!["PASS","FAIL","CONDITIONAL"].includes(input.result)) throw new Error("Test result must be PASS, FAIL, or CONDITIONAL");
  return sql.begin(async tx=>{const rows=await tx<Array<{status:string;supervisorId:string|null;assetId:string}>>`SELECT status::text AS status,"supervisorId","assetId" FROM "MaintenanceWorkOrder" WHERE id=${input.workOrderId} LIMIT 1 FOR UPDATE`; const wo=rows[0]; if(!wo)throw new Error("Maintenance work order not found"); if(wo.status!=="COMPLETED"&&!(wo.status==="IN_PROGRESS"&&input.result==="FAIL"))throw new Error("Complete repair work before testing"); const conditionalApproved=input.result==="CONDITIONAL"&&input.supervisorApproval&&wo.supervisorId===input.testedById; const id=randomUUID(); await tx`INSERT INTO "MaintenanceWorkOrderTest" (id,"workOrderId","testDate","testedById","supervisorId","testMethod","machineRunMinutes",result,observations,"productionTrialBatchId","supervisorApprovedAt",remarks,"createdAt","updatedAt") VALUES (${id},${input.workOrderId},${input.testDate?new Date(input.testDate):new Date()},${input.testedById},${wo.supervisorId},${input.testMethod.trim()},${Math.max(Number(input.machineRunMinutes||0),0)},${input.result},${input.observations?.trim()||null},${input.productionTrialBatchId||null},${conditionalApproved?new Date():null},${input.remarks?.trim()||null},NOW(),NOW())`; const status=input.result==="FAIL"?"IN_PROGRESS":"TESTED"; await tx`UPDATE "MaintenanceWorkOrder" SET status=${status},"testResult"=${input.result},"updatedAt"=NOW() WHERE id=${input.workOrderId}`; await tx`UPDATE "Asset" SET status=${input.result==="FAIL"?'UNDER_MAINTENANCE':'ACTIVE'},"updatedAt"=NOW() WHERE id=${wo.assetId}`; await tx`INSERT INTO "MaintenanceWorkLog" (id,"workOrderId","technicianId","eventType","eventDateTime",notes,"createdAt") VALUES (${randomUUID()},${input.workOrderId},${input.testedById},'TEST_COMPLETED',NOW(),${`${input.result}: ${input.observations?.trim()||input.testMethod.trim()}`},NOW())`; return {id,result:input.result,status,conditionalApproved};}).then(async result=>{await audit(input.testedById,"TEST_WORK_ORDER",input.workOrderId,result);return result;});
}
