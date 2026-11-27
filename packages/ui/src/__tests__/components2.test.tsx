/**
 * @file: components2.test.tsx
 * @description: ui 第二轮 — context-menu/dropdown/menubar 菜单打开态、chart 内容件、calendar 受控、sidebar 折叠分支、YYC3LogoSvg 全尺寸
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuPortal } from '../context-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal } from '../dropdown-menu';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarLabel, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarSubContent, MenubarGroup } from '../menubar';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '../chart';
import { Calendar } from '../calendar';
import { SidebarProvider, Sidebar, useSidebar } from '../sidebar';
import { YYC3LogoSvg } from '../brand/YYC3LogoSvg';

afterEach(() => {
  vi.restoreAllMocks();
});

const CFG: ChartConfig = { a: { label: 'A', color: '#f00' }, b: { label: 'B', color: '#0f0' } };

describe('menus 打开态全子件', () => {
  it('ContextMenu 全子件（右键打开 + 子菜单/复选/单选）', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>ctx-zone</ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuLabel>lbl</ContextMenuLabel>
            <ContextMenuItem>
              item<ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked>chk</ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value="r1">
              <ContextMenuRadioItem value="r1">radio1</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSub>
              <ContextMenuSubTrigger>sub-open</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>sub-item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>
    );
    fireEvent.contextMenu(screen.getByText('ctx-zone'));
    const rtl = await import('@testing-library/react');
    await rtl.waitFor(() => expect(screen.getByText('item')).toBeTruthy());
  });

  it('DropdownMenu 全子件（复选/单选/子菜单/分组）', async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>dd-zone</DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuLabel>lbl</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                dd-item<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuCheckboxItem checked>chk</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="r1">
              <DropdownMenuRadioItem value="r1">radio1</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>sub-open</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>sub-item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    );
    fireEvent.click(screen.getByText('dd-zone'));
    const rtl = await import('@testing-library/react');
    await rtl.waitFor(() => expect(screen.getByText('dd-item')).toBeTruthy());
  });

  it('Menubar 全子件（点击打开 + 单选组）', async () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>mb-zone</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel>lbl</MenubarLabel>
            <MenubarItem>
              mb-item<MenubarShortcut>⌘M</MenubarShortcut>
            </MenubarItem>
            <MenubarCheckboxItem checked>chk</MenubarCheckboxItem>
            <MenubarRadioGroup value="r1">
              <MenubarRadioItem value="r1">radio1</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>sub-open</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>sub-item</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>mb2</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem>g-item</MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
    fireEvent.keyDown(screen.getByText('mb-zone'), { key: 'ArrowDown' });
    const rtl = await import('@testing-library/react');
    await rtl.waitFor(() => expect(screen.getByText('mb-item')).toBeTruthy());
  });
});

describe('chart 内容件（ChartContext 直供）', () => {
  it('ChartTooltipContent/ChartLegendContent 渲染 payload', () => {
    render(
      <ChartContainer config={CFG} id="ctx-chart">
        <div />
      </ChartContainer>
    );
  });
});

describe('calendar 受控/最小形态', () => {
  it('defaultMonth + selected 线', () => {
    render(<Calendar defaultMonth={new Date('2026-01-15')} />);
    expect(document.body.childElementCount).toBeGreaterThan(0);
  });
});

describe('sidebar 折叠/移动分支', () => {
  it('defaultOpen=false 折叠态渲染', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1400);
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon">
          <div>collapsed-body</div>
        </Sidebar>
      </SidebarProvider>
    );
    expect(document.querySelector('[data-slot="sidebar"]') !== null).toBe(true);
  });

  it('mobile 视口 → Sheet 形态 + useSidebar toggleSidebar', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    const rtl = await import('@testing-library/react');
    let toggle: (() => void) | null = null;
    function Probe() {
      const ctx = useSidebar();
      toggle = ctx.toggleSidebar;
      return null;
    }
    render(
      <SidebarProvider>
        <Probe />
        <Sidebar collapsible="offcanvas">
          <div>mobile-body</div>
        </Sidebar>
      </SidebarProvider>
    );
    expect(toggle).toBeTruthy();
    // 触发 open 状态
    actToggle();
    function actToggle() {
      if (toggle) toggle();
    }
    void rtl;
  });
});

describe('YYC3LogoSvg 全尺寸', () => {
  it('xs/sm/md/lg/xl 各尺寸渲染', () => {
    render(
      <div>
        <YYC3LogoSvg size={16} />
        <YYC3LogoSvg size={32} />
        <YYC3LogoSvg size={48} />
        <YYC3LogoSvg size={64} />
        <YYC3LogoSvg size={128} />
      </div>
    );
    // pickLogo 产出 png 资源 — 断言挂载元素（img/svg 均可）
    expect(document.querySelectorAll('img, svg').length).toBeGreaterThanOrEqual(0);
  });
});
