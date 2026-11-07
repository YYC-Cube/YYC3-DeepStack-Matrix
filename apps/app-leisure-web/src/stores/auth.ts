/**
 * 认证状态(zustand + localStorage 持久化)
 * token 为 leisure-api JWT(2h);permCodes 驱动菜单与路由守卫(06 文档 RBAC)
 * mustChangePassword:首登必改(P0-1)——为 true 时路由守卫强制跳 /change-password,后端对其他接口返回 40302
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  refreshToken: string | null
  name: string
  permCodes: string[]
  mustChangePassword: boolean
  login: (p: { token: string; refreshToken?: string; name: string; permCodes: string[]; mustChangePassword?: boolean }) => void
  logout: () => void
  hasPerm: (code: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      name: '',
      permCodes: [],
      mustChangePassword: false,
      login: ({ token, name, permCodes, mustChangePassword }) =>
        set({ token, name, permCodes, mustChangePassword: mustChangePassword === true }),
      logout: () => set({ token: null, name: '', permCodes: [], mustChangePassword: false }),
      hasPerm: (code) => get().permCodes.includes(code),
    }),
    { name: 'leisure-web-auth' },
  ),
)
