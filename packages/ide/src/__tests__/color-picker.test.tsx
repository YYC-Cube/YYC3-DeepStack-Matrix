/**
 * @file: color-picker.test.tsx
 * @description: 主题色选取组件用例 — ColorSwatch(开合/外点关闭/OKLCH 显示) + ColorPicker(HEX/RGB 通道/画布拾取回退/HSV 派生)
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { ColorSwatch } from '../theme/ColorSwatch';
import { ColorPicker } from '../theme/ColorPicker';

/** 受控包装：onChange 更新 value，模拟真实受控用法 */
function SwatchHarness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <ColorSwatch label="主色" value={value} onChange={setValue} />;
}

describe('ColorSwatch', () => {
  it('渲染标签/HEX 大写/OKLCH 文本', () => {
    render(<ColorSwatch label="主色" value="#00d4ff" onChange={() => {}} />);
    expect(screen.getByText('主色')).toBeInTheDocument();
    expect(screen.getByText('#00D4FF')).toBeInTheDocument();
    expect(screen.getByText(/oklch/)).toBeInTheDocument();
  });

  it('点击展开拾色器；再次点击收起', () => {
    render(<SwatchHarness initial="#00d4ff" />);
    const toggle = screen.getByText('主色').closest('button')!;
    fireEvent.click(toggle);
    expect(screen.getByTitle('HEX 颜色值')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTitle('HEX 颜色值')).not.toBeInTheDocument();
  });

  it('展开后文档 mousedown 外点 → 收起', () => {
    render(<SwatchHarness initial="#00d4ff" />);
    fireEvent.click(screen.getByText('主色').closest('button')!);
    expect(screen.getByTitle('HEX 颜色值')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTitle('HEX 颜色值')).not.toBeInTheDocument();
  });

  it('拾色器改色 → onChange 回流到 swatch 显示', () => {
    render(<SwatchHarness initial="#00d4ff" />);
    fireEvent.click(screen.getByText('主色').closest('button')!);
    const hexInput = screen.getAllByTitle('Hex 颜色值')[0];
    fireEvent.change(hexInput, { target: { value: 'ff0000' } });
    fireEvent.keyDown(hexInput, { key: 'Enter' });
    expect(screen.getByText('#FF0000')).toBeInTheDocument();
    expect(screen.getByText('主色').closest('button')!.textContent).toContain('oklch');
  });
});

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(initial = '#00d4ff') {
    const onChange = vi.fn();
    render(<ColorPicker value={initial} onChange={onChange} onClose={() => {}} />);
    // 外部 value 同步 effect 的 setTimeout(0)
    act(() => { vi.advanceTimersByTime(0); });
    return { onChange };
  }

  it('初始渲染：HEX 输入 + R/G/B 通道 + OKLCH 派生文本', () => {
    setup();
    expect(screen.getByTitle('HEX 颜色值')).toHaveValue('00d4ff');
    expect(screen.getByTitle('R 通道值')).toHaveValue(0);
    expect(screen.getByTitle('G 通道值')).toHaveValue(212);
    expect(screen.getByTitle('B 通道值')).toHaveValue(255);
    expect(screen.getByText(/oklch/)).toBeInTheDocument();
  });

  it('HEX 输入 Enter 提交（含非法字符过滤与短值补零）', () => {
    const { onChange } = setup();
    const hexInput = screen.getAllByTitle('Hex 颜色值')[0];
    fireEvent.change(hexInput, { target: { value: 'zzff00zz1' } }); // 过滤 z → ff001
    fireEvent.keyDown(hexInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('#ff0010'); // padEnd(6,'0')
  });

  it('HEX 输入 blur 提交', () => {
    const { onChange } = setup();
    const hexInput = screen.getAllByTitle('Hex 颜色值')[0];
    fireEvent.change(hexInput, { target: { value: '123456' } });
    fireEvent.blur(hexInput);
    expect(onChange).toHaveBeenLastCalledWith('#123456');
  });

  it('RGB 通道输入钳位 0-255 并联动 HEX', () => {
    const { onChange } = setup('#00d4ff');
    fireEvent.change(screen.getByTitle('R 通道值'), { target: { value: '300' } });
    expect(onChange).toHaveBeenLastCalledWith('#ffd4ff'); // 300 → 钳位 255
    fireEvent.change(screen.getByTitle('G 通道值'), { target: { value: 'abc' } }); // NaN → 0
    expect(onChange).toHaveBeenLastCalledWith('#ff00ff');
  });

  it('SV/Hue 画布 mousedown 拾取（jsdom rect 为 0 → 钳位原点）', () => {
    const { onChange } = setup();
    const canvases = document.querySelectorAll('canvas');
    expect(canvases.length).toBe(2);
    fireEvent.mouseDown(canvases[0]); // SV
    expect(onChange).toHaveBeenCalled();
    fireEvent.mouseDown(canvases[1]); // Hue
    expect(onChange).toHaveBeenCalled();
  });

  it('全局 mousemove 仅在拖拽态生效，mouseup 结束', () => {
    const { onChange } = setup();
    const canvases = document.querySelectorAll('canvas');
    fireEvent.mouseDown(canvases[1]); // hueDragging = true
    const callsAfterDown = onChange.mock.calls.length;
    fireEvent.mouseMove(window);
    expect(onChange.mock.calls.length).toBeGreaterThan(callsAfterDown);
    fireEvent.mouseUp(window);
    const callsAfterUp = onChange.mock.calls.length;
    fireEvent.mouseMove(window);
    expect(onChange.mock.calls.length).toBe(callsAfterUp); // 拖拽结束不再拾取
  });

  it('外部 value 变化 → setTimeout(0) 同步内部态', () => {
    const { rerender } = render(<ColorPicker value="#00d4ff" onChange={() => {}} onClose={() => {}} />);
    rerender(<ColorPicker value="#ff0000" onChange={() => {}} onClose={() => {}} />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByTitle('R 通道值')).toHaveValue(255);
    expect(screen.getByTitle('G 通道值')).toHaveValue(0);
  });
});
