/**
 * @file: use-terminal.test.ts
 * @description: hooks/useTerminal 逻辑用例 — 命令处理器全分支 + 补全引擎 + AI Text-to-CLI + env 真实读写 + 历史导航
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 *
 * @brief: 进程内命令引擎（processCommand/getCompletions/aiTextToCli 为模块私有，
 *         经 useTerminal().execute / handleInputChange 驱动）; kb 命令的 CJS require 以
 *         vi.stubGlobal('require', …) 桩替代（vitest ESM 无 require 全局）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTerminal } from '../hooks/useTerminal';
import {
  resetEnvConfig,
  getEnvConfig,
  env,
} from '@yyc3-deepstack/core/env-config';

const last = (h: ReturnType<typeof useTerminal>['history']) => h[h.length - 1];

describe('useTerminal 初始态与 execute 基础', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('初始 history 仅含 banner 欢迎条目（info）', () => {
    const { result } = renderHook(() => useTerminal());
    expect(result.current.history).toHaveLength(1);
    const banner = result.current.history[0];
    expect(banner.status).toBe('info');
    expect(banner.output).toContain('CLI v');
    expect(banner.output).toContain('help');
    expect(result.current.inputValue).toBe('');
    expect(result.current.completions).toEqual([]);
  });

  it('空输入/纯空白输入不产生历史条目', () => {
    const { result } = renderHook(() => useTerminal());
    const before = result.current.history.length;
    act(() => result.current.execute('   '));
    act(() => result.current.execute(''));
    expect(result.current.history).toHaveLength(before);
  });

  it('clear 清空历史与输入', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim status'));
    act(() => result.current.execute('clear'));
    expect(result.current.history).toHaveLength(0);
    expect(result.current.inputValue).toBe('');
  });

  it('未知命令返回 error 与帮助指引', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('definitely-not-a-cmd'));
    const entry = last(result.current.history);
    expect(entry.status).toBe('error');
    expect(entry.output).toContain('命令未找到');
    expect(entry.input).toBe('definitely-not-a-cmd');
  });

  it('echo 原样回显; cd 成功且输出为空', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('echo hello world'));
    expect(last(result.current.history).output).toBe('hello world');
    act(() => result.current.execute('cd /tmp'));
    expect(last(result.current.history).status).toBe('success');
  });

  it('pwd/whoami/date/uptime/history/exit/quit 固定输出', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('pwd'));
    expect(last(result.current.history).output).toBe('~/.cpim-cloudpivot');
    act(() => result.current.execute('whoami'));
    expect(last(result.current.history).output).toBe('admin@cpim-cloudpivot');
    act(() => result.current.execute('date'));
    expect(last(result.current.history).status).toBe('success');
    act(() => result.current.execute('uptime'));
    expect(last(result.current.history).output).toContain('load average');
    act(() => result.current.execute('history'));
    expect(last(result.current.history).output).toContain('Command history');
    act(() => result.current.execute('exit'));
    expect(last(result.current.history).output).toContain('Ctrl+`');
    act(() => result.current.execute('quit'));
    expect(last(result.current.history).output).toContain('Ctrl+`');
  });

  it('ls 无参列出根目录; 已知目录成功; 未知目录报错', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('ls'));
    expect(last(result.current.history).output).toContain('logs/');
    act(() => result.current.execute('ls logs'));
    expect(last(result.current.history).output).toContain('node/');
    act(() => result.current.execute('ls configs'));
    expect(last(result.current.history).output).toContain('patrol.json');
    act(() => result.current.execute('ls no-such-dir'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('No such file');
  });

  it('df/htop/top/ping/fastfetch/neofetch 系统命令', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('df'));
    expect(last(result.current.history).output).toContain('/mnt/nas');
    act(() => result.current.execute('htop'));
    expect(last(result.current.history).output).toContain('PID');
    act(() => result.current.execute('top'));
    expect(last(result.current.history).output).toContain('PID');
    act(() => result.current.execute('ping gateway.local'));
    expect(last(result.current.history).output).toContain('PING gateway.local');
    act(() => result.current.execute('ping'));
    expect(last(result.current.history).output).toContain('PING localhost');
    act(() => result.current.execute('fastfetch'));
    expect(last(result.current.history).output).toContain('Memory: 128GB');
    act(() => result.current.execute('neofetch'));
    expect(last(result.current.history).output).toContain('M4 Max');
    expect(env('SYSTEM_NAME').length).toBeGreaterThan(0);
  });

  it('cat 四个已知配置文件 + 缺文件 + 缺操作数', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cat configs/patrol.json'));
    expect(last(result.current.history).output).toContain('"interval": 15');
    act(() => result.current.execute('cat configs/alerts.json'));
    expect(last(result.current.history).output).toContain('gpu_usage');
    act(() => result.current.execute('cat configs/templates.json'));
    expect(last(result.current.history).output).toContain('模型部署标准流程');
    act(() => result.current.execute('cat configs/env.json'));
    expect(last(result.current.history).output).toContain('env-config');
    act(() => result.current.execute('cat missing.txt'));
    expect(last(result.current.history).status).toBe('error');
    act(() => result.current.execute('cat'));
    expect(last(result.current.history).output).toContain('missing operand');
  });
});

describe('useTerminal help 与 cpim 家族', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('help / cpim help / cpim --help 输出完整命令清单', () => {
    const { result } = renderHook(() => useTerminal());
    for (const cmd of ['help', 'cpim help', 'cpim --help']) {
      act(() => result.current.execute(cmd));
      const out = last(result.current.history).output;
      expect(out).toContain('CPIM 命令');
      expect(out).toContain('Text-to-CLI');
    }
  });

  it('cpim status 总览面板', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim status'));
    const out = last(result.current.history).output;
    expect(out).toContain('活跃节点');
    expect(out).toContain('WebSocket');
    expect(last(result.current.history).status).toBe('success');
  });

  it('cpim node 列表 / 详情 / restart(含 --force 分支)', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim node'));
    expect(last(result.current.history).output).toContain('共 7 节点');
    act(() => result.current.execute('cpim node GPU-A100-01'));
    expect(last(result.current.history).output).toContain('节点详情: GPU-A100-01');
    act(() => result.current.execute('cpim node restart'));
    expect(last(result.current.history).output).not.toContain('强制');
    act(() => result.current.execute('cpim node restart --all --force'));
    expect(last(result.current.history).output).toContain('强制');
  });

  it('cpim model list(缺省与显式) / deploy(缺省名) / 未知操作', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim model'));
    expect(last(result.current.history).output).toContain('已部署模型');
    act(() => result.current.execute('cpim model list'));
    expect(last(result.current.history).output).toContain('DeepSeek-V3');
    act(() => result.current.execute('cpim model deploy'));
    expect(last(result.current.history).output).toContain('unknown');
    act(() => result.current.execute('cpim model deploy Qwen-72B'));
    expect(last(result.current.history).output).toContain('Qwen-72B 部署成功');
    act(() => result.current.execute('cpim model bogus'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('未知模型操作');
  });

  it('cpim alerts 告警列表', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim alerts'));
    expect(last(result.current.history).output).toContain('共 5 条告警');
  });

  it('cpim patrol run/history/status + --full 分支', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim patrol run'));
    expect(last(result.current.history).output).not.toContain('完整模式');
    act(() => result.current.execute('cpim patrol run --full'));
    expect(last(result.current.history).output).toContain('完整模式');
    act(() => result.current.execute('cpim patrol history'));
    expect(last(result.current.history).output).toContain('巡查历史');
    act(() => result.current.execute('cpim patrol'));
    expect(last(result.current.history).output).toContain('巡查状态');
  });

  it('cpim report 默认性能/JSON 与 health/markdown 分支', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim report'));
    expect(last(result.current.history).output).toContain('性能');
    expect(last(result.current.history).output).toContain('JSON');
    act(() => result.current.execute('cpim report health markdown'));
    expect(last(result.current.history).output).toContain('健康');
    expect(last(result.current.history).output).toContain('Markdown');
  });

  it('cpim config list/get(命中与未命中)/set(完整与缺参)/无操作', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim config list'));
    expect(last(result.current.history).output).toContain('系统配置');
    act(() => result.current.execute('cpim config get patrol.interval'));
    expect(last(result.current.history).output).toBe('patrol.interval = 15');
    act(() => result.current.execute('cpim config get no.such'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('未找到配置项');
    act(() => result.current.execute('cpim config set ws.endpoint wss://x'));
    expect(last(result.current.history).output).toContain('已更新');
    act(() => result.current.execute('cpim config set onlykey'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('用法');
    act(() => result.current.execute('cpim config'));
    expect(last(result.current.history).output).toContain('cpim config [get|set|list]');
  });

  it('cpim 未知子命令报错', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('cpim nonsense'));
    expect(last(result.current.history).output).toContain('未知子命令');
  });
});

describe('useTerminal env 命令（真实读写 env-config）', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('env 与 env list 列出全部配置', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('env'));
    let out = last(result.current.history).output;
    expect(out).toContain('环境变量配置');
    expect(out).toContain('SYSTEM_NAME');
    act(() => result.current.execute('env list'));
    out = last(result.current.history).output;
    expect(out).toContain('优先级');
  });

  it('env get 命中 / 缺参 / 模糊提示 / 未找到', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('env get SYSTEM_NAME'));
    expect(last(result.current.history).output).toContain('SYSTEM_NAME =');
    act(() => result.current.execute('env get'));
    expect(last(result.current.history).output).toContain('用法: env get');
    act(() => result.current.execute('env get SYSTEM_NAM'));
    expect(last(result.current.history).output).toContain('相似变量');
    act(() => result.current.execute('env get NOT_A_KEY_XYZ'));
    expect(last(result.current.history).output).toContain('未找到环境变量');
  });

  it('env set 字符串(含引号剥离)/布尔/浮点/整数/非法数值/未知键/缺参', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('env set SYSTEM_NAME "My System"'));
    expect(last(result.current.history).output).toContain('已保存到 localStorage');
    expect(getEnvConfig().SYSTEM_NAME).toBe('My System');

    act(() => result.current.execute('env set ENABLE_DEBUG true'));
    expect(getEnvConfig().ENABLE_DEBUG).toBe(true);
    act(() => result.current.execute('env set ENABLE_MOCK_MODE false'));
    expect(getEnvConfig().ENABLE_MOCK_MODE).toBe(false);

    act(() => result.current.execute('env set DEFAULT_AI_TEMPERATURE 0.9'));
    expect(getEnvConfig().DEFAULT_AI_TEMPERATURE).toBe(0.9);
    act(() => result.current.execute('env set DEFAULT_AI_TIMEOUT 5000'));
    expect(getEnvConfig().DEFAULT_AI_TIMEOUT).toBe(5000);

    act(() => result.current.execute('env set DEFAULT_AI_TEMPERATURE abc'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('无效数值');

    act(() => result.current.execute('env set NOT_A_KEY x'));
    expect(last(result.current.history).output).toContain('未知变量');

    act(() => result.current.execute('env set SYSTEM_NAME'));
    expect(last(result.current.history).output).toContain('用法: env set');
  });

  it('env reset 无确认(info) / --confirm / -y', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('env set SYSTEM_NAME changed'));
    act(() => result.current.execute('env reset'));
    expect(last(result.current.history).status).toBe('info');
    expect(last(result.current.history).output).toContain('--confirm');
    expect(getEnvConfig().SYSTEM_NAME).toBe('changed');
    act(() => result.current.execute('env reset -y'));
    expect(last(result.current.history).output).toContain('恢复默认');
    expect(getEnvConfig().SYSTEM_NAME).not.toBe('changed');
    act(() => result.current.execute('env set SYSTEM_NAME again'));
    act(() => result.current.execute('env reset --confirm'));
    expect(getEnvConfig().SYSTEM_NAME).not.toBe('again');
  });

  it('env export 输出 JSON; env bogus 报未知操作', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('env export'));
    expect(last(result.current.history).output).toContain('_type');
    act(() => result.current.execute('env bogus'));
    expect(last(result.current.history).output).toContain('未知 env 操作');
  });
});

describe('useTerminal goto/open 路由跳转', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('无参列出全部路由', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('goto'));
    const out = last(result.current.history).output;
    expect(out).toContain('可用路由');
    expect(out).toContain('/patrol');
    act(() => result.current.execute('open'));
    expect(last(result.current.history).output).toContain('可用路由');
  });

  it('路径直达 / 中文标签匹配 / open 同义', () => {
    const { result } = renderHook(() => useTerminal());
    const onNavigate = vi.fn();
    const { result: r2 } = renderHook(() => useTerminal({ onNavigate }));
    act(() => r2.current.execute('goto /ide'));
    expect(last(r2.current.history).output).toContain('IDE 面板');
    expect(onNavigate).toHaveBeenCalledWith('/ide');

    act(() => r2.current.execute('goto 终端'));
    expect(last(r2.current.history).output).toContain('导航至: 终端');
    expect(onNavigate).toHaveBeenCalledWith('/terminal');

    act(() => r2.current.execute('open /patrol'));
    expect(onNavigate).toHaveBeenCalledWith('/patrol');
  });

  it('未知路由报错', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('goto /nope'));
    expect(last(result.current.history).status).toBe('error');
    expect(last(result.current.history).output).toContain('未知路由');
  });
});

describe('useTerminal AI Text-to-CLI（模块私有 aiTextToCli 全分支）', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(onNavigate?: (p: string) => void) {
    const rendered = renderHook(() => useTerminal({ onNavigate }));
    const runAi = (prompt: string) => {
      act(() => rendered.result.current.execute(`ai ${prompt}`));
      const suggestionEntry = last(rendered.result.current.history);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      return { suggestionEntry, follow: last(rendered.result.current.history) };
    };
    return { rendered, runAi };
  }

  it('ai 无参数输出用法', () => {
    const { rendered } = setup();
    act(() => rendered.result.current.execute('ai'));
    expect(last(rendered.result.current.history).output).toContain('用法: ai');
  });

  it.each([
    ['查看所有节点状态', 'cpim node'],
    ['重启异常节点', 'cpim node restart --all --force'],
    ['查看告警', 'cpim alerts --unresolved'],
    ['执行巡查', 'cpim patrol run --full'],
    ['模型列表', 'cpim model list'],
    ['部署 llama 模型', 'cpim model deploy llama'],
    ['部署模型', 'cpim model deploy LLaMA-70B'],
    ['生成性能报告', 'cpim report --type performance --format json'],
    ['查看环境变量', 'env list'],
    ['看看磁盘', 'df'],
    ['cpu 占用如何', 'htop'],
    ['测试网络延迟', 'ping 192.168.3.1'],
    ['显示系统信息', 'neofetch'],
    ['显示帮助', 'help'],
    ['随便说点什么', 'cpim status'],
  ])('ai "%s" → 建议 %s 并自动执行', (prompt, suggestion) => {
    const { rendered, runAi } = setup();
    const { suggestionEntry, follow } = runAi(prompt);
    expect(suggestionEntry.output).toContain('AI Text-to-CLI');
    expect(suggestionEntry.output).toContain(suggestion);
    expect(follow.input).toBe(suggestion);
    expect(follow.output.length).toBeGreaterThan(0);
    expect(last(rendered.result.current.history).input).toBe(suggestion);
  });

  it('ai 跳转意图触发 onNavigate（监控 / 操作 / 设置 / 缺省）', () => {
    const onNavigate = vi.fn();
    const { runAi } = setup(onNavigate);
    expect(runAi('跳转到监控页面').follow.output).toContain('数据监控');
    expect(onNavigate).toHaveBeenCalledWith('/');
    expect(runAi('去操作中心看看').follow.output).toContain('操作中心');
    expect(onNavigate).toHaveBeenCalledWith('/operations');
    expect(runAi('跳转 设置').follow.output).toContain('系统设置');
    expect(onNavigate).toHaveBeenCalledWith('/settings');
    // 无子意图命中 → 缺省跳首页
    expect(runAi('去一个不存在的地方').follow.output).toContain('数据监控');
    expect(onNavigate).toHaveBeenLastCalledWith('/');
  });

  it('ai 建议为 clear 时抑制 follow-up 条目（__CLEAR__ 分支）', () => {
    const { rendered, runAi } = setup();
    const before = rendered.result.current.history.length;
    const { suggestionEntry } = runAi('清屏');
    expect(suggestionEntry.output).toContain('clear');
    // follow-up 被 __CLEAR__ 抑制，仅 AI 提示条目入史
    expect(rendered.result.current.history.length).toBe(before + 1);
  });
});

describe('useTerminal kb 知识库命令（真实 local-knowledge-base）', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('kb 与 kb search 缺关键词 → 用法', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('kb'));
    expect(last(result.current.history).output).toContain('kb search');
    act(() => result.current.execute('kb search'));
    expect(last(result.current.history).output).toContain('kb search');
  });

  it('kb search 命中 → 相关度结果列表; 未命中 → 空结果提示', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('kb search react'));
    const out = last(result.current.history).output;
    expect(out).toContain('知识库检索');
    expect(out).toContain('相关度:');
    expect(out).toContain('[1]');
    // tokenize 产出 0 词元的纯符号查询 → 检索空结果分支
    act(() => result.current.execute('kb search !!!'));
    expect(last(result.current.history).output).toContain('未找到');
  });

  it('kb list / stats / categories / 未知子命令', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.execute('kb list'));
    const listOut = last(result.current.history).output;
    expect(listOut).toContain('知识库条目列表');
    act(() => result.current.execute('kb stats'));
    const statsOut = last(result.current.history).output;
    expect(statsOut).toContain('总条目数:');
    expect(statsOut).toContain('分类数:');
    expect(statsOut).toContain('关键词数:');
    act(() => result.current.execute('kb categories'));
    const catsOut = last(result.current.history).output;
    expect(catsOut).toContain('知识库分类');
    expect(catsOut).toContain('·');
    act(() => result.current.execute('kb bogus'));
    expect(last(result.current.history).output).toContain('用法: kb');
  });
});

describe('useTerminal 补全引擎与历史导航', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvConfig();
  });

  it('handleInputChange 首词补全（含精确匹配排除与无匹配）', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleInputChange('cp'));
    expect(result.current.completions).toEqual(['cpim']);
    act(() => result.current.handleInputChange('cpim'));
    expect(result.current.completions).toEqual([]);
    act(() => result.current.handleInputChange('zzz'));
    expect(result.current.completions).toEqual([]);
    act(() => result.current.handleInputChange('   '));
    expect(result.current.completions).toEqual([]);
    act(() => result.current.handleInputChange('HI'));
    expect(result.current.completions).toEqual(['history']);
  });

  it('env 子命令补全与键名补全', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleInputChange('env l'));
    expect(result.current.completions).toEqual(['list']);
    act(() => result.current.handleInputChange('env get SYST'));
    expect(result.current.completions).toContain('SYSTEM_NAME');
    act(() => result.current.handleInputChange('env set SYST'));
    expect(result.current.completions).toContain('SYSTEM_VERSION');
    // 4 段以上（值已给全）不再补全键名
    act(() => result.current.handleInputChange('env get SYSTEM_NAME X'));
    expect(result.current.completions).toEqual([]);
  });

  it('cpim 子命令补全（两层）与未知子命令空补全', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleInputChange('cpim n'));
    expect(result.current.completions).toEqual(['node']);
    act(() => result.current.handleInputChange('cpim node re'));
    expect(result.current.completions).toEqual(['restart']);
    act(() => result.current.handleInputChange('cpim bogus x'));
    expect(result.current.completions).toEqual([]);
  });

  it('goto/open 路由补全与 ls/cat 文件补全', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleInputChange('goto /f'));
    expect(result.current.completions).toEqual(['/follow-up', '/files']);
    act(() => result.current.handleInputChange('open /'));
    expect(result.current.completions).toContain('/patrol');
    act(() => result.current.handleInputChange('ls l'));
    expect(result.current.completions).toContain('logs');
    expect(result.current.completions).toContain('logs/node');
    act(() => result.current.handleInputChange('cat configs/p'));
    expect(result.current.completions).toContain('configs/patrol.json');
    act(() => result.current.handleInputChange('echo done'));
    expect(result.current.completions).toEqual([]);
  });

  it('applyCompletion 替换最后一个词并追加空格', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleInputChange('cp'));
    expect(result.current.completions).toEqual(['cpim']);
    act(() => result.current.applyCompletion('cpim'));
    expect(result.current.inputValue).toBe('cpim ');
    expect(result.current.completions).toEqual([]);
  });

  it('历史导航 up/down：空历史 no-op、循环与回退', () => {
    const { result } = renderHook(() => useTerminal());
    act(() => result.current.handleHistoryNav('up'));
    act(() => result.current.handleHistoryNav('down'));
    expect(result.current.inputValue).toBe('');

    act(() => result.current.execute('cpim status'));
    act(() => result.current.execute('env list'));
    act(() => result.current.handleHistoryNav('up'));
    expect(result.current.inputValue).toBe('env list');
    act(() => result.current.handleHistoryNav('up'));
    expect(result.current.inputValue).toBe('cpim status');
    act(() => result.current.handleHistoryNav('up')); // clamp at oldest
    expect(result.current.inputValue).toBe('cpim status');
    act(() => result.current.handleHistoryNav('down'));
    expect(result.current.inputValue).toBe('env list');
    act(() => result.current.handleHistoryNav('down'));
    expect(result.current.inputValue).toBe('');
    act(() => result.current.handleHistoryNav('down')); // below bottom stays ''
    expect(result.current.inputValue).toBe('');
  });
});
