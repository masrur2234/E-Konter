import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// Super admin check helper
async function requireSuperAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: errorResponse('Unauthorized', 401) };
  if (user.role !== 'super_admin') return { error: errorResponse('Forbidden: Super admin only', 403) };
  return { user };
}

// GET - List all users (super admin)
export async function GET(request: Request) {
  try {
    const check = await requireSuperAdmin(request);
    if (check.error) return check.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const subscription = searchParams.get('subscription');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { role: { not: 'super_admin' } };

    if (status) where.status = status;
    if (subscription) where.subscriptionStatus = subscription;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          subscriptionStatus: true,
          trialStart: true,
          trialEnd: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          planType: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              stores: true,
              transactions: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return successResponse({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return errorResponse(message, 500);
  }
}

// PATCH - Suspend/activate user or extend subscription (super admin)
export async function PATCH(request: Request) {
  try {
    const check = await requireSuperAdmin(request);
    if (check.error) return check.error;

    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId || !action) return errorResponse('userId and action are required');

    // Verify target user exists and is not super_admin
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) return errorResponse('User not found', 404);
    if (targetUser.role === 'super_admin') return errorResponse('Cannot modify super admin', 403);

    let updatedUser;

    if (action === 'suspend') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { status: 'suspended' },
      });
    } else if (action === 'activate') {
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { status: 'active' },
      });
    } else if (action === 'extend_subscription') {
      const { days, planType } = data || {};
      if (!days) return errorResponse('days is required for extension');

      const now = new Date();
      const currentEnd = targetUser.subscriptionEnd || now;
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'active',
          subscriptionStart: now,
          subscriptionEnd: newEnd,
          planType: planType || targetUser.planType,
          status: 'active',
        },
      });
    } else {
      return errorResponse('Invalid action. Use: suspend, activate, or extend_subscription');
    }

    // Log admin action
    await db.activityLog.create({
      data: {
        userId: check.user!.id,
        action: `ADMIN_${action.toUpperCase()}`,
        description: `Admin ${action} user: ${targetUser.email}`,
        metadata: JSON.stringify({ targetUserId: userId, action, data }),
      },
    });

    return successResponse({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        status: updatedUser.status,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionEnd: updatedUser.subscriptionEnd,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return errorResponse(message, 500);
  }
}
