# 方式一: 从开发机直连 NAS 数据库
psql -h 192.168.3.45 -p 5432 -U postgres -d yyc3_kb

# 方式二: SSH 隧道
ssh -p 9557 -L 5432:127.0.0.1:5432 yyc3-45
# 然后在另一个终端
psql -h 127.0.0.1 -p 5432 -U postgres -d yyc3_kb
