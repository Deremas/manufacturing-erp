import assert from "node:assert/strict";
import { after, test } from "node:test";
import { checkInTechnician, transitionTechnicianSession } from "@/services/maintenance/work-execution.service";
import { assignMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";
import { closeTestDatabase, createMaintenanceTestContext } from "./_helpers";
after(closeTestDatabase);
test("technician check-in prevents overlapping active sessions and records checkout labor",async()=>{const c=await createMaintenanceTestContext();await assignMaintenanceWorkOrder({id:c.workOrderId,assignedTechnicianId:c.secondUserId,supervisorId:c.adminUserId,performedById:c.adminUserId});const session=await checkInTechnician({workOrderId:c.workOrderId,technicianId:c.secondUserId});assert.equal(session.status,"ACTIVE");await assert.rejects(checkInTechnician({workOrderId:c.workOrderId,technicianId:c.secondUserId}),/active maintenance session/i);const checkout=await transitionTechnicianSession({workOrderId:c.workOrderId,technicianId:c.secondUserId,action:"check-out"});assert.equal(checkout.status,"COMPLETED");assert.ok(Number(checkout.laborMinutes)>=0);});
