import { sql } from "@/lib/db";

async function main() {
  const migrationTable = await sql<Array<{ name: string }>>`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = current_schema() AND tablename = '_prisma_migrations'
  `;
  const columns = await sql<Array<{ tableName: string; columnName: string }>>`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND (
        (table_name = 'ProductionDowntime' AND column_name IN ('downtimeNo', 'reasonId', 'updatedAt'))
        OR (table_name = 'MaintenanceWorkOrder' AND column_name IN ('createdById', 'productionDowntimeId'))
        OR (table_name = 'AssetAssignment' AND column_name = 'status')
      )
    ORDER BY table_name, column_name
  `;
  const tables = await sql<Array<{ tableName: string }>>`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN ('AssetHistory', 'MaintenanceSpareRequest', 'MaintenanceWorkSession', 'DowntimeCategory', 'QCNonconformity')
    ORDER BY table_name
  `;
  const expectedTables = ["StockTransfer","PurchaseRequisition","GoodsReceipt","Account","BOM","AssetCategory","AssetAssignment","AssetTransfer","AssetMeterReading","AssetHistory","BankReconciliation","BankTransfer","AssetReceipt","ProductionMachineAssignment","ProductionBatchStage","QCDisposition","ProductionStage","QCTestType","QCTestTemplate","QCTask","QCTestResult","UserDepartment","ApprovalPolicy"];
  const actualTables=await sql<Array<{tableName:string}>>`SELECT table_name AS "tableName" FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY(${expectedTables})`;
  const expectedColumns:Array<[string,string]>=[["Asset","isProductionAsset"],["ProductionDowntime","assetId"],["ProductionMaterialIssueItem","sourceLotNo"],["ProductionDowntime","productionBatchStageId"],["QCDisposition","unitCost"],["QCHoldRelease","holdCategory"],["QCNonconformity","reinspectionTaskId"],["ProductionBatch","sourceBatchId"],["MaintenanceWorkOrderPart","unresolvedQty"],["AssetAssignment","checkedById"],["MaintenanceTicket","checkedById"]];
  const actualColumns=await sql<Array<{tableName:string;columnName:string}>>`SELECT table_name AS "tableName",column_name AS "columnName" FROM information_schema.columns WHERE table_schema=current_schema()`;
  const actualTableSet=new Set(actualTables.map(row=>row.tableName)); const actualColumnSet=new Set(actualColumns.map(row=>`${row.tableName}.${row.columnName}`));
  console.log(JSON.stringify({ migrationTable, columns, tables, missingBaselineTables:expectedTables.filter(name=>!actualTableSet.has(name)),missingBaselineColumns:expectedColumns.map(([table,column])=>`${table}.${column}`).filter(key=>!actualColumnSet.has(key)) }, null, 2));
}

main().finally(() => sql.end());
