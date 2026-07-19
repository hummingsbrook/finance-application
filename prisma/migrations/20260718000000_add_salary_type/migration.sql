-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('PASTOR', 'CARETAKER', 'SECURITY_OFFICER');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "salaryType" "SalaryType" NULL;
