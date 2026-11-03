/**
 * 员工信息(设置域 /staff;《16-全链路权限体系与组织架构设计》实施)
 * 建号返回一次性临时密码(首登强制改密);重置密码同;编辑含部门/角色/职级/直属上级
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, StatusBadge, type Column } from '@/components/kit'

interface StaffRow {
  id: number
  name: string
  phone: string
  roleName: string | null
  departmentId: number | null
  departmentName: string | null
  title: string | null
  titleName: string | null
  managerId: number | null
  managerName: string | null
  status: number
  mustChangePassword: boolean
  createdAt: string
}
interface Option {
  id: number
  name: string
}

const TITLE_OPTIONS = [
  { value: 'VP', label: '销售副总(管理职)' },
  { value: 'MANAGER_DIRECTOR', label: '销售总监(管理职)' },
  { value: 'MANAGER', label: '销售经理' },
  { value: 'CASHIER', label: '收银员' },
  { value: 'FINANCE', label: '财务' },
]

interface FormState {
  id?: number
  name: string
  phone: string
  roleId: string
  departmentId: string
  title: string
  managerId: string
}

export default function StaffPage(): React.JSX.Element {
  const [rows, setRows] = useState<StaffRow[]>()
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [options, setOptions] = useState<{ roles: Option[]; departments: Option[]; managers: Array<{ id: number; name: string; title: string }> }>({ roles: [], departments: [], managers: [] })
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  /** 建号/重置后一次性临时口令展示 */
  const [tempPwd, setTempPwd] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (keyword !== '') q.set('keyword', keyword)
      const res = await req<{ rows: StaffRow[] }>('GET', '/staff/users?' + q.toString())
      setRows(res.rows)
    } catch (e) {
      toastError(e, '员工加载失败')
    } finally {
      setLoading(false)
    }
  }, [keyword])

  const loadOptions = useCallback(async (): Promise<void> => {
    try {
      setOptions(await req<{ roles: Option[]; departments: Option[]; managers: Array<{ id: number; name: string; title: string }> }>('GET', '/staff/form-options'))
    } catch {
      /* 静默(下拉为辅助) */
    }
  }, [])

  useEffect(() => {
    void load()
    void loadOptions()
  }, [load, loadOptions])

  async function save(): Promise<void> {
    if (form === null) return
    if (form.name.trim() === '' || form.phone.trim() === '') {
      toast.error('姓名与手机号必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        ...(form.id === undefined ? { phone: form.phone.trim() } : {}),
        roleId: form.roleId === '' ? undefined : Number(form.roleId),
        departmentId: form.departmentId === '' ? undefined : Number(form.departmentId),
        title: form.title === '' ? undefined : form.title,
        managerId: form.managerId === '' ? undefined : Number(form.managerId),
      }
      if (form.id !== undefined) {
        await req('PUT', '/staff/users/' + String(form.id), body)
        toast.success('员工已更新(权限变更 ≤30 秒生效;让本人重登立即生效)')
      } else {
        const out = await req<{ id: number; tempPassword: string }>('POST', '/staff/users', body)
        setTempPwd(out.tempPassword)
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(row: StaffRow): Promise<void> {
    try {
      const out = await req<{ tempPassword: string }>('POST', '/staff/users/' + String(row.id) + '/reset-password')
      setTempPwd(out.tempPassword)
    } catch (e) {
      toastError(e)
    }
  }

  const columns: Array<Column<StaffRow>> = [
    { key: 'name', header: '姓名' },
    { key: 'phone', header: '手机号' },
    { key: 'roleName', header: '角色', render: (r) => r.roleName ?? '—' },
    { key: 'departmentName', header: '部门', render: (r) => r.departmentName ?? '—' },
    { key: 'titleName', header: '职级', render: (r) => r.titleName ?? '—' },
    { key: 'managerName', header: '直属上级', render: (r) => r.managerName ?? '—' },
    {
      key: 'status',
      header: '状态',
      render: (r) =>
        r.status === 1
          ? <StatusBadge label="在职" color="#00ff88" />
          : <StatusBadge label="已停用" color="#8b9bb4" />,
    },
    {
      key: 'act',
      header: '操作',
      render: (r) => (
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm({
                id: r.id,
                name: r.name,
                phone: r.phone,
                roleId: '',
                departmentId: r.departmentId !== null ? String(r.departmentId) : '',
                title: r.title ?? '',
                managerId: '',
              })
            }
          >
            编辑
          </Button>
          <Button variant="outline" size="sm" onClick={() => { void resetPassword(r) }}>
            重置密码
          </Button>
          {r.status === 1 && (
            <ConfirmButton
              confirmTitle="停用员工"
              confirmDesc={'「' + r.name + '」停用后立即失去全部管理端权限(JWT 即时失效)。'}
              onConfirm={() => {
                void req('PUT', '/staff/users/' + String(r.id), { status: 0 })
                  .then(() => { toast.success('已停用'); return load() })
                  .catch((e) => toastError(e))
              }}
            >
              停用
            </ConfirmButton>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="员工信息"
        desc="管理端账号全生命周期:建号(临时口令首登强制改密)/编辑/重置密码/停用即时失效;权限变更 ≤30 秒生效"
        actions={<Button onClick={() => setForm({ name: '', phone: '', roleId: '', departmentId: '', title: '', managerId: '' })}>+ 新建员工</Button>}
      />
      <Card className="p-4 mb-4 flex flex-row items-center gap-3">
        <Input className="w-64" placeholder="姓名/手机号" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button variant="outline" onClick={() => { void load() }}>查询</Button>
      </Card>
      <DataTable columns={columns} rows={rows} loading={loading} total={rows?.length ?? 0} page={1} pageSize={200} />

      {/* 新建/编辑 */}
      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑员工' : '新建员工'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="姓名" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="手机号(登录账号)" required>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={form.id !== undefined} />
              </Field>
              <Field label="角色">
                <select
                  className="w-full h-9 rounded-md border px-2 text-sm"
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                >
                  <option value="">不分配</option>
                  {options.roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="部门">
                <select
                  className="w-full h-9 rounded-md border px-2 text-sm"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">不分配</option>
                  {options.departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="职级">
                <select
                  className="w-full h-9 rounded-md border px-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                >
                  <option value="">不设置</option>
                  {TITLE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="直属上级(管理职)">
                <select
                  className="w-full h-9 rounded-md border px-2 text-sm"
                  value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                >
                  <option value="">不设置</option>
                  {options.managers.map((m) => (
                    <option key={m.id} value={String(m.id)}>{m.name}({m.title})</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void save() }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 临时口令一次性展示 */}
      <Dialog open={tempPwd !== null} onOpenChange={(o) => { if (!o) setTempPwd(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>临时登录口令(仅显示一次)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded-lg border border-line p-3 text-center font-mono text-lg tracking-wider select-all">
              {tempPwd}
            </div>
            <p className="text-xs text-fg-muted">
              请立即复制并线下交付本人;首次登录将强制修改密码;该口令不再显示(遗失请重新重置)。
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (tempPwd !== null) void navigator.clipboard.writeText(tempPwd).then(() => toast.success('已复制'))
              }}
            >
              复制口令
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
