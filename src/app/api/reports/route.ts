import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type'); // sales, stock, profit_loss
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!storeId) return errorResponse('storeId is required');

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const reportType = type || 'sales';

    if (reportType === 'sales') {
      // ---- Sales Report ----
      const transactions = await db.transaction.findMany({
        where: {
          userId: user.id,
          storeId,
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        include: {
          items: true,
          customer: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalDiscount = transactions.reduce((sum, t) => sum + t.discount, 0);
      const totalItemsSold = transactions.reduce(
        (sum, t) => sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0
      );
      const avgTransaction = transactions.length > 0 ? totalSales / transactions.length : 0;

      // Group by payment method
      const byPaymentMethod: Record<string, { total: number; count: number }> = {};
      for (const t of transactions) {
        if (!byPaymentMethod[t.paymentMethod]) {
          byPaymentMethod[t.paymentMethod] = { total: 0, count: 0 };
        }
        byPaymentMethod[t.paymentMethod].total += t.total;
        byPaymentMethod[t.paymentMethod].count += 1;
      }

      return successResponse({
        type: 'sales',
        period: { startDate, endDate },
        summary: {
          totalSales,
          totalDiscount,
          totalItemsSold,
          transactionCount: transactions.length,
          avgTransaction,
        },
        byPaymentMethod,
        transactions: transactions.slice(0, 100), // Limit response size
      });
    }

    if (reportType === 'stock') {
      // ---- Stock Report ----
      const products = await db.product.findMany({
        where: {
          userId: user.id,
          storeId,
          isActive: true,
        },
        include: {
          category: { select: { name: true } },
        },
        orderBy: [{ type: 'asc' }, { stock: 'asc' }],
      });

      const totalProducts = products.length;
      const totalStockValue = products.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);
      const totalSellValue = products.reduce((sum, p) => sum + (p.sellPrice * p.stock), 0);
      const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
      const outOfStockCount = products.filter((p) => p.stock === 0).length;

      // Group by type
      const byType: Record<string, { count: number; totalStock: number; value: number }> = {};
      for (const p of products) {
        if (!byType[p.type]) {
          byType[p.type] = { count: 0, totalStock: 0, value: 0 };
        }
        byType[p.type].count += 1;
        byType[p.type].totalStock += p.stock;
        byType[p.type].value += p.buyPrice * p.stock;
      }

      return successResponse({
        type: 'stock',
        summary: {
          totalProducts,
          totalStockValue,
          totalSellValue,
          lowStockCount,
          outOfStockCount,
        },
        byType,
        products,
      });
    }

    if (reportType === 'profit_loss') {
      // ---- Profit & Loss Report ----
      const transactions = await db.transaction.findMany({
        where: {
          userId: user.id,
          storeId,
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        include: { items: true },
      });

      // Calculate revenue and COGS from transactions
      let totalRevenue = 0;
      let totalCOGS = 0;
      let totalDiscount = 0;

      for (const t of transactions) {
        totalRevenue += t.total;
        totalDiscount += t.discount;
        if (t.items) {
          for (const item of t.items) {
            totalCOGS += item.buyPrice * item.quantity;
          }
        }
      }

      const grossProfit = totalRevenue - totalCOGS;

      // Get expenses from cashflow
      const expenses = await db.cashflow.findMany({
        where: {
          userId: user.id,
          storeId,
          type: 'expense',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      });

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Group expenses by category
      const expenseByCategory: Record<string, number> = {};
      for (const e of expenses) {
        const cat = e.category || 'Lainnya';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
      }

      const netProfit = grossProfit - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return successResponse({
        type: 'profit_loss',
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          totalExpenses,
          netProfit,
          totalDiscount,
          profitMargin: Math.round(profitMargin * 100) / 100,
          transactionCount: transactions.length,
        },
        expenseBreakdown: expenseByCategory,
      });
    }

    return errorResponse('Invalid report type. Use: sales, stock, or profit_loss');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return errorResponse(message, 500);
  }
}
