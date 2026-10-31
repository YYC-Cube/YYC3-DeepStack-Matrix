/**
 * YYC³ LeisureAPI · 种子数据(幂等 upsert,对齐实测:皇家国际/6房型/技师/江海龙)
 * 运行:pnpm db:seed(生产首部后立即改默认密码)
 */
import { PrismaClient } from '@prisma/client'
// ESM 下 import * as ns 拿不到 CJS 命名导出(bcryptjs 2.x),必须 default 导入
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 门店(实测:皇家国际)
  const store = await prisma.store.upsert({
    where: { externalId: '1002348' },
    update: {},
    create: {
      name: '皇家国际',
      address: '河南省洛阳市国际商城',
      city: '洛阳市',
      businessDayCutTime: '08:00',
      externalId: '1002348',
    },
  })

  // 房型(实测 6 类)
  const roomNames = ['小包', '中包', '大包', 'VIP包', '西亳厅', '外卖房']
  for (let i = 0; i < roomNames.length; i += 1) {
    const exists = await prisma.roomType.findFirst({
      where: { storeId: store.id, name: roomNames[i] ?? '' },
    })
    if (exists === null) {
      await prisma.roomType.create({
        data: { storeId: store.id, name: roomNames[i] ?? '', sort: i + 1 },
      })
    }
  }

  // 等级(实测:技师)
  let level = await prisma.artistLevel.findFirst({
    where: { storeId: store.id, name: '技师', deletedAt: null },
  })
  if (level === null) {
    level = await prisma.artistLevel.create({
      data: { storeId: store.id, name: '技师' },
    })
  }

  // 组别(实测:江海龙)
  let group = await prisma.artistGroup.findFirst({
    where: { storeId: store.id, name: '江海龙', deletedAt: null },
  })
  if (group === null) {
    group = await prisma.artistGroup.create({
      data: { storeId: store.id, name: '江海龙', supervisorName: '江海龙' },
    })
  }

  // 台费规则(实测:技师×6房型=0.00 占位,金额由运营改)
  const roomTypes = await prisma.roomType.findMany({
    where: { storeId: store.id },
    orderBy: { sort: 'asc' },
  })
  const ruleExists = await prisma.stageFeeRule.findFirst({
    where: { storeId: store.id, levelId: level.id, deletedAt: null },
  })
  if (ruleExists === null) {
    await prisma.stageFeeRule.create({
      data: {
        storeId: store.id,
        levelId: level.id,
        roomTypeIds: roomTypes.map((r) => r.id),
        amount: 0,
      },
    })
  }

  // 包厢房号样例(需求全集 §5;全合成,禁真实信息)——每房型 2 间,房号店内唯一
  const roomSamples: Array<{ prefix: string; count: number; typeName: string }> = [
    { prefix: 'A', count: 3, typeName: '小包' },
    { prefix: 'B', count: 3, typeName: '中包' },
    { prefix: 'C', count: 2, typeName: '大包' },
    { prefix: 'V', count: 2, typeName: 'VIP包' },
    { prefix: 'X', count: 1, typeName: '西亳厅' },
    { prefix: 'W', count: 2, typeName: '外卖房' },
  ]
  for (const sample of roomSamples) {
    const rt = roomTypes.find((r) => r.name === sample.typeName)
    if (rt === undefined) continue
    for (let i = 1; i <= sample.count; i += 1) {
      const roomNo = sample.prefix + String(i).padStart(2, '0')
      const exists = await prisma.room.findFirst({
        where: { storeId: store.id, roomNo },
      })
      if (exists === null) {
        await prisma.room.create({
          data: {
            storeId: store.id,
            roomNo,
            roomName: sample.typeName + ' ' + roomNo,
            roomTypeId: rt.id,
            capacity: 4 + i,
            status: 'FREE',
          },
        })
      }
    }
  }

  // 艺人设置 8 项默认值(需求全集 §7;门店级可改;env 默认在 store-config 服务合并)
  const configDefaults: Array<{ key: string; value: object | string[] | number | boolean | string }> = [
    { key: 'required_profile_fields', value: ['realName', 'phone'] },
    { key: 'report_settings', value: { requireReview: false } },
    { key: 'checkout_min_minutes', value: 60 },
    { key: 'self_scan_finish', value: true },
    { key: 'stage_without_checkin', value: false },
    { key: 'ticket_purchase', value: { enabled: true } },
    { key: 'room_billing', value: { feeMode: 'HOURLY', roundingEnabled: true, roundingThresholdMinutes: 15, crossDayAccumulate: true } },
    { key: 'stage_assign_mode', value: 'MIXED' },
  ]
  for (const cfg of configDefaults) {
    await prisma.storeConfig.upsert({
      where: { storeId_configKey: { storeId: store.id, configKey: cfg.key } },
      update: {},
      create: { storeId: store.id, configKey: cfg.key, configValue: cfg.value as object },
    })
  }

  // 合成艺人样例(禁真实个人信息;姓名/手机号均为虚构)——覆盖审核三态
  const artistSamples = [
    { realName: '测试档案-晨曦', stageName: '晨曦', badgeNo: 'A1001', phone: '13900000001', hourlyRate: 100, auditStatus: 'APPROVED' },
    { realName: '测试档案-雨露', stageName: '雨露', badgeNo: 'A1002', phone: '13900000002', hourlyRate: 120, auditStatus: 'APPROVED' },
    { realName: '测试档案-星辰', stageName: '星辰', badgeNo: 'A1003', phone: '13900000003', hourlyRate: 0, auditStatus: 'PENDING' },
  ] as const
  for (const a of artistSamples) {
    const exists = await prisma.artist.findFirst({
      where: { storeId: store.id, badgeNo: a.badgeNo, deletedAt: null },
    })
    if (exists === null) {
      await prisma.artist.create({
        data: {
          storeId: store.id,
          groupId: group.id,
          supervisorName: group.supervisorName,
          levelId: level.id,
          realName: a.realName,
          stageName: a.stageName,
          gender: 1,
          phone: a.phone,
          badgeNo: a.badgeNo,
          hourlyRate: a.hourlyRate,
          auditStatus: a.auditStatus,
        },
      })
    }
  }

  // 角色 + 管理员(默认密码,首次登录后必须修改)
  const permCodes = [
    'artist:view', 'artist:edit', 'artist:delete', 'artist:transfer', 'artist:batch',
    'level:manage', 'group:manage', 'feerule:manage', 'ticketrule:manage',
    'room:manage',
    'fee:recharge', 'fee:manual', 'fee:ledger:view', 'fee:ledger:export',
    'ticket:buy', 'ticket:use', 'ticket:ledger:view',
    'attend:qrcode', 'attend:manual', 'attend:ledger:view', 'attend:summary:view',
    'session:view', 'session:finish', 'session:cross',
    'showcase:cast', 'showcase:view', 'order:view', 'review:view',
    'approval:decide', 'audit:view', 'report:export', 'setting:manage',
  ]
  let role = await prisma.role.findFirst({
    where: { storeId: store.id, name: '管理员' },
  })
  if (role === null) {
    role = await prisma.role.create({
      data: { storeId: store.id, name: '管理员', permCodes },
    })
  } else {
    // 幂等升级:功能码并集(seed 新增功能码时补齐既有角色,不撤销人工配置)
    const owned = Array.isArray(role.permCodes) ? (role.permCodes as string[]) : []
    const merged = Array.from(new Set([...owned, ...permCodes]))
    if (merged.length !== owned.length) {
      role = await prisma.role.update({ where: { id: role.id }, data: { permCodes: merged } })
      console.log('[seed] 角色功能码并集升级: +' + String(merged.length - owned.length))
    }
  }
  const adminPhone = '13103790379'
  const adminExists = await prisma.adminUser.findUnique({ where: { phone: adminPhone } })
  if (adminExists === null) {
    await prisma.adminUser.create({
      data: {
        storeId: store.id,
        name: '郭克',
        phone: adminPhone,
        passwordHash: await bcrypt.hash('ChangeMe@2026', 10),
        roleId: role.id,
      },
    })
    console.log('[seed] 管理员已创建: ' + adminPhone + ' / 初始密码 ChangeMe@2026(首次登录必须修改)')
  }

  // 财务角色+账号(双人防线第二人:手动扣费审批人≠申请人,C-08)
  const financePerms = [
    'fee:recharge', 'fee:manual', 'fee:ledger:view', 'fee:ledger:export',
    'ticket:ledger:view', 'approval:decide', 'report:export',
    'session:view', 'artist:view', 'attend:ledger:view',
  ]
  let financeRole = await prisma.role.findFirst({
    where: { storeId: store.id, name: '财务' },
  })
  if (financeRole === null) {
    financeRole = await prisma.role.create({
      data: { storeId: store.id, name: '财务', permCodes: financePerms },
    })
  } else {
    const owned = Array.isArray(financeRole.permCodes) ? (financeRole.permCodes as string[]) : []
    const merged = Array.from(new Set([...owned, ...financePerms]))
    if (merged.length !== owned.length) {
      financeRole = await prisma.role.update({ where: { id: financeRole.id }, data: { permCodes: merged } })
    }
  }
  const financePhone = '13103790380'
  const financeExists = await prisma.adminUser.findUnique({ where: { phone: financePhone } })
  if (financeExists === null) {
    await prisma.adminUser.create({
      data: {
        storeId: store.id,
        name: '测试财务',
        phone: financePhone,
        passwordHash: await bcrypt.hash('ChangeMe@2026', 10),
        roleId: financeRole.id,
      },
    })
    console.log('[seed] 财务已创建: ' + financePhone + ' / 初始密码 ChangeMe@2026(首次登录必须修改)')
  }

  console.log('[seed] 完成: store=' + store.name + ' roomTypes=' + roomTypes.length + ' rooms=' + String(roomSamples.reduce((n, s) => n + s.count, 0)) + ' level=技师 group=江海龙 artists=3 storeConfig=8项')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
