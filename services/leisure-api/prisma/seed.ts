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

  // 角色 + 管理员(默认密码,首次登录后必须修改)
  const permCodes = [
    'artist:view', 'artist:edit', 'artist:delete', 'artist:transfer', 'artist:batch',
    'level:manage', 'group:manage', 'feerule:manage', 'ticketrule:manage',
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

  console.log('[seed] 完成: store=' + store.name + ' roomTypes=' + roomTypes.length + ' level=技师 group=江海龙')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
