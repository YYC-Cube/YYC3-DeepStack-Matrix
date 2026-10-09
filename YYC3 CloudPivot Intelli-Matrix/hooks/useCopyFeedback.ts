/**
 * useCopyFeedback.ts
 * ====================
 * 通用"复制反馈" Hook
 *
 * 复制内容到剪贴板，并记录最近一次复制的目标 id，
 * 供 UI 在 2 秒内显示"已复制"状态反馈。
 *
 * 用法:
 *   const [copiedId, copyToClipboard] = useCopyFeedback<string>();
 *   copyToClipboard("text to copy", "msg-123");
 *   // UI: {copiedId === "msg-123" ? "已复制" : "复制"}
 */

import { useCallback, useEffect, useRef, useState } from "react";

const FEEDBACK_DURATION = 2000;

/**
 * @returns [copiedId, copyToClipboard]
 *   copiedId: 最近一次成功复制的目标 id (2 秒后自动清除)
 *   copyToClipboard: (text, id) => void
 */
export function useCopyFeedback<T>(): [T | null, (text: string, id: T) => void] {
  const [copiedId, setCopiedId] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback((text: string, id: T) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).catch(() => {
          // 剪贴板权限被拒时降级为 execCommand 方案
          legacyCopy(text);
        });
      } else {
        legacyCopy(text);
      }
    } catch {
      legacyCopy(text);
    }

    setCopiedId(id);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopiedId(null), FEEDBACK_DURATION);
  }, []);

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [copiedId, copyToClipboard];
}

/** 降级复制方案 (兼容非 HTTPS / 旧浏览器) */
function legacyCopy(text: string): void {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch {
    // 复制失败时静默忽略，仅保留 UI 反馈
  }
}
