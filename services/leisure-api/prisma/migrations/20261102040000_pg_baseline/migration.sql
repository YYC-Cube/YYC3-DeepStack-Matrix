-- CreateTable
CREATE TABLE "store" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "address" VARCHAR(255),
    "city" VARCHAR(64),
    "business_day_cut_time" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "external_id" VARCHAR(64),
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(64),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "room_no" VARCHAR(32) NOT NULL,
    "room_name" VARCHAR(64),
    "room_type_id" INTEGER NOT NULL,
    "capacity" INTEGER,
    "status" VARCHAR(16) NOT NULL DEFAULT 'FREE',
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_group" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "supervisor_name" VARCHAR(64),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "artist_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_level" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "artist_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "supervisor_name" VARCHAR(64),
    "level_id" INTEGER,
    "real_name" VARCHAR(64) NOT NULL,
    "stage_name" VARCHAR(64),
    "gender" INTEGER NOT NULL DEFAULT 1,
    "phone" VARCHAR(20),
    "badge_no" VARCHAR(32),
    "id_card_no_enc" BYTEA,
    "id_card_img_key" VARCHAR(255),
    "avatar_keys" JSONB,
    "tags" JSONB,
    "performance_target" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_total_shows" INTEGER NOT NULL DEFAULT 0,
    "max_cross_rooms" INTEGER NOT NULL DEFAULT 0,
    "first_show_min_minutes" INTEGER NOT NULL DEFAULT 0,
    "same_room_min_minutes" INTEGER NOT NULL DEFAULT 0,
    "work_start_mode" VARCHAR(8) NOT NULL DEFAULT 'FREE',
    "work_start" VARCHAR(5),
    "work_end_mode" VARCHAR(8) NOT NULL DEFAULT 'FREE',
    "work_end" VARCHAR(5),
    "tip_fixed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "wechat_openid" VARCHAR(64),
    "status" INTEGER NOT NULL DEFAULT 1,
    "audit_status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wechat_bind_log" (
    "id" SERIAL NOT NULL,
    "openid" VARCHAR(64) NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "prev_store_id" INTEGER,
    "prev_artist_id" INTEGER,
    "mode" VARCHAR(8) NOT NULL,
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wechat_bind_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_workorder" (
    "id" SERIAL NOT NULL,
    "openid" VARCHAR(64) NOT NULL,
    "from_store_id" INTEGER NOT NULL,
    "from_artist_id" INTEGER NOT NULL,
    "to_store_id" INTEGER NOT NULL,
    "to_badge_no" VARCHAR(32),
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "created_by" INTEGER NOT NULL,
    "decided_by" INTEGER,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_workorder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_report" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "supervisor_name" VARCHAR(64),
    "type" VARCHAR(16) NOT NULL,
    "report_time" TIMESTAMP(3) NOT NULL,
    "checkin_lat" DECIMAL(10,6),
    "checkin_lng" DECIMAL(10,6),
    "checkin_geo_ok" BOOLEAN NOT NULL DEFAULT true,
    "checkout_time" TIMESTAMP(3),
    "checkout_lat" DECIMAL(10,6),
    "checkout_lng" DECIMAL(10,6),
    "source" INTEGER NOT NULL DEFAULT 0,
    "operator_id" INTEGER,
    "remark" VARCHAR(255),
    "review_status" VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "attendance_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_log" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "room_session_id" INTEGER,
    "artist_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "supervisor_name" VARCHAR(64),
    "mode" VARCHAR(16) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "suggested" BOOLEAN NOT NULL DEFAULT false,
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(255),
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_session" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "room_type_id" INTEGER,
    "room_name" VARCHAR(64),
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "is_cross" BOOLEAN NOT NULL DEFAULT false,
    "fee_amount" DECIMAL(10,2),
    "fee_rule_id" INTEGER,
    "unit_price" DECIMAL(10,2),
    "bill_hours" INTEGER,
    "rounding_minutes" INTEGER,
    "rounding_enabled" BOOLEAN,
    "fee_mode" VARCHAR(8),
    "price_slot_name" VARCHAR(64),
    "bill_no" VARCHAR(64),
    "operator_id" INTEGER,
    "room_session_id" INTEGER,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "show_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_slot" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "room_type_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "days_of_week" JSONB,
    "date_from" DATE,
    "date_to" DATE,
    "start_clock" VARCHAR(5) NOT NULL,
    "end_clock" VARCHAR(5) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pricing_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_call" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "room_id" INTEGER NOT NULL,
    "room_no" VARCHAR(32) NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "stage_name" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
    "called_at" TIMESTAMP(3),
    "voice_text" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recon_diff" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "metric" VARCHAR(32) NOT NULL,
    "self_value" DECIMAL(12,2) NOT NULL,
    "legacy_value" DECIMAL(12,2) NOT NULL,
    "diff" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "note" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recon_diff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_fee_rule" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "room_type_ids" JSONB NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stage_fee_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_fee_txn" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "stage_name" VARCHAR(64),
    "badge_no" VARCHAR(32),
    "group_id" INTEGER,
    "type" VARCHAR(16) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "pay_channel" VARCHAR(16),
    "pay_txn_no" VARCHAR(64),
    "ref_type" VARCHAR(16),
    "ref_id" INTEGER,
    "remark" VARCHAR(255),
    "approval_id" INTEGER,
    "operator_id" INTEGER,
    "operator_name" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_fee_txn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_order" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "out_trade_no" VARCHAR(64) NOT NULL,
    "channel_trade_no" VARCHAR(64),
    "amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'CREATED',
    "artist_id" INTEGER,
    "biz_type" VARCHAR(16),
    "biz_ref_id" INTEGER,
    "raw_notify" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "pay_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "biz_type" VARCHAR(16) NOT NULL,
    "biz_payload" JSONB NOT NULL,
    "amount" DECIMAL(10,2),
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "applicant_id" INTEGER NOT NULL,
    "approver_id" INTEGER,
    "decided_at" TIMESTAMP(3),
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_rule" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "valid_days" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ticket_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_txn" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "ticket_rule_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pay_channel" VARCHAR(16),
    "ref_session_id" INTEGER,
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_txn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_order" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER,
    "order_no" VARCHAR(64) NOT NULL,
    "order_type" VARCHAR(32),
    "pay_status" VARCHAR(16),
    "pay_type" VARCHAR(16),
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    "room_name" VARCHAR(64),
    "external_id" VARCHAR(64),

    CONSTRAINT "artist_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_review" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "review_type" VARCHAR(32),
    "score" INTEGER,
    "content" VARCHAR(500),
    "reviewer" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_booking" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "booking_no" VARCHAR(32) NOT NULL,
    "booking_time" TIMESTAMP(3),
    "room_id" INTEGER,
    "room_name" VARCHAR(64),
    "group_id" INTEGER,
    "artist_id" INTEGER,
    "artist_name" VARCHAR(64),
    "status" VARCHAR(16) NOT NULL DEFAULT 'BOOKED',

    CONSTRAINT "artist_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_cast" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "group_id" INTEGER,
    "artist_id" INTEGER NOT NULL,
    "cast_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "showcase_cast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER,
    "name" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "username" VARCHAR(32),
    "password_hash" VARCHAR(128) NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "role_id" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 1,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER,
    "name" VARCHAR(64) NOT NULL,
    "perm_codes" JSONB NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_store" (
    "role_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,

    CONSTRAINT "role_store_pkey" PRIMARY KEY ("role_id","store_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER,
    "actor_id" INTEGER,
    "actor_name" VARCHAR(64),
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" VARCHAR(64),
    "before_json" JSONB,
    "after_json" JSONB,
    "ip" VARCHAR(45),
    "ua" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "idem_key" VARCHAR(80) NOT NULL,
    "path" VARCHAR(128) NOT NULL,
    "response_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_config" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "config_key" VARCHAR(64) NOT NULL,
    "config_value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openapi_event" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER,
    "event_type" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "openapi_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summary" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_run_log" (
    "id" SERIAL NOT NULL,
    "job_name" VARCHAR(64) NOT NULL,
    "business_date" DATE,
    "status" VARCHAR(16) NOT NULL,
    "stats" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "error" VARCHAR(1000),

    CONSTRAINT "job_run_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_session" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "room_id" INTEGER NOT NULL,
    "room_no" VARCHAR(32) NOT NULL,
    "opened_by" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "room_fee" DECIMAL(10,2),
    "order_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2),
    "settle_type" VARCHAR(16),
    "fee_deduct_amount" DECIMAL(10,2),
    "closed_by" INTEGER,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "room_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_session_artist" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "room_session_artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_order" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "session_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PLACED',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "remark" VARCHAR(255),

    CONSTRAINT "self_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32),
    "unit" VARCHAR(16),
    "sale_price" DECIMAL(10,2) NOT NULL,
    "on_sale" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_external_id_key" ON "store"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_store_id_name_key" ON "room_type"("store_id", "name");

-- CreateIndex
CREATE INDEX "room_store_id_status_idx" ON "room"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "room_store_id_room_no_key" ON "room"("store_id", "room_no");

-- CreateIndex
CREATE UNIQUE INDEX "artist_group_store_id_name_deleted_at_key" ON "artist_group"("store_id", "name", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "artist_level_store_id_name_deleted_at_key" ON "artist_level"("store_id", "name", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "artist_wechat_openid_key" ON "artist"("wechat_openid");

-- CreateIndex
CREATE INDEX "artist_store_id_stage_name_idx" ON "artist"("store_id", "stage_name");

-- CreateIndex
CREATE INDEX "artist_store_id_group_id_idx" ON "artist"("store_id", "group_id");

-- CreateIndex
CREATE INDEX "artist_store_id_audit_status_idx" ON "artist"("store_id", "audit_status");

-- CreateIndex
CREATE UNIQUE INDEX "artist_store_id_badge_no_key" ON "artist"("store_id", "badge_no");

-- CreateIndex
CREATE INDEX "wechat_bind_log_openid_idx" ON "wechat_bind_log"("openid");

-- CreateIndex
CREATE INDEX "wechat_bind_log_artist_id_idx" ON "wechat_bind_log"("artist_id");

-- CreateIndex
CREATE INDEX "transfer_workorder_status_idx" ON "transfer_workorder"("status");

-- CreateIndex
CREATE INDEX "transfer_workorder_openid_idx" ON "transfer_workorder"("openid");

-- CreateIndex
CREATE INDEX "attendance_report_store_id_business_date_idx" ON "attendance_report"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "attendance_report_artist_id_business_date_idx" ON "attendance_report"("artist_id", "business_date");

-- CreateIndex
CREATE INDEX "attendance_report_store_id_group_id_type_business_date_idx" ON "attendance_report"("store_id", "group_id", "type", "business_date");

-- CreateIndex
CREATE INDEX "attendance_report_store_id_review_status_business_date_idx" ON "attendance_report"("store_id", "review_status", "business_date");

-- CreateIndex
CREATE INDEX "dispatch_log_store_id_business_date_idx" ON "dispatch_log"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "dispatch_log_artist_id_business_date_idx" ON "dispatch_log"("artist_id", "business_date");

-- CreateIndex
CREATE INDEX "show_session_store_id_business_date_idx" ON "show_session"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "show_session_artist_id_start_at_idx" ON "show_session"("artist_id", "start_at");

-- CreateIndex
CREATE INDEX "show_session_store_id_room_id_start_at_idx" ON "show_session"("store_id", "room_id", "start_at");

-- CreateIndex
CREATE INDEX "pricing_slot_store_id_room_type_id_status_idx" ON "pricing_slot"("store_id", "room_type_id", "status");

-- CreateIndex
CREATE INDEX "room_call_store_id_business_date_status_idx" ON "room_call"("store_id", "business_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recon_diff_store_id_business_date_metric_key" ON "recon_diff"("store_id", "business_date", "metric");

-- CreateIndex
CREATE INDEX "stage_fee_rule_store_id_level_id_idx" ON "stage_fee_rule"("store_id", "level_id");

-- CreateIndex
CREATE INDEX "stage_fee_txn_store_id_business_date_idx" ON "stage_fee_txn"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "stage_fee_txn_artist_id_business_date_idx" ON "stage_fee_txn"("artist_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "pay_order_out_trade_no_key" ON "pay_order"("out_trade_no");

-- CreateIndex
CREATE UNIQUE INDEX "pay_order_channel_trade_no_key" ON "pay_order"("channel_trade_no");

-- CreateIndex
CREATE INDEX "pay_order_store_id_business_date_idx" ON "pay_order"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "approval_store_id_status_idx" ON "approval"("store_id", "status");

-- CreateIndex
CREATE INDEX "ticket_txn_store_id_business_date_idx" ON "ticket_txn"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "ticket_txn_artist_id_business_date_idx" ON "ticket_txn"("artist_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "artist_order_external_id_key" ON "artist_order"("external_id");

-- CreateIndex
CREATE INDEX "artist_order_store_id_business_date_idx" ON "artist_order"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "artist_review_artist_id_business_date_idx" ON "artist_review"("artist_id", "business_date");

-- CreateIndex
CREATE INDEX "artist_booking_store_id_business_date_idx" ON "artist_booking"("store_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "artist_booking_store_id_booking_no_key" ON "artist_booking"("store_id", "booking_no");

-- CreateIndex
CREATE INDEX "showcase_cast_store_id_ended_at_idx" ON "showcase_cast"("store_id", "ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_phone_key" ON "admin_user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_username_key" ON "admin_user"("username");

-- CreateIndex
CREATE INDEX "audit_log_store_id_created_at_idx" ON "audit_log"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_store_id_idem_key_path_key" ON "idempotency_keys"("store_id", "idem_key", "path");

-- CreateIndex
CREATE UNIQUE INDEX "store_config_store_id_config_key_key" ON "store_config"("store_id", "config_key");

-- CreateIndex
CREATE INDEX "openapi_event_status_created_at_idx" ON "openapi_event"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summary_store_id_business_date_key" ON "daily_summary"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "job_run_log_job_name_started_at_idx" ON "job_run_log"("job_name", "started_at");

-- CreateIndex
CREATE INDEX "room_session_store_id_business_date_idx" ON "room_session"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "room_session_room_id_status_idx" ON "room_session"("room_id", "status");

-- CreateIndex
CREATE INDEX "room_session_artist_session_id_idx" ON "room_session_artist"("session_id");

-- CreateIndex
CREATE INDEX "room_session_artist_artist_id_joined_at_idx" ON "room_session_artist"("artist_id", "joined_at");

-- CreateIndex
CREATE INDEX "self_order_session_id_idx" ON "self_order"("session_id");

-- CreateIndex
CREATE INDEX "self_order_artist_id_business_date_idx" ON "self_order"("artist_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "goods_store_id_name_deleted_at_key" ON "goods"("store_id", "name", "deleted_at");

-- AddForeignKey
ALTER TABLE "room_type" ADD CONSTRAINT "room_type_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_group" ADD CONSTRAINT "artist_group_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_level" ADD CONSTRAINT "artist_level_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist" ADD CONSTRAINT "artist_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist" ADD CONSTRAINT "artist_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "artist_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist" ADD CONSTRAINT "artist_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "artist_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_report" ADD CONSTRAINT "attendance_report_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_log" ADD CONSTRAINT "dispatch_log_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_session" ADD CONSTRAINT "show_session_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_session" ADD CONSTRAINT "show_session_room_session_id_fkey" FOREIGN KEY ("room_session_id") REFERENCES "room_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_slot" ADD CONSTRAINT "pricing_slot_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_fee_rule" ADD CONSTRAINT "stage_fee_rule_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_fee_txn" ADD CONSTRAINT "stage_fee_txn_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_rule" ADD CONSTRAINT "ticket_rule_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_txn" ADD CONSTRAINT "ticket_txn_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_review" ADD CONSTRAINT "artist_review_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_booking" ADD CONSTRAINT "artist_booking_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_cast" ADD CONSTRAINT "showcase_cast_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_store" ADD CONSTRAINT "role_store_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_session" ADD CONSTRAINT "room_session_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_session_artist" ADD CONSTRAINT "room_session_artist_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "room_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_session_artist" ADD CONSTRAINT "room_session_artist_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_order" ADD CONSTRAINT "self_order_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "room_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_order" ADD CONSTRAINT "self_order_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

