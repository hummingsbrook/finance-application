-- CreateEnum
CREATE TYPE "EventContributionType" AS ENUM ('MONEY', 'IN_KIND');

-- CreateEnum
CREATE TYPE "InKindCategory" AS ENUM ('FOOD', 'CLOTHES', 'SUPPLIES', 'OTHERS');

-- CreateEnum
CREATE TYPE "EventMoneyPurpose" AS ENUM ('TITHE', 'OFFERING');

-- CreateEnum
CREATE TYPE "ChurchEventType" AS ENUM ('NEW_YEAR', 'GOOD_FRIDAY', 'EASTER_SUNDAY', 'EASTER_MONDAY', 'CHRISTMAS', 'BOXING_DAY', 'THANKSGIVING_SUNDAY', 'CHURCH_ANNIVERSARY', 'HARVEST_FESTIVAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "event_contributions" (
    "id" TEXT NOT NULL,
    "contributorName" TEXT NOT NULL,
    "contributionType" "EventContributionType" NOT NULL,
    "purpose" "EventMoneyPurpose",
    "amount" DECIMAL(12,2),
    "paymentMethod" "PaymentMethod",
    "mpesaReceiptNo" TEXT,
    "bankName" TEXT,
    "accountNo" TEXT,
    "idNumber" TEXT,
    "inKindCategory" "InKindCategory",
    "inKindDescription" TEXT,
    "inKindOtherType" TEXT,
    "eventType" "ChurchEventType" NOT NULL DEFAULT 'CUSTOM',
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "programmeTeam" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_contributions_eventDate_idx" ON "event_contributions"("eventDate");

-- CreateIndex
CREATE INDEX "event_contributions_eventType_idx" ON "event_contributions"("eventType");

-- CreateIndex
CREATE INDEX "event_contributions_contributionType_idx" ON "event_contributions"("contributionType");

-- AddForeignKey
ALTER TABLE "event_contributions"
  ADD CONSTRAINT "event_contributions_recordedBy_fkey"
  FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
