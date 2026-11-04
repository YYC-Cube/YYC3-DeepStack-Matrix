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

/* ── 登录守卫:未登录一律去 /login;首登未改密一律去 /change-password(P0-1) ── */
function NeedAuth({ children }: { children: React.JSX.Element }): React.JSX.Element {
  const token = useAuthStore((s) => s.token)
  const mustChange = useAuthStore((s) => s.mustChangePassword)
  if (token === null || token === '') window.location.hash = '#/login'
  else if (mustChange) window.location.hash = '#/change-password'
  return children
}

/** 首页分流:移动端落地工作台,桌面落档案页(移动工作台批次) */
function IndexRedirect(): null {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  window.location.hash = isMobile ? '#/m/workbench' : '#/artists'
  return null
}

const LoginPage = sus(lazy(() => import('@/pages/login')))
const ChangePasswordPage = sus(lazy(() => import('@/pages/change-password')))
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
const ReportCenterPage = sus(lazy(() => import('@/pages/report-center')))
const TodoPage = sus(lazy(() => import('@/pages/placeholder')))
const BoardPage = sus(lazy(() => import('@/pages/board')))
const ClockScreenPage = sus(lazy(() => import('@/pages/clock-screen')))
const ReconPage = sus(lazy(() => import('@/pages/recon')))
const PricingPage = sus(lazy(() => import('@/pages/pricing')))
const TicketsPage = sus(lazy(() => import('@/pages/tickets')))
const ShowcasePage = sus(lazy(() => import('@/pages/showcase')))
const BookingsPage = sus(lazy(() => import('@/pages/bookings')))
const ReviewsPage = sus(lazy(() => import('@/pages/reviews')))
const ThemeCustomizerPage = sus(lazy(() => import('@/pages/theme-customizer')))
const ProfilePage = sus(lazy(() => import('@/pages/profile')))
const MWorkbenchPage = sus(lazy(() => import('@/pages/m-workbench')))
const MBoardPage = sus(lazy(() => import('@/pages/m-board')))
const StaffPage = sus(lazy(() => import('@/pages/staff')))
const DepartmentsPage = sus(lazy(() => import('@/pages/departments')))
const RolesPage = sus(lazy(() => import('@/pages/roles')))
const NoticesPage = sus(lazy(() => import('@/pages/notices')))
const SplitPage = sus(lazy(() => import('@/pages/split')))
const HandoverPage = sus(lazy(() => import('@/pages/handover')))
const HandoverPrintPage = sus(lazy(() => import('@/pages/handover-print')))

export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/change-password', element: <ChangePasswordPage /> },
  {
    path: '/',
    element: (
      <NeedAuth>
        <AppLayout />
      </NeedAuth>
    ),
    children: [
      // 移动工作台(mobile-first;桌面亦可访问)
      { path: 'm/workbench', element: <MWorkbenchPage /> },
      { path: 'm/board', element: <MBoardPage /> },
      { index: true, element: <IndexRedirect /> },
      // 档案域
      { path: 'artists', element: <ArtistsPage /> },
      { path: 'artists/levels', element: <TaxonomyPage kind="level" /> },
      { path: 'artists/groups', element: <TaxonomyPage kind="group" /> },
      // 资源经理档案域(2026-11-04 独立板块:入口/授权分线 resource:view;等级/组别数据全域共用)
      { path: 'resource/artists', element: <ArtistsPage /> },
      { path: 'resource/levels', element: <TaxonomyPage kind="level" /> },
      { path: 'resource/groups', element: <TaxonomyPage kind="group" /> },
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
      // 台票域
      { path: 'tickets', element: <TicketsPage /> },
      // 扩展域
      { path: 'showcase', element: <ShowcasePage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      // 设置域
      { path: 'settings/artist', element: <SettingsArtistPage /> },
      { path: 'settings/theme', element: <ThemeCustomizerPage /> },
      // 员工管理(组织架构批次)
      { path: 'staff', element: <StaffPage /> },
      { path: 'staff/departments', element: <DepartmentsPage /> },
      { path: 'staff/roles', element: <RolesPage /> },
      { path: 'notices', element: <NoticesPage /> },
      { path: 'split', element: <SplitPage /> },
      { path: 'handover', element: <HandoverPage /> },
      { path: 'handover/:id/print', element: <HandoverPrintPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'store/rooms', element: <RoomsPage /> },
      { path: 'rooms/board', element: <BoardPage /> },
      { path: 'clock-screen', element: <ClockScreenPage /> },
      { path: 'reports/recon', element: <ReconPage /> },
      { path: 'fees/pricing', element: <PricingPage /> },
      { path: 'reports', element: <ReportCenterPage /> },
      // II 期/IV 期占位
      { path: 'todo/:key', element: <TodoPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/artists" replace /> },
])

export { RequirePerm }
