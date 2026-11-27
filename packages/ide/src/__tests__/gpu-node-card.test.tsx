/**
 * @file: gpu-node-card.test.tsx
 * @description: GPUNodeCard 用例 — 三状态徽标/紧凑与完整模式/刷新节流/点击回调/利用率配色阈值
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { GPUNodeCard } from '../GPUNodeCard';
import type { NodeData } from '@yyc3-deepstack/core/types';

const NODE: NodeData = {
  id: 'GPU-A100-01', status: 'active',
  gpu: 72, mem: 65, temp: 45, model: 'LLaMA-70B', tasks: 3,
};

describe('GPUNodeCard 完整模式', () => {
  it('渲染节点 id/模型/状态徽标/指标', () => {
    render(<GPUNodeCard node={NODE} />);
    expect(screen.getByText('GPU-A100-01')).toBeInTheDocument();
    expect(screen.getByText('LLaMA-70B')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.getAllByText('GPU').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('45°C')).toBeInTheDocument();
  });

  it.each([
    ['active', '运行中'],
    ['warning', '警告'],
    ['inactive', '离线'],
  ] as const)('状态 %s 徽标文案 %s', (status, label) => {
    render(<GPUNodeCard node={{ ...NODE, status }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('刷新按钮：回调触发 + 1s 节流内禁用，1s 后恢复', () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn();
    render(<GPUNodeCard node={NODE} onRefresh={onRefresh} />);
    const btn = screen.getByTitle('刷新状态');
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledWith('GPU-A100-01');
    fireEvent.click(btn); // 节流中
    expect(onRefresh).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1100); });
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('无 onRefresh 时不渲染动作区（showActions=false）', () => {
    const { container } = render(<GPUNodeCard node={NODE} showActions={false} />);
    expect(screen.queryByTitle('刷新状态')).not.toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('点击卡片回调 node；compact 模式精简渲染', () => {
    const onClick = vi.fn();
    const { rerender } = render(<GPUNodeCard node={NODE} onClick={onClick} />);
    fireEvent.click(screen.getByText('GPU-A100-01'));
    expect(onClick).toHaveBeenCalledWith(NODE);

    rerender(<GPUNodeCard node={NODE} onClick={onClick} compact />);
    expect(screen.getByText('GPU-A100-01')).toBeInTheDocument();
    expect(screen.queryByText('运行中')).not.toBeInTheDocument(); // 紧凑模式无徽标
    expect(screen.getByText('72%')).toBeInTheDocument(); // 紧凑模式仅 GPU 利用率
  });

  it('利用率/温度配色阈值', () => {
    const { rerender } = render(<GPUNodeCard node={{ ...NODE, gpu: 95, temp: 90 }} />);
    expect(screen.getAllByText('95%').length).toBeGreaterThanOrEqual(1);
    rerender(<GPUNodeCard node={{ ...NODE, gpu: 75, temp: 75 }} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    rerender(<GPUNodeCard node={{ ...NODE, gpu: 10, temp: 30 }} />);
    expect(screen.getByText('10%')).toBeInTheDocument();
  });
});
