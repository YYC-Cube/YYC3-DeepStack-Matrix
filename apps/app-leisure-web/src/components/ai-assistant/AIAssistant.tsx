/**
 * YYC³ AI 助手浮窗(LeisureManage 定制版)
 * - 内容对齐当前项目:房态/台票/对账/轮台/预约/评价 快捷命令与领域应答
 * - 浮窗按钮与面板均可拖拽(位置持久化 localStorage),面板可缩放(右下角手柄),多端自适应
 * - ⌘J / Ctrl+J 全局开关;未接推理服务时本地领域 mock 应答(III 期接真 AI)
 * 适配移植自 YYC3-Cloud-Matrix ai-assistant(共享版)+ docs/ai-assistant-dev(开发版)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Send, Sparkles, Zap, RotateCcw, Trash2,
  Minimize2, Maximize2, MessageSquare, Command,
  BookOpen, Sliders, Copy, Check, LayoutDashboard,
  Receipt, BarChart3, CalendarCheck, Users, Store,
} from 'lucide-react'
import { YYC3LogoSvg } from './YYC3LogoSvg'

// ═══════════════════════════════════════════════════════════════
//  类型定义
// ═══════════════════════════════════════════════════════════════

export interface AIAssistantProps {
  isMobile?: boolean;
  onSendMessage?: (message: string) => Promise<string>;
  apiKey?: string;
  modelProvider?: string;
}

interface SystemCommand {
  id: string;
  icon: typeof Zap;
  label: string;
  desc: string;
  category: string;
  /** 发给 AI 的指令文本 */
  action: string;
  /** 直接跳转的页面 hash(优先于 action) */
  hash?: string;
  color: string;
}

interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  category: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
//  常量定义(LeisureManage 领域)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_COMMANDS: SystemCommand[] = [
  { id: 'cmd-01', icon: LayoutDashboard, label: '房态看板', desc: '开房/空房/清扫/预定 全店总览', category: '房务', action: '给我一份当前全店房态总览:开房/空房/清扫/预定各多少间', hash: '#/rooms/board', color: '#00d4ff' },
  { id: 'cmd-02', icon: Users, label: '实时在岗', desc: '签到/上钟/串台 实时状态', category: '房务', action: '查看当前艺人在岗实时状态:签到、上钟、串台各多少人', hash: '#/attendance/realtime', color: '#00ff88' },
  { id: 'cmd-03', icon: CalendarCheck, label: '预约管理', desc: '今日预约与到店状态', category: '房务', action: '查看今日预约列表与到店情况', hash: '#/bookings', color: '#ffaa00' },
  { id: 'cmd-04', icon: Receipt, label: '台票体系', desc: '台票设置/购买/核销', category: '资金', action: '查看台票购买与使用记录汇总', hash: '#/tickets?tab=buy-log', color: '#aa55ff' },
  { id: 'cmd-05', icon: Zap, label: '双轨对账', desc: '今日四指标与 14 天门禁', category: '资金', action: '查看今日双轨对账四指标与 14 天门禁进度', hash: '#/reports/recon', color: '#ffdd00' },
  { id: 'cmd-06', icon: BarChart3, label: '报表中心', desc: '8 张报表与 CSV 导出', category: '报表', action: '打开报表中心,查看今日上下钟汇总', hash: '#/reports', color: '#00d4ff' },
  { id: 'cmd-07', icon: Users, label: '轮台报表', desc: '主管/艺人被派与越序统计', category: '报表', action: '查看主管轮台报表:各艺人被派次数与越序情况', hash: '#/reports/dispatch-rotation', color: '#00ff88' },
  { id: 'cmd-08', icon: Store, label: '门店参数', desc: '计费规则/通道/轮台模式', category: '运营', action: '打开门店参数设置:计费规则与收费通道配置', hash: '#/settings/artist', color: '#ff3366' },
  { id: 'cmd-09', icon: Command, label: '今日对账快照', desc: '生成自算四指标快照', category: '资金', action: '生成今日对账自算快照并核对开房数/时间费/点单额/签到人数', color: '#ff6600' },
  { id: 'cmd-10', icon: Sparkles, label: '今日营业日报', desc: 'AI 汇总今日经营概况', category: '报表', action: '汇总今日营业日报:开房数、时间费、点单额、签到人数、台票销售', color: '#ffdd00' },
];

const PROMPT_PRESETS: PromptPreset[] = [
  { id: 'p1', name: '门店运营管家', prompt: '你是 LeisureManage 门店运营管家。熟悉包厢房态、开房关房流程、清扫流转与轮台派单。请基于当前门店状态给出运营建议。使用中文,简洁专业。', category: '运营' },
  { id: 'p2', name: '财务对账专员', prompt: '你是资金对账专员。掌握台费充值、ROOM_SETTLE 结算、台票购买核销与双轨对账四指标口径。帮助用户核对当日账务与差异。', category: '资金' },
  { id: 'p3', name: '轮台调度师', prompt: '你是艺人轮台调度师。理解轮台/自选/混合三种上钟模式与越序规则,能给出公平派单建议与预警。', category: '调度' },
  { id: 'p4', name: '经营数据分析师', prompt: '你是经营数据分析师。基于开房数、时间费、点单额、签到人数、台票销售等指标识别趋势与异常,给出可视化报告建议。', category: '数据' },
  { id: 'p5', name: 'LeisureManage 助手', prompt: '你是 YYC³ LeisureManage 的 AI 助手,帮助门店管理者快速执行房务/资金/报表操作、查询状态与分析数据。一切以中文交互,保持简洁友好。', category: '通用' },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好!我是 YYC³ AI 助手 🎉\n\n我可以帮你:\n- 🏠 查看房态看板与开房/清扫统计\n- 💰 核对台费/台票/双轨对账\n- 📊 汇总今日营业日报与轮台情况\n- ⚡ 快捷跳转到任意管理页面\n\n请输入指令,或点击「命令」页签使用快捷操作。',
  timestamp: Date.now(),
};

// ═══════════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════════

let messageIdCounter = 0;
const generateMessageId = (suffix = ''): string => {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}${suffix}`;
};

/** 领域 mock 应答(未接推理服务时的本地回退;对齐当前项目口径) */
const generateMockResponse = (userMsg: string): string => {
  const lower = userMsg.toLowerCase();

  if (lower.includes('房态') || lower.includes('开房') || lower.includes('空房') || lower.includes('清扫')) {
    return `## 房态总览(示例口径)\n\n| 状态 | 间数 | 说明 |\n|------|------|------|\n| 🟢 空闲 | 25 | 可直接开房 |\n| 🔴 消费中 | 3 | 计时/点单入房账 |\n| 🔵 清扫中 | 2 | 清扫完成→空闲 |\n| 🟠 已预定 | 0 | 预约未到店 |\n| ⚪ 维修中 | 1 | 不可开房 |\n\n**建议**: 清扫中 2 间预计 15 分钟完成;已预定 0 间,今日预约可提前锁房。\n\n📍 数据以「房态看板」实时页为准。`;
  }

  if (lower.includes('对账') || lower.includes('指标') || lower.includes('门禁')) {
    return `## 双轨对账(方案甲口径)\n\n| 指标 | 本系统 | 说明 |\n|------|--------|------|\n| 开房数 | room_session 当日总数 | OPEN+CLOSED |\n| 时间费 | Σ上钟时间费 | 计入房账 |\n| 点单额 | Σ 自点单 | 房账挂账 |\n| 签到人数 | CHECKIN 去重艺人 | 仅审核通过 |\n\n**14 天门禁**: 连续 MATCHED ≥14 天即可切换;日切 job 每晚自动快照,次日只需录入对侧 4 个数。\n\n📍 页面:「报表 → 双轨对账」顶部有门禁面板。`;
  }

  if (lower.includes('台票') || lower.includes('核销')) {
    return `## 台票体系\n\n- **余额** = ΣBUY − ΣUSE(过期票已自动归零展示)\n- **购买**: 收费通道须在门店清单内(现金/转账/自定义1-3)\n- **核销**: 上钟抵扣提示后由前台落 USE 流水\n- **流水**: 只增不改,购买/使用双记录可查\n\n📍 页面:「台票体系」四 Tab;艺人端有「我的台票」。`;
  }

  if (lower.includes('轮台') || lower.includes('派单') || lower.includes('越序')) {
    return `## 轮台派单\n\n- **队列口径**: 已签到(审核通过且空闲)艺人,按 被派次数 → 最近被派 → 签到时间 排序\n- **轮台模式**: 越序直接拒绝(40914,提示下一位)\n- **混合模式**: 允许越序但记 overridden,供主管轮台报表考核\n- **报表**: 「报表中心 → 主管轮台报表」可按主管/组别统计\n\n📍 开房弹窗内会显示推荐位(#N)与当日被派次数。`;
  }

  if (lower.includes('日报') || lower.includes('营业') || lower.includes('汇总')) {
    return `## 今日营业日报(示例口径)\n\n- **开房数**: 以房态看板当日房账为准\n- **时间费**: Σ上钟计费(最低消费/封顶已应用)\n- **点单额**: Σ 艺人自点单(PLACED 视同送达)\n- **签到**: 已通过审核的去重艺人数\n\n💡 精确数字以「报表中心」与「双轨对账」页面为准;本条为能力说明。`;
  }

  return `收到您的请求:"${userMsg}"\n\n我已接入 LeisureManage 全端能力:\n- 🏠 房态/开房/清扫/预定\n- 💰 台费/台票/对账/报表\n- 👥 在岗状态/轮台/评价\n\n试试点击「命令」页签的快捷操作,或直接告诉我想看什么。`;
};

// ═══════════════════════════════════════════════════════════════
//  拖拽/缩放工具
// ═══════════════════════════════════════════════════════════════

interface AiPanelState {
  /** 浮窗按钮位置(视口坐标,左上角) */
  bx: number;
  by: number;
  /** 面板位置(视口坐标,左上角) */
  px: number;
  py: number;
  /** 面板尺寸 */
  pw: number;
  ph: number;
}

const PANEL_MIN_W = 360;
const PANEL_MIN_H = 460;
const AI_POS_KEY = 'leisure-ai-pos-v1';

const DEFAULT_PANEL: AiPanelState = {
  bx: 0,
  by: 0,
  px: 0,
  py: 0,
  pw: 480,
  ph: 640,
};

function loadPanelState(viewportW: number, viewportH: number, isMobile: boolean): AiPanelState {
  const defaults: AiPanelState = isMobile
    ? { bx: 16, by: viewportH - 80 - 48, px: 0, py: 0, pw: viewportW, ph: viewportH }
    : { bx: viewportW - 24 - 56, by: viewportH - 24 - 56, px: viewportW - 4 - 480, py: viewportH - 24 - 640, pw: 480, ph: 640 };
  try {
    const raw = localStorage.getItem(AI_POS_KEY);
    if (raw === null) return defaults;
    const saved = JSON.parse(raw) as Partial<AiPanelState>;
    const merged = { ...defaults, ...saved };
    return {
      bx: Math.min(Math.max(0, merged.bx), Math.max(0, viewportW - 56)),
      by: Math.min(Math.max(0, merged.by), Math.max(0, viewportH - 56)),
      px: Math.min(Math.max(0, merged.px), Math.max(0, viewportW - PANEL_MIN_W)),
      py: Math.min(Math.max(0, merged.py), Math.max(0, viewportH - PANEL_MIN_H)),
      pw: Math.max(PANEL_MIN_W, merged.pw),
      ph: Math.max(PANEL_MIN_H, merged.ph),
    };
  } catch {
    return defaults;
  }
}

function savePanelState(s: AiPanelState): void {
  try {
    localStorage.setItem(AI_POS_KEY, JSON.stringify(s));
  } catch {
    /* 存储不可用静默 */
  }
}

function clampPanel(s: AiPanelState, vw: number, vh: number): AiPanelState {
  return {
    ...s,
    px: Math.min(Math.max(0, s.px), Math.max(0, vw - PANEL_MIN_W)),
    py: Math.min(Math.max(0, s.py), Math.max(0, vh - PANEL_MIN_H)),
    pw: Math.min(s.pw, Math.max(PANEL_MIN_W, vw - 16)),
    ph: Math.min(s.ph, Math.max(PANEL_MIN_H, vh - 16)),
  };
}

// ═══════════════════════════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════════════════════════

export function AIAssistant({
  isMobile = false,
  onSendMessage,
  apiKey = '',
  modelProvider = 'openai',
}: AIAssistantProps) {
  // 面板状态
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'commands' | 'prompts' | 'settings'>('chat');

  // 聊天状态
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // AI 设置
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PRESETS[4].prompt);
  const [temperature, setTemperature] = useState(0.7);
  const [_topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);

  // 命令过滤
  const [cmdFilter, setCmdFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 拖拽/缩放状态
  const [panel, setPanel] = useState<AiPanelState>(() => {
    const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
    return loadPanelState(vw, vh, isMobile);
  });
  const bubbleDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const [bubbleDragging, setBubbleDragging] = useState(false);
  const panelDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; baseW: number; baseH: number } | null>(null);

  // 视口变化时收拢位置
  useEffect(() => {
    const onResize = (): void => setPanel((p) => clampPanel(p, window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); };
  }, []);

  // ⌘J / Ctrl+J 开关
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      let response: string;
      if (onSendMessage) {
        response = await onSendMessage(content);
      } else {
        // 模拟延迟(确定性伪随机,非加密用途)
        await new Promise(r => setTimeout(r, 800 + (content.length % 12) * 100));
        response = generateMockResponse(content);
      }

      const assistantMsg: ChatMessage = {
        id: generateMessageId('-resp'),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateMessageId('-error'),
        role: 'system',
        content: `抱歉，发生了错误：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const executeCommand = (cmd: SystemCommand) => {
    setActiveTab('chat');
    if (cmd.hash !== undefined) {
      window.location.hash = cmd.hash;
      if (!isMobile) setIsOpen(false);
      return;
    }
    sendMessage(cmd.action);
  };

  const applyPreset = (preset: PromptPreset) => {
    setSystemPrompt(preset.prompt);
    setActiveTab('chat');
    const sysMsg: ChatMessage = {
      id: generateMessageId('-sys'),
      role: 'system',
      content: `✅ 已切换系统角色为「${preset.name}」`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, sysMsg]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: '对话已清空。请输入新的指令开始操作。',
      timestamp: Date.now(),
    }]);
  };

  const cmdCategories = [
    { key: 'all', label: '全部' },
    { key: '房务', label: '房务' },
    { key: '资金', label: '资金' },
    { key: '报表', label: '报表' },
    { key: '运营', label: '运营' },
  ];

  const filteredCommands = cmdFilter === 'all'
    ? SYSTEM_COMMANDS
    : SYSTEM_COMMANDS.filter(c => c.category === cmdFilter);

  // ── 浮窗按钮拖拽 ──
  const bubbleSize = isMobile ? 48 : 56;
  const onBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (isMobile) return; // 移动端点击即开,不做拖拽
    e.currentTarget.setPointerCapture(e.pointerId);
    bubbleDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: panel.bx, baseY: panel.by, moved: false };
  };
  const onBubblePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = bubbleDragRef.current;
    if (d === null) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) {
      setBubbleDragging(true);
      setPanel((p) => clampPanel(
        { ...p, bx: d.baseX + dx, by: d.baseY + dy },
        window.innerWidth,
        window.innerHeight,
      ));
    }
  };
  const onBubblePointerUp = (): void => {
    const d = bubbleDragRef.current;
    if (d !== null && d.moved) savePanelState(panel);
    bubbleDragRef.current = null;
    setTimeout(() => setBubbleDragging(false), 50);
  };

  // ── 面板拖拽(头部手柄) ──
  const onPanelHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (isMobile || isMaximized) return;
    if ((e.target as HTMLElement).closest('button') !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panelDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: panel.px, baseY: panel.py };
  };
  const onPanelHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = panelDragRef.current;
    if (d === null) return;
    setPanel((p) => clampPanel(
      { ...p, px: d.baseX + (e.clientX - d.startX), py: d.baseY + (e.clientY - d.startY) },
      window.innerWidth,
      window.innerHeight,
    ));
  };
  const onPanelHeaderPointerUp = (): void => {
    panelDragRef.current = null;
    savePanelState(panel);
  };

  // ── 面板缩放(右下角手柄) ──
  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (isMobile || isMaximized) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, baseW: panel.pw, baseH: panel.ph };
  };
  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = resizeRef.current;
    if (d === null) return;
    setPanel((p) => clampPanel(
      {
        ...p,
        pw: Math.max(PANEL_MIN_W, d.baseW + (e.clientX - d.startX)),
        ph: Math.max(PANEL_MIN_H, d.baseH + (e.clientY - d.startY)),
      },
      window.innerWidth,
      window.innerHeight,
    ));
  };
  const onResizePointerUp = (): void => {
    resizeRef.current = null;
    savePanelState(panel);
  };

  // 面板定位(桌面非最大化:自由位置;最大化:铺满留边;移动端:全屏)
  const panelStyle: React.CSSProperties = isMobile
    ? { inset: 0 }
    : isMaximized
      ? { inset: 16 }
      : { left: panel.px, top: panel.py, width: panel.pw, height: panel.ph };

  // ========== 浮动按钮(可拖拽) ==========
  if (!isOpen) {
    return (
      <div
        className="fixed z-[60] group touch-none select-none"
        style={{ left: panel.bx, top: panel.by }}
        data-testid="ai-assistant-float-btn"
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="打开 AI 智能助理"
          onClick={() => { if (!bubbleDragging) setIsOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter') setIsOpen(true); }}
          onPointerDown={onBubblePointerDown}
          onPointerMove={onBubblePointerMove}
          onPointerUp={onBubblePointerUp}
          className="relative rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_30px_rgba(0,180,255,0.4)] hover:shadow-[0_0_40px_rgba(0,180,255,0.6)] transition-shadow hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing"
          style={{ width: bubbleSize, height: bubbleSize }}
        >
          <YYC3LogoSvg size={isMobile ? 32 : 38} />
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] animate-ping opacity-20" />
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00ff88] flex items-center justify-center shadow-[0_0_8px_rgba(0,255,136,0.5)]">
            <Sparkles className="w-3 h-3 text-[#060e1f]" />
          </div>
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-[rgba(8,25,55,0.95)] border border-[rgba(0,180,255,0.2)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="text-[#00d4ff]" style={{ fontSize: '0.72rem' }}>AI 智能助理 (⌘J · 可拖动)</span>
        </div>
      </div>
    );
  }

  // ========== 主面板(可拖拽/可缩放) ==========
  return (
    <div
      className="fixed z-[60] flex flex-col"
      style={panelStyle}
      data-testid="ai-assistant-panel"
    >
      <div className="w-full h-full rounded-2xl bg-[rgba(8,25,55,0.95)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.12)] flex flex-col overflow-hidden">

        {/* ======== 头部(拖拽手柄) ======== */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[rgba(0,180,255,0.12)] bg-[rgba(0,40,80,0.2)] cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={onPanelHeaderPointerDown}
          onPointerMove={onPanelHeaderPointerMove}
          onPointerUp={onPanelHeaderPointerUp}
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_15px_rgba(0,180,255,0.3)] overflow-hidden">
              <YYC3LogoSvg size={24} />
            </div>
            <div>
              <h3 className="text-[#e0f0ff]" style={{ fontSize: '0.9rem' }}>AI 助手 · LeisureManage</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: '0.62rem' }}>
                  {modelProvider || '未配置'} · 拖动移动
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            </button>
            {!isMobile && (
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                data-testid="ai-assistant-maximize-btn"
                className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
                title={isMaximized ? '还原' : '最大化'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" /> : <Maximize2 className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />}
              </button>
            )}
            <button
              onClick={() => { setIsOpen(false); setIsMaximized(false); }}
              data-testid="ai-assistant-close-btn"
              className="p-1.5 rounded-lg hover:bg-[rgba(255,51,102,0.1)] transition-all"
            >
              <X className="w-4 h-4 text-[rgba(0,212,255,0.5)]" />
            </button>
          </div>
        </div>

        {/* ======== 标签栏 ======== */}
        <div className="shrink-0 flex items-center gap-0.5 px-3 py-2 border-b border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.1)]">
          {([
            { key: 'chat' as const, icon: MessageSquare, label: '对话' },
            { key: 'commands' as const, icon: Command, label: '命令' },
            { key: 'prompts' as const, icon: BookOpen, label: '提示词' },
            { key: 'settings' as const, icon: Sliders, label: '配置' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]'
                  : 'text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] border border-transparent'
              }`}
              style={{ fontSize: '0.72rem' }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ======== 内容区 ======== */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* === 对话标签 === */}
          {activeTab === 'chat' && (
            <>
              {/* 消息列表 */}
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] relative group ${
                      msg.role === 'user'
                        ? 'bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.2)] rounded-2xl rounded-br-sm'
                        : msg.role === 'system'
                          ? 'bg-[rgba(255,221,0,0.08)] border border-[rgba(255,221,0,0.15)] rounded-2xl'
                          : 'bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] rounded-2xl rounded-bl-sm'
                    } px-3 py-2`}>
                      <div
                        className="text-[#e0f0ff] whitespace-pre-wrap break-words"
                        style={{ fontSize: '0.8rem', lineHeight: 1.6 }}
                      >
                        {msg.content}
                      </div>
                      {msg.role !== 'system' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                            msg.role === 'user' ? 'hover:bg-[rgba(0,212,255,0.15)]' : 'hover:bg-[rgba(0,180,255,0.15)]'
                          }`}
                          title="复制"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3 text-[rgba(0,212,255,0.5)]" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] rounded-2xl rounded-bl-sm px-4 py-2 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 输入区 */}
              <div className="shrink-0 p-3 border-t border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.1)]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入指令,如:查看今日房态…"
                    rows={1}
                    className="flex-1 resize-none rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.15)] px-3 py-2 text-[#e0f0ff] outline-none focus:border-[#00d4ff] transition-colors"
                    style={{ fontSize: '0.8rem', maxHeight: 96, minHeight: 36 }}
                  />
                  <button
                    onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    data-testid="ai-assistant-send-btn"
                    className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                    title="发送"
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* === 命令标签 === */}
          {activeTab === 'commands' && (
            <div className="flex-1 overflow-auto p-3 space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {cmdCategories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCmdFilter(cat.key)}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                      cmdFilter === cat.key
                        ? 'bg-[rgba(0,212,255,0.12)] border-[rgba(0,212,255,0.3)] text-[#00d4ff]'
                        : 'border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredCommands.map(cmd => (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.08)] hover:bg-[rgba(0,40,80,0.15)] border border-transparent hover:border-[rgba(0,212,255,0.15)] transition-all text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: cmd.color + '18', color: cmd.color }}
                    >
                      <cmd.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#e0f0ff]" style={{ fontSize: '0.8rem' }}>{cmd.label}</div>
                      <div className="text-[#6bb8d9] truncate" style={{ fontSize: '0.68rem' }}>{cmd.desc}</div>
                    </div>
                    {cmd.hash !== undefined && (
                      <span className="text-[10px] text-[rgba(0,212,255,0.4)] shrink-0">跳转</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === 提示词标签 === */}
          {activeTab === 'prompts' && (
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {PROMPT_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    systemPrompt === p.prompt
                      ? 'bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.3)]'
                      : 'bg-[rgba(0,40,80,0.08)] border-[rgba(0,180,255,0.1)] hover:border-[rgba(0,212,255,0.25)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#00d4ff] font-medium" style={{ fontSize: '0.8rem' }}>{p.name}</span>
                    <span className="text-[10px] text-[#6bb8d9] px-1.5 py-0.5 rounded bg-[rgba(0,120,200,0.15)]">{p.category}</span>
                    {systemPrompt === p.prompt && <Check className="ml-auto w-3.5 h-3.5 text-[#00ff88]" />}
                  </div>
                  <div className="mt-1 text-[#6bb8d9] line-clamp-2" style={{ fontSize: '0.68rem' }}>{p.prompt}</div>
                </button>
              ))}
            </div>
          )}

          {/* === 配置标签 === */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-auto p-3 space-y-4">
              {/* 模型配置 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#00d4ff]" style={{ fontSize: '0.75rem' }}>
                  <Zap className="w-3.5 h-3.5" /> 模型接入(III 期)
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={() => {}}
                    placeholder="API Key(就绪后填写,仅本地)"
                    className="w-full h-8 px-3 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] text-xs outline-none focus:border-[#00d4ff]"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1.5 text-[10px] text-[#6bb8d9] hover:text-[#00d4ff]"
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
                <div className="text-[10px] text-[#6bb8d9]">
                  当前: {modelProvider} · 推理服务就绪后由主应用注入 Key,浮窗不经手明文
                </div>
              </div>

              {/* 系统提示词 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#00d4ff]" style={{ fontSize: '0.75rem' }}>
                  <Sparkles className="w-3.5 h-3.5" /> 系统提示词
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.15)] p-2.5 text-[#e0f0ff] text-xs outline-none focus:border-[#00d4ff] resize-none"
                />
              </div>

              {/* 温度 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#6bb8d9]" style={{ fontSize: '0.72rem' }}>
                  <span>温度 temperature</span>
                  <span className="font-mono">{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-[#00d4ff]"
                />
              </div>

              {/* TopP */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#6bb8d9]" style={{ fontSize: '0.72rem' }}>
                  <span>TopP</span>
                  <span className="font-mono">{_topP.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={_topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full accent-[#00d4ff]"
                />
              </div>

              {/* MaxTokens */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#6bb8d9]" style={{ fontSize: '0.72rem' }}>
                  <span>最大 Token</span>
                  <span className="font-mono">{String(maxTokens)}</span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={8192}
                  step={256}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-[#00d4ff]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ======== 缩放手柄(右下角;桌面非最大化) ======== */}
        {!isMobile && !isMaximized && (
          <div
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize touch-none"
            title="拖拽调整大小"
          >
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r-2 border-b-2 border-[rgba(0,212,255,0.4)] rounded-br-md" />
          </div>
        )}
      </div>
    </div>
  );
}
