/**
 * @file: tabs.tsx
 * @description: tabs.tsx description
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-03-19
 * @updated: 2026-03-19
 * @status: active
 * @tags: [tag1],[tag2],[tag3]
 */

"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // 分段控件(对照 YYC³ 设计体系):内缩容器 + 触发器间 gap,选中态青色描边底
        "inline-flex h-10 w-fit items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3.5 py-1 text-sm font-medium whitespace-nowrap text-[#8b9bb4] transition-colors",
        "hover:text-[#e0f0ff]",
        "focus-visible:ring-[3px] focus-visible:ring-[rgba(0,212,255,0.25)] focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-[rgba(0,212,255,0.12)] data-[state=active]:text-[#00d4ff] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(0,212,255,0.35)]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
