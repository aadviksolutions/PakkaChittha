import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface RecordAuditEventInput {
  businessId: string;
  actorUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return String(value);
  }
}

export async function recordAuditEvent(
  input: RecordAuditEventInput,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  try {
    await client.auditEvent.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail ?? null,
        actorName: input.actorName ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        previousValue: toJsonValue(input.previousValue),
        newValue: toJsonValue(input.newValue),
        reason: input.reason ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error('[AuditService] Failed to persist AuditEvent:', error);
  }
}

export interface ListAuditEventsParams {
  businessId: string;
  entityType?: string;
  action?: string;
  actorUserId?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditEvents(params: ListAuditEventsParams) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: Prisma.AuditEventWhereInput = {
    businessId: params.businessId,
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return { events, total, limit, offset };
}

