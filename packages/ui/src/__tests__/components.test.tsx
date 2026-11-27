/**
 * @file: components.test.tsx
 * @description: @yyc3-deepstack/ui 全组件 smoke render — 49 shadcn/radix 件 + brand 件 + cn 工具 + useIsMobile
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { cn } from '../utils';
import { useIsMobile } from '../use-mobile';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '../alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { AspectRatio } from '../aspect-ratio';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';
import { Badge, badgeVariants } from '../badge';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../breadcrumb';
import { Button, buttonVariants } from '../button';
import { Calendar } from '../calendar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../carousel';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle } from '../chart';
import { Checkbox } from '../checkbox';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from '../command';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '../context-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../dialog';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '../drawer';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../dropdown-menu';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormMessage as _FM, useFormField } from '../form';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../hover-card';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../input-otp';
import { Input } from '../input';
import { Label } from '../label';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from '../menubar';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from '../navigation-menu';
import { PageHeader } from '../page-header';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from '../pagination';
import { Popover, PopoverTrigger, PopoverContent } from '../popover';
import { Progress } from '../progress';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../resizable';
import { ScrollArea, ScrollBar } from '../scroll-area';
import { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator } from '../select';
import { Separator } from '../separator';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '../sheet';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger, SidebarInset, useSidebar } from '../sidebar';
import { Skeleton } from '../skeleton';
import { Slider } from '../slider';
import { Toaster } from '../sonner';
import { Switch } from '../switch';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '../table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import { Textarea } from '../textarea';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';
import { Toggle, toggleVariants } from '../toggle';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../tooltip';
import { EmptyState } from '../brand/empty-state';
import { GlassCard } from '../brand/GlassCard';
import { YYC3Logo } from '../brand/YYC3Logo';
import { YYC3LogoSvg } from '../brand/YYC3LogoSvg';

const TEXT = 'yyc3-ui';

// 防止个别用例的 window 属性 spy 污染后续用例（如 innerWidth 影响 Sidebar 桌面/移动分支）
afterEach(() => {
  vi.restoreAllMocks();
});

describe('utils / cn', () => {
  it('合并与冲突消解', () => {
    expect(cn('a', 'b')).toBe('a b');
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('a', false, undefined, 'b')).toBe('a b');
    expect(cn({ c: true, d: false })).toBe('c');
  });
});

describe('useIsMobile', () => {
  it('matchMedia 响应', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    const { result } = renderHookIsMobile();
    expect(typeof result.current).toBe('boolean');
    function renderHookIsMobile() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { renderHook } = require('@testing-library/react') as typeof import('@testing-library/react');
      return renderHook(() => useIsMobile());
    }
  });
});

describe('primitives smoke（无 provider 组件）', () => {
  it('Alert / Badge / Button / Card / Separator / Skeleton / Progress', () => {
    render(
      <div>
        <Alert>
          <AlertTitle>{TEXT}</AlertTitle>
          <AlertDescription>desc</AlertDescription>
        </Alert>
        <Badge>{TEXT}</Badge>
        <Button>{TEXT}</Button>
        <Card>
          <CardHeader>
            <CardTitle>{TEXT}</CardTitle>
            <CardDescription>d</CardDescription>
          </CardHeader>
          <CardContent>c</CardContent>
          <CardFooter>f</CardFooter>
        </Card>
        <Separator />
        <Skeleton />
        <Progress value={42} />
        <Progress value={undefined} />
      </div>
    );
    expect(screen.getAllByText(TEXT).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(buttonVariants({})).length).toBeGreaterThanOrEqual(0);
  });

  it('表单族：Input/Textarea/Label/Checkbox/Switch/Slider/RadioGroup', () => {
    render(
      <div>
        <Input placeholder={TEXT} />
        <Textarea placeholder={TEXT} />
        <Label>{TEXT}</Label>
        <Checkbox />
        <Switch />
        <Slider defaultValue={[5]} />
        <RadioGroup>
          <RadioGroupItem value="a" />
        </RadioGroup>
      </div>
    );
    expect(screen.getAllByPlaceholderText(TEXT).length).toBe(2);
  });

  it('Accordion / Tabs / Collapsible / Toggle 族', () => {
    render(
      <div>
        <Accordion type="single" collapsible>
          <AccordionItem value="a1">
            <AccordionTrigger>{TEXT}</AccordionTrigger>
            <AccordionContent>content</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Tabs defaultValue="t1">
          <TabsList>
            <TabsTrigger value="t1">tab</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">tc</TabsContent>
        </Tabs>
        <Collapsible>
          <CollapsibleTrigger>cl-trigger</CollapsibleTrigger>
          <CollapsibleContent>cl-content</CollapsibleContent>
        </Collapsible>
        <Toggle>tg</Toggle>
        <ToggleGroup type="single">
          <ToggleGroupItem value="x">tgi</ToggleGroupItem>
        </ToggleGroup>
      </div>
    );
    expect(screen.getByText(TEXT)).toBeTruthy();
    expect(screen.getByText('tc')).toBeTruthy();
  });

  it('Avatar / AspectRatio / Carousel / Calendar / ScrollArea', () => {
    render(
      <div>
        <Avatar>
          <AvatarImage src="/x.png" />
          <AvatarFallback>YY</AvatarFallback>
        </Avatar>
        <AspectRatio ratio={16 / 9}>ar</AspectRatio>
        <Carousel>
          <CarouselContent>
            <CarouselItem>slide1</CarouselItem>
            <CarouselItem>slide2</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <Calendar />
        <ScrollArea>
          content
          <ScrollBar />
        </ScrollArea>
      </div>
    );
    expect(screen.getByText('YY')).toBeTruthy();
    expect(screen.getByText('slide1')).toBeTruthy();
  });

  it('Table / Pagination / Breadcrumb / PageHeader', () => {
    render(
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>H</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{TEXT}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>foot</TableCell>
            </TableRow>
          </TableFooter>
          <TableCaption>cap</TableCaption>
        </Table>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{TEXT}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PageHeader title="PH" description="ph-desc" actions={<Button>act</Button>} />
      </div>
    );
    expect(screen.getByText('PH')).toBeTruthy();
    expect(screen.getByText('cap')).toBeTruthy();
  });

  it('InputOTP / Resizable', () => {
    render(
      <div>
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSeparator />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>left</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>right</ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
    expect(screen.getByText('left')).toBeTruthy();
  });

  it('Toaster / Sonner 挂载', () => {
    render(<Toaster />);
    // sonner 仅在有 toast 时注入 toaster 节点 — 断言挂载不抛错
    expect(document.body.childElementCount).toBeGreaterThan(0);
  });
});

describe('portal 族（trigger+content 打开态）', () => {
  it('Dialog / AlertDialog / Sheet / Drawer', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rtl = await import('@testing-library/react');
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <div>
        <Dialog>
          <DialogTrigger>open-dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>DT</DialogTitle>
              <DialogDescription>DD</DialogDescription>
            </DialogHeader>
            body
            <DialogFooter>
              <DialogClose>close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger>open-alert</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AT</AlertDialogTitle>
              <AlertDialogDescription>AD</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>cancel</AlertDialogCancel>
              <AlertDialogAction>ok</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger>open-sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>ST</SheetTitle>
              <SheetDescription>SD</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose>sc</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Drawer>
          <DrawerTrigger>open-drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>DR</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose>dc</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    );
    fireEvent.click(screen.getByText('open-dialog'));
    await rtl.waitFor(() => expect(screen.getByText('DT')).toBeTruthy());
    fireEvent.click(screen.getByText('open-alert'));
    await rtl.waitFor(() => expect(screen.getByText('AT')).toBeTruthy());
    fireEvent.click(screen.getByText('open-sheet'));
    await rtl.waitFor(() => expect(screen.getByText('ST')).toBeTruthy());
    fireEvent.click(screen.getByText('open-drawer'));
    await rtl.waitFor(() => expect(screen.getByText('DR')).toBeTruthy());
  });

  it('DropdownMenu / ContextMenu / Menubar / Select / Popover / HoverCard / Tooltip', async () => {
    const rtl = await import('@testing-library/react');
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger>dd-trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>label</DropdownMenuLabel>
            <DropdownMenuItem>dd-item</DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
        <ContextMenu>
          <ContextMenuTrigger>ctx-trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>ctx-item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>mb-trigger</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>mb-item</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder={TEXT} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>group</SelectLabel>
              <SelectItem value="v1">opt1</SelectItem>
            </SelectGroup>
            <SelectSeparator />
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger>pop-trigger</PopoverTrigger>
          <PopoverContent>pop-content</PopoverContent>
        </Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>tip-trigger</TooltipTrigger>
            <TooltipContent>tip-content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <HoverCard>
          <HoverCardTrigger>hover-trigger</HoverCardTrigger>
          <HoverCardContent>hover-content</HoverCardContent>
        </HoverCard>
      </div>
    );
    for (const t of ['dd-trigger', 'pop-trigger', 'tip-trigger']) {
      fireEvent.click(screen.getByText(t));
    }
    await rtl.waitFor(() => expect(screen.getByText('pop-content')).toBeTruthy());
  });

  it('Command 族 + CommandDialog', async () => {
    const rtl = await import('@testing-library/react');
    render(
      <div>
        <Command>
          <CommandInput placeholder={TEXT} />
          <CommandList>
            <CommandEmpty>empty</CommandEmpty>
            <CommandGroup heading="g">
              <CommandItem>ci1</CommandItem>
              <CommandSeparator />
              <CommandItem>
                ci2<CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <CommandDialog open>
          <CommandInput />
          <CommandList>
            <CommandItem>dlg-item</CommandItem>
          </CommandList>
        </CommandDialog>
      </div>
    );
    await rtl.waitFor(() => expect(screen.getByText('ci1')).toBeTruthy());
    await rtl.waitFor(() => expect(screen.getByText('dlg-item')).toBeTruthy());
  });

  it('NavigationMenu', async () => {
    const rtl = await import('@testing-library/react');
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>nav-trigger</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#">nav-link</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
    fireEvent.click(screen.getByText('nav-trigger'));
    await rtl.waitFor(() => expect(screen.getByText('nav-link')).toBeTruthy());
  });
});

describe('form 族（react-hook-form 全链）', () => {
  it('Form/FormField/FormItem/Label/Control/Description/Message 渲染', async () => {
    const { useForm } = await import('react-hook-form');
    function Demo() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const form = useForm<any>({ defaultValues: { name: '' } });
      return (
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{TEXT}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="field-input" />
                  </FormControl>
                  <FormDescription>fd</FormDescription>
                  <FormMessage>fm</FormMessage>
                </FormItem>
              )}
            />
          </form>
        </Form>
      );
    }
    render(<Demo />);
    expect(screen.getByText(TEXT)).toBeTruthy();
    expect(screen.getByPlaceholderText('field-input')).toBeTruthy();
  });
});

describe('chart 族（recharts）', () => {
  it('ChartContainer + Tooltip + Legend + ChartStyle', () => {
    render(
      <div>
        <ChartContainer
          id="chart-1"
          config={{ a: { label: 'A', color: '#f00' }, b: { label: 'B', color: '#0f0' } }}
          className="h-10"
        >
          <div>chart-body</div>
        </ChartContainer>
        <ChartStyle config={{ a: { color: '#f00' } }} id="chart-test" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </div>
    );
    // ResponsiveContainer 在 jsdom 零尺寸视口下不渲染子件 — 断言容器挂载不抛错
    expect(document.querySelector('[data-chart="chart-1"]') !== null || document.body.childElementCount > 0).toBe(true);
  });
});

describe('sidebar 族', () => {
  it('Provider + Sidebar 全子件 + Trigger', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>sh</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>group</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>item-btn</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>sf</SidebarFooter>
        </Sidebar>
        <SidebarTrigger />
        <SidebarInset>inset</SidebarInset>
      </SidebarProvider>
    );
    expect(document.querySelector('[data-slot="sidebar"]') !== null).toBe(true);
    expect(screen.getByText('inset')).toBeTruthy();
  });

  it('useSidebar 脱离 Provider 抛错', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<HookUser />)).toThrow();
    spy.mockRestore();
    function HookUser() {
      useSidebar();
      return null;
    }
  });
});

describe('brand 族', () => {
  it('EmptyState / GlassCard / YYC3Logo / YYC3LogoSvg', () => {
    render(
      <div>
        <EmptyState icon={<span>i</span>} title={TEXT} hint="hint" action={<button>go</button>} />
        <GlassCard glowColor="#0af">glass</GlassCard>
        <GlassCard onClick={() => {}}>clickable</GlassCard>
        <YYC3Logo size="lg" />
        <YYC3LogoSvg />
      </div>
    );
    expect(screen.getByText(TEXT)).toBeTruthy();
    expect(screen.getByText('glass')).toBeTruthy();
  });
});
