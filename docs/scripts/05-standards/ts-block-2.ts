/**
 * file: vite.config.ts
 * description: Vite 配置文件 · 包含构建、插件、别名等配置
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [config],[build],[vite]
 *
 * brief: Vite 构建配置
 *
 * details:
 * - 基础路径配置（./ 用于 Electron 兼容）
 * - 插件配置（React + TailwindCSS）
 * - 路径别名（/* → ./src/*）
 * - 开发服务器配置（端口 3218）
 * - 构建优化（代码分割、压缩）
 *
 * dependencies: Vite, React, TailwindCSS
 * notes: 修改配置后需要重启开发服务器
 */
