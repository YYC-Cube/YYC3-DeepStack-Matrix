// src/services/intentRecognition.ts
interface IntentRecognitionResult {
  targetModule: 'ai-programming' | 'long-text-chat' | 'learning-center' | 'continue-chat';
  confidence: number;
  detectedKeywords: string[];
  userContext: string;
  suggestedAction: string;
}

export class IntentRecognitionEngine {
  private readonly intentPatterns = {
    aiProgramming: {
      keywords: [
        '设计', '布局', '界面', 'UI', 'UX', '页面', '组件',
        '创建', '生成', '制作', '开发', '构建', '实现',
        'design', 'layout', 'interface', 'create', 'generate', 'build',
        'figma', 'sketch', '原型', 'wireframe'
      ],
      confidenceThreshold: 0.6,
      suggestedAction: '进入AI智能编程工具，开始设计您的界面'
    },
    longTextChat: {
      keywords: [
        '讨论', '分析', '优化', '建议', '审查',
        '算法', '数据结构', '性能', '并发', '异步',
        'discuss', 'analyze', 'optimize', 'review', 'algorithm',
        '详细', '深入', '复杂', '架构'
      ],
      confidenceThreshold: 0.5,
      suggestedAction: '进入大屏沟通页面，进行深度技术交流'
    },
    learningCenter: {
      keywords: [
        '如何', '教程', '学习', '文档', '示例',
        '新手', '入门', '指南', '最佳实践',
        'how', 'tutorial', 'learn', 'documentation', 'example',
        'best practice', 'guide', 'getting started'
      ],
      confidenceThreshold: 0.5,
      suggestedAction: '进入学习中心，查看相关教程和文档'
    }
  };

  recognize(userMessage: string, conversationHistory: Message[] = []): IntentRecognitionResult {
    const lowerMessage = userMessage.toLowerCase();
    let bestMatch: IntentRecognitionResult = {
      targetModule: 'continue-chat',
      confidence: 0,
      detectedKeywords: [],
      userContext: userMessage,
      suggestedAction: '继续对话'
    };

    // 分析每个意图模式
    for (const [module, pattern] of Object.entries(this.intentPatterns)) {
      const detectedKeywords = pattern.keywords.filter(keyword =>
        lowerMessage.includes(keyword.toLowerCase())
      );

      if (detectedKeywords.length > 0) {
        const confidence = Math.min(detectedKeywords.length * 0.25, 1.0);

        if (confidence > bestMatch.confidence && confidence >= pattern.confidenceThreshold) {
          bestMatch = {
            targetModule: module as any,
            confidence,
            detectedKeywords,
            userContext: userMessage,
            suggestedAction: pattern.suggestedAction
          };
        }
      }
    }

    // 考虑对话历史上下文
    if (conversationHistory.length > 3) {
      const depthAnalysis = this.analyzeConversationDepth(conversationHistory);
      if (depthAnalysis.requiresDeepChat && bestMatch.confidence < 0.7) {
        bestMatch = {
          targetModule: 'long-text-chat',
          confidence: 0.8,
          detectedKeywords: depthAnalysis.topics,
          userContext: userMessage,
          suggestedAction: '检测到深度技术对话，建议进入大屏沟通页面'
        };
      }
    }

    return bestMatch;
  }

  private analyzeConversationDepth(history: Message[]): {
    requiresDeepChat: boolean;
    topics: string[];
  } {
    const deepTopics = [
      '算法', '数据结构', '优化', '性能', '并发', '异步',
      'architecture', 'design pattern', 'optimization'
    ];

    const detectedTopics: string[] = [];
    let depthScore = 0;

    history.forEach(message => {
      const lowerContent = message.content.toLowerCase();
      deepTopics.forEach(topic => {
        if (lowerContent.includes(topic.toLowerCase())) {
          detectedTopics.push(topic);
          depthScore += 2;
        }
      });
    });

    return {
      requiresDeepChat: depthScore >= 6,
      topics: detectedTopics
    };
  }
}

export const intentRecognitionEngine = new IntentRecognitionEngine();
