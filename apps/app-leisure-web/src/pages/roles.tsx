/**
 * 权限管理(/staff/roles):角色 × 功能码矩阵勾选;预置角色保护(管理员不可改/删)
 * 权限变更 ≤30 秒生效(JwtGuard 实时查库);全动作审计
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, Field, PageHeader } from '@/components/kit'

interface RoleRow {
  id: number
  name: string
  permCodes: string[]
  builtin: boolean
  userCount: number
}

/** 功能码域分组(06 号文档功能码表) */
const PERM_DOMAINS: Array<{ label: string; perms: Array<{ code: string; label: string }> }> = [
  { label: '档案', perms: [
    { code: 'artist:view', label: '销售档案查看' },
    { code: 'artist:edit', label: '销售档案编辑' },
    { code: 'artist:delete', label: '销售档案删除' },
    { code: 'artist:transfer', label: '销售档案转移' },
    { code: 'artist:batch', label: '销售档案批量' },
    { code: 'resource:view', label: '资源档案板块(查看+入口)' },
  ] },
  { label: '配置', perms: [
    { code: 'level:manage', label: '等级管理' },
    { code: 'group:manage', label: '组别管理' },
    { code: 'feerule:manage', label: '台费规则' },
    { code: 'ticketrule:manage', label: '台票规则' },
  ] },
  { label: '台费', perms: [
    { code: 'fee:recharge', label: '充值' },
    { code: 'fee:manual', label: '手动扣费' },
    { code: 'fee:ledger:view', label: '流水查看' },
    { code: 'fee:ledger:export', label: '流水导出' },
  ] },
  { label: '台票', perms: [
    { code: 'ticket:buy', label: '购买' },
    { code: 'ticket:use', label: '核销' },
    { code: 'ticket:ledger:view', label: '台账查看' },
  ] },
  { label: '考勤', perms: [
    { code: 'attend:qrcode', label: '现场屏二维码' },
    { code: 'attend:manual', label: '补打卡' },
    { code: 'attend:ledger:view', label: '报备明细' },
    { code: 'attend:summary:view', label: '报备汇总/实时' },
  ] },
  { label: '场次', perms: [
    { code: 'session:view', label: '上下钟查看' },
    { code: 'session:finish', label: '代下钟' },
    { code: 'session:cross', label: '串台' },
  ] },
  { label: '展示/订单', perms: [
    { code: 'showcase:cast', label: '展示投放' },
    { code: 'showcase:view', label: '展示查看' },
    { code: 'order:view', label: '订单' },
    { code: 'review:view', label: '评价' },
  ] },
  { label: '系统', perms: [
    { code: 'approval:decide', label: '审批' },
    { code: 'audit:view', label: '审计' },
    { code: 'report:export', label: '报表导出' },
    { code: 'setting:manage', label: '门店参数/员工管理' },
  ] },
]

interface FormState {
  id?: number
  name: string
  permCodes: string[]
}

export default function RolesPage(): React.JSX.Element {
  const [rows, setRows] = useState<RoleRow[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: RoleRow[] }>('GET', '/staff/roles')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '角色加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (form === null || form.name.trim() === '') {
      toast.error('角色名称必填')
      return
    }
    if (form.permCodes.length === 0) {
      toast.error('至少勾选一个功能码')
      return
    }
    setBusy(true)
    try {
      if (form.id !== undefined) {
        await req('PUT', '/staff/roles/' + String(form.id), { name: form.name.trim(), permCodes: form.permCodes })
        toast.success('角色已更新(≤30 秒全端生效)')
      } else {
        await req('POST', '/staff/roles', { name: form.name.trim(), permCodes: form.permCodes })
        toast.success('角色已创建')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (code: string): void => {
    if (form === null) return
    setForm({
      ...form,
      permCodes: form.permCodes.includes(code)
        ? form.permCodes.filter((c) => c !== code)
        : [...form.permCodes, code],
    })
  }

  return (
    <div>
      <PageHeader
        title="权限管理"
        desc="角色 × 功能码矩阵;变更 ≤30 秒全端生效(实时校验);预置角色「管理员」保护不可改/删"
        actions={<Button onClick={() => setForm({ name: '', permCodes: [] })}>+ 新建角色</Button>}
      />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {rows.map((r) => (
          <Card key={r.id} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--lm-fg)]">{r.name}</span>
              {r.builtin && (
                <span className="px-1.5 py-0.5 rounded text-[10px] text-primary border border-[rgba(0,212,255,0.3)]">预置</span>
              )}
              <span className="text-xs text-fg-muted ml-auto">{String(r.userCount)} 名在职</span>
            </div>
            <div className="text-xs text-fg-muted">{String(r.permCodes.length)} 个功能码</div>
            <div className="flex gap-1.5 pt-1">
              {!r.builtin && (
                <Button variant="outline" size="sm" onClick={() => setForm({ id: r.id, name: r.name, permCodes: [...r.permCodes] })}>
                  编辑
                </Button>
              )}
              {!r.builtin && (
                <ConfirmButton
                  confirmTitle="删除角色"
                  confirmDesc={'删除「' + r.name + '」?需先转移该角色在职员工。'}
                  onConfirm={() => {
                    void req('DELETE', '/staff/roles/' + String(r.id))
                      .then(() => { toast.success('已删除'); return load() })
                      .catch((e) => toastError(e))
                  }}
                >
                  删除
                </ConfirmButton>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑角色' : '新建角色'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div className="flex items-end gap-3">
                <Field label="角色名称" required>
                  <Input className="w-56" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <div className="text-xs text-fg-muted pb-2">已选 {String(form.permCodes.length)} 个功能码</div>
              </div>
              <div className="space-y-2">
                {PERM_DOMAINS.map((d) => (
                  <div key={d.label} className="border rounded border-line p-2.5">
                    <div className="text-xs font-medium text-primary mb-1.5">{d.label}</div>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                      {d.perms.map((p) => (
                        <label key={p.code} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={form.permCodes.includes(p.code)}
                            onCheckedChange={(c) => {
                              const has = form.permCodes.includes(p.code)
                              setForm({
                                ...form,
                                permCodes: c === true && !has ? [...form.permCodes, p.code] : has && c !== true ? form.permCodes.filter((x) => x !== p.code) : form.permCodes,
                              })
                            }}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void save() }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
