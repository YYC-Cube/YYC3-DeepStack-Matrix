/**
 * @file: node-types.ts
 * @description: 类型桥（整件翻正）— 类型单源 @yyc3/core/types + toNodeData 值转换（P5 第三轮）
 * @author: YanYuCloudCube Team
 * @version: v3.0.0
 * @updated: 2026-10-10
 * @status: active
 * @tags: [types],[bridge]
 */

import type { NodeStatusRecord, NodeData } from "@yyc3/core/types";

export type { NodeStatusType, NodeData, NodeStatusRecord } from "@yyc3/core/types";

/** NodeStatusRecord → NodeData 转换 */
export function toNodeData(record: NodeStatusRecord): NodeData {
  return {
    id: record.hostname,
    status: record.status,
    gpu: record.gpu_util,
    mem: record.mem_util,
    temp: record.temp_celsius,
    model: record.model_deployed,
    tasks: record.active_tasks,
  };
}
