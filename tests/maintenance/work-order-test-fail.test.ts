import assert from "node:assert/strict";
import { after, test } from "node:test";
import { assignMaintenanceWorkOrder, completeMaintenanceWorkOrder, getWorkOrderById } from "@/services/maintenance/maintenance.service";
import { testWorkOrder } from "@/services/maintenance/work-execution.service";
import { closeTestDatabase, createMaintenanceTestContext } from "./_helpers";
after(closeTestDatabase);
test("failed machine test returns completed repair to in progress",async()=>{const c=await createMaintenanceTestContext();await assignMaintenanceWorkOrder({id:c.workOrderId,assignedTechnicianId:c.secondUserId,supervisorId:c.adminUserId,startNow:true,performedById:c.adminUserId});await completeMaintenanceWorkOrder({id:c.workOrderId,diagnosis:"Bearing noise",correctiveAction:"Bearing replaced",completedById:c.secondUserId});await testWorkOrder({workOrderId:c.workOrderId,testedById:c.adminUserId,testMethod:"Run under load",result:"FAIL",observations:"Noise remains"});assert.equal((await getWorkOrderById(c.workOrderId))?.status,"IN_PROGRESS");});
