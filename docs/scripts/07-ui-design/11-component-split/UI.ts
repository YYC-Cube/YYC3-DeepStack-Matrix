// 导入 UI 组件
import { Button, Card, Dialog, Select } from '@yyc3/ui';

// 导入业务组件
import { 
  PerformanceMonitorDashboard,
  ChatArea,
  KnowledgeGraphVisualization 
} from '@yyc3/business';

// 导入核心库模块
import { ConnectionPool } from '@yyc3/performance';
import { ErrorHandler } from '@yyc3/error';
import { MetricsCollector } from '@yyc3/metrics';
import { HealthChecker } from '@yyc3/health';
import { VoiceRecognition } from '@yyc3/multimodal';
import { GitOpsService } from '@yyc3/gitops';
