/*
  Warnings:

  - You are about to drop the `integration_event` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `artist` ADD COLUMN `audit_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `show_session` ADD COLUMN `bill_hours` INTEGER NULL,
    ADD COLUMN `rounding_minutes` INTEGER NULL,
    ADD COLUMN `unit_price` DECIMAL(10, 2) NULL;

-- DropTable
DROP TABLE `integration_event`;

-- CreateTable
CREATE TABLE `room` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `room_no` VARCHAR(32) NOT NULL,
    `room_name` VARCHAR(64) NULL,
    `room_type_id` INTEGER NOT NULL,
    `capacity` INTEGER NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'FREE',
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_store_id_status_idx`(`store_id`, `status`),
    UNIQUE INDEX `room_store_id_room_no_key`(`store_id`, `room_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `config_key` VARCHAR(64) NOT NULL,
    `config_value` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_config_store_id_config_key_key`(`store_id`, `config_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `openapi_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NULL,
    `event_type` VARCHAR(32) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `last_error` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_at` DATETIME(3) NULL,

    INDEX `openapi_event_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `artist_store_id_audit_status_idx` ON `artist`(`store_id`, `audit_status`);

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
