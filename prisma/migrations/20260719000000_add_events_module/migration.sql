-- CreateTable
CREATE TABLE `event_contributions` (
  `id` VARCHAR(191) NOT NULL,
  `contributorName` VARCHAR(191) NOT NULL,
  `contributionType` ENUM('MONEY', 'IN_KIND') NOT NULL,
  `amount` DECIMAL(12, 2) NULL,
  `paymentMethod` ENUM('CASH', 'MPESA', 'BANK_TRANSFER') NULL,
  `mpesaReceiptNo` VARCHAR(191) NULL,
  `bankName` VARCHAR(191) NULL,
  `accountNo` VARCHAR(191) NULL,
  `idNumber` VARCHAR(191) NULL,
  `inKindCategory` ENUM('FOOD', 'CLOTHES', 'SUPPLIES', 'OTHERS') NULL,
  `inKindDescription` TEXT NULL,
  `inKindOtherType` VARCHAR(191) NULL,
  `eventType` ENUM('NEW_YEAR', 'GOOD_FRIDAY', 'EASTER_SUNDAY', 'EASTER_MONDAY', 'CHRISTMAS', 'BOXING_DAY', 'THANKSGIVING_SUNDAY', 'CHURCH_ANNIVERSARY', 'HARVEST_FESTIVAL', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
  `eventName` VARCHAR(191) NOT NULL,
  `eventDate` DATETIME(3) NOT NULL,
  `programmeTeam` TEXT NULL,
  `notes` VARCHAR(191) NULL,
  `recordedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `event_contributions_eventDate_idx`(`eventDate`),
  INDEX `event_contributions_eventType_idx`(`eventType`),
  INDEX `event_contributions_contributionType_idx`(`contributionType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_contributions` ADD CONSTRAINT `event_contributions_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
