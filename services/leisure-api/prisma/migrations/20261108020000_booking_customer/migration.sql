-- 预定挂客资(P5 衔接 2026-11-08):booking 关联 customer_lead
ALTER TABLE artist_booking ADD COLUMN customer_lead_id INTEGER;
ALTER TABLE artist_booking ADD COLUMN customer_name VARCHAR(64);
