/**
 * 路由表:hash router(部署免服务端 rewrite);登录页公开,其余经 AppLayout + RequirePerm
 */
import { lazy, Suspense, type ComponentType } from 'react'
import { createHashRouter, Navigate } from 'react-router'
import { AppLayout } from './layout/AppLayout'
import { RequirePerm } from './layout/RequirePerm'
import { useAuthStore } from '@/stores/auth'

function Loading(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function sus<T extends object>(C: ComponentType<T>): ComponentType<T> {
  return function Sus(props: T) {
    return (
      <Suspense fallback={<Loading />}>
        <C {...props} />
      </Suspense>
    )
  }
}

/* ── 登录守卫:未登录一律去 /login ── */
function NeedAuth({ children }: { children: React.JSX.Element }): React.JSX.Element {
  const token = useAuthStore((s) => s.token)
  if (token === null || token === '') window.location.hash = '#/login'
  return children
}

const LoginPage = sus(lazy(() => import('@/pages/login')))
const ArtistsPage = sus(lazy(() => import('@/pages/artists')))
const TaxonomyPage = sus(lazy(() => import('@/pages/taxonomy')))
const FeeRulesPage = sus(lazy(() => import('@/pages/fee-rules')))
const FeeFormPage = sus(lazy(() => import('@/pages/fee-forms')))
const FeeTxnsPage = sus(lazy(() => import('@/pages/fee-txns')))
const AttendancePage = sus(lazy(() => import('@/pages/attendance')))
const AttendanceScreenPage = sus(lazy(() => import('@/pages/attendance-screen')))
const RealtimePage = sus(lazy(() => import('@/pages/realtime')))
const SessionsPage = sus(lazy(() => import('@/pages/sessions')))
const SettingsArtistPage = sus(lazy(() => import('@/pages/settings-artist')))
const RoomsPage = sus(lazy(() => import('@/pages/rooms')))
const TodoPage = sus(lazy(() => import('@/pages/placeholder')))

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <NeedAuth>
        <AppLayout />
      </NeedAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/artists" replace /> },
      // 档案域
      { path: 'artists', element: <ArtistsPage /> },
      { path: 'artists/levels', element: <TaxonomyPage kind="level" /> },
      { path: 'artists/groups', element: <TaxonomyPage kind="group" /> },
      // 考勤上钟域
      { path: 'attendance/realtime', element: <RealtimePage /> },
      { path: 'attendance/reports', element: <AttendancePage view="reports" /> },
      { path: 'attendance/summary', element: <AttendancePage view="summary" /> },
      { path: 'attendance/manual', element: <AttendancePage view="manual" /> },
      { path: 'attendance/screen', element: <AttendanceScreenPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      // 台费域
      { path: 'fees/rules', element: <FeeRulesPage /> },
      { path: 'fees/recharge', element: <FeeFormPage mode="recharge" /> },
      { path: 'fees/deduct', element: <FeeFormPage mode="deduct" /> },
      { path: 'fees/txns/:type', element: <FeeTxnsPage /> },
      // 设置域
      { path: 'settings/artist', element: <SettingsArtistPage /> },
      { path: 'store/rooms', element: <RoomsPage /> },
      // II 期/IV 期占位
      { path: 'todo/:key', element: <TodoPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/artists" replace /> },
])

export { RequirePerm }
