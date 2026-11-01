/**
 * API 层:传输统一走 @yyc3/leisure-core FetchTransport(幂等键内置,单源契约)
 * - 泛化 request():覆盖 leisure-core client 尚未声明的端点(rooms/store-config/approvals/taxonomy)
 * - 401(40001)统一登出并跳登录;业务错误 toast 由调用方经 toastError 处理
 * - 金额:后端 Prisma Decimal 序列化为字符串,统一 num()/fmtMoney() 收敛
 */
import { FetchTransport, LeisureApiClient, LeisureError, newIdempotencyKey } from '@yyc3/leisure-core'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

export const transport = new FetchTransport({ baseUrl: '/api/v1', getToken: () => useAuthStore.getState().token ?? undefined })

export const client = new LeisureApiClient(transport, { baseUrl: '/api/v1' })

/** 业务错误是否为未认证 → 登出跳转 */
function guardAuthError(e: unknown): boolean {
  if (e instanceof LeisureError && e.code === 40001) {
    useAuthStore.getState().logout()
    window.location.hash = '#/login'
    return true
  }
  return false
}

/** 泛化请求( leisure-core client 未覆盖的端点 ) */
export async function req<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts?: { idempotencyKey?: string },
): Promise<T> {
  try {
    return await transport.request<T>({ method, path, body, idempotencyKey: opts?.idempotencyKey })
  } catch (e) {
    if (!guardAuthError(e)) throw e
    throw e
  }
}

/** 统一错误提示(返回是否为 401,调用方可据此中断流程) */
export function toastError(e: unknown, fallback = '操作失败'): boolean {
  if (e instanceof LeisureError) {
    if (e.code === 40001) return true
    // 202+41201 审批挂起不是失败语义,调用方自行处理;此处仅提示纯错误
    toast.error(e.message || fallback)
    return false
  }
  toast.error(fallback)
  return false
}

/** 幂等键(资金写接口必带;后端 24h 回放)——单源实现,禁前端复制随机逻辑 */
export function idemKey(seed: string): string {
  return 'web-' + seed + '-' + newIdempotencyKey()
}
