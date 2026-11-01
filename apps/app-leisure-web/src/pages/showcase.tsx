/**
 * 展示控制台(实测 App 模块;需求全集 §9):在场艺人投放包厢/组别展示屏
 * 投放→进行中(可结束/批量结束);同艺人同目标去重
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, Input } from '@yyc3/ui'
import { toast } from 'sonner'
import { client, req, toastError } from '@/lib/api'
import { ConfirmButton, PageHeader, StatusBadge } from '@/components/kit'
import type { ShowcaseCastRow } from '@yyc3/leisure-core'

interface RoomLite {
  id: number
  roomNo: string
  roomName: string | null
}
interface ArtistLite {
  id: number
  realName: string
  stageName: string | null
  badgeNo: string | null
}

export default function ShowcasePage(): React.JSX.Element {
  const [rows, setRows] = useState<ShowcaseCastRow[]>([])
  const [rooms, setRooms] = useState<RoomLite[]>([])
  const [artists, setArtists] = useState<ArtistLite[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [roomId, setRoomId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [cast, roomRes, artistRes] = await Promise.all([
        client.showcase.list({ active: true }),
        req<{ rows: RoomLite[] }>('GET', '/store/rooms?pageSize=100'),
        req<{ rows: ArtistLite[] }>('GET', '/artists?pageSize=100'),
      ])
      setRows(cast.rows)
      setRooms(roomRes.rows)
      setArtists(artistRes.rows)
    } catch (e) {
      toastError(e, '加载失败')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cast = async (): Promise<void> => {
    if (picked.length === 0) {
      toast.error('请勾选要投放的艺人')
      return
    }
    setBusy(true)
    try {
      const res = await client.showcase.cast({
        artistIds: picked,
        ...(roomId !== '' ? { roomId: Number(roomId) } : {}),
      })
      toast.success(
        '已投放 ' + String(res.ids.length) + ' 人' +
          (res.skipped.length > 0 ? ',去重跳过 ' + String(res.skipped.length) + ' 人' : '') +
          (res.rejected.length > 0 ? ',未审核通过被拒 ' + String(res.rejected.length) + ' 人' : ''),
      )
      setPicked([])
      await load()
    } catch (e) {
      toastError(e, '投放失败')
    } finally {
      setBusy(false)
    }
  }

  const filtered = artists.filter((a) => {
    if (keyword.trim() === '') return true
    const k = keyword.trim()
    return (a.stageName ?? '').includes(k) || a.realName.includes(k) || (a.badgeNo ?? '').includes(k)
  })

  return (
    <div>
      <PageHeader title="展示控制台" desc="把在场艺人投放到包厢/门店展示屏;同艺人同目标去重,可单个或批量结束" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* 投放表单 */}
        <Card className="p-4 space-y-3">
          <div className="text-sm text-[#00d4ff]">新建投放</div>
          <div className="flex gap-2 items-center">
            <Input
              className="flex-1"
              placeholder="搜索艺名/腰牌号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1.5 text-sm bg-transparent w-36"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">门店大屏</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNo}
                  {r.roomName !== null ? ' · ' + r.roomName : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 border rounded p-2 border-[rgba(0,212,255,0.12)]">
            {filtered.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-[#e0f0ff]">
                <Checkbox
                  checked={picked.includes(a.id)}
                  onCheckedChange={(c) => {
                    setPicked(c === true ? [...picked, a.id] : picked.filter((x) => x !== a.id))
                  }}
                />
                {a.stageName ?? a.realName}
                <span className="text-[#8b9bb4] text-xs">({a.badgeNo ?? '无腰牌'})</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="text-xs text-[#8b9bb4] py-4 text-center">无匹配艺人</div>}
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[#8b9bb4] self-center">已选 {String(picked.length)} 人</span>
            <Button disabled={busy} onClick={() => void cast()}>
              投放
            </Button>
          </div>
        </Card>
        {/* 进行中投放 */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#00d4ff]">进行中投放({String(rows.length)})</div>
            <ConfirmButton
              confirmTitle="确认结束全部投放?"
              confirmDesc="所有进行中的投放将写入结束时间(记录保留)"
              variant="outline"
              onConfirm={async () => {
                const res = await client.showcase.endAll()
                toast.success('已结束 ' + String(res.ended) + ' 个投放')
                await load()
              }}
            >
              全部结束
            </ConfirmButton>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm border-b border-[rgba(0,212,255,0.06)] pb-2">
                <span className="text-[#e0f0ff] w-28 truncate">{r.stageName ?? r.realName}</span>
                <span className="text-[#8b9bb4] text-xs">{r.badgeNo ?? ''}</span>
                <StatusBadge label={r.roomNo ?? '门店大屏'} color="#00d4ff" />
                <span className="text-xs text-[#8b9bb4] ml-auto">{r.createdAt.slice(11, 16)} 起</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await client.showcase.end(r.id)
                      toast.success('已结束')
                      await load()
                    } catch (e) {
                      toastError(e, '结束失败')
                    }
                  }}
                >
                  结束
                </Button>
              </div>
            ))}
            {rows.length === 0 && <div className="text-xs text-[#8b9bb4] py-8 text-center">暂无进行中投放</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}
