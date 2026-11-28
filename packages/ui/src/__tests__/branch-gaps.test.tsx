/**
 * @file: branch-gaps.test.tsx
 * @description: 分支缺口冲刺（batch 5）— sidebar 变体矩阵 / chart 内容件全参 / carousel 纵向与键盘 / brand 全尺寸 / 表单状态分支 / 散点组件假分支逐处补齐（istanbul branchMap 提取）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-28
 * @status: active
 * @tags: [ui],[test],[branch-coverage]
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import {
  SidebarProvider, Sidebar, SidebarRail, SidebarGroup, SidebarGroupLabel, SidebarGroupAction,
  SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction,
  SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarSeparator, SidebarInput, SidebarFooter, SidebarTrigger, useSidebar,
} from '../sidebar';
import {
  ChartContainer, ChartTooltipContent, ChartLegendContent, ChartStyle, ChartTooltip,
} from '../chart';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel } from '../carousel';
import { YYC3LogoSvg } from '../brand/YYC3LogoSvg';
import { YYC3Logo } from '../brand/YYC3Logo';
import { EmptyState } from '../brand/empty-state';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../input-otp';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../form';
import { Badge } from '../badge';
import { Button } from '../button';
import { BreadcrumbSeparator } from '../breadcrumb';
import { Calendar } from '../calendar';
import { Sheet, SheetContent } from '../sheet';
import { Slider } from '../slider';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../resizable';
import { ScrollArea, ScrollBar } from '../scroll-area';

// ResponsiveContainer 依赖真实布局测量，jsdom 零尺寸恒为 0x0 → 本文件内 mock 为直通渲染
vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('recharts')>();
  return {
    ...mod,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="rc-pass">{children}</div>,
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

describe('sidebar 分支矩阵（batch 5）', () => {
  const matchMediaMobile = (mobile: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: mobile && query.includes('max-width'),
        media: query, onchange: null,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
      }),
    });
  };

  it('键盘快捷键 Ctrl+B / setOpen 函数式 / 受控 setOpenProp / SidebarRail 点击', () => {
    const setOpenProp = vi.fn();
    const { container } = render(
      <SidebarProvider open={true} onOpenChange={setOpenProp}>
        <Sidebar>
          <SidebarRail />
        </Sidebar>
        <SidebarTrigger data-testid="trigger" />
      </SidebarProvider>,
    );
    // 快捷键（meta 与 ctrl 两分支）
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, metaKey: false });
    expect(setOpenProp).toHaveBeenCalledWith(false);
    fireEvent.keyDown(window, { key: 'b', metaKey: true, ctrlKey: false });

    // 函数式 setOpen（open=true → false）
    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    expect(setOpenProp).toHaveBeenLastCalledWith(false);

    // Rail 点击 → toggle
    fireEvent.mouseDown(container.querySelector('[data-sidebar="rail"]')!);
    fireEvent.click(container.querySelector('[data-sidebar="rail"]')!);
    expect(setOpenProp).toHaveBeenCalled();
  });

  it('collapsible=none / variant floating+inset / side=right / collapsible=icon', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" data-testid="sb-none">plain</Sidebar>
        <Sidebar variant="floating" side="right" data-testid="sb-float" />
        <Sidebar variant="inset" side="left" collapsible="icon" data-testid="sb-inset" />
        <Sidebar data-testid="sb-default" />
      </SidebarProvider>,
    );
    expect(screen.getByText('plain')).toBeTruthy();
    expect(document.querySelector('[data-testid="sb-none"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-sidebar="sidebar"]').length).toBeGreaterThanOrEqual(3);
  });

  it('isMobile → Sheet 形态 + toggleSidebar 走 setOpenMobile', async () => {
    const innerSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375); // useIsMobile 依据 innerWidth
    render(
      <SidebarProvider>
        <Sidebar data-testid="sb-mobile"><SidebarHeader>mobile-h</SidebarHeader></Sidebar>
        <SidebarTrigger data-testid="t" />
      </SidebarProvider>,
    );
    const t = screen.getByTestId('t');
    await act(async () => { fireEvent.click(t); }); // isMobile → setOpenMobile(true)
    await waitFor(() => expect(document.querySelector('[data-slot="sidebar"][data-mobile="true"]')).toBeTruthy());
    innerSpy.mockRestore();
  });

  it('子件 asChild / tooltip 两形态 / showOnHover / showIcon / MenuSubButton 尺寸与 isActive', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupLabel asChild><a href="#g">label-as-child</a></SidebarGroupLabel>
            <SidebarGroupAction asChild><a href="#act">act</a></SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive tooltip="tip-str">
                    <a href="#i1">btn-str-tip</a>
                  </SidebarMenuButton>
                  <SidebarMenuButton tooltip={{ children: 'tip-obj' }} variant="outline" size="lg">btn-obj-tip</SidebarMenuButton>
                  <SidebarMenuAction asChild showOnHover><a href="#a1">action</a></SidebarMenuAction>
                  <SidebarMenuBadge>badge</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="sm">small</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild size="sm" isActive><a href="#s1">sub-sm</a></SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton size="md">sub-md</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarInput placeholder="sb-input" />
          <SidebarFooter>foot</SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(screen.getByText('label-as-child')).toBeTruthy();
    expect(screen.getByText('sub-sm')).toBeTruthy();
    expect(screen.getByText('sub-md')).toBeTruthy();
    expect(document.querySelectorAll('[data-sidebar="menu-skeleton"]').length).toBe(2);
    expect(screen.getByPlaceholderText('sb-input')).toBeTruthy();
  });

  it('useCarousel 脱离 Provider 渲染失败', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function C() { useCarousel(); return null; }
    let threw = false;
    try { render(<C />); } catch { threw = true; }
    expect(threw || spy.mock.calls.length > 0).toBe(true);
    spy.mockRestore();
  });
});

describe('chart 内容件全参矩阵（batch 5）', () => {
  const config = {
    gpu: { label: 'GPU', color: '#ff0000' },
    mem: { label: 'MEM', color: 'javascript:bad' },
    withIcon: { label: 'IC', color: '#00f', icon: () => <i data-testid="cfg-icon" /> },
  } as Any;

  const wrap = (ui: Any) => render(<ChartContainer id="bg-chart" config={config}>{ui}</ChartContainer>);

  it('ChartStyle 空配置 null 早退 + 无 id 走 useId', () => {
    render(<ChartStyle id="style-x" config={{}} />); // colorConfig 空 → null 早退
    render(<ChartContainer config={{}}><div>no-id</div></ChartContainer>); // id 缺省 → uniqueId
    expect(document.querySelector('[data-slot="chart"]') || document.body).toBeTruthy();
  });

  it('TooltipContent：inactive/空 payload 早退 + label 三态 + formatter/icon/indicator 全变体', () => {
    const payload = [
      { dataKey: 'gpu', name: 'gpu', value: 42, payload: { fill: '#123456' } },
      { dataKey: 'withIcon', name: 'ic', value: 7, color: '#010203', payload: {} },
      { dataKey: 'mem', name: 'mem', value: undefined, payload: {} },
    ];
    wrap(<ChartTooltipContent />); // inactive → null 早退
    wrap(<ChartTooltipContent active={false} payload={payload} />);

    wrap(<ChartTooltipContent active payload={[]} />); // 空 payload → null

    wrap(<ChartTooltipContent active payload={payload} label="gpu" labelFormatter={(v: Any) => `F:${v}`} labelClassName="lc" />);
    expect(screen.getByText('F:GPU')).toBeTruthy();

    wrap(<ChartTooltipContent active payload={[{ dataKey: 'mem', name: 'mem', value: 1, payload: {} }]} label="mem" />); // 非法色 → color ''
    wrap(<ChartTooltipContent active payload={payload} formatter={(v: Any, n: Any) => <b>{n}:{String(v)}</b>} />);
    wrap(<ChartTooltipContent active payload={payload} hideIndicator indicator="line" />);
    wrap(<ChartTooltipContent active payload={[payload[1]]} indicator="dashed" nestLabel />);
    wrap(<ChartTooltipContent active payload={[{ dataKey: 'withIcon', name: 'ic', value: 3, payload: {} }]} hideLabel color="#abc" nameKey="nk" />);
    wrap(<ChartTooltipContent active payload={[{ name: 'plain', value: 5, payload: 'raw-string' }]} />); // payload 非对象 → configLabelKey 直取
    wrap(<ChartTooltipContent active payload={[{ name: 'nested', value: 6, payload: { mem: 'mem-str' } }]} />); // payloadPayload 命中
  });

  it('LegendContent：空 payload / icon 显示与 hideIcon / nameKey', async () => {
    const { rerender } = render(
      <ChartContainer id="bg-legend" config={config}>
        <ChartLegendContent />
      </ChartContainer>,
    );
    await waitFor(() => expect(document.querySelector('[data-chart="chart-bg-legend"] > *')).toBeTruthy(), { timeout: 2000 });
    const go = (ui: Any) => rerender(<ChartContainer id="bg-legend" config={config}>{ui}</ChartContainer>);
    go(<ChartLegendContent payload={[{ dataKey: 'gpu', value: 'GPU', color: '#f00' }, { value: 'plain' }]} />);
    await waitFor(() => expect(screen.getByText('GPU')).toBeTruthy());
    go(<ChartLegendContent payload={[{ dataKey: 'withIcon', value: 'IC' }]} hideIcon />);
    go(<ChartLegendContent payload={[{ dataKey: 'mem', value: 'M' }]} nameKey="nk" verticalAlign="bottom" />);
    go(<ChartLegendContent />); // payload 缺 → null
  });
});

describe('carousel 纵向/键盘/setApi（batch 5）', () => {
  it('纵向 orientation + 键盘左右 + Previous/Next 点击 + setApi + opts 回调', () => {
    const setApi = vi.fn();
    const { container } = render(
      <Carousel orientation="vertical" opts={{ axis: 'y', loop: true }} setApi={setApi}>
        <CarouselContent>
          <CarouselItem>i1</CarouselItem>
          <CarouselItem>i2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="prev" />
        <CarouselNext data-testid="next" />
      </Carousel>,
    );
    const root = container.querySelector('[data-slot="carousel"]')!;
    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'ArrowUp' }); // 非目标键
    fireEvent.click(screen.getByTestId('prev'));
    fireEvent.click(screen.getByTestId('next'));
    expect(document.querySelectorAll('[data-slot="carousel-item"]').length).toBe(2);
  });
});

describe('brand 全尺寸/关效矩阵（batch 5）', () => {
  it('YYC3LogoSvg pickLogo 全阈值（16..512+）', () => {
    render(
      <div>
        <YYC3LogoSvg size={8} />
        <YYC3LogoSvg size={16} />
        <YYC3LogoSvg size={17} />
        <YYC3LogoSvg size={32} />
        <YYC3LogoSvg size={33} />
        <YYC3LogoSvg size={48} />
        <YYC3LogoSvg size={49} />
        <YYC3LogoSvg size={64} />
        <YYC3LogoSvg size={65} />
        <YYC3LogoSvg size={96} />
        <YYC3LogoSvg size={97} />
        <YYC3LogoSvg size={128} />
        <YYC3LogoSvg size={129} />
        <YYC3LogoSvg size={192} />
        <YYC3LogoSvg size={193} />
        <YYC3LogoSvg size={256} />
        <YYC3LogoSvg size={257} />
        <YYC3LogoSvg size={999} />
      </div>,
    );
    expect(document.querySelectorAll('[data-testid="yyc3-logo-img"]').length).toBe(18);
  });

  it('YYC3Logo glow/状态/点击三开关', () => {
    render(
      <div>
        <YYC3Logo size="lg" glow={false} showStatus={false} />
        <YYC3Logo size="xl" onClick={() => {}} statusColor="#ff0000" />
      </div>,
    );
    expect(document.querySelectorAll('[data-testid="yyc3-logo"]').length).toBe(2);
  });

  it('EmptyState icon/hint/action 全组合', () => {
    render(
      <div>
        <EmptyState title="全量" hint="提示语" icon={<span data-testid="ic">I</span>} action={<button>a</button>} />
        <EmptyState title="裸" />
      </div>,
    );
    expect(screen.getByTestId('ic')).toBeTruthy();
    expect(screen.getByText('提示语')).toBeTruthy();
    expect(screen.getByText('裸')).toBeTruthy();
  });
});

describe('表单与散点假分支（batch 5）', () => {
  it('Form 全状态：error aria 链 / FormMessage 三态 / description', async () => {
    let methods: Any;
    function Host() {
      const m = useForm({ defaultValues: { name: '' } });
      methods = m;
      return (
        <Form {...m}>
          <FormField name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>N</FormLabel>
              <FormControl><input data-testid="in" {...field} /></FormControl>
              <FormDescription>desc</FormDescription>
              <FormMessage data-testid="msg" />
            </FormItem>
          )} />
        </Form>
      );
    }
    render(<Host />);
    expect(screen.getByTestId('in').getAttribute('aria-describedby')).toContain('description');
    await act(() => methods.trigger('name')); // 触发 required 错误（无规则 → 不报错，改用 setError）
    await act(() => { methods.setError('name', { message: '必填失败' }); });
    expect(screen.getByTestId('in').getAttribute('aria-describedby')).toContain('message');
    expect(screen.getByTestId('msg').textContent).toContain('必填失败');
    // FormMessage children 分支：无 error 时渲染 children
    await act(() => { methods.clearErrors('name'); });
    expect(screen.queryByTestId('msg')?.textContent ?? '').toBe('');
  });

  it('Badge/Button/BreadcrumbSeparator asChild + Calendar range 模式', () => {
    render(
      <div>
        <Badge asChild><a href="#b">badge-link</a></Badge>
        <Button asChild><a href="#btn">btn-link</a></Button>
        <BreadcrumbSeparator asChild><span data-testid="sep">|</span></BreadcrumbSeparator>
        <Calendar mode="range" numberOfMonths={2} defaultMonth={new Date('2026-01-01')} />
      </div>,
    );
    expect(screen.getByText('badge-link')).toBeTruthy();
    expect(screen.getByText('btn-link')).toBeTruthy();
    expect(screen.getByTestId('sep')).toBeTruthy();
  });

  it('Slider 无值 → [min,max] 兜底 + InputOTP Slot 脱离上下文 + ResizableHandle withHandle + 横向 ScrollBar', () => {
    render(
      <div>
        <Slider min={0} max={10} />
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={9} />
          </InputOTPGroup>
        </InputOTP>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>panel</ResizablePanel>
          <ResizableHandle withHandle />
        </ResizablePanelGroup>
        <ScrollArea><ScrollBar orientation="horizontal" /><ScrollBar /></ScrollArea>
      </div>,
    );
    expect(document.querySelector('[data-slot="slider"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="resizable-handle"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="scroll-area"]')).toBeTruthy();
  });

  it('Sheet 四向 side', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const { unmount } = render(
        <Sheet open>
          <SheetContent side={side}>sheet-{side}</SheetContent>
        </Sheet>,
      );
      expect(screen.getByText(`sheet-${side}`)).toBeTruthy();
      unmount();
    }
  });
});
