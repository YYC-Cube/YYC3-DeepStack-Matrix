/**
 * 部门管理(/staff/departments;两级树:部门 → 小组)
 * 成员计数/主管指定;有成员或小组时禁删
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, type Column } from '@/components/kit'

interface DeptRow {
  id: number
  name: string
  parentId: number | null
  headUserId: number | null
  headName: string | null
  memberCount: number
}

interface FormState {
  id?: number
  name: string
  parentId: string
  headUserId: string
}

export default function DepartmentsPage(): React.JSX.Element {
  const [rows, setRows] = useState<DeptRow[]>()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await req<{ rows: DeptRow[] }>('GET', '/staff/departments')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '部门加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (form === null || form.name.trim() === '') {
      toast.error('部门名称必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        ...(form.parentId !== '' ? { parentId: Number(form.parentId) } : {}),
        ...(form.headUserId !== '' ? { headUserId: Number(form.headUserId) } : {}),
      }
      if (form.id !== undefined) {
        await req('PUT', '/staff/departments/' + String(form.id), body)
        toast.success('部门已更新')
      } else {
        await req('POST', '/staff/departments', body)
        toast.success('部门已创建')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  const columns: Array<Column<DeptRow>> = [
    {
      key: 'name',
      header: '部门 / 小组',
      render: (r) =>
        r.parentId !== null ? (
          <span className="pl-6 text-fg-muted">└ {r.name}</span>
        ) : (
          <span className="font-medium">{r.name}</span>
        ),
    },
    { key: 'headName', header: '主管', render: (r) => r.headName ?? '—' },
    { key: 'memberCount', header: '在职成员', render: (r) => String(r.memberCount) },
    {
      key: 'act',
      header: '操作',
      render: (r) => (
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setForm({ id: r.id, name: r.name, parentId: r.parentId !== null ? String(r.parentId) : '', headUserId: r.headUserId !== null ? String(r.headUserId) : '' })}>
            编辑
          </Button>
          {r.parentId === null && (
            <Button variant="outline" size="sm" onClick={() => setForm({ name: '', parentId: String(r.id), headUserId: '' })}>
              + 小组
            </Button>
          )}
          <ConfirmButton
            confirmTitle="删除部门"
            confirmDesc={'删除「' + r.name + '」?需先转移成员与小组。'}
            onConfirm={() => {
              void req('DELETE', '/staff/departments/' + String(r.id))
                .then(() => { toast.success('已删除'); return load() })
                .catch((e) => toastError(e))
            }}
          >
            删除
          </ConfirmButton>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="部门管理"
        desc="两级组织(部门 → 小组);部门主管用于审批与数据范围;有成员/小组时不可删"
        actions={<Button onClick={() => setForm({ name: '', parentId: '', headUserId: '' })}>+ 新建部门</Button>}
      />
      <DataTable columns={columns} rows={rows} loading={loading} total={rows?.length ?? 0} page={1} pageSize={100} />

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑' : form?.parentId !== undefined && form.parentId !== '' ? '新建小组' : '新建部门'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <Field label="名称" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.parentId !== '' ? '小组名称' : '部门名称'} />
              </Field>
              <Field label="主管(可空)">
                <select
                  className="w-full h-9 rounded-md border px-2 text-sm"
                  value={form.headUserId}
                  onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
                >
                  <option value="">不设置</option>
                  {(rows ?? []).filter((r) => r.parentId === null).map((r) => (
                    <option key={r.id} value={r.id} disabled>{r.name}(成员请在员工信息里指派)</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-fg-muted">
                主管请在「员工信息」编辑员工时指派职级(销售副总/销售总监)后由本页展示;此处下拉预留。
              </p>
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
