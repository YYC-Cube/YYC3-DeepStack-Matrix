import { ConnectionPool } from '@yyc3/performance';
import { ErrorHandler } from '@yyc3/error';
import { MetricsCollector } from '@yyc3/metrics';

// 使用连接池
const pool = new ConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 30000
});

// 使用错误处理
const errorHandler = new ErrorHandler();
try {
  // 业务逻辑
} catch (error) {
  errorHandler.handle(error);
}

// 使用指标收集
const collector = new MetricsCollector();
collector.record('request_duration', 150);
collector.record('request_count', 1);
