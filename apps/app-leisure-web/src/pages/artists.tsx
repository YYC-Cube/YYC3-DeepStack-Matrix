/**
 * A1 艺人资料管理(列表筛选含审核状态)+ A2 添加/编辑表单(需求全集 §3)
 * 业务规则:审核通过才对外展示;删除有流水禁删(40906 引导停用);腰牌号唯一(40901 含软删档案)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { req, toastError } from '@/lib/api'
import { AUDIT_LABEL } from '@/lib/format'
import { ConfirmButton, DataTable, Field, MoneyText, PageHeader, SelectBox, StatusBadge, type Column } from '@/components/kit'
import { useAuthStore } from '@/stores/auth'

/* ── 行类型(后端返回) ── */
interface ArtistRow {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
  phone: string | null
  gender: number
  hourlyRate: string
  tipFixed: string
  status: number
  auditStatus: string
  groupId: number | null
  levelId: number | null
  supervisorName: string | null
  group?: { name: string } | null
  level?: { name: string } | null
}
interface Option {
  id: number
  name: string
}

const AUDIT_COLOR: Record<string, string> = {
  PENDING: '#ffaa00',
  REJECTED: '#ff3366',
  APPROVED: '#00ff88',
}

/* ── A2 表单状态 ── */
interface FormState {
  id?: number
  realName: string
  stageName: string
  gender: string
  phone: string
  badgeNo: string
  groupId: string
  levelId: string
  supervisorName: string
  maxTotalShows: string
  maxCrossRooms: string
  firstShowMinMinutes: string
  sameRoomMinMinutes: string
  tipFixed: string
  hourlyRate: string
  auditStatus: string
}

const EMPTY_FORM: FormState = {
  realName: '',
  stageName: '',
  gender: '1',
  phone: '',
  badgeNo: '',
  groupId: '',
  levelId: '',
  supervisorName: '',
  maxTotalShows: '0',
  maxCrossRooms: '0',
  firstShowMinMinutes: '0',
  sameRoomMinMinutes: '0',
  tipFixed: '0',
  hourlyRate: '0',
  auditStatus: 'PENDING',
}

export default function ArtistsPage() {
  // 注意:选择器必须返回稳定引用(返回 includes.bind 新函数会触发 zustand 无限重渲染)
  const permCodes = useAuthStore((s) => s.permCodes)
  const hasPerm = (code: string): boolean => permCodes.includes(code)
  const [rows, setRows] = useState<ArtistRow[]>()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [groupId, setGroupId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [auditStatus, setAuditStatus] = useState('')
  const [groups, setGroups] = useState<Option[]>([])
  const [levels, setLevels] = useState<Option[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<number[]>([])

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('page', String(page))
      q.set('pageSize', '20')
      if (keyword !== '') q.set('keyword', keyword)
      if (groupId !== '') q.set('groupId', groupId)
      if (levelId !== '') q.set('levelId', levelId)
      if (auditStatus !== '') q.set('auditStatus', auditStatus)
      const res = await req<{ rows: ArtistRow[]; total: number }>('GET', '/artists?' + q.toString())
      setRows(res.rows)
      setTotal(res.total)
      setSelected([])
    } catch (e) {
      toastError(e, '档案加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, keyword, groupId, levelId, auditStatus])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void Promise.all([req<Option[]>('GET', '/artist-groups'), req<Option[]>('GET', '/artist-levels')])
      .then(([g, l]) => {
        setGroups(g)
        setLevels(l)
      })
      .catch(() => undefined)
  }, [])

  const opts = (list: Option[]): Array<{ value: string; label: string }> => [
    { value: '', label: '全部' },
    ...list.map((x) => ({ value: String(x.id), label: x.name })),
  ]

  /* ── A2 保存(新增/编辑) ── */
  async function saveForm(): Promise<void> {
    if (form === null) return
    if (form.realName.trim() === '') {
      toast.error('姓名必填')
      return
    }
    setBusy(true)
    try {
      const body = {
        realName: form.realName,
        stageName: form.stageName === '' ? undefined : form.stageName,
        gender: Number(form.gender),
        phone: form.phone === '' ? undefined : form.phone,
        badgeNo: form.badgeNo === '' ? undefined : form.badgeNo,
        groupId: form.groupId === '' ? undefined : Number(form.groupId),
        levelId: form.levelId === '' ? undefined : Number(form.levelId),
        supervisorName: form.supervisorName === '' ? undefined : form.supervisorName,
        maxTotalShows: Number(form.maxTotalShows),
        maxCrossRooms: Number(form.maxCrossRooms),
        firstShowMinMinutes: Number(form.firstShowMinMinutes),
        sameRoomMinMinutes: Number(form.sameRoomMinMinutes),
        tipFixed: Number(form.tipFixed),
        hourlyRate: Number(form.hourlyRate),
        auditStatus: form.auditStatus,
      }
      if (form.id !== undefined) {
        await req('PUT', '/artists/' + String(form.id), body)
        toast.success('档案已更新')
      } else {
        await req<{ id: number }>('POST', '/artists', body)
        toast.success('档案已创建(默认等待审核)')
      }
      setForm(null)
      await load()
    } catch (e) {
      toastError(e, '保存失败')
    } finally {
      setBusy(false)
    }
  }

  /* ── 审核流转 ── */
  async function audit(id: number, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    try {
      await req('POST', '/artists/' + String(id) + '/audit', { auditStatus: status })
      toast.success(status === 'APPROVED' ? '已审核通过(对外可见)' : '已驳回')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  /* ── 批量设置(等级/组别/审核) ── */
  async function batch(level: string, group: string, audit: string): Promise<void> {
    if (selected.length === 0) return
    try {
      const body: Record<string, unknown> = { ids: selected }
      if (level !== '') body.levelId = Number(level)
      if (group !== '') body.groupId = Number(group)
      if (audit !== '') {
        // 审核态走逐条 audit 接口
        await Promise.all(selected.map((id) => req('POST', '/artists/' + String(id) + '/audit', { auditStatus: audit })))
      } else {
        await req('PUT', '/artists/batch', body)
      }
      toast.success('批量设置完成(' + String(selected.length) + ' 人)')
      await load()
    } catch (e) {
      toastError(e)
    }
  }

  const columns: Array<Column<ArtistRow>> = useMemo(
    () => [
      {
        key: 'sel',
        header: '',
        render: (r) => (
          <Checkbox
            checked={selected.includes(r.id)}
            onCheckedChange={(v) => {
              setSelected((prev) => (v === true ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
            }}
          />
        ),
      },
      { key: 'stageName', header: '艺名', render: (r) => r.stageName ?? '—' },
      { key: 'realName', header: '姓名' },
      { key: 'badgeNo', header: '腰牌号', render: (r) => r.badgeNo ?? '—' },
      { key: 'group', header: '组别', render: (r) => r.group?.name ?? '—' },
      { key: 'level', header: '等级', render: (r) => r.level?.name ?? '—' },
      { key: 'phone', header: '手机号', render: (r) => r.phone ?? '—' },
      {
        key: 'hourlyRate',
        header: '计时单价',
        render: (r) => <MoneyText v={r.hourlyRate} />,
      },
      {
        key: 'auditStatus',
        header: '审核状态',
        render: (r) => <StatusBadge label={AUDIT_LABEL[r.auditStatus] ?? r.auditStatus} color={AUDIT_COLOR[r.auditStatus] ?? '#8b9bb4'} />,
      },
      {
        key: 'act',
        header: '操作',
        render: (r) => (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setForm({
                  id: r.id,
                  realName: r.realName,
                  stageName: r.stageName ?? '',
                  gender: String(r.gender),
                  phone: r.phone ?? '',
                  badgeNo: r.badgeNo ?? '',
                  groupId: r.groupId !== null ? String(r.groupId) : '',
                  levelId: r.levelId !== null ? String(r.levelId) : '',
                  supervisorName: r.supervisorName ?? '',
                  maxTotalShows: String(0),
                  maxCrossRooms: String(0),
                  firstShowMinMinutes: String(0),
                  sameRoomMinMinutes: String(0),
                  tipFixed: String(r.tipFixed ?? 0),
                  hourlyRate: String(r.hourlyRate ?? 0),
                  auditStatus: r.auditStatus,
                })
              }
            >
              编辑
            </Button>
            {r.auditStatus !== 'APPROVED' && hasPerm('artist:edit') && (
              <Button variant="outline" size="sm" className="text-[#00ff88]" onClick={() => void audit(r.id, 'APPROVED')}>
                通过
              </Button>
            )}
            {r.auditStatus !== 'REJECTED' && hasPerm('artist:edit') && (
              <Button variant="outline" size="sm" className="text-[#ff3366]" onClick={() => void audit(r.id, 'REJECTED')}>
                驳回
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, hasPerm],
  )

  return (
    <div>
      <PageHeader
        title="艺人资料管理"
        desc="审核通过后才在展示端对外可见(需求全集 §3);腰牌号店内唯一含停用档案"
        actions={
          hasPerm('artist:edit') && (
            <Button onClick={() => setForm({ ...EMPTY_FORM })}>+ 添加艺人</Button>
          )
        }
      />
      <Card className="p-4 mb-4 flex flex-row flex-wrap items-center gap-3">
        <Input
          className="w-52"
          placeholder="姓名/艺名/腰牌号/手机号"
          value={keyword}
          onChange={(e) => {
            setPage(1)
            setKeyword(e.target.value)
          }}
        />
        <SelectBox className="w-36" value={groupId} onChange={(v) => { setPage(1); setGroupId(v) }} options={opts(groups)} placeholder="组别" />
        <SelectBox className="w-36" value={levelId} onChange={(v) => { setPage(1); setLevelId(v) }} options={opts(levels)} placeholder="等级" />
        <SelectBox
          className="w-36"
          value={auditStatus}
          onChange={(v) => { setPage(1); setAuditStatus(v) }}
          options={[
            { value: '', label: '全部审核状态' },
            { value: 'PENDING', label: '等待审核' },
            { value: 'REJECTED', label: '审核未通过' },
            { value: 'APPROVED', label: '审核通过' },
          ]}
        />
      </Card>

      {/* 批量设置条(A1 交互) */}
      {selected.length > 0 && hasPerm('artist:batch') && (
        <Card className="p-3 mb-4 flex flex-row flex-wrap items-center gap-3 text-sm">
          <span className="text-[#8b9bb4]">已选 {String(selected.length)} 人 · 批量:</span>
          <BatchControls groups={groups} levels={levels} onApply={batch} />
        </Card>
      )}

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} pageSize={20} onPageChange={setPage} />

      {/* A2 添加/编辑表单 */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id !== undefined ? '编辑艺人' : '添加艺人'}</DialogTitle>
          </DialogHeader>
          {form !== null && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="姓名" required>
                <Input value={form.realName} onChange={(e) => setForm({ ...form, realName: e.target.value })} />
              </Field>
              <Field label="艺名">
                <Input value={form.stageName} onChange={(e) => setForm({ ...form, stageName: e.target.value })} />
              </Field>
              <Field label="性别">
                <SelectBox
                  value={form.gender}
                  onChange={(v) => setForm({ ...form, gender: v })}
                  options={[{ value: '1', label: '女' }, { value: '2', label: '男' }]}
                />
              </Field>
              <Field label="手机号">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="腰牌号(店内唯一)">
                <Input value={form.badgeNo} onChange={(e) => setForm({ ...form, badgeNo: e.target.value })} />
              </Field>
              <Field label="组别">
                <SelectBox value={form.groupId} onChange={(v) => setForm({ ...form, groupId: v })} options={[{ value: '', label: '未分组' }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))]} />
              </Field>
              <Field label="等级">
                <SelectBox value={form.levelId} onChange={(v) => setForm({ ...form, levelId: v })} options={[{ value: '', label: '未定级' }, ...levels.map((l) => ({ value: String(l.id), label: l.name }))]} />
              </Field>
              <Field label="主管">
                <Input value={form.supervisorName} onChange={(e) => setForm({ ...form, supervisorName: e.target.value })} />
              </Field>
              <Field label="总上台次数上限(0=不限)">
                <Input type="number" value={form.maxTotalShows} onChange={(e) => setForm({ ...form, maxTotalShows: e.target.value })} />
              </Field>
              <Field label="允许串台数(0=不允许)">
                <Input type="number" value={form.maxCrossRooms} onChange={(e) => setForm({ ...form, maxCrossRooms: e.target.value })} />
              </Field>
              <Field label="首台最低时长(分)">
                <Input type="number" value={form.firstShowMinMinutes} onChange={(e) => setForm({ ...form, firstShowMinMinutes: e.target.value })} />
              </Field>
              <Field label="同包厢最低时长(分)">
                <Input type="number" value={form.sameRoomMinMinutes} onChange={(e) => setForm({ ...form, sameRoomMinMinutes: e.target.value })} />
              </Field>
              <Field label="小费一口价(元)">
                <Input type="number" value={form.tipFixed} onChange={(e) => setForm({ ...form, tipFixed: e.target.value })} />
              </Field>
              <Field label="计时单价(元/小时)">
                <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
              </Field>
              <Field label="审核状态">
                <SelectBox
                  value={form.auditStatus}
                  onChange={(v) => setForm({ ...form, auditStatus: v })}
                  options={[
                    { value: 'PENDING', label: '等待审核' },
                    { value: 'APPROVED', label: '审核通过' },
                    { value: 'REJECTED', label: '审核未通过' },
                  ]}
                />
              </Field>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button disabled={busy} onClick={() => void saveForm()}>
              {busy ? '保存中…' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── 批量设置控件 ── */
function BatchControls({
  groups,
  levels,
  onApply,
}: {
  groups: Option[]
  levels: Option[]
  onApply: (level: string, group: string, audit: string) => Promise<void>
}) {
  const [level, setLevel] = useState('')
  const [group, setGroup] = useState('')
  const [audit, setAudit] = useState('')
  return (
    <>
      <SelectBox className="w-32" value={level} onChange={setLevel} options={[{ value: '', label: '等级不变' }, ...levels.map((l) => ({ value: String(l.id), label: l.name }))]} />
      <SelectBox className="w-32" value={group} onChange={setGroup} options={[{ value: '', label: '组别不变' }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))]} />
      <SelectBox
        className="w-32"
        value={audit}
        onChange={setAudit}
        options={[
          { value: '', label: '审核不变' },
          { value: 'APPROVED', label: '批量通过' },
          { value: 'REJECTED', label: '批量驳回' },
        ]}
      />
      <ConfirmButton
        confirmTitle="确认批量设置"
        confirmDesc="将对勾选艺人应用上述变更,操作逐人留痕审计。"
        confirmText="确认应用"
        variant="default"
        onConfirm={() => {
          void onApply(level, group, audit)
        }}
      >
        应用
      </ConfirmButton>
    </>
  )
}
