-- YYC³ LeisureManage · P1 批次:台票抵扣并入关房结算 + 预约锁钟/押金/到店自动叫钟
-- ① room_session.ticket_deduct_amount:关房结算时 Σ(qty×台票面值),与 fee_deduct_amount 并列
-- ② artist_booking 四列:押金登记 / 锁钟分钟 / 锁钟截止(booking_time+hold_minutes) / 到店自动叫钟记录

-- AlterTable
ALTER TABLE "artist_booking" ADD COLUMN     "call_id" INTEGER,
ADD COLUMN     "deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hold_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "hold_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "room_session" ADD COLUMN     "ticket_deduct_amount" DECIMAL(10,2);
