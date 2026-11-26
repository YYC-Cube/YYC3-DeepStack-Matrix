# 自包含红线(SELF-CONTAINED)

本目录**必须包含全部所用源码与资源,零中转拉取**(Owner 指令 2026-11-27)。核查口径:

| 项 | 状态 | 说明 |
| ---- | ---- | ---- |
| 源码 | ✅ 全在 `src/`(90+ 文件) | 组件/hooks/lib/i18n/types/styles 全部实体拷贝,无 workspace 依赖、无跨目录 import |
| 字体 | ✅ `public/fonts/`(16 woff2) | Rajdhani+Orbitron 全权重本地化;原 Google Fonts @import 已移除,`styles/fonts.css` → `fonts-local.css` 本地引用 |
| 运行时外链 | ✅ 零 | `grep -rn "https?://" src/` 仅剩默认配置值/placeholder 文案,无资源拉取 |
| favicon | ✅ `public/favicon.svg` | index.html 显式引用 |
| 溯源脚本 | ✅ 应用根 `extract-copy*.sh` / `vendor-fonts*.sh` | 抽取清单存档,**构建/运行零引用**;尝试移入 docs/provenance 被工具链钩子拦截,就地保留 |

新增依赖/资源时同样落本目录;禁止引用卷上其它快照或仓外路径。
