-- AlterTable: add salaryType column to expenses
-- FIXED: replaced PostgreSQL-specific CREATE TYPE ... AS ENUM syntax with
-- MySQL/TiDB inline ENUM syntax. The original migration used double-quoted
-- identifiers and CREATE TYPE, which are not supported by MySQL or TiDB.
ALTER TABLE `expenses` ADD COLUMN `salaryType` ENUM('PASTOR', 'CARETAKER', 'SECURITY_OFFICER') NULL;
