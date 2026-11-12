import { ApprovalStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isOwnerRole } from './roles';
import { recordAuditEvent } from './auditService';

export interface CreateApprovalInput {
  businessId: string;
  requestedByUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  requestType: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
}

export async function createApprovalRequest(input: CreateApprovalInput) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.create({
      data: {
        businessId: input.businessId,
        requestedByUserId: input.requestedByUserId,
        requestType: input.requestType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload
          ? (JSON.parse(JSON.stringify(input.payload)) as Prisma.InputJsonValue)
          : undefined,
        status: ApprovalStatus.PENDING,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.requestedByUserId,
        actorEmail: input.actorEmail,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: 'APPROVAL_REQUEST_CREATED',
        entityType: 'ApprovalRequest',
        entityId: request.id,
        newValue: {
          requestType: request.requestType,
          entityType: request.entityType,
          title: request.title,
        },
      },
      tx
    );

    return request;
  });
}

export interface DecideApprovalInput {
  businessId: string;
  approvalId: string;
  decidedByUserId: string;
  deciderEmail?: string | null;
  deciderName?: string | null;
  deciderRole: string;
  decision: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  decisionNotes?: string | null;
}

export async function decideApprovalRequest(input: DecideApprovalInput) {
  if (input.decision !== 'CANCELLED' && !isOwnerRole(input.deciderRole)) {
    throw new Error('Only the Business Owner can approve or reject sensitive accounting requests.');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.approvalRequest.findFirst({
      where: {
        id: input.approvalId,
        businessId: input.businessId,
      },
    });

    if (!existing) {
      throw new Error('Approval request not found in this business.');
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval request is already ${existing.status}.`);
    }

    if (
      input.decision === 'CANCELLED' &&
      !isOwnerRole(input.deciderRole) &&
      existing.requestedByUserId !== input.decidedByUserId
    ) {
      throw new Error('Only the requester or Business Owner can cancel a pending request.');
    }

    const updated = await tx.approvalRequest.update({
      where: { id: existing.id },
      data: {
        status: input.decision as ApprovalStatus,
        decidedByUserId: input.decidedByUserId,
        decisionNotes: input.decisionNotes ?? null,
        decidedAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAuditEvent(
      {
        businessId: input.businessId,
        actorUserId: input.decidedByUserId,
        actorEmail: input.deciderEmail,
        actorName: input.deciderName,
        actorRole: input.deciderRole,
        action: `APPROVAL_REQUEST_${input.decision}`,
        entityType: 'ApprovalRequest',
        entityId: existing.id,
        previousValue: { status: existing.status },
        newValue: { status: updated.status, decisionNotes: updated.decisionNotes },
        reason: input.decisionNotes ?? null,
      },
      tx
    );

    return updated;
  });
}

export async function listApprovalRequests(businessId: string, status?: ApprovalStatus) {
  return prisma.approvalRequest.findMany({
    where: {
      businessId,
      ...(status ? { status } : {}),
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
}

