-- CreateTable
CREATE TABLE "split_plan" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "category" VARCHAR(16) NOT NULL,
    "period_type" VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_rule" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "apply_title" VARCHAR(32),
    "apply_line" VARCHAR(16),
    "apply_department_id" INTEGER,
    "calc_type" VARCHAR(16) NOT NULL,
    "percent" DECIMAL(6,2),
    "fixed_amount" DECIMAL(12,2),
    "tier_json" JSONB,
    "reward_type" VARCHAR(16) NOT NULL DEFAULT 'REWARD',
    "pay_method" VARCHAR(16) NOT NULL DEFAULT 'CASH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_entry" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "target_scope" VARCHAR(16) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "target_name" VARCHAR(64) NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACCRUED',
    "pay_method" VARCHAR(16),
    "pay_ref" VARCHAR(64),
    "ref_type" VARCHAR(16),
    "refId" INTEGER,
    "settlement_id" INTEGER,
    "operator_id" INTEGER NOT NULL,
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_settlement" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "target_scope" VARCHAR(16) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "target_name" VARCHAR(64) NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "pay_method" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'CONFIRMED',
    "confirmed_by" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3),
    "pay_ref" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handover" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "business_date" DATE NOT NULL,
    "shift_name" VARCHAR(32) NOT NULL,
    "handed_by" INTEGER NOT NULL,
    "recharge_total" DECIMAL(12,2) NOT NULL,
    "deduct_total" DECIMAL(12,2) NOT NULL,
    "settle_total" DECIMAL(12,2) NOT NULL,
    "order_total" DECIMAL(12,2) NOT NULL,
    "open_orders" INTEGER NOT NULL,
    "summary_json" JSONB,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "taken_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "remark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_handover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "split_plan_store_id_status_idx" ON "split_plan"("store_id", "status");

-- CreateIndex
CREATE INDEX "split_rule_plan_id_idx" ON "split_rule"("plan_id");

-- CreateIndex
CREATE INDEX "split_entry_store_id_business_date_idx" ON "split_entry"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "split_entry_plan_id_status_idx" ON "split_entry"("plan_id", "status");

-- CreateIndex
CREATE INDEX "split_settlement_store_id_created_at_idx" ON "split_settlement"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "shift_handover_store_id_business_date_idx" ON "shift_handover"("store_id", "business_date");

-- AddForeignKey
ALTER TABLE "split_rule" ADD CONSTRAINT "split_rule_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "split_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_entry" ADD CONSTRAINT "split_entry_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "split_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_entry" ADD CONSTRAINT "split_entry_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "split_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_entry" ADD CONSTRAINT "split_entry_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "split_settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

