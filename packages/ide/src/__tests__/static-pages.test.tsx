/**
 * @file: static-pages.test.tsx
 * @description: 静态审计/报告页用例 — ArchitectureAudit(6 tab 全切换 + 分类展开收起) + RefactoringReport(阶段过滤 + 严重度过滤 + 重置)
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArchitectureAudit } from '../ArchitectureAudit';
import { RefactoringReport } from '../RefactoringReport';

vi.mock('@yyc3-deepstack/core/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('ArchitectureAudit', () => {
  it('overview 默认页：标题 + 副标题渲染', () => {
    render(<ArchitectureAudit />);
    expect(screen.getByText('YYC3 架构审计全景')).toBeInTheDocument();
    expect(screen.getByText(/停止发展，先补缺失/)).toBeInTheDocument();
    expect(screen.getByText('架构概览')).toBeInTheDocument();
  });

  it('六个 tab 逐个切换并渲染内容', () => {
    render(<ArchitectureAudit />);
    // tab 文案含计数：路由/数据层/测试/缺口 数量随数据变化 → 用前缀匹配
    const click = (label: string | RegExp) => {
      const btn = screen.getAllByText(label).find((el) => el.closest('button')) ??
        screen.getAllByText(label)[0];
      fireEvent.click(btn);
    };
    click('架构概览');
    expect(screen.getByText('YYC3 架构审计全景')).toBeInTheDocument();
    click(/^路由 \(/);
    click(/^数据层 \(/);
    click(/^测试 \(/);
    click('功能清单');
    click(/^缺口 \(/);
    // 每次切换后页面都有实质内容
    expect(document.body.textContent!.length).toBeGreaterThan(300);
  });

  it('overview 分组卡片展开/收起（含路径详情）', () => {
    render(<ArchitectureAudit />);
    // overview 页有若干分组头按钮（点击展开 detail/path）——全部点一遍不抛错
    const headerButtons = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.querySelector('svg') && b.textContent && b.textContent.length > 0,
    );
    for (const b of headerButtons) {
      fireEvent.click(b);
    }
    expect(document.body.textContent!.length).toBeGreaterThan(300);
  });
});

describe('RefactoringReport', () => {
  it('默认渲染：标题 + 统计头', () => {
    render(<RefactoringReport />);
    expect(screen.getByText('YYC3 深度代码分析 & 重构方案')).toBeInTheDocument();
    expect(screen.getByText('重构阶段')).toBeInTheDocument();
    expect(screen.getByText('发现问题')).toBeInTheDocument();
    expect(screen.getByText('影响文件')).toBeInTheDocument();
    expect(screen.getByText('严重/高危')).toBeInTheDocument();
  });

  it('阶段/严重度过滤与重置交互不抛错且内容持续渲染', () => {
    render(<RefactoringReport />);
    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(3);
    // 点击所有过滤类按钮（阶段名 + 严重度 + 全部）
    for (const b of buttons) {
      const text = b.textContent ?? '';
      if (text && text.length <= 24) {
        fireEvent.click(b);
        expect(document.body.textContent!.length).toBeGreaterThan(200);
      }
    }
  });
});
