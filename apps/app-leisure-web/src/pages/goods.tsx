/**
 * 商品管理(2026-11-07 P3):点单/送花商品库维护——增改删/图片上传(canvas 压缩 dataURL)/价格体系(售价+会员价)/上下架
 * 端点:GET/POST /goods + PUT /goods/:id + POST /goods/:id/delete(守卫 ADMIN 于 Controller)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { ConfirmButton, PageHeader, StatusBadge } from '@/components/kit'

interface GoodsRow {
  id: number
  name: string
  category: string | null
  unit: string | null
  salePrice: string | number
  memberPrice: string | number | null
  imageUrl: string | null
  onSale: boolean
  sort: number
}

interface FormState {
  id?: number
  name: string
  category: string
  unit: string
  salePrice: string
  memberPrice: string
  imageUrl: string
  onSale: boolean
}

export default function GoodsPage(): React.JSX.Element {
  const [rows, setRows] = useState<GoodsRow[]>()
  const [showOff, setShowOff] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await req<{ rows: GoodsRow[] }>('GET', showOff ? '/goods' : '/goods?onSale=true')
      setRows(res.rows)
    } catch (e) {
      toastError(e, '商品加载失败')
    }
  }, [showOff])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    if (form === null) return
    if (form.name.trim() === '' || form.salePrice === '' || Number(form.salePrice) <= 0) {
      toast.error('名称必填;售价须大于 0(保存时禁 0 元)')
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        category: form.category === '' ? undefined : form.category.trim(),
        unit: form.unit === '' ? undefined : form.unit.trim(),
        salePrice: Number(form.salePrice),
        memberPrice: form.memberPrice === '' ? null : Number(form.memberPrice),
        imageUrl: form.imageUrl === '' ? null : form.imageUrl,
        onSale: form.onSale,
      }
      if (form.id !== undefined) {
        await req('PUT', '/goods/' + String(form.id), body)
        toast.success('商品已更新')
      } else {
        await req('POST', '/goods', body)
        toast.success('商品已创建')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e) // 同名幂等复用提示场景
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number): Promise<void> {
    try {
      await req('POST', '/goods/' + String(id) + '/delete', {})
      toast.success('商品已删除(历史点单引用不受影响)')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  async function pickImage(file: File): Promise<void> {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(file)
    })
    const img = new Image()
    await new Promise((resolve) => { img.onload = resolve; img.src = dataUrl })
    const scale = Math.min(1, 400 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    const out = canvas.toDataURL('image/jpeg', 0.75)
    if (form !== null) setForm({ ...form, imageUrl: out })
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="商品管理"
        desc="点单/送花商品库:增改删 · 图片上传 · 价格体系(售价+会员价) · 上下架;点单入房账,关房统一结算"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowOff(!showOff)}>{showOff ? '只看在售' : '显示已下架'}</Button>
            <Button onClick={() => setForm({ name: '', category: '', unit: '', salePrice: '', memberPrice: '', imageUrl: '', onSale: true })}>+ 新增商品</Button>
          </div>
        }
      />

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-muted border-b border-line">
              <th className="py-1.5 pr-3">图</th>
              <th className="py-1.5 pr-3">名称</th>
              <th className="py-1.5 pr-3">分类</th>
              <th className="py-1.5 pr-3">单位</th>
              <th className="py-1.5 pr-3">售价</th>
              <th className="py-1.5 pr-3">会员价</th>
              <th className="py-1.5 pr-3">状态</th>
              <th className="py-1.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((g) => (
              <tr key={g.id} className="border-b border-line/60">
                <td className="py-1.5 pr-3">
                  {g.imageUrl !== null ? <img src={g.imageUrl} alt="" className="w-10 h-10 rounded object-cover" /> : <span className="inline-block w-10 h-10 rounded bg-fg-muted/10" />}
                </td>
                <td className="py-1.5 pr-3 font-medium">{g.name}</td>
                <td className="py-1.5 pr-3">{g.category ?? '—'}</td>
                <td className="py-1.5 pr-3">{g.unit ?? '—'}</td>
                <td className="py-1.5 pr-3">¥{String(g.salePrice)}</td>
                <td className="py-1.5 pr-3">{g.memberPrice !== null ? '¥' + String(g.memberPrice) : '—'}</td>
                <td className="py-1.5 pr-3">
                  <StatusBadge label={g.onSale ? '在售' : '已下架'} color={g.onSale ? '#00ff88' : '#8b9bb4'} />
                </td>
                <td className="py-1.5">
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setForm({
                      id: g.id,
                      name: g.name,
                      category: g.category ?? '',
                      unit: g.unit ?? '',
                      salePrice: String(g.salePrice),
                      memberPrice: g.memberPrice !== null ? String(g.memberPrice) : '',
                      imageUrl: g.imageUrl ?? '',
                      onSale: g.onSale,
                    })}>编辑</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        void req('PUT', '/goods/' + String(g.id), { onSale: !g.onSale }).then(async () => {
                          toast.success(g.onSale ? '已下架' : '已上架')
                          await load()
                        }).catch((e) => toastError(e))
                      }}
                    >
                      {g.onSale ? '下架' : '上架'}
                    </Button>
                    <ConfirmButton
                      confirmTitle="确认删除商品"
                      confirmDesc={'「' + g.name + '」删除后不再可选;历史点单引用不受影响。'}
                      onConfirm={() => { void remove(g.id) }}
                    >
                      <span className="text-xs">删除</span>
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows !== undefined && rows.length === 0 && <div className="text-center text-sm text-fg-muted py-6">暂无商品;点击「+ 新增商品」上架首品</div>}
      </Card>

      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑商品' : '新增商品'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">名称(店内唯一)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如 精品果盘 / 玫瑰花束" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">分类(含「花」=送花可选)</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="果盘 / 花 / 饮品" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">单位</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="份 / 束 / 瓶" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">售价(必填,大于 0)</Label>
                  <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">会员价(可空)</Label>
                  <Input type="number" value={form.memberPrice} onChange={(e) => setForm({ ...form, memberPrice: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">商品图(可空;自动压缩 ≤300KB)</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f !== undefined) void pickImage(f)
                  }}
                />
                {form.imageUrl !== '' && (
                  <div className="mt-1.5">
                    <img src={form.imageUrl} alt="" className="w-20 h-20 rounded object-cover" />
                    <button className="text-[10px] text-fg-muted hover:text-error ml-2" onClick={() => setForm({ ...form, imageUrl: '' })}>移除图片</button>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
                <input type="checkbox" checked={form.onSale} onChange={(e) => setForm({ ...form, onSale: e.target.checked })} />
                立即上架(在售可被点单/送花选择)
              </label>
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
