/**
 * 认证状态(zustand + localStorage 持久化)
 * token 为 leisure-api JWT(2h);permCodes 驱动菜单与路由守卫(06 文档 RBAC)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  name: string
  permCodes: string[]
  login: (p: { token: string; name: string; permCodes: string[] }) => void
  logout: () => void
  hasPerm: (code: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      name: '',
      permCodes: [],
      login: ({ token, name, permCodes }) => set({ token, name, permCodes }),
      logout: () => set({ token: null, name: '', permCodes: [] }),
      hasPerm: (code) => get().permCodes.includes(code),
    }),
    { name: 'leisure-web-auth' },
  ),
)
