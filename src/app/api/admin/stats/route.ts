import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

async function requireSuperAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: errorResponse('Unauthorized', 401) };
  if (user.role !== 'super_admin') return { error: errorResponse('Forbidden: Super admin only', 403) };
  return { user };
}

// GET - Global stats (super admin)
export async function GET(request: Request) {
  try {
    const check = await requireSuperAdmin(request);
    if (check.error) return check.error;

    // Total users (excluding super_admin)
    const totalUsers = await db.user.count({
      where: { role: { not: 'super_admin' } },
    });

    // Users by status
    const activeUsers = await db.user.count({
      where: { status: 'active', role: { not: 'super_admin' } },
    });

    const suspendedUsers = await db.user.count({
      where: { status: 'suspended', role: { not: 'super_admin' } },
    });

    // Users by subscription
    const trialUsers = await db.user.count({
      where: { subscriptionStatus: 'trial', role: { not: 'super_admin' } },
    });

    const activeSubscriptionUsers = await db.user.count({
      where: { subscriptionStatus: 'active', role: { not: 'super_admin' } },
    });

    const expiredUsers = await db.user.count({
      where: { subscriptionStatus: 'expired', role: { not: 'super_admin' } },
    });

    // Subscription plans distribution
    const planDistribution = await db.user.groupBy({
      by: ['planType'],
      where: { role: { not: 'super_admin' } },
      _count: true,
    });

    // Total stores
    const totalStores = await db.store.count();

    // Total transactions
    const totalTransactions = await db.transaction.count();

    // Total transaction revenue
    const totalRevenue = await db.transaction.aggregate({
      where: { status: 'completed' },
      _sum: { total: true },
    });

    // Total products
    const totalProducts = await db.product.count();

    // Total customers
    const totalCustomers = await db.customer.count();

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await db.user.count({
      where: {
        role: { not: 'super_admin' },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // New registrations by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentUsersRaw = await db.user.findMany({
      where: {
        role: { not: 'super_admin' },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRegistrations: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      dailyRegistrations[d.toISOString().split('T')[0]] = 0;
    }

    for (const u of recentUsersRaw) {
      const key = u.createdAt.toISOString().split('T')[0];
      if (key in dailyRegistrations) {
        dailyRegistrations[key]++;
      }
    }

    return successResponse({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        bySubscription: {
          trial: trialUsers,
          active: activeSubscriptionUsers,
          expired: expiredUsers,
        },
        recentRegistrations,
      },
      subscription: {
        planDistribution: planDistribution.map((p) => ({
          plan: p.planType || 'none',
          count: p._count,
        })),
      },
      platform: {
        totalStores,
        totalTransactions,
        totalRevenue: totalRevenue._sum.total || 0,
        totalProducts,
        totalCustomers,
      },
      dailyRegistrations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch admin stats';
    return errorResponse(message, 500);
  }
}
