/**
 * 审批模块:手动扣费高额审批(C-08)
 * 红线:审批人与申请人不得同一人;通过才落 MANUAL_DEDUCT 流水(关联 approvalId);驳回不落流水
 * 依据:08-测试 C-08 + 06-权限 §3 双人防线
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { IsIn } from 'class-validator'
import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service.js'
import { JwtGuard, RequirePerm, type ReqWithUser } from '../../common/guards/jwt.guard.js'

class ApprovalDecideDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED'
}

/** 审批 payload(申请时快照;落账字段显式收敛) */
interface ManualDeductPayload {
  artistId: number
  artistStoreId: number
  businessDate: string
  stageName?: string
  badgeNo?: string
  groupId?: number
  amount: number
  remark: string
}

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: {
    storeId: number
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ rows: unknown[]; total: number }> {
    const page = Math.max(q.page ?? 1, 1)
    const pageSize = Math.min(q.pageSize ?? 20, 200)
    const where = { storeId: q.storeId, status: q.status }
    const [rows, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.approval.count({ where }),
    ])
    return { rows, total }
  }

  async decide(
    id: number,
    decision: 'APPROVED' | 'REJECTED',
    approver: { sub: number; name: string },
  ): Promise<{ id: number; status: string; txnId?: number }> {
    const approval = await this.prisma.approval.findFirst({ where: { id } })
    if (approval === null) throw new NotFoundException('审批单不存在')
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('该审批单已处理')
    }
    // 双人防线:审批人与申请人不得同一人(C-08)
    if (approval.applicantId === approver.sub) {
      throw new BadRequestException('审批人与申请人不可为同一人')
    }
    if (decision === 'REJECTED') {
      await this.prisma.approval.update({
        where: { id },
        data: { status: 'REJECTED', approverId: approver.sub, decidedAt: new Date() },
      })
      await this.audit(approval.storeId, approver.sub, 'APPROVAL_REJECT', 'approval', String(id), approval, null)
      return { id, status: 'REJECTED' }
    }

    // 通过 → 同事务:审批单 APPROVED + 落 MANUAL_DEDUCT 流水
    const payload = approval.bizPayload as unknown as ManualDeductPayload
    const txnId = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.approval.update({
        where: { id },
        data: { status: 'APPROVED', approverId: approver.sub, decidedAt: new Date() },
      })
      const txn = await tx.stageFeeTxn.create({
        data: {
          storeId: approval.storeId,
          businessDate: new Date(payload.businessDate),
          artistId: payload.artistId,
          stageName: payload.stageName,
          badgeNo: payload.badgeNo,
          groupId: payload.groupId,
          type: 'MANUAL_DEDUCT',
          amount: -payload.amount,
          refType: 'manual',
          remark: payload.remark,
          approvalId: approval.id,
          operatorId: approver.sub,
        },
      })
      return txn.id
    })
    await this.audit(approval.storeId, approver.sub, 'APPROVAL_APPROVE', 'approval', String(id), approval, { txnId })
    return { id, status: 'APPROVED', txnId }
  }

  private async audit(
    storeId: number | null,
    operatorId: number,
    action: string,
    targetType: string,
    targetId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        storeId: storeId ?? undefined,
        actorId: operatorId,
        action,
        targetType,
        targetId,
        beforeJson: (before ?? null) as object,
        afterJson: (after ?? null) as object,
      },
    })
  }
}

@Controller('approvals')
export class ApprovalController {
  constructor(private readonly svc: ApprovalService) {}

  @RequirePerm('fee:ledger:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.list({
      storeId: user?.storeId ?? 1,
      status,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    })
  }

  @RequirePerm('approval:decide')
  @Post(':id/decide')
  async decide(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApprovalDecideDto,
  ): Promise<unknown> {
    const user = (req as ReqWithUser).user
    return this.svc.decide(id, body.decision, { sub: user?.sub ?? 0, name: user?.name ?? '' })
  }
}

@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService, PrismaService],
})
export class ApprovalModule {}
