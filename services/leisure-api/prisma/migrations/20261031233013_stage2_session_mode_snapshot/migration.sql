-- AlterTable
ALTER TABLE `show_session` ADD COLUMN `fee_mode` VARCHAR(8) NULL,
    ADD COLUMN `rounding_enabled` BOOLEAN NULL;
