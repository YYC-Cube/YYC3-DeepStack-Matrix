/**
 * permission-manager.ts
 * =======================
 * 桥接层权限管理器
 * 控制 IPC 操作的访问权限
 */

import * as crypto from "crypto";
import { app } from "electron";
import * as path from "path";

/**
 * 权限级别
 */
export enum PermissionLevel {
  READ_ONLY = "read_only",
  READ_WRITE = "read_write",
  FULL_ACCESS = "full_access",
  ADMIN = "admin",
}

/**
 * 权限配置
 */
export interface PermissionConfig {
  level: PermissionLevel;
  allowedChannels: string[];
  deniedChannels: string[];
  maxFileSize?: number;
  allowedPaths?: string[];
  deniedPaths?: string[];
}

/**
 * 用户会话
 */
export interface UserSession {
  id: string;
  userId: string;
  permissions: PermissionConfig;
  createdAt: number;
  expiresAt: number;
}

/**
 * 权限管理器
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private sessions: Map<string, UserSession> = new Map();
  private defaultPermissions: PermissionConfig = {
    level: PermissionLevel.READ_WRITE,
    allowedChannels: [],
    deniedChannels: [],
    maxFileSize: 100 * 1024 * 1024, // 100MB
  };

  private constructor() { }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 创建用户会话
   */
  public createSession(userId: string, permissions?: Partial<PermissionConfig>): string {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const now = Date.now();

    const session: UserSession = {
      id: sessionId,
      userId,
      permissions: {
        ...this.defaultPermissions,
        ...permissions,
      },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24小时后过期
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * 获取用户会话
   */
  public getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 检查会话是否过期
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 销毁用户会话
   */
  public destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 检查是否有权限访问指定通道
   */
  public hasChannelPermission(sessionId: string, channel: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const { allowedChannels, deniedChannels } = session.permissions;

    // 如果通道在拒绝列表中，直接拒绝
    if (deniedChannels.includes(channel)) {
      return false;
    }

    // 如果允许列表为空，表示允许所有通道
    if (allowedChannels.length === 0) {
      return true;
    }

    // 检查通道是否在允许列表中
    return allowedChannels.includes(channel);
  }

  /**
   * 检查是否有权限访问指定路径
   */
  public hasPathPermission(sessionId: string, filePath: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const { allowedPaths, deniedPaths } = session.permissions;

    // 如果路径在拒绝列表中，直接拒绝
    if (deniedPaths && deniedPaths.some(denied => filePath.startsWith(denied))) {
      return false;
    }

    // 如果允许列表为空，表示允许所有路径
    if (!allowedPaths || allowedPaths.length === 0) {
      return true;
    }

    // 检查路径是否在允许列表中
    return allowedPaths.some(allowed => filePath.startsWith(allowed));
  }

  /**
   * 检查文件大小是否超过限制
   */
  public isFileSizeAllowed(sessionId: string, fileSize: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const { maxFileSize } = session.permissions;
    return !maxFileSize || fileSize <= maxFileSize;
  }

  /**
   * 获取权限级别
   */
  public getPermissionLevel(sessionId: string): PermissionLevel | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return session.permissions.level;
  }

  /**
   * 更新权限配置
   */
  public updatePermissions(sessionId: string, permissions: Partial<PermissionConfig>): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.permissions = {
      ...session.permissions,
      ...permissions,
    };

    return true;
  }

  /**
   * 清理过期会话
   */
  public cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * 获取活跃会话数量
   */
  public getActiveSessionCount(): number {
    this.cleanExpiredSessions();
    return this.sessions.size;
  }
}

/**
 * 导出单例实例
 */
export const permissionManager = PermissionManager.getInstance();

// ════════════════════════════════════════════════════════════════
// 安全根目录模型（2026-10-16 全局漏洞扫描修复）
//
// 原设计依赖"会话 + event.sessionId"做路径鉴权，但 createSession 从未被
// 调用、Electron 事件亦无 sessionId 属性，导致：
//   - FILE_READ/FILE_WRITE 因 session 恒为 undefined 而恒被拒（死路径）
//   - FILE_DELETE/COPY/MOVE/MKDIR、DB_BACKUP/RESTORE 则完全无校验，
//     渲染层可对任意路径执行删除/覆盖（如 ~/.zshrc、LaunchAgents）。
//
// 修复：文件类 IPC 统一收敛到「安全根」前缀约束 ——
//   1. app.getPath("userData")：应用数据目录（始终允许）
//   2. 用户通过 DIALOG_OPEN 显式选择的路径（选择即授权）
// ════════════════════════════════════════════════════════════════

const grantedPathRoots = new Set<string>();

/**
 * 授予一个路径根（用户经对话框显式选择时调用）
 */
export function grantPathRoot(root: string): void {
  if (typeof root === "string" && root.length > 0) {
    grantedPathRoots.add(path.resolve(root));
  }
}

/**
 * 获取当前全部安全根目录
 */
export function getSafePathRoots(): string[] {
  const roots: string[] = [];
  try {
    roots.push(path.resolve(app.getPath("userData")));
  } catch {
    // app 未就绪时忽略
  }
  roots.push(...grantedPathRoots);
  return roots;
}

/**
 * 判断目标路径是否位于任一安全根之下（含根本身）。
 * 使用 resolve 消解 ..、符号拼接等绕过尝试后再做前缀匹配。
 */
export function isPathWithinSafeRoots(target: string): boolean {
  if (typeof target !== "string" || target.length === 0) {
    return false;
  }
  let resolved: string;
  try {
    resolved = path.resolve(target);
  } catch {
    return false;
  }
  return getSafePathRoots().some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
}
