-- AlterTable
ALTER TABLE "User" ADD COLUMN     "daysInMonth" INTEGER DEFAULT 30,
ADD COLUMN     "hoursPerDay" DOUBLE PRECISION DEFAULT 8.0,
ADD COLUMN     "payrollPolicyId" TEXT;

-- CreateTable
CREATE TABLE "PayrollPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Régimen General 728',
    "daysInMonth" INTEGER NOT NULL DEFAULT 30,
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "overtimeFirst2HoursRate" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "overtimeNextHoursRate" DOUBLE PRECISION NOT NULL DEFAULT 1.35,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPolicy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_payrollPolicyId_fkey" FOREIGN KEY ("payrollPolicyId") REFERENCES "PayrollPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPolicy" ADD CONSTRAINT "PayrollPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
