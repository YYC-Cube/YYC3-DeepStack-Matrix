-- 客资体系最小闭环(P5 2026-11-07):客户线索(姓名/电话/来源/状态/跟进/归属)
CREATE TABLE customer_lead (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(32),
  source VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'FOLLOW',
  note VARCHAR(500),
  owner_artist_id INTEGER,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_lead_store_status ON customer_lead(store_id, status);
