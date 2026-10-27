# Prisma Drift Reconciliation

This repo had a historical schema drift that blocked normal `npm run db:push`.

## Current blockers that were reproduced on July 3, 2026

`npm run db:push` reported:

- dropping `BankAccount.accountType`
- dropping `GoodsReceipt.locationId`
- recreating the inventory document `status` columns on:
  - `StockTransfer`
  - `StockAdjustment`
  - `StockIssue`
  - `StockReturn`
  - `StoreRequisition`

## Safe reconciliation applied in code

To keep future schema pushes safe and non-destructive:

1. `BankAccount.accountType` was restored as an optional schema field.
2. `GoodsReceipt.receivingLocationId` now maps to the existing DB column:
   - `@map("locationId")`
3. Inventory document status fields were normalized back to string columns in Prisma, matching the live database shape that the raw SQL services already use.

## Why this path

The app’s inventory and procurement document services already use string status values in SQL (`'DRAFT'`, `'APPROVED'`, `'POSTED'`, etc.). Matching Prisma to the live database avoids destructive push warnings without changing the operational service layer.

## Next follow-up if we want stronger Prisma typing later

If we want true enum-backed Prisma status fields later, do it as an explicit migration:

1. Create new enum types in PostgreSQL.
2. Backfill existing string status values into enum-safe values.
3. Alter each table column with a guarded migration.
4. Only then switch the Prisma fields back from `String` to enum types.

That should be done as a deliberate migration step, not through blind `db push --accept-data-loss`.
