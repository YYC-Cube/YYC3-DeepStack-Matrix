/**
 * 移动商品管理(/m/goods;2026-11-17 移动点单批):工作台「管理」组入口
 * 参照:13 号《包厢操作与销售经理自点单》商品目录(名称/类型/单位/售价/在售)
 *       + Owner 五项批商品档案字段(图/会员价);写路径与桌面 goods.tsx 同源 API
 * 能力:列表(在售/全部 chips)+ 卡片(图/名/类/价/在售徽)+ 上/下架一键 + 新增/编辑弹窗(含图压缩)
 * 权限:读全员开放(GET /goods);写仅 setting:manage(与桌面 MENU 同码;后端另守 ADMIN scope)
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface GoodsRow {
  id: number
  name: string
  category: string | null
  unit: string | null
  salePrice: string | number
  memberPrice: string | number | null
  imageUrl: string | null
  onSale: boolean
}

interface GoodsForm {
  id: number | null
  name: string
  category: string
  unit: string
  salePrice: string
  memberPrice: string
  imageUrl: string
  onSale: boolean
}

const EMPTY_FORM: GoodsForm = { id: null, name: '', category: '', unit: '', salePrice: '', memberPrice: '', imageUrl: '', onSale: true }

export default function MGoodsPage(): React.JSX.Element {
  const permCodes = useAuthStore((s) => s.permCodes)
  const canManage = permCodes.includes('setting:manage')
  const [rows, setRows] = useState<GoodsRow[]>([])
  const [showOff, setShowOff] = useState(false)
  const [cat, setCat] = useState('') // ''=全部分类
  const [form, setForm] = useState<GoodsForm | null>(null)
  const [busy, setBusy] = useState(false)

  // 分类池(数据驱动;在售+全部两态并集)
  const cats = [''].concat([...new Set(rows.map((g) => g.category ?? '未分类'))])
  const shown = cat === '' ? rows : rows.filter((g) => (g.category ?? '未分类') === cat)

  const load = useCallback(async (): Promise<void> => {
    try {
      const r = await req<{ rows: GoodsRow[] }>('GET', showOff ? '/goods' : '/goods?onSale=true')
      setRows(r.rows)
    } catch (e) {
      toastError(e, '商品加载失败')
    }
  }, [showOff])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleSale(g: GoodsRow): Promise<void> {
    setBusy(true)
    try {
      await req('PUT', '/goods/' + String(g.id), {
        name: g.name,
        category: g.category ?? undefined,
        unit: g.unit ?? undefined,
        salePrice: Number(g.salePrice),
        memberPrice: g.memberPrice !== null ? Number(g.memberPrice) : undefined,
        imageUrl: g.imageUrl ?? undefined,
        onSale: !g.onSale,
      })
      toast.success(g.name + (g.onSale ? ' 已下架' : ' 已上架'))
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  async function submit(): Promise<void> {
    if (form === null || form.name.trim() === '' || form.salePrice.trim() === '') {
      toast.error('名称/售价必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        category: form.category.trim() === '' ? undefined : form.category.trim(),
        unit: form.unit.trim() === '' ? undefined : form.unit.trim(),
        salePrice: Number(form.salePrice),
        memberPrice: form.memberPrice === '' ? undefined : Number(form.memberPrice),
        imageUrl: form.imageUrl === '' ? undefined : form.imageUrl,
        onSale: form.onSale,
      }
      if (form.id !== null) await req('PUT', '/goods/' + String(form.id), body)
      else await req('POST', '/goods', body)
      toast.success(form.id !== null ? '商品已更新' : '商品已上架')
      setForm(null)
      await load()
    } catch (e) {
      toastError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* 筛选+新增 */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 flex items-center gap-2" style={{ background: 'linear-gradient(180deg, rgba(6,18,38,0.96) 70%, transparent)' }}>
        <div className="flex gap-1.5 flex-1">
          <button
            className={'px-2.5 py-1 rounded-full border text-xs ' + (!showOff ? 'border-primary text-primary bg-primary/10 font-medium' : 'border-line text-fg-muted')}
            onClick={() => setShowOff(false)}
          >
            在售
          </button>
          <button
            className={'px-2.5 py-1 rounded-full border text-xs ' + (showOff ? 'border-primary text-primary bg-primary/10 font-medium' : 'border-line text-fg-muted')}
            onClick={() => setShowOff(true)}
          >
            全部
          </button>
        </div>
        {canManage && (
          <button
            className="px-2.5 py-1 rounded text-[11px] bg-primary/15 text-primary whitespace-nowrap"
            onClick={() => setForm({ ...EMPTY_FORM })}
          >
            + 新增
          </button>
        )}
      </div>

      {/* 分类 Tab(2026-11-17:啤酒/小吃/果盘…数据驱动筛选) */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {cats.map((c) => (
          <button
            key={c}
            className={'px-2.5 py-1 rounded-full border text-xs whitespace-nowrap shrink-0 ' +
              (cat === c ? 'border-primary text-primary bg-primary/10 font-medium' : 'border-line text-fg-muted')}
            onClick={() => setCat(c)}
          >
            {c === '' ? '全部分类' : c}
          </button>
        ))}
      </div>

      {/* 商品卡列表 */}
      {shown.map((g) => (
        <div key={g.id} className="rounded-2xl border border-line p-3 flex gap-2.5" style={{ background: 'var(--lm-card)' }}>
          {g.imageUrl !== null && g.imageUrl !== '' ? (
            <img src={g.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-fg-muted text-lg" style={{ background: 'var(--lm-bg)' }}>
              {g.name.slice(0, 1)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--lm-fg)] truncate flex-1">{g.name}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  color: g.onSale ? '#00ff88' : '#8b9bb4',
                  background: g.onSale ? 'rgba(0,255,136,0.12)' : 'rgba(139,155,180,0.12)',
                }}
              >
                {g.onSale ? '在售' : '已下架'}
              </span>
            </div>
            <div className="text-xs text-fg-muted mt-0.5 flex items-center gap-2 flex-wrap">
              {g.category !== null && g.category !== '' && <span className="px-1 rounded bg-[rgba(0,212,255,0.08)] text-primary">{g.category}</span>}
              <span>¥{String(g.salePrice)}{g.unit !== null && g.unit !== '' ? '/' + g.unit : ''}</span>
              {g.memberPrice !== null && <span className="text-[#ffaa00]">会员 ¥{String(g.memberPrice)}</span>}
            </div>
            {canManage && (
              <div className="flex gap-1.5 mt-2">
                <button
                  className="px-2 py-0.5 rounded text-[10px] border border-line text-fg-muted"
                  onClick={() => setForm({
                    id: g.id,
                    name: g.name,
                    category: g.category ?? '',
                    unit: g.unit ?? '',
                    salePrice: String(g.salePrice),
                    memberPrice: g.memberPrice !== null ? String(g.memberPrice) : '',
                    imageUrl: g.imageUrl ?? '',
                    onSale: g.onSale,
                  })}
                >
                  编辑
                </button>
                <button
                  className="px-2 py-0.5 rounded text-[10px] bg-primary/15 text-primary"
                  disabled={busy}
                  onClick={() => { void toggleSale(g) }}
                >
                  {g.onSale ? '下架' : '上架'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="rounded-2xl border border-line p-8 text-center text-sm text-fg-muted" style={{ background: 'var(--lm-card)' }}>
          暂无商品{!showOff ? ';切「全部」查看已下架' : ''}
        </div>
      )}
      <div className="text-center text-[10px] text-fg-muted pt-1 pb-2">点单入房账:房态图 → 消费中房卡 →「点单」</div>

      {/* 新增/编辑弹窗(写路径与桌面 goods.tsx 同源) */}
      <Dialog open={form !== null} onOpenChange={(o) => { if (!o) setForm(null) }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id !== null && form !== undefined ? '编辑商品' : '新增商品'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如:科罗娜" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">分类</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="啤酒/小吃/果盘" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">单位</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="瓶/份" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">售价 *</Label>
                  <Input value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">会员价</Label>
                  <Input value={form.memberPrice} onChange={(e) => setForm({ ...form, memberPrice: e.target.value })} inputMode="decimal" placeholder="可空" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">图片(可选,自动压缩;点图可替换)</Label>
                <div className="flex items-center gap-2">
                  {form.imageUrl !== '' ? (
                    <>
                      <label className="relative cursor-pointer">
                        <img src={form.imageUrl} alt="" className="w-16 h-16 rounded object-cover border border-line" />
                        <span className="absolute inset-0 rounded flex items-center justify-center text-[10px] text-white bg-black/0 hover:bg-black/40 transition-colors">换图</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f === undefined) return
                            const reader = new FileReader()
                            reader.onload = () => {
                              const img = new Image()
                              img.onload = () => {
                                const scale = Math.min(1, 480 / Math.max(img.width, img.height))
                                const canvas = document.createElement('canvas')
                                canvas.width = Math.round(img.width * scale)
                                canvas.height = Math.round(img.height * scale)
                                canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                                setForm({ ...form, imageUrl: canvas.toDataURL('image/jpeg', 0.75) })
                              }
                              img.src = String(reader.result)
                            }
                            reader.readAsDataURL(f)
                          }}
                        />
                      </label>
                      <button
                        className="px-2 py-1 rounded text-[11px] border border-line text-fg-muted"
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                      >
                        移除图片
                      </button>
                    </>
                  ) : (
                    <label className="px-3 py-2 rounded text-[11px] border border-dashed border-line text-fg-muted cursor-pointer">
                      + 上传图片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f === undefined) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            const img = new Image()
                            img.onload = () => {
                              const scale = Math.min(1, 480 / Math.max(img.width, img.height))
                              const canvas = document.createElement('canvas')
                              canvas.width = Math.round(img.width * scale)
                              canvas.height = Math.round(img.height * scale)
                              canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
                              setForm({ ...form, imageUrl: canvas.toDataURL('image/jpeg', 0.75) })
                            }
                            img.src = String(reader.result)
                          }
                          reader.readAsDataURL(f)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                <input type="checkbox" checked={form.onSale} onChange={(e) => setForm({ ...form, onSale: e.target.checked })} />
                在售(点单目录仅列在售商品)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>取消</Button>
            <Button disabled={busy} onClick={() => { void submit() }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
