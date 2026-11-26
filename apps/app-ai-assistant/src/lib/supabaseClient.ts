/**
 * supabaseClient 抽取 shim(app-ai-assistant 独立版)
 * ─────────────────────────
 * 原版 lib/supabaseClient.ts 依赖 @supabase/supabase-js + 云端 Auth。
 * 本应用为可插拔独立应用:登录走 ghost 本地态,不接云 Auth。
 * Login 表单提交 signInWithPassword 返回成功(本地 ghost 账号);
 * 需要 @supabase/supabase-js 真实接入时,恢复原文件并安装依赖即可(接口面不变)。
 * 原文件见 FAmily版 src/app/lib/supabaseClient.ts(未拷贝)。
 */

export interface GhostUser {
  id: string
  email: string
}

export function isGhostMode(): boolean {
  return true
}

export const supabase = {
  auth: {
    /** ghost 登录:本地直接放行(独立应用无云端账号体系) */
    async signInWithPassword(_creds: { email: string; password: string }): Promise<{
      data: { user: GhostUser | null }
      error: { message: string } | null
    }> {
      return {
        data: { user: { id: "ghost-local", email: _creds.email || "ghost@local" } },
        error: null,
      }
    },
  },
}

export async function ghostSignIn(): Promise<GhostUser> {
  return { id: "ghost-local", email: "ghost@local" }
}
