-- AlterTable
ALTER TABLE `show_session` ADD COLUMN `price_slot_name` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `pricing_slot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `room_type_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `days_of_week` JSON NULL,
    `date_from` DATE NULL,
    `date_to` DATE NULL,
    `start_clock` VARCHAR(5) NOT NULL,
    `end_clock` VARCHAR(5) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `deleted_at` DATETIME(3) NULL,

    INDEX `pricing_slot_store_id_room_type_id_status_idx`(`store_id`, `room_type_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_call` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `room_id` INTEGER NOT NULL,
    `room_no` VARCHAR(32) NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `stage_name` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
    `called_at` DATETIME(3) NULL,
    `voice_text` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_call_store_id_business_date_status_idx`(`store_id`, `business_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recon_diff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `metric` VARCHAR(32) NOT NULL,
    `self_value` DECIMAL(12, 2) NOT NULL,
    `legacy_value` DECIMAL(12, 2) NOT NULL,
    `diff` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recon_diff_store_id_business_date_metric_key`(`store_id`, `business_date`, `metric`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pricing_slot` ADD CONSTRAINT `pricing_slot_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
