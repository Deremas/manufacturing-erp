ALTER TABLE "ShiftAttendance" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ShiftAttendance" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

ALTER TABLE "ShiftSession" DROP CONSTRAINT IF EXISTS "ShiftSession_primaryMachineId_fkey";
ALTER TABLE "ShiftSession" DROP COLUMN IF EXISTS "primaryMachineId";
