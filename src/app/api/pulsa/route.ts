export const preferredRegion = "sin1";

import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// POST - Create pulsa/PPOB transaction (simulated)
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { storeId, customerId, phone, type, operator, nominal, price } = body;

    if (!storeId || !phone || !type || !nominal || !price) {
      return errorResponse('storeId, phone, type, nominal, and price are required');
    }

    const validTypes = ['pulsa', 'paket_data', 'token_listrik'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    // Create pulsa transaction
    const pulsaTransaction = await db.$transaction(async (tx) => {
      // Create pulsa transaction record
      const pulsaTx = await tx.pulsaTransaction.create({
        data: {
          userId: user.id,
          storeId,
          customerId: customerId || null,
          phone,
          type,
          operator: operator || null,
          nominal: String(nominal),
          price: parseFloat(price) || 0,
          status: 'success', // Simulated: always success
          refId: `REF${Date.now()}${Math.floor(Math.random() * 1000)}`,
          provider: 'Simulated Provider',
        },
      });

      // Create regular transaction record for accounting
      const invoiceNo = `PUL${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          storeId,
          customerId: customerId || null,
          cashierName: user.name,
          invoiceNo,
          type: 'pulsa',
          subtotal: parseFloat(price) || 0,
          discount: 0,
          total: parseFloat(price) || 0,
          paid: parseFloat(price) || 0,
          change: 0,
          paymentMethod: 'cash',
          status: 'completed',
          items: {
            create: {
              productName: `${type.toUpperCase()} ${nominal} - ${phone}`,
              category: type,
              quantity: 1,
              buyPrice: 0,
              sellPrice: parseFloat(price) || 0,
              total: parseFloat(price) || 0,
            },
          },
        },
      });

      // Create cashflow entry
      await tx.cashflow.create({
        data: {
          userId: user.id,
          storeId,
          type: 'income',
          category: 'pulsa',
          amount: parseFloat(price) || 0,
          description: `${type} ${nominal} - ${phone}`,
          reference: invoiceNo,
        },
      });

      return { pulsaTx, transaction };
    });

    // Build receipt
    const receiptData = {
      store: {
        name: store.name,
        address: store.address,
        phone: store.phone,
        whatsapp: store.whatsapp,
      },
      type: 'pulsa',
      pulsaTransaction: {
        phone,
        type,
        operator: operator || '-',
        nominal,
        price: parseFloat(price),
        refId: pulsaTransaction.pulsaTx.refId,
        status: pulsaTransaction.pulsaTx.status,
        provider: pulsaTransaction.pulsaTx.provider,
      },
      transaction: {
        invoiceNo: pulsaTransaction.transaction.invoiceNo,
        total: pulsaTransaction.transaction.total,
        paymentMethod: pulsaTransaction.transaction.paymentMethod,
      },
      createdAt: new Date().toISOString(),
    };

    // Save receipt snapshot
    await db.transaction.update({
      where: { id: pulsaTransaction.transaction.id },
      data: { receiptData: JSON.stringify(receiptData) },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId,
        action: 'PULSA_TRANSACTION',
        description: `Pulsa/PPOB transaction: ${type} ${nominal} to ${phone}`,
        metadata: JSON.stringify({
          phone,
          type,
          nominal,
          price,
          refId: pulsaTransaction.pulsaTx.refId,
        }),
      },
    });

    return successResponse({
      pulsaTransaction: pulsaTransaction.pulsaTx,
      transaction: pulsaTransaction.transaction,
      receipt: receiptData,
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pulsa transaction failed';
    return errorResponse(message, 500);
  }
}

// GET - List pulsa transactions
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!storeId) return errorResponse('storeId is required');

    const where: Record<string, unknown> = {
      userId: user.id,
      storeId,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }

    const [pulsaTransactions, total] = await Promise.all([
      db.pulsaTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.pulsaTransaction.count({ where }),
    ]);

    return successResponse({
      pulsaTransactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pulsa transactions';
    return errorResponse(message, 500);
  }
}
