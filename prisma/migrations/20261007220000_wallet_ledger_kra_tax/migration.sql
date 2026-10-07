-- Wallet activity ledger, KRA withholding-tax records, deposit kind, worker KRA PIN
-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('DEPOSIT', 'BOOKING_PAYMENT', 'REFUND', 'RELEASE', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL');

-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'DEPOSIT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "whtAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "kraPin" TEXT;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "bookingId" TEXT,
    "paymentId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxWithholding" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "gross" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "whtRate" DOUBLE PRECISION NOT NULL,
    "whtAmount" DOUBLE PRECISION NOT NULL,
    "net" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxWithholding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_kind_createdAt_idx" ON "LedgerEntry"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxWithholding_bookingId_key" ON "TaxWithholding"("bookingId");

-- CreateIndex
CREATE INDEX "TaxWithholding_workerId_createdAt_idx" ON "TaxWithholding"("workerId", "createdAt");

-- CreateIndex
CREATE INDEX "TaxWithholding_period_idx" ON "TaxWithholding"("period");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxWithholding" ADD CONSTRAINT "TaxWithholding_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

