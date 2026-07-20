-- CreateTable: users
CREATE TABLE `users` (
  `id`                   VARCHAR(191) NOT NULL,
  `email`                VARCHAR(191) NOT NULL,
  `passwordHash`         VARCHAR(191) NOT NULL,
  `firstName`            VARCHAR(191) NOT NULL,
  `lastName`             VARCHAR(191) NOT NULL,
  `phone`                VARCHAR(191) NULL,
  `role`                 ENUM('MANAGER', 'SUPER_ADMIN') NOT NULL DEFAULT 'MANAGER',
  `isActive`             BOOLEAN NOT NULL DEFAULT true,
  `lastLoginAt`          DATETIME(3) NULL,
  `createdAt`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3) NOT NULL,
  `passwordResetToken`   VARCHAR(191) NULL,
  `passwordResetExpiry`  DATETIME(3) NULL,
  `failedLoginAttempts`  INTEGER NOT NULL DEFAULT 0,
  `lockedUntil`          DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key` (`email`),
  UNIQUE INDEX `users_passwordResetToken_key` (`passwordResetToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: tithes
CREATE TABLE `tithes` (
  `id`              VARCHAR(191) NOT NULL,
  `contributorName` VARCHAR(191) NOT NULL,
  `amount`          DECIMAL(12, 2) NOT NULL,
  `date`            DATETIME(3) NOT NULL,
  `paymentMethod`   ENUM('CASH', 'MPESA', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `mpesaReceiptNo`  VARCHAR(191) NULL,
  `bankName`        VARCHAR(191) NULL,
  `chequeNumber`    VARCHAR(191) NULL,
  `idNumber`        VARCHAR(191) NULL,
  `notes`           VARCHAR(191) NULL,
  `status`          ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'CONFIRMED',
  `recordedBy`      VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: offerings
CREATE TABLE `offerings` (
  `id`              VARCHAR(191) NOT NULL,
  `contributorName` VARCHAR(191) NOT NULL,
  `amount`          DECIMAL(12, 2) NOT NULL,
  `date`            DATETIME(3) NOT NULL,
  `serviceType`     VARCHAR(191) NOT NULL,
  `paymentMethod`   ENUM('CASH', 'MPESA', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `mpesaReceiptNo`  VARCHAR(191) NULL,
  `bankName`        VARCHAR(191) NULL,
  `chequeNumber`    VARCHAR(191) NULL,
  `idNumber`        VARCHAR(191) NULL,
  `notes`           VARCHAR(191) NULL,
  `status`          ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'CONFIRMED',
  `recordedBy`      VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: expenses
CREATE TABLE `expenses` (
  `id`              VARCHAR(191) NOT NULL,
  `description`     VARCHAR(191) NOT NULL,
  `amount`          DECIMAL(12, 2) NOT NULL,
  `date`            DATETIME(3) NOT NULL,
  `category`        ENUM('SALARIES', 'UTILITIES', 'MAINTENANCE', 'EVENTS', 'TRANSPORT', 'SUPPLIES', 'MISCELLANEOUS') NOT NULL,
  `paymentMethod`   ENUM('CASH', 'MPESA', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `recipientName`   VARCHAR(191) NULL,
  `mpesaReceiptNo`  VARCHAR(191) NULL,
  `bankName`        VARCHAR(191) NULL,
  `accountNo`       VARCHAR(191) NULL,
  `idNumber`        VARCHAR(191) NULL,
  `notes`           VARCHAR(191) NULL,
  `status`          ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'CONFIRMED',
  `recordedBy`      VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: harambees
CREATE TABLE `harambees` (
  `id`            VARCHAR(191) NOT NULL,
  `title`         VARCHAR(191) NOT NULL,
  `description`   VARCHAR(191) NULL,
  `targetAmount`  DECIMAL(14, 2) NOT NULL,
  `currentAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `deadline`      DATETIME(3) NULL,
  `status`        ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `createdBy`     VARCHAR(191) NOT NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: harambee_contributions
CREATE TABLE `harambee_contributions` (
  `id`              VARCHAR(191) NOT NULL,
  `harambeeId`      VARCHAR(191) NOT NULL,
  `contributorName` VARCHAR(191) NOT NULL,
  `amount`          DECIMAL(12, 2) NOT NULL,
  `date`            DATETIME(3) NOT NULL,
  `paymentMethod`   ENUM('CASH', 'MPESA', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  `mpesaReceiptNo`  VARCHAR(191) NULL,
  `bankName`        VARCHAR(191) NULL,
  `chequeNumber`    VARCHAR(191) NULL,
  `notes`           VARCHAR(191) NULL,
  `recordedBy`      VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: church_services
CREATE TABLE `church_services` (
  `id`              VARCHAR(191) NOT NULL,
  `name`            VARCHAR(191) NOT NULL,
  `dayOfWeek`       VARCHAR(191) NOT NULL,
  `time`            VARCHAR(191) NOT NULL,
  `serviceDate`     DATETIME(3) NULL,
  `topic`           VARCHAR(191) NULL,
  `speaker`         VARCHAR(191) NULL,
  `programmer`      VARCHAR(191) NULL,
  `leadMinistrant`  VARCHAR(191) NULL,
  `reader`          VARCHAR(191) NULL,
  `notes`           VARCHAR(191) NULL,
  `status`          ENUM('SCHEDULED', 'INCOMPLETE', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  `isActive`        BOOLEAN NOT NULL DEFAULT true,
  `createdBy`       VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: audit_logs
CREATE TABLE `audit_logs` (
  `id`          VARCHAR(191) NOT NULL,
  `userId`      VARCHAR(191) NOT NULL,
  `action`      ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE') NOT NULL,
  `module`      VARCHAR(191) NOT NULL,
  `recordId`    VARCHAR(191) NULL,
  `details`     TEXT NULL,
  `ipAddress`   VARCHAR(191) NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: tithes -> users
ALTER TABLE `tithes` ADD CONSTRAINT `tithes_recordedBy_fkey`
  FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: offerings -> users
ALTER TABLE `offerings` ADD CONSTRAINT `offerings_recordedBy_fkey`
  FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: expenses -> users
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_recordedBy_fkey`
  FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: harambees -> users
ALTER TABLE `harambees` ADD CONSTRAINT `harambees_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: harambee_contributions -> harambees
ALTER TABLE `harambee_contributions` ADD CONSTRAINT `harambee_contributions_harambeeId_fkey`
  FOREIGN KEY (`harambeeId`) REFERENCES `harambees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: harambee_contributions -> users
ALTER TABLE `harambee_contributions` ADD CONSTRAINT `harambee_contributions_recordedBy_fkey`
  FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: church_services -> users
ALTER TABLE `church_services` ADD CONSTRAINT `church_services_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: audit_logs -> users
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
