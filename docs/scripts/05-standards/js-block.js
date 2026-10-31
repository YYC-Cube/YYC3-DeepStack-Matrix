/**
 * file: main.js
 * description: Electron 主进程入口文件 · 创建窗口、托盘和 IPC 通信
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [electron],[main-process],[ipc]
 *
 * brief: Electron 主进程配置
 *
 * details:
 * - 创建 BrowserWindow（1400x900，最小 1200x700）
 * - 系统托盘集成
 * - IPC 通信（preload 脚本）
 * - 自动更新（electron-updater）
 * - 安全配置（contextIsolation, nodeIntegration: false）
 *
 * dependencies: Electron, electron-updater
 * notes: 需要配合 preload.js 使用
 */
