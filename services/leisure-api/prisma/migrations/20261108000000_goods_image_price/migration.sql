-- 商品管理增强(P3):图片 + 会员价(价格体系)
ALTER TABLE goods ADD COLUMN image_url TEXT;
ALTER TABLE goods ADD COLUMN member_price DECIMAL(10,2);
