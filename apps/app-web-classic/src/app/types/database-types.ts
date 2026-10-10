/**
 * @file: database-types.ts
 * @description: 类型桥（整件翻正）— 类型单源 @yyc3/core/types + 双向值转换（P5 第三轮）
 * @author: YanYuCloudCube Team
 * @version: v3.0.0
 * @updated: 2026-10-10
 * @status: active
 * @tags: [types],[bridge]
 */

import type { ConnectionInfo, ConnectionStatus as InfraConnectionStatus } from "@yyc3/core/database/types";
import type { DBConnection, DBConnectionStatus } from "@yyc3/core/types";

export type {
  ChangeType, CommittedChange, DatabaseType, DBBackup, DBColumn, DBConnection, DBConnectionStatus, DBTable, EditableCellChange, QueryResult, SQLTemplate
} from "@yyc3/core/types";

// ============================================================
// 桥接映射函数 — UI 层 ↔ 基础设施层
// ============================================================

export function toConnectionInfo(conn: DBConnection): ConnectionInfo {
  return {
    id: conn.id,
    name: conn.name,
    config: {
      type: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password,
    },
    status: conn.status as InfraConnectionStatus,
    connectedAt: conn.lastConnected ?? undefined,
    retryCount: 0,
  };
}

export function toDBConnection(info: ConnectionInfo, overrides?: Partial<DBConnection>): DBConnection {
  return {
    id: info.id,
    name: info.name,
    type: info.config.type,
    host: info.config.host,
    port: info.config.port,
    database: info.config.database,
    username: info.config.username,
    password: info.config.password,
    status: info.status as DBConnectionStatus,
    lastConnected: info.connectedAt ?? null,
    ...overrides,
  } as DBConnection;
}
