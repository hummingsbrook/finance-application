-- Create Migration: security_fixes
-- FIXED: C-3 + H-2 — adds single-use password reset token storage and
-- account-lockout counters to the `users` table.
--
-- Generated for MySQL. For SQLite-based test environments, run
-- `npx prisma db push` against schema.sqlite.prisma instead (see
-- TEST_README.md).

-- C-3: single-use password reset token (stored as SHA-256 hash) + expiry
ALTER TABLE `users` ADD COLUMN `passwordResetToken` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `passwordResetExpiry` DATETIME(3) NULL;

-- H-2: account lockout after repeated failed logins
ALTER TABLE `users` ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `lockedUntil` DATETIME(3) NULL;

-- C-3: token hash lookups must be unique & indexed
CREATE UNIQUE INDEX `users_passwordResetToken_key` ON `users`(`passwordResetToken`);
