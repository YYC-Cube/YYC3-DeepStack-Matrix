// 前端 UI 层: camelCase（高频渲染优化）
interface NodeData {
  gpu: number;
  mem: number;
  temp: number;
}

// DB 层: snake_case（与 PostgreSQL 列名一致）
interface NodeStatusRecord {
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
}

// 转换函数: toNodeData(record) → NodeData
