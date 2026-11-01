-- AlterTable
ALTER TABLE `show_session` ADD COLUMN `room_session_id` INTEGER NULL,
    ADD COLUMN `settled_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `room_session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `room_id` INTEGER NOT NULL,
    `room_no` VARCHAR(32) NOT NULL,
    `opened_by` INTEGER NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    `room_fee` DECIMAL(10, 2) NULL,
    `order_total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(10, 2) NULL,
    `settle_type` VARCHAR(16) NULL,
    `fee_deduct_amount` DECIMAL(10, 2) NULL,
    `closed_by` INTEGER NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    INDEX `room_session_store_id_business_date_idx`(`store_id`, `business_date`),
    INDEX `room_session_room_id_status_idx`(`room_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_session_artist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `left_at` DATETIME(3) NULL,

    INDEX `room_session_artist_session_id_idx`(`session_id`),
    INDEX `room_session_artist_artist_id_joined_at_idx`(`artist_id`, `joined_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `self_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `session_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `items` JSON NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PLACED',
    `placed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `delivered_at` DATETIME(3) NULL,
    `settled_at` DATETIME(3) NULL,
    `remark` VARCHAR(255) NULL,

    INDEX `self_order_session_id_idx`(`session_id`),
    INDEX `self_order_artist_id_business_date_idx`(`artist_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `category` VARCHAR(32) NULL,
    `unit` VARCHAR(16) NULL,
    `sale_price` DECIMAL(10, 2) NOT NULL,
    `on_sale` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `goods_store_id_name_deleted_at_key`(`store_id`, `name`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `show_session` ADD CONSTRAINT `show_session_room_session_id_fkey` FOREIGN KEY (`room_session_id`) REFERENCES `room_session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_session` ADD CONSTRAINT `room_session_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_session_artist` ADD CONSTRAINT `room_session_artist_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `room_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_session_artist` ADD CONSTRAINT `room_session_artist_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `self_order` ADD CONSTRAINT `self_order_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `room_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `self_order` ADD CONSTRAINT `self_order_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
