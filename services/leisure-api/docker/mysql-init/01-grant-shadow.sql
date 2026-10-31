-- Prisma migrate dev 需要影子数据库(CREATE/DROP DATABASE)权限。
-- 镜像入口脚本仅在数据卷首次初始化时执行本文件;已初始化的卷需手动执行同款 GRANT。
GRANT ALL PRIVILEGES ON *.* TO 'leisure'@'%';
FLUSH PRIVILEGES;
