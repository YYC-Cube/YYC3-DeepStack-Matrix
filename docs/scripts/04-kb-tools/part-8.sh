# 分析当前目录下所有项目并生成依赖矩阵
yyc3 analyze --output deps-matrix.json

# 批量将所有项目中的重复组件替换为 @yyc3/ui 引用
yyc3 refactor --replace-components --target @yyc3/ui

# 自动生成每个项目的 yyc3.config.json（基于扫描结果）
yyc3 config-generate --interactive

# 一键执行整个迁移流程（谨慎使用）
yyc3 migrate-all --dry-run   # 先预览
yyc3 migrate-all --apply
