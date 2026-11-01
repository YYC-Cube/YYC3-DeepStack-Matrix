-- 管理员登录用户名(测试/非手机号账号;可空唯一)——账号=用户名或手机号均可登录
-- AlterTable
ALTER TABLE `admin_user` ADD COLUMN `username` VARCHAR(32) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `admin_user_username_key` ON `admin_user`(`username`);
