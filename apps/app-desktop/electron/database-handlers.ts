/**
 * database-handlers.ts
 * =====================
 * 数据库 IPC 处理器
 * 支持 SQLite、MySQL、PostgreSQL 等多种数据库
 */

import { ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { IPCChannel, type DatabaseExecuteResult, type DatabaseQueryResult, type IPCResponse } from "../src/shared/ipc-types";
import { isPathWithinSafeRoots } from "./permission-manager";

/**
 * 数据库连接配置
 */
interface DatabaseConnection {
  type: "sqlite" | "mysql" | "postgresql";
  filename?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connection?: any;
}

let currentConnection: DatabaseConnection | null = null;

/**
 * 创建成功响应
 */
function createSuccessResponse<T>(data: T): IPCResponse<T> {
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
 * 初始化数据库连接
 */
async function initializeDatabase(config: any): Promise<void> {
  currentConnection = {
    type: config.type || "sqlite",
    ...config,
  };

  // 在实际应用中，这里应该使用真实的数据库驱动
  // 例如：better-sqlite3、mysql2、pg 等
  if (currentConnection) {
    console.info(`[Database] Initialized ${currentConnection.type} database`);
  }
}

/**
 * 执行 SQL 查询（模拟实现）
 */
async function executeQuery(sql: string, params?: any[]): Promise<any[]> {
  if (!currentConnection) {
    throw new Error("Database not initialized");
  }

  // 模拟查询结果
  // 在实际应用中，这里应该使用真实的数据库驱动执行查询
  console.info(`[Database] Executing query: ${sql}`);

  return [];
}

/**
 * 执行 SQL 语句（模拟实现）
 */
async function executeStatement(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
  if (!currentConnection) {
    throw new Error("Database not initialized");
  }

  // 模拟执行结果
  // 在实际应用中，这里应该使用真实的数据库驱动执行语句
  console.info(`[Database] Executing statement: ${sql}`);

  return {
    affectedRows: 0,
    insertId: undefined,
  };
}

/**
 * 注册数据库 IPC 处理器
 */
export function registerDatabaseHandlers(): void {
  // 执行 SQL 语句
  ipcMain.handle(IPCChannel.DB_EXECUTE, async (_, sql: string, params?: any[]) => {
    try {
      const startTime = Date.now();
      const result = await executeStatement(sql, params);
      const duration = Date.now() - startTime;

      const executeResult: DatabaseExecuteResult = {
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        duration,
      };

      return createSuccessResponse(executeResult);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 查询数据
  ipcMain.handle(IPCChannel.DB_QUERY, async (_, sql: string, params?: any[]) => {
    try {
      const startTime = Date.now();
      const rows = await executeQuery(sql, params);
      const duration = Date.now() - startTime;

      const queryResult: DatabaseQueryResult = {
        rows: rows || [],
        rowCount: rows?.length || 0,
        duration,
      };

      return createSuccessResponse(queryResult);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 备份数据库
  ipcMain.handle(IPCChannel.DB_BACKUP, async (_, backupPath: string) => {
    try {
      if (!currentConnection) {
        return createErrorResponse("Database not initialized");
      }

      // 安全修复（2026-10-16）：备份写出的目标路径必须位于安全根内，
      // 防止渲染层借备份通道覆盖任意系统文件（copyFileSync 默认覆盖）
      if (!isPathWithinSafeRoots(backupPath)) {
        return createErrorResponse("Permission denied: backup path outside allowed roots");
      }

      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 对于 SQLite，直接复制数据库文件
      if (currentConnection.type === "sqlite" && currentConnection.filename) {
        if (fs.existsSync(currentConnection.filename)) {
          fs.copyFileSync(currentConnection.filename, backupPath);
        }
      } else {
        // 对于其他数据库类型，导出 SQL 转储
        const sqlDump = `-- Database Backup\n-- Generated at: ${new Date().toISOString()}\n-- Type: ${currentConnection.type}\n`;
        fs.writeFileSync(backupPath, sqlDump, "utf-8");
      }

      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 恢复数据库
  ipcMain.handle(IPCChannel.DB_RESTORE, async (_, restorePath: string) => {
    try {
      if (!currentConnection) {
        return createErrorResponse("Database not initialized");
      }

      // 安全修复（2026-10-16）：恢复源路径必须位于安全根内，
      // 防止渲染层诱导主进程从任意路径读取并覆盖数据库文件
      if (!isPathWithinSafeRoots(restorePath)) {
        return createErrorResponse("Permission denied: restore path outside allowed roots");
      }

      if (!fs.existsSync(restorePath)) {
        return createErrorResponse("Restore file not found");
      }

      // 对于 SQLite，直接替换数据库文件
      if (currentConnection.type === "sqlite" && currentConnection.filename) {
        fs.copyFileSync(restorePath, currentConnection.filename);
      } else {
        // 对于其他数据库类型，执行 SQL 文件
        const sql = fs.readFileSync(restorePath, "utf-8");
        const statements = sql
          .split(";")
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          await executeStatement(statement);
        }
      }

      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });

  // 迁移数据库
  ipcMain.handle(IPCChannel.DB_MIGRATE, async () => {
    try {
      if (!currentConnection) {
        return createErrorResponse("Database not initialized");
      }

      // 执行数据库迁移
      const migrations = [
        `CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          name TEXT,
          provider TEXT,
          tier TEXT,
          avg_latency_ms INTEGER,
          throughput INTEGER,
          created_at TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT,
          name_cn TEXT,
          role TEXT,
          description TEXT,
          is_active INTEGER
        )`,
        `CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY,
          hostname TEXT,
          gpu_util INTEGER,
          mem_util INTEGER,
          temp_celsius INTEGER,
          model_deployed TEXT,
          active_tasks INTEGER,
          status TEXT
        )`,
      ];

      for (const migration of migrations) {
        await executeStatement(migration);
      }

      return createSuccessResponse(undefined);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  });
}

/**
 * 获取当前数据库连接
 */
export function getCurrentConnection(): DatabaseConnection | null {
  return currentConnection;
}
