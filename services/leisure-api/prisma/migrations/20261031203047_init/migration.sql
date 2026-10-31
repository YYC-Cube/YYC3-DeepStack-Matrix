-- CreateTable
CREATE TABLE `store` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(64) NULL,
    `business_day_cut_time` VARCHAR(5) NOT NULL DEFAULT '08:00',
    `external_id` VARCHAR(64) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_external_id_key`(`external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `name` VARCHAR(32) NOT NULL,
    `external_id` VARCHAR(64) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `room_type_store_id_name_key`(`store_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `supervisor_name` VARCHAR(64) NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `artist_group_store_id_name_deleted_at_key`(`store_id`, `name`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_level` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `artist_level_store_id_name_deleted_at_key`(`store_id`, `name`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `group_id` INTEGER NULL,
    `supervisor_name` VARCHAR(64) NULL,
    `level_id` INTEGER NULL,
    `real_name` VARCHAR(64) NOT NULL,
    `stage_name` VARCHAR(64) NULL,
    `gender` INTEGER NOT NULL DEFAULT 1,
    `phone` VARCHAR(20) NULL,
    `badge_no` VARCHAR(32) NULL,
    `id_card_no_enc` LONGBLOB NULL,
    `id_card_img_key` VARCHAR(255) NULL,
    `avatar_keys` JSON NULL,
    `tags` JSON NULL,
    `performance_target` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `max_total_shows` INTEGER NOT NULL DEFAULT 0,
    `max_cross_rooms` INTEGER NOT NULL DEFAULT 0,
    `first_show_min_minutes` INTEGER NOT NULL DEFAULT 0,
    `same_room_min_minutes` INTEGER NOT NULL DEFAULT 0,
    `work_start_mode` VARCHAR(8) NOT NULL DEFAULT 'FREE',
    `work_start` VARCHAR(5) NULL,
    `work_end_mode` VARCHAR(8) NOT NULL DEFAULT 'FREE',
    `work_end` VARCHAR(5) NULL,
    `tip_fixed` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `hourly_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `wechat_openid` VARCHAR(64) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `artist_wechat_openid_key`(`wechat_openid`),
    INDEX `artist_store_id_stage_name_idx`(`store_id`, `stage_name`),
    INDEX `artist_store_id_group_id_idx`(`store_id`, `group_id`),
    UNIQUE INDEX `artist_store_id_badge_no_key`(`store_id`, `badge_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wechat_bind_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `openid` VARCHAR(64) NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `store_id` INTEGER NOT NULL,
    `action` VARCHAR(16) NOT NULL,
    `prev_store_id` INTEGER NULL,
    `prev_artist_id` INTEGER NULL,
    `mode` VARCHAR(8) NOT NULL,
    `operator_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wechat_bind_log_openid_idx`(`openid`),
    INDEX `wechat_bind_log_artist_id_idx`(`artist_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_workorder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `openid` VARCHAR(64) NOT NULL,
    `from_store_id` INTEGER NOT NULL,
    `from_artist_id` INTEGER NOT NULL,
    `to_store_id` INTEGER NOT NULL,
    `to_badge_no` VARCHAR(32) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `payload` JSON NULL,
    `created_by` INTEGER NOT NULL,
    `decided_by` INTEGER NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transfer_workorder_status_idx`(`status`),
    INDEX `transfer_workorder_openid_idx`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `group_id` INTEGER NULL,
    `supervisor_name` VARCHAR(64) NULL,
    `type` VARCHAR(16) NOT NULL,
    `report_time` DATETIME(3) NOT NULL,
    `checkin_lat` DECIMAL(10, 6) NULL,
    `checkin_lng` DECIMAL(10, 6) NULL,
    `checkin_geo_ok` BOOLEAN NOT NULL DEFAULT true,
    `checkout_time` DATETIME(3) NULL,
    `checkout_lat` DECIMAL(10, 6) NULL,
    `checkout_lng` DECIMAL(10, 6) NULL,
    `source` INTEGER NOT NULL DEFAULT 0,
    `operator_id` INTEGER NULL,
    `remark` VARCHAR(255) NULL,

    INDEX `attendance_report_store_id_business_date_idx`(`store_id`, `business_date`),
    INDEX `attendance_report_artist_id_business_date_idx`(`artist_id`, `business_date`),
    INDEX `attendance_report_store_id_group_id_type_business_date_idx`(`store_id`, `group_id`, `type`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `show_session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `room_type_id` INTEGER NULL,
    `room_name` VARCHAR(64) NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `duration_minutes` INTEGER NULL,
    `is_cross` BOOLEAN NOT NULL DEFAULT false,
    `fee_amount` DECIMAL(10, 2) NULL,
    `fee_rule_id` INTEGER NULL,
    `bill_no` VARCHAR(64) NULL,
    `operator_id` INTEGER NULL,

    INDEX `show_session_store_id_business_date_idx`(`store_id`, `business_date`),
    INDEX `show_session_artist_id_start_at_idx`(`artist_id`, `start_at`),
    INDEX `show_session_store_id_room_id_start_at_idx`(`store_id`, `room_id`, `start_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stage_fee_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `level_id` INTEGER NOT NULL,
    `room_type_ids` JSON NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `stage_fee_rule_store_id_level_id_idx`(`store_id`, `level_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stage_fee_txn` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `stage_name` VARCHAR(64) NULL,
    `badge_no` VARCHAR(32) NULL,
    `group_id` INTEGER NULL,
    `type` VARCHAR(16) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `pay_channel` VARCHAR(16) NULL,
    `pay_txn_no` VARCHAR(64) NULL,
    `ref_type` VARCHAR(16) NULL,
    `ref_id` INTEGER NULL,
    `remark` VARCHAR(255) NULL,
    `approval_id` INTEGER NULL,
    `operator_id` INTEGER NULL,
    `operator_name` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stage_fee_txn_store_id_business_date_idx`(`store_id`, `business_date`),
    INDEX `stage_fee_txn_artist_id_business_date_idx`(`artist_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pay_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `channel` VARCHAR(16) NOT NULL,
    `out_trade_no` VARCHAR(64) NOT NULL,
    `channel_trade_no` VARCHAR(64) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'CREATED',
    `artist_id` INTEGER NULL,
    `biz_type` VARCHAR(16) NULL,
    `biz_ref_id` INTEGER NULL,
    `raw_notify` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,

    UNIQUE INDEX `pay_order_out_trade_no_key`(`out_trade_no`),
    UNIQUE INDEX `pay_order_channel_trade_no_key`(`channel_trade_no`),
    INDEX `pay_order_store_id_business_date_idx`(`store_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `biz_type` VARCHAR(16) NOT NULL,
    `biz_payload` JSON NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `applicant_id` INTEGER NOT NULL,
    `approver_id` INTEGER NULL,
    `decided_at` DATETIME(3) NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `approval_store_id_status_idx`(`store_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `valid_days` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_txn` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `type` VARCHAR(16) NOT NULL,
    `ticket_rule_id` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `pay_channel` VARCHAR(16) NULL,
    `ref_session_id` INTEGER NULL,
    `operator_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_txn_store_id_business_date_idx`(`store_id`, `business_date`),
    INDEX `ticket_txn_artist_id_business_date_idx`(`artist_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NULL,
    `order_no` VARCHAR(64) NOT NULL,
    `order_type` VARCHAR(32) NULL,
    `pay_status` VARCHAR(16) NULL,
    `pay_type` VARCHAR(16) NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paid_at` DATETIME(3) NULL,
    `room_name` VARCHAR(64) NULL,
    `external_id` VARCHAR(64) NULL,

    UNIQUE INDEX `artist_order_external_id_key`(`external_id`),
    INDEX `artist_order_store_id_business_date_idx`(`store_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `review_type` VARCHAR(32) NULL,
    `score` INTEGER NULL,
    `content` VARCHAR(500) NULL,
    `reviewer` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `artist_review_artist_id_business_date_idx`(`artist_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `booking_no` VARCHAR(32) NOT NULL,
    `booking_time` DATETIME(3) NULL,
    `room_id` INTEGER NULL,
    `room_name` VARCHAR(64) NULL,
    `group_id` INTEGER NULL,
    `artist_id` INTEGER NULL,
    `artist_name` VARCHAR(64) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'BOOKED',

    INDEX `artist_booking_store_id_business_date_idx`(`store_id`, `business_date`),
    UNIQUE INDEX `artist_booking_store_id_booking_no_key`(`store_id`, `booking_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `showcase_cast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `group_id` INTEGER NULL,
    `artist_id` INTEGER NOT NULL,
    `cast_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,

    INDEX `showcase_cast_store_id_ended_at_idx`(`store_id`, `ended_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NULL,
    `name` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(128) NOT NULL,
    `role_id` INTEGER NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_user_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NULL,
    `name` VARCHAR(64) NOT NULL,
    `perm_codes` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_store` (
    `role_id` INTEGER NOT NULL,
    `store_id` INTEGER NOT NULL,

    PRIMARY KEY (`role_id`, `store_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NULL,
    `actor_id` INTEGER NULL,
    `actor_name` VARCHAR(64) NULL,
    `action` VARCHAR(64) NOT NULL,
    `target_type` VARCHAR(32) NULL,
    `target_id` VARCHAR(64) NULL,
    `before_json` JSON NULL,
    `after_json` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `ua` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_store_id_created_at_idx`(`store_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `idem_key` VARCHAR(80) NOT NULL,
    `path` VARCHAR(128) NOT NULL,
    `response_snapshot` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idempotency_keys_created_at_idx`(`created_at`),
    UNIQUE INDEX `idempotency_keys_store_id_idem_key_path_key`(`store_id`, `idem_key`, `path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NULL,
    `event_type` VARCHAR(32) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `last_error` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_at` DATETIME(3) NULL,

    INDEX `integration_event_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_summary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_id` INTEGER NOT NULL,
    `business_date` DATE NOT NULL,
    `metrics` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_summary_store_id_business_date_key`(`store_id`, `business_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_run_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_name` VARCHAR(64) NOT NULL,
    `business_date` DATE NULL,
    `status` VARCHAR(16) NOT NULL,
    `stats` JSON NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `error` VARCHAR(1000) NULL,

    INDEX `job_run_log_job_name_started_at_idx`(`job_name`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_type` ADD CONSTRAINT `room_type_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_group` ADD CONSTRAINT `artist_group_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_level` ADD CONSTRAINT `artist_level_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist` ADD CONSTRAINT `artist_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist` ADD CONSTRAINT `artist_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `artist_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist` ADD CONSTRAINT `artist_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `artist_level`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_report` ADD CONSTRAINT `attendance_report_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `show_session` ADD CONSTRAINT `show_session_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stage_fee_rule` ADD CONSTRAINT `stage_fee_rule_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stage_fee_txn` ADD CONSTRAINT `stage_fee_txn_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_rule` ADD CONSTRAINT `ticket_rule_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_txn` ADD CONSTRAINT `ticket_txn_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_review` ADD CONSTRAINT `artist_review_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `artist_booking` ADD CONSTRAINT `artist_booking_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showcase_cast` ADD CONSTRAINT `showcase_cast_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_user` ADD CONSTRAINT `admin_user_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_store` ADD CONSTRAINT `role_store_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
