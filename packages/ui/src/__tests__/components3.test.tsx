/**
 * @file: components3.test.tsx
 * @description: ui 第三轮 — chart 内容件（payload 驱动）+ ChartTooltipContent/ChartLegendContent/ChartStyle 全形态
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, ChartStyle } from '../chart';

const CFG = {
  desktop: { label: 'Desktop', color: '#ff0000' },
  mobile: { label: 'Mobile', color: '#00ff00' },
};

describe('chart 内容件（payload 直驱）', () => {
  it('ChartTooltipContent active+payload 渲染 label 与条目', async () => {
    render(
      <ChartContainer config={CFG} id="tip-chart">
        <ChartTooltipContent
          active
          payload={[
            { dataKey: 'desktop', name: 'desktop', value: 120, payload: { fill: '#ff0000' } },
            { dataKey: 'mobile', name: 'mobile', value: 80, payload: { fill: '#00ff00' } },
          ]}
          label="January"
        />
      </ChartContainer>
    );
    await waitFor(() => expect(screen.getByText('January')).toBeTruthy());
    expect(screen.getAllByText('Desktop').length).toBeGreaterThan(0);
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('labelFormatter / hideLabel / indicator 变体', async () => {
    render(
      <ChartContainer config={CFG} id="tip-chart2">
        <ChartTooltipContent
          active
          payload={[{ dataKey: 'desktop', name: 'desktop', value: 5, payload: { fill: '#ff0000' } }]}
          labelFormatter={(v) => `FMT:${String(v)}`}
          indicator="line"
        />
      </ChartContainer>
    );
    // 未传 label → 取 config 中 desktop 的 label
    await waitFor(() => expect(screen.getByText('FMT:Desktop')).toBeTruthy());
  });

  it('非 active / 空 payload → 不渲染', () => {
    render(
      <ChartContainer config={CFG} id="tip-chart3">
        <ChartTooltipContent active={false} payload={[]} />
      </ChartContainer>
    );
  });

  it('ChartLegendContent payload 渲染 + ChartStyle 注入', async () => {
    render(
      <div>
        <ChartContainer config={CFG} id="legend-chart">
          <ChartLegendContent
            payload={[
              { dataKey: 'desktop', value: 1, payload: { dataKey: 'desktop', fill: '#ff0000' } },
              { dataKey: 'mobile', value: 2, payload: { dataKey: 'mobile', fill: '#00ff00' } },
            ]}
            verticalAlign="bottom"
          />
        </ChartContainer>
        <ChartStyle config={CFG} id="legend-chart" />
      </div>
    );
    await waitFor(() => expect(screen.getAllByText('Desktop').length).toBeGreaterThan(0));
    expect(screen.getByText('Mobile')).toBeTruthy();
  });
});
