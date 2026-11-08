-- 客资跟进时间线(2026-11-08):一客多条跟进记录子表
CREATE TABLE customer_followup (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  content VARCHAR(500) NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_followup_lead ON customer_followup(lead_id, created_at DESC);
