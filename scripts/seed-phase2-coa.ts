import { SubscriptionPlan } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { ensureBusinessCOA } from '../src/lib/accounting';
import { buildIndianFyWindow, getIndianFyStartYear } from '../src/lib/rbac/fiscalYear';

async function main() {
  const currentFy = buildIndianFyWindow(getIndianFyStartYear()).code;

  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { plan: true },
      },
      _count: {
        select: { accountingGroups: true },
      },
    },
  });

  const scaleTargets = businesses.filter(
    (b) => b.subscriptions[0]?.plan === SubscriptionPlan.ENTERPRISE
  );

  console.log(
    `Found ${businesses.length} total businesses, ${scaleTargets.length} Scale (ENTERPRISE) targets.`
  );

  for (const biz of scaleTargets) {
    const res = await ensureBusinessCOA(biz.id, currentFy);
    console.log(
      `Business "${biz.name}" (${biz.id}): +${res.groupsCreated} groups, +${res.ledgersCreated} ledgers (prior groups: ${biz._count.accountingGroups}).`
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Failed to seed Phase 2 COA:', err);
    await prisma.$disconnect();
    process.exit(1);
  });

