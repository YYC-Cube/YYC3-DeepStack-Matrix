/**
 * @file: usePersistedState.ts
 * @description: usePersistedState.ts
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-04-08
 * @updated: 2026-04-08
 * @status: active
 * @tags: [hook]
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreName } from "./types";
import {
  idbClear,
  idbDelete,
  idbGetAll,
  idbPut,
  idbPutMany,
  onStorageChange,
} from "./yyc3-storage";

/**
 * 持久化列表状态 — 适用于告警规则/巡查历史/闭环历史等
 *
 * @param store IndexedDB store 名称
 * @param initialData 当 IndexedDB 为空时使用的默认数据
 * @param options.maxItems 列表上限（默认 200，超出淘汰最旧记录，
 *   修复 2026-10-16 质量审核：自动巡查 15 分钟/次导致 patrolHistory/
 *   loopHistory/operationLogs 长期运行无限膨胀；与 log-slice、
 *   family-chat-slice 的 200 条上限规范对齐）
 */
export function usePersistedList<T extends { id: string }>(
  store: StoreName,
  initialData: T[] = [],
  options?: { maxItems?: number }
) {
  const [items, setItems] = useState<T[]>(initialData);
  const [loaded, setLoaded] = useState(false);
  const storeRef = useRef(store);
  const maxItems = options?.maxItems ?? 200;

  // 初始化: 从 IndexedDB 加载（修复：补 .catch，IDB 不可用时不再产生 unhandled rejection）
  useEffect(() => {
    storeRef.current = store;
    let cancelled = false;
    idbGetAll<T>(store)
      .then((data) => {
        if (!cancelled) {
          if (data.length > 0) {
            setItems(data);
          }
          setLoaded(true);
        }
      })
      .catch(() => {
        // IndexedDB 被禁用/配额异常：保留 initialData 并标记加载完成
        if (!cancelled) {
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [store]);

  // 跨标签页同步: 收到其他 Tab 的变更时重新加载
  useEffect(() => {
    const unsubscribe = onStorageChange((event) => {
      if (event.store === storeRef.current) {
        idbGetAll<T>(storeRef.current).then(setItems).catch(() => {
          // 读取失败时保留当前内存态
        });
      }
    });
    return unsubscribe;
  }, []);

  /** 添加或更新单条（新增超限时淘汰最旧记录） */
  const upsert = useCallback(async (item: T) => {
    let evicted: T[] = [];
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      const appended = [...prev, item];
      if (appended.length > maxItems) {
        evicted = appended.slice(maxItems);
        return appended.slice(0, maxItems);
      }
      return appended;
    });
    await idbPut(store, item);
    if (evicted.length > 0) {
      await Promise.all(evicted.map((e) => idbDelete(store, e.id)));
    }
  }, [store, maxItems]);

  /** 批量设置 (全量替换) */
  const setAll = useCallback(async (newItems: T[]) => {
    setItems(newItems);
    await idbClear(store);
    if (newItems.length > 0) {
      await idbPutMany(store, newItems);
    }
  }, [store]);

  /** 删除单条 */
  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await idbDelete(store, id);
  }, [store]);

  /** 清空 */
  const clear = useCallback(async () => {
    setItems([]);
    await idbClear(store);
  }, [store]);

  /** 追加一条到开头 (最新在前，超限淘汰最旧) */
  const prepend = useCallback(async (item: T) => {
    let evicted: T[] = [];
    setItems((prev) => {
      const next = [item, ...prev];
      if (next.length > maxItems) {
        evicted = next.slice(maxItems);
        return next.slice(0, maxItems);
      }
      return next;
    });
    await idbPut(store, item);
    if (evicted.length > 0) {
      await Promise.all(evicted.map((e) => idbDelete(store, e.id)));
    }
  }, [store, maxItems]);

  return {
    items,
    loaded,
    upsert,
    setAll,
    remove,
    clear,
    prepend,
    setItems,
  };
}
