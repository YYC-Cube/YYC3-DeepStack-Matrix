# 安装 jscodeshift
pnpm add -g jscodeshift

# 创建一个转换脚本 replace-imports.js
# 内容：将 '@/components/ui/(.+)' 替换为 '@yyc3/ui/$1'
