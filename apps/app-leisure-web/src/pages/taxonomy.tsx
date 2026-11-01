/**
 * A3 艺人等级 / A4 艺人组别(CRUD;有艺人挂靠禁删)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, DataTable, Field, PageHeader, type Column } from '@/components/kit'

interface TaxRow {
  id: number
  name: string
  supervisorName?: string | null
  artistCount: number
}

export default function TaxonomyPage({ kind }: { kind: 'level' | 'group' }) {
  const isGroup = kind === 'group'
  const path = isGroup ? '/artist-groups' : '/artist-levels'
  const [rows, setRows] = useState<TaxRow[]>()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ id?: number; name: string; supervisorName: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setRows(await req<TaxRow[]>('GET', path))
    } catch (e) {
      toastError(e, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (form === null || form.name.trim() === '') {
      toast.error('名称必填')
      return
    }
    setBusy(true)
    try {
      const body = isGroup
        ? { name: form.name, supervisorName: form.supervisorName === '' ? undefined : form.supervisorName }
        : { name: form.name }
      if (form.id !== undefined) {
        await req('PUT', path + '/' + String(form.id), body)
        toast.success('已更新')
      } else {
        await req('POST', path, body)
        toast.success('已创建')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number, name: string, count: number): Promise<void> {
    try {
      await req('DELETE', path + '/' + String(id))
      toast.success('已删除')
      await load()
    } catch (e) {
      // 有挂靠 400 由 toastError 展示后端文案
      toastError(e, '删除失败(可能存在挂靠艺人:' + name + ' 当前 ' + String(count) + ' 人)')
    }
  }

  const columns: Array<Column<TaxRow>> = [
    { key: 'name', header: isGroup ? '组别名称' : '等级名称' },
    ...(isGroup ? [{ key: 'supervisorName', header: '主管', render: (r: TaxRow) => r.supervisorName ?? '—' }] : []),
    { key: 'artistCount', header: '关联艺人数', render: (r: TaxRow) => String(r.artistCount) },
    {
      key: 'act',
      header: '操作',
      render: (r: TaxRow) => (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm({ id: r.id, name: r.name, supervisorName: r.supervisorName ?? '' })}
          >
            修改
          </Button>
          <ConfirmButton
            confirmTitle="确认删除"
            confirmDesc={'将删除「' + r.name + '」(当前关联 ' + String(r.artistCount) + ' 名艺人;有挂靠时后端将拒绝)。'}
            confirmText="确认删除"
            onConfirm={() => {
              void remove(r.id, r.name, r.artistCount)
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
        title={isGroup ? '艺人组别' : '艺人等级'}
        desc={isGroup ? '分组绑定主管,用于业绩归属与报备汇总' : '等级 × 包厢类型决定台费单价'}
        actions={<Button onClick={() => setForm({ name: '', supervisorName: '' })}>+ 新增{isGroup ? '组别' : '等级'}</Button>}
      />
      <Card className="p-4 mb-3 text-xs text-[#8b9bb4]">
        seed 参照:组别「江海龙」(主管同名) · 等级「技师」——名称店内唯一,软删可恢复
      </Card>
      <DataTable columns={columns} rows={rows} loading={loading} emptyText="暂无记录" />

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '修改' : '新增'}{isGroup ? '组别' : '等级'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label={isGroup ? '组别名称' : '等级名称'} required>
              <Input value={form?.name ?? ''} onChange={(e) => setForm((f) => (f !== null ? { ...f, name: e.target.value } : f))} />
            </Field>
            {isGroup && (
              <Field label="主管">
                <Input
                  value={form?.supervisorName ?? ''}
                  onChange={(e) => setForm((f) => (f !== null ? { ...f, supervisorName: e.target.value } : f))}
                />
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
