# 1. 切换到清洗专用目录（你指定的路径）
cd /Volumes/Development/yyc3-platform/YYC3\ AI\ Call

# 2. 一行命令，使用不同模板刷新当前目录
yyc3 clean --template dashboard      # 变成仪表盘模板
yyc3 clean --template ai-chat         # 变成 AI 对话模板
yyc3 clean --template landing         # 变成落地页模板

# 3. 或者通过环境变量指定模板，实现“改名称即换皮”
export YYC3_TEMPLATE=ai-chat
yyc3 clean
