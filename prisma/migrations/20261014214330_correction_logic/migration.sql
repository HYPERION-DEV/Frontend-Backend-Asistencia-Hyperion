/*
  Warnings:

  - You are about to drop the column `daysInMonth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hoursPerDay` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `overtimeRate` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "daysInMonth",
DROP COLUMN "hoursPerDay",
DROP COLUMN "overtimeRate";
