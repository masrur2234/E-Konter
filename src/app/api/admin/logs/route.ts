export const preferredRegion = "sin1";

import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

async function requireSuperAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: errorResponse('Unauthorized', 401) };
  if (user.role !== 'super_admin') return { error: errorResponse('Forbidden: Super admin only', 403) };
  return { user };
}

// GET - All activity logs with filters (super admin)
export async function GET(request: Request) {
  try {
    const check = await requireSuperAdmin(request);
    if (check.error) return check.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (storeId) where.storeId = storeId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          store: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.activityLog.count({ where }),
    ]);

    return successResponse({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch activity logs';
    return errorResponse(message, 500);
  }
}
