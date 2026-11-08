-- 客资详情/TODO/房账挂客资(2026-11-08)
ALTER TABLE room_session ADD COLUMN customer_lead_id INTEGER;
-- followup 待办跟进
ALTER TABLE customer_followup ADD COLUMN due_at TIMESTAMP(3);
ALTER TABLE customer_followup ADD COLUMN is_done BOOLEAN NOT NULL DEFAULT false;
-- TODO 到期提醒索引
CREATE INDEX idx_customer_followup_todo ON customer_followup(lead_id, is_done, due_at);
