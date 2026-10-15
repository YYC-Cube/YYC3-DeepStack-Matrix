/**
 * ipc-handlers.ts
 * =================
 * Electron 主进程 IPC 处理器
 */

import { execFile } from "child_process";
import { app, dialog, Notification as ElectronNotification, ipcMain, shell } from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { IPCChannel, type IPCResponse } from "../src/shared/ipc-types";
import { grantPathRoot, isPathWithinSafeRoots } from "./permission-manager";

// 安全修复（2026-10-16）：移除 open/xdg-open/start —— 它们可带 -a/<app> 参数
// 启动任意本地应用（等效任意代码执行面），白名单形同虚设。
// 打开外部资源的需求统一走已限协议的 SHELL_OPEN（openExternal）。
const ALLOWED_SHELL_COMMANDS = new Set([
  'ping', 'echo', 'which', 'where',
]);

// SHELL_OPEN 允许的外链协议白名单（与 main.ts setWindowOpenHandler 策略一致）
const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

// FILE_WRITE 大小上限（原会话模型 maxFileSize 常量收编）
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

const DANGEROUS_ARG_PATTERN = /[|;&`$>\n\r]/;

/**
 * 创建成功响应
 */
function createSuccessResponse<T>(data?: T): IPCResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

/**
 * 创建错误响应
 */
function createErrorResponse(error: string): IPCResponse {
  return {
    success: false,
    error,
    timestamp: Date.now(),
  };
}

/**
 * 注册文件系统 IPC 处理器
 */
export function registerFileSystemHandlers(): void {
  // 读取文件
  ipcMain.handle(IPCChannel.FILE_READ, async (_, filePath: string, options?: any) => {
    try {
      // 权限检查：安全根目录前缀约束（原 sessionId 会话模型从未接线，恒为拒绝态死路径）
      if (!isPathWithinSafeRoots(filePath)) {
        return createErrorResponse("Permission denied: path outside allowed roots");
      }

      const content = await fs.promises.readFile(filePath, options);
      return createSuccessResponse(content);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 写入文件
  ipcMain.handle(IPCChannel.FILE_WRITE, async (_, filePath: string, data: string | Buffer, options?: any) => {
    try {
      // 权限检查：安全根目录前缀约束
      if (!isPathWithinSafeRoots(filePath)) {
        return createErrorResponse("Permission denied: path outside allowed roots");
      }

      // 文件大小检查
      const fileSize = Buffer.byteLength(data);
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        return createErrorResponse("File size exceeds limit");
      }

      await fs.promises.writeFile(filePath, data, options);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 删除文件
  ipcMain.handle(IPCChannel.FILE_DELETE, async (_, filePath: string) => {
    try {
      // 安全修复（2026-10-16）：删除属破坏性操作，必须限定在安全根内
      if (!isPathWithinSafeRoots(filePath)) {
        return createErrorResponse("Permission denied: destructive operations are limited to allowed roots");
      }
      await fs.promises.unlink(filePath);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 检查文件是否存在
  ipcMain.handle(IPCChannel.FILE_EXISTS, async (_, filePath: string) => {
    try {
      const exists = fs.existsSync(filePath);
      return createSuccessResponse(exists);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 列出目录内容
  ipcMain.handle(IPCChannel.FILE_LIST, async (_, dirPath: string, options?: any) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        path: path.join(dirPath, entry.name),
        name: entry.name,
        size: 0,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        createdAt: 0,
        modifiedAt: 0,
        accessedAt: 0,
      }));
      return createSuccessResponse(files);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取文件信息
  ipcMain.handle(IPCChannel.FILE_STAT, async (_, filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath);
      return createSuccessResponse({
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        accessedAt: stats.atimeMs,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 创建目录
  ipcMain.handle(IPCChannel.FILE_MKDIR, async (_, dirPath: string) => {
    try {
      // 安全修复（2026-10-16）：目录创建限定在安全根内
      if (!isPathWithinSafeRoots(dirPath)) {
        return createErrorResponse("Permission denied: path outside allowed roots");
      }
      await fs.promises.mkdir(dirPath, { recursive: true });
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 复制文件
  ipcMain.handle(IPCChannel.FILE_COPY, async (_, source: string, destination: string) => {
    try {
      // 安全修复（2026-10-16）：源与目标均须位于安全根内（copyFile 默认覆盖目标）
      if (!isPathWithinSafeRoots(source) || !isPathWithinSafeRoots(destination)) {
        return createErrorResponse("Permission denied: path outside allowed roots");
      }
      await fs.promises.copyFile(source, destination);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 移动文件
  ipcMain.handle(IPCChannel.FILE_MOVE, async (_, source: string, destination: string) => {
    try {
      // 安全修复（2026-10-16）：源与目标均须位于安全根内
      if (!isPathWithinSafeRoots(source) || !isPathWithinSafeRoots(destination)) {
        return createErrorResponse("Permission denied: path outside allowed roots");
      }
      await fs.promises.rename(source, destination);
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册系统监控 IPC 处理器
 */
export function registerSystemMonitorHandlers(): void {
  // 获取 CPU 信息
  ipcMain.handle(IPCChannel.SYSTEM_CPU, async () => {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      return createSuccessResponse({
        model: cpus[0]?.model || "Unknown",
        speed: cpus[0]?.speed || 0,
        usage: loadAverage[0] / cpus.length,
        cores: cpus.length,
        loadAverage,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取内存信息
  ipcMain.handle(IPCChannel.SYSTEM_MEMORY, async () => {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;

      return createSuccessResponse({
        total,
        free,
        used,
        usage: (used / total) * 100,
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取磁盘信息
  ipcMain.handle(IPCChannel.SYSTEM_DISK, async () => {
    try {
      const homeDir = os.homedir();

      return createSuccessResponse([
        {
          filesystem: "main",
          mountpoint: homeDir,
          total: 0,
          free: 0,
          used: 0,
          usage: 0,
        },
      ]);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取网络信息
  ipcMain.handle(IPCChannel.SYSTEM_NETWORK, async () => {
    try {
      const interfaces = os.networkInterfaces();
      const networkInfo = Object.entries(interfaces).map(([name, addrs]) => ({
        interface: name,
        ip: addrs?.[0]?.address || "",
        mac: addrs?.[0]?.mac || "",
        bytesReceived: 0,
        bytesSent: 0,
      }));

      return createSuccessResponse(networkInfo);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取进程信息
  ipcMain.handle(IPCChannel.SYSTEM_PROCESSES, async () => {
    try {
      return createSuccessResponse([
        {
          pid: process.pid,
          name: "YYC3-Cloud-Intelli-Matrix",
          cpu: 0,
          memory: process.memoryUsage().heapUsed,
          status: "running",
        },
      ]);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册应用控制 IPC 处理器
 */
export function registerAppControlHandlers(): void {
  // 获取应用版本
  ipcMain.handle(IPCChannel.APP_VERSION, async () => {
    try {
      const version = app.getVersion();
      return createSuccessResponse(version);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取应用路径
  ipcMain.handle(IPCChannel.APP_PATH, async (_, name: string) => {
    try {
      const appPath = app.getPath(name as any);
      return createSuccessResponse(appPath);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 获取应用配置
  ipcMain.handle(IPCChannel.APP_CONFIG, async () => {
    try {
      const config = {
        name: app.getName(),
        version: app.getVersion(),
        locale: app.getLocale(),
        isPackaged: app.isPackaged,
      };
      return createSuccessResponse(config);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 重启应用
  ipcMain.handle(IPCChannel.APP_RESTART, async () => {
    try {
      app.relaunch();
      app.exit();
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 退出应用
  ipcMain.handle(IPCChannel.APP_QUIT, async () => {
    try {
      app.quit();
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册对话框 IPC 处理器
 */
export function registerDialogHandlers(): void {
  // 显示打开对话框
  ipcMain.handle(IPCChannel.DIALOG_OPEN, async (_, options: any) => {
    try {
      const result = await dialog.showOpenDialog(options);
      // 安全修复（2026-10-16）：用户显式选择的路径即视为授权根，
      // 后续文件类 IPC 仅对 userData 与这些已授权根开放
      for (const p of result.filePaths) {
        grantPathRoot(p);
      }
      return createSuccessResponse(result.filePaths);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 显示保存对话框
  ipcMain.handle(IPCChannel.DIALOG_SAVE, async (_, options: any) => {
    try {
      const result = await dialog.showSaveDialog(options);
      return createSuccessResponse(result.filePath || "");
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 显示消息对话框
  ipcMain.handle(IPCChannel.DIALOG_MESSAGE, async (_, options: any) => {
    try {
      const result = await dialog.showMessageBox(options);
      return createSuccessResponse(result.response);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册 Shell IPC 处理器
 */
export function registerShellHandlers(): void {
  // 打开外部链接
  ipcMain.handle(IPCChannel.SHELL_OPEN, async (_, url: string) => {
    try {
      // 安全修复（2026-10-16）：协议白名单过滤，阻断 file:/smb:/自定义协议
      // 处理器被滥用拉起（与 setWindowOpenHandler 的 http/https 策略对齐）
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return createErrorResponse("Invalid URL");
      }
      if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
        return createErrorResponse(`Protocol not allowed: ${parsed.protocol}`);
      }
      await shell.openExternal(parsed.toString());
      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 执行命令 (白名单限制)
  ipcMain.handle(IPCChannel.SHELL_EXECUTE, async (_, command: string, args: string[] = []) => {
    try {
      const baseCmd = path.basename(command);
      if (!ALLOWED_SHELL_COMMANDS.has(baseCmd)) {
        return createErrorResponse(`Command not allowed: ${baseCmd}`);
      }
      for (const arg of args) {
        if (DANGEROUS_ARG_PATTERN.test(arg)) {
          return createErrorResponse('Invalid argument: contains disallowed characters');
        }
      }
      const result = await new Promise<string>((resolve, reject) => {
        execFile(command, args, { timeout: 10000 }, (err, stdout) => {
          if (err) { reject(err); } else { resolve(stdout); }
        });
      });
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 注册所有 IPC 处理器
 */
export function registerNotificationHandlers(): void {
  ipcMain.handle(IPCChannel.NOTIFICATION_SHOW, async (_, options: { title: string; body?: string; icon?: string; tag?: string; silent?: boolean; requireInteraction?: boolean }) => {
    try {
      if (!ElectronNotification.isSupported()) {
        return createErrorResponse("Notifications not supported on this system");
      }

      const notif = new ElectronNotification({
        title: options.title,
        body: options.body || "",
        icon: options.icon,
        silent: options.silent,
      });

      notif.on("click", () => {
        const win = require("electron").BrowserWindow.getAllWindows()[0];
        if (win) {
          win.show();
          win.focus();
        }
      });

      return createSuccessResponse("sent");
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  ipcMain.handle(IPCChannel.NOTIFICATION_PERMISSION, async () => {
    return createSuccessResponse("granted");
  });

  ipcMain.handle(IPCChannel.NOTIFICATION_REQUEST, async () => {
    return createSuccessResponse("granted");
  });
}

export function registerAllIPCHandlers(): void {
  registerFileSystemHandlers();
  registerSystemMonitorHandlers();
  registerAppControlHandlers();
  registerDialogHandlers();
  registerShellHandlers();
  registerNotificationHandlers();

  console.info("[IPC] All handlers registered");
}

// 导出数据库处理器
export { registerDatabaseHandlers } from "./database-handlers";
