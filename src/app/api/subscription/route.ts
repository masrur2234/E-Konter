import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - Get current subscription status
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    // Re-fetch user with latest subscription data
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        trialStart: true,
        trialEnd: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        planType: true,
      },
    });

    if (!userData) return errorResponse('User not found', 404);

    // Check if trial/subscription has expired
    const now = new Date();
    let currentStatus = userData.subscriptionStatus;

    if (currentStatus === 'trial' && userData.trialEnd && now > userData.trialEnd) {
      await db.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' },
      });
      currentStatus = 'expired';
    } else if (currentStatus === 'active' && userData.subscriptionEnd && now > userData.subscriptionEnd) {
      await db.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' },
      });
      currentStatus = 'expired';
    }

    // Get store count
    const storeCount = await db.store.count({ where: { userId: user.id } });

    // Get transaction count (to show usage)
    const transactionCount = await db.transaction.count({ where: { userId: user.id } });

    return successResponse({
      subscription: {
        status: currentStatus,
        trialStart: userData.trialStart,
        trialEnd: userData.trialEnd,
        subscriptionStart: userData.subscriptionStart,
        subscriptionEnd: userData.subscriptionEnd,
        planType: userData.planType,
        storeCount,
        transactionCount,
      },
      plans: [
        {
          id: 'monthly',
          name: 'Bulanan',
          price: 29999,
          duration: '1 bulan',
          features: [
            'Multi-toko (hingga 3 toko)',
            'Transaksi unlimited',
            'Laporan lengkap',
            'Dukungan prioritas',
          ],
        },
        {
          id: 'yearly',
          name: 'Tahunan',
          price: 299000,
          duration: '12 bulan',
          features: [
            'Multi-toko unlimited',
            'Transaksi unlimited',
            'Laporan lengkap',
            'Dukungan prioritas',
            'Hemat 17% (setara Rp 24.917/bulan)',
          ],
        },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return errorResponse(message, 500);
  }
}

// POST - Activate subscription (manual approve flow)
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { planType } = body;

    if (!planType) return errorResponse('planType is required');

    const validPlans = ['monthly', 'yearly'];
    if (!validPlans.includes(planType)) {
      return errorResponse(`Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    }

    // In a real app, this would integrate with a payment gateway.
    // For now, we create a pending subscription that requires admin approval.
    // For demo purposes, we'll auto-activate the subscription.

    const now = new Date();
    let subscriptionEnd = new Date(now);

    if (planType === 'monthly') {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        planType,
        subscriptionStart: now,
        subscriptionEnd,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'ACTIVATE_SUBSCRIPTION',
        description: `Subscription activated: ${planType} plan`,
        metadata: JSON.stringify({
          planType,
          subscriptionStart: now.toISOString(),
          subscriptionEnd: subscriptionEnd.toISOString(),
        }),
      },
    });

    return successResponse({
      subscription: {
        status: updatedUser.subscriptionStatus,
        planType: updatedUser.planType,
        subscriptionStart: updatedUser.subscriptionStart,
        subscriptionEnd: updatedUser.subscriptionEnd,
      },
      message: 'Subscription activated successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to activate subscription';
    return errorResponse(message, 500);
  }
}
