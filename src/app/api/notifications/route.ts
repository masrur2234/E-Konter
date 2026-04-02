export const preferredRegion = "sin1";

import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) return errorResponse('storeId is required');

    // Verify store belongs to user
    const store = await db.store.findFirst({
      where: { id: storeId, userId: user.id, isActive: true },
    });
    if (!store) return errorResponse('Store not found', 404);

    const notifications: Array<{
      type: 'low_stock' | 'debt_reminder' | 'subscription_expiring' | 'transaction' | 'system'
      title: string
      message: string
      link?: string
    }> = [];

    // 1. Low stock products
    const lowStockProducts = await db.product.findMany({
      where: {
        storeId,
        isActive: true,
        stock: { lte: 5 },
      },
      orderBy: { stock: 'asc' },
      take: 10,
      select: { id: true, name: true, stock: true, minStock: true },
    });

    if (lowStockProducts.length > 0) {
      const outOfStock = lowStockProducts.filter((p) => p.stock === 0);
      const lowStock = lowStockProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock);

      if (outOfStock.length > 0) {
        notifications.push({
          type: 'low_stock',
          title: `${outOfStock.length} produk habis`,
          message: `${outOfStock.map((p) => p.name).slice(0, 3).join(', ')}${outOfStock.length > 3 ? ' dan lainnya' : ''} kehabisan stok.`,
          link: 'products',
        });
      }

      if (lowStock.length > 0) {
        notifications.push({
          type: 'low_stock',
          title: `${lowStock.length} produk stok menipis`,
          message: `${lowStock.map((p) => p.name).slice(0, 3).join(', ')}${lowStock.length > 3 ? ' dan lainnya' : ''} perlu segera restock.`,
          link: 'products',
        });
      }
    }

    // 2. Subscription expiring (within 2 days)
    if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active') {
      const endDate = user.subscriptionStatus === 'trial'
        ? user.trialEnd
        : user.subscriptionEnd;

      if (endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 2 && diffDays >= 0) {
          notifications.push({
            type: 'subscription_expiring',
            title: `Langganan ${diffDays === 0 ? 'berakhir hari ini' : `berakhir dalam ${diffDays} hari`}`,
            message: `Segera perpanjang langganan Anda agar tetap bisa mengakses semua fitur.`,
            link: 'subscription',
          });
        }
      }
    }

    // 3. Customers with debt
    const customersWithDebt = await db.customer.findMany({
      where: {
        storeId,
        debt: { gt: 0 },
      },
      orderBy: { debt: 'desc' },
      take: 5,
      select: { name: true, debt: true },
    });

    if (customersWithDebt.length > 0) {
      const totalDebt = customersWithDebt.reduce((sum, c) => sum + c.debt, 0);
      notifications.push({
        type: 'debt_reminder',
        title: `${customersWithDebt.length} pelanggan memiliki hutang`,
        message: `Total hutang pelanggan: Rp ${totalDebt.toLocaleString('id-ID')}. Pelanggan terbesar: ${customersWithDebt[0].name} (Rp ${customersWithDebt[0].debt.toLocaleString('id-ID')}).`,
        link: 'customers',
      });
    }

    // 4. Recent transactions (last 5)
    const recentTransactions = await db.transaction.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        customer: {
          select: { name: true },
        },
      },
    });

    if (recentTransactions.length > 0) {
      const lastTx = recentTransactions[0];
      const timeDiff = Date.now() - new Date(lastTx.createdAt).getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));

      if (minutesAgo < 60) {
        notifications.push({
          type: 'transaction',
          title: `Transaksi terbaru: ${lastTx.invoiceNo}`,
          message: `${lastTx.customer?.name || 'Pelanggan'} - Rp ${lastTx.total.toLocaleString('id-ID')} (${lastTx.paymentMethod})`,
          link: 'transactions',
        });
      }
    }

    return successResponse(notifications);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    console.error('Notification error:', message);
    return errorResponse(message, 500);
  }
}
