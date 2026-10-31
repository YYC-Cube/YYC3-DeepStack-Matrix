// hooks/useRequest.ts （通用数据请求Hook，全项目复用）
'use client';
import { useState, useEffect } from 'react';

type UseRequestOptions<T> = {
  manual?: boolean; // 是否手动触发
  onSuccess?: (data: T) => void;
};

// 通用请求逻辑，无业务耦合
export function useRequest<T>(
  apiFn: () => Promise<T>,
  options: UseRequestOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn();
      setData(res);
      options.onSuccess?.(res);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // 自动触发请求
  useEffect(() => {
    if (!options.manual) run();
  }, [apiFn, options.manual]);

  return { data, loading, error, run };
}
