export const preferredRegion = "sin1";

import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - List cashflow entries
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!storeId) return errorResponse('storeId is required');

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const where: Record<string, unknown> = {
      userId: user.id,
      storeId,
    };

    if (type) where.type = type;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [cashflows, total] = await Promise.all([
      db.cashflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.cashflow.count({ where }),
    ]);

    // Calculate summary
    const summary = await db.cashflow.aggregate({
      where: {
        userId: user.id,
        storeId,
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        } : {}),
      },
      _sum: { amount: true },
    });

    const incomeSummary = await db.cashflow.aggregate({
      where: {
        userId: user.id,
        storeId,
        type: 'income',
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        } : {}),
      },
      _sum: { amount: true },
    });

    const expenseSummary = await db.cashflow.aggregate({
      where: {
        userId: user.id,
        storeId,
        type: 'expense',
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        } : {}),
      },
      _sum: { amount: true },
    });

    return successResponse({
      cashflows,
      summary: {
        total: summary._sum.amount || 0,
        income: incomeSummary._sum.amount || 0,
        expense: expenseSummary._sum.amount || 0,
        balance: (incomeSummary._sum.amount || 0) - (expenseSummary._sum.amount || 0),
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cashflow';
    return errorResponse(message, 500);
  }
}

// POST - Create cashflow entry
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { storeId, type, category, amount, description, reference, fromStoreId, toStoreId } = body;

    if (!storeId || !type || !amount) {
      return errorResponse('storeId, type, and amount are required');
    }

    const validTypes = ['income', 'expense', 'transfer'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const cashflow = await db.cashflow.create({
      data: {
        userId: user.id,
        storeId,
        type,
        category: category || null,
        amount: parseFloat(amount) || 0,
        description: description || null,
        reference: reference || null,
        fromStoreId: fromStoreId || null,
        toStoreId: toStoreId || null,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId,
        action: type === 'income' ? 'ADD_INCOME' : type === 'expense' ? 'ADD_EXPENSE' : 'TRANSFER',
        description: `${type} entry: Rp ${parseFloat(amount).toLocaleString('id-ID')} - ${category || description || ''}`,
        metadata: JSON.stringify({ cashflowId: cashflow.id, type, amount }),
      },
    });

    return successResponse(cashflow, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create cashflow entry';
    return errorResponse(message, 500);
  }
}
