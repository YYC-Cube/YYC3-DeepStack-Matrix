/**
 * YYC3LogoSvg.tsx
 * ================
 * YYC³ 品牌 Logo — 9 档真实 PNG 按尺寸自适应 (FIX-004)
 *
 * 资源优先级:
 *   1. Figma 沙箱环境: figma:asset/* (Figma Make iframe 专用)
 *   2. 独立环境:       public/yyc3-icons/ 本地真实 PNG (9 档)
 *   3. 加载失败:       GitHub Raw CDN 兜底 (onerror)
 *   4. 极端兜底:       内联 SVG data URI
 *
 * 尺寸档位: 16/32/48/64/96/128/192/256/512
 * 引用组件零改动兼容 (<YYC3LogoSvg size={n} />)
 */

import React from "react";
import { icons, iconsCDN } from "../lib/yyc3-icons";

/** 极端兜底占位图标 (内联 SVG data URI) */
const FALLBACK_LOGO =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="43" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#040a16" text-anchor="middle">Y3</text></svg>`
  );

// ════════════════════════════════════════════════════════════
//  9 档尺寸映射 — 本地真实 PNG (public/yyc3-icons/)
// ════════════════════════════════════════════════════════════
const LOGO_TIERS: {
  max: number;
  local: string;
  cdn: string;
}[] = [
    { max: 16, local: icons.macOS16, cdn: iconsCDN.macOS16 },
    { max: 32, local: icons.macOS32, cdn: iconsCDN.macOS32 },
    { max: 48, local: icons.androidMdpi, cdn: iconsCDN.androidMdpi },
    { max: 64, local: icons.macOS64, cdn: iconsCDN.macOS64 },
    { max: 96, local: icons.androidXhdpi, cdn: iconsCDN.androidXhdpi },
    { max: 128, local: icons.macOS128, cdn: iconsCDN.macOS128 },
    { max: 192, local: icons.webAppChrome192, cdn: iconsCDN.webAppChrome192 },
    { max: 256, local: icons.macOS256, cdn: iconsCDN.macOS256 },
    { max: Infinity, local: icons.macOS512, cdn: iconsCDN.macOS512 },
  ];

function pickTier(size: number) {
  return LOGO_TIERS.find((t) => size <= t.max) ?? LOGO_TIERS[LOGO_TIERS.length - 1];
}

// ════════════════════════════════════════════════════════════
//  Figma 沙箱兼容 — 动态 require figma:asset (仅 Figma 环境可用)
// ════════════════════════════════════════════════════════════
const figmaRequire = (globalThis as Record<string, unknown>).require as
  | ((id: string) => unknown)
  | undefined;

const FIGMA_ASSET_IDS = [
  "65ccc9dddffabc97f54f57cde65f1b53d05fd021", // 16
  "3e28796e9d06280ab8bddc1f4f760e0082b37db7", // 32
  "798bb35f982766f84fc7d8be3148a8bd3b543ef2", // 48
  "a93da949e0d41c6c020b16b5e8502eb55f46dcd4", // 64
  "710a81bbb48f97d927c9de4c9e7d81431f2b494e", // 96
  "82b7665fd5fca4ae995823612dd61a69c5380270", // 128
  "e149570c295eb277c910c4eba7fcc5a0d40d709c", // 192
  "384ff1d098a94fb683fcad8c550f1b1d6f56c936", // 256
  "a6975eaf3758b71c6977778e6ae2ec5d7c03c7db", // 512
];

/** Figma 环境: 按尺寸档位索引取 figma:asset，不可用时返回 null */
function pickFigmaLogo(size: number): string | null {
  if (!figmaRequire) return null;
  const tierIdx = LOGO_TIERS.findIndex((t) => size <= t.max);
  const id = FIGMA_ASSET_IDS[Math.max(0, tierIdx === -1 ? FIGMA_ASSET_IDS.length - 1 : tierIdx)];
  try {
    const resolved = figmaRequire(`figma:asset/${id}.png`);
    return resolved as string;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════
//  组件
// ════════════════════════════════════════════════════════════

interface YYC3LogoSvgProps {
  size?: number;
  className?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}

export function YYC3LogoSvg({
  size = 40,
  className = "",
  showText: _showText = true,
  style,
}: YYC3LogoSvgProps) {
  // 独立环境: 本地真实 PNG；Figma 环境: figma:asset；兜底 SVG
  const tier = pickTier(size);
  const src = pickFigmaLogo(size) ?? tier.local;

  // onerror → CDN 兜底 → SVG 兜底 (两级降级)
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== tier.cdn) {
      img.src = tier.cdn; // 本地 PNG 失败 → CDN
    } else if (img.src !== FALLBACK_LOGO) {
      img.src = FALLBACK_LOGO; // CDN 也失败 → 内联 SVG
    }
  };

  return (
    <img
      src={src}
      alt="YYC³ Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={style}
      draggable={false}
      onError={handleError}
    />
  );
}

export default YYC3LogoSvg;
