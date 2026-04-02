import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) return errorResponse('storeId is required');

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ---- Today's Sales ----
    const todayTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        storeId,
        status: 'completed',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: { items: true },
    });

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const todayTransactionCount = todayTransactions.length;
    const todayProfit = todayTransactions.reduce((sum, t) => {
      return sum + (t.total - (t.items?.reduce((itemSum, item) => itemSum + (item.buyPrice * item.quantity), 0) || 0));
    }, 0);

    // ---- Total Revenue & Transaction Count (all time) ----
    const totalRevenueData = await db.transaction.aggregate({
      where: { userId: user.id, storeId, status: 'completed' },
      _sum: { total: true },
      _count: true,
    });

    // ---- Top Products (by quantity sold) ----
    const topProductsRaw = await db.transactionItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        transaction: {
          userId: user.id,
          storeId,
          status: 'completed',
        },
        productId: { not: null },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const topProducts = topProductsRaw.map((p) => ({
      productName: p.productName,
      quantitySold: p._sum.quantity || 0,
      revenue: p._sum.total || 0,
    }));

    // ---- Low Stock Products ----
    const lowStockProducts = await db.product.findMany({
      where: {
        userId: user.id,
        storeId,
        isActive: true,
        stock: { lte: 10 },
      },
      select: {
        id: true,
        name: true,
        type: true,
        stock: true,
        minStock: true,
        sellPrice: true,
      },
      orderBy: { stock: 'asc' },
      take: 10,
    });

    // ---- Recent Transactions ----
    const recentTransactions = await db.transaction.findMany({
      where: { userId: user.id, storeId, status: 'completed' },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // ---- Sales by Day (last 7 days) ----
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesByDayRaw = await db.transaction.groupBy({
      by: ['createdAt'],
      where: {
        userId: user.id,
        storeId,
        status: 'completed',
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { total: true },
      _count: true,
    });

    // Build daily map
    const dailyMap = new Map<string, { date: string; sales: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { date: key, sales: 0, count: 0 });
    }

    for (const item of salesByDayRaw) {
      const key = item.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(key);
      if (existing) {
        existing.sales += item._sum.total || 0;
        existing.count += item._count;
      }
    }

    const salesByDay = Array.from(dailyMap.values());

    // ---- Sales by Payment Method ----
    const paymentMethodData = await db.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        userId: user.id,
        storeId,
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    const salesByPaymentMethod = paymentMethodData.map((pm) => ({
      method: pm.paymentMethod,
      total: pm._sum.total || 0,
      count: pm._count,
    }));

    // ---- Sales by Product Type ----
    const salesByTypeData = await db.transaction.groupBy({
      by: ['type'],
      where: {
        userId: user.id,
        storeId,
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    const salesByType = salesByTypeData.map((t) => ({
      type: t.type,
      total: t._sum.total || 0,
      count: t._count,
    }));

    return successResponse({
      todaySales,
      todayTransactionCount,
      todayProfit,
      totalRevenue: totalRevenueData._sum.total || 0,
      totalTransactions: totalRevenueData._count,
      topProducts,
      lowStockProducts,
      recentTransactions,
      salesByDay,
      salesByPaymentMethod,
      salesByType,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    return errorResponse(message, 500);
  }
}
