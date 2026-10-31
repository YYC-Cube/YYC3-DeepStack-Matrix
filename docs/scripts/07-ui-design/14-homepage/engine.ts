// utils/intentRecognition.ts
import { IntentRecognitionEngine } from './intentRecognition';

// 初始化引擎
const engine = new IntentRecognitionEngine();

// 使用示例
const result = engine.recognize(
  "帮我设计一个登录页面",
  conversationHistory
);

// 处理识别结果
if (result.confidence >= 0.5) {
  // 显示建议弹窗
  showSuggestion(result);
}
