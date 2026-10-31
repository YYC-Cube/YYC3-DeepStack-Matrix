// /hooks/useQuery.ts

interface QueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

function useQuery<T>(options: QueryOptions<T>) {
  // 实现数据获取、缓存、重试逻辑
}

// 使用示例：
const { data, isLoading, error } = useQuery({
  queryKey: ['members'],
  queryFn: fetchMembers,
  staleTime: 5 * 60 * 1000 // 5分钟
});
