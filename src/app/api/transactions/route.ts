import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

function generateInvoiceNo(): string {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV${ts}${rand}`;
}

// GET - List transactions with filters
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
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
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { cashierName: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    return successResponse({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return errorResponse(message, 500);
  }
}

// POST - Create transaction
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const {
      storeId, customerId, cashierName, type, items,
      discount, paid, paymentMethod, paymentRef,
    } = body;

    if (!storeId || !items || !items.length) {
      return errorResponse('storeId and items are required');
    }

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    // Validate products and calculate totals
    let subtotal = 0;
    const transactionItems: Array<{
      productId: string | null;
      productName: string;
      category: string | null;
      quantity: number;
      buyPrice: number;
      sellPrice: number;
      total: number;
    }> = [];

    for (const item of items) {
      const itemQty = item.quantity || 1;
      let buyPrice = item.buyPrice || 0;
      let sellPrice = item.sellPrice || 0;
      let productName = item.productName;
      let productId: string | null = item.productId || null;
      let category: string | null = item.category || null;

      // If productId is provided, fetch product data and check stock
      if (productId) {
        const product = await db.product.findFirst({
          where: { id: productId, userId: user.id, storeId },
        });
        if (!product) return errorResponse(`Product with ID ${productId} not found`, 404);
        if (product.stock < itemQty) {
          return errorResponse(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${itemQty}`);
        }
        buyPrice = product.buyPrice;
        sellPrice = product.sellPrice;
        productName = product.name;
        category = product.type;
      }

      const itemTotal = sellPrice * itemQty;
      subtotal += itemTotal;

      transactionItems.push({
        productId,
        productName,
        category,
        quantity: itemQty,
        buyPrice,
        sellPrice,
        total: itemTotal,
      });
    }

    const discountAmount = discount || 0;
    const total = subtotal - discountAmount;
    const paidAmount = paid || 0;
    const changeAmount = paidAmount - total;

    // Generate invoice number
    let invoiceNo = generateInvoiceNo();
    // Ensure uniqueness
    const existingInvoice = await db.transaction.findUnique({ where: { invoiceNo } });
    if (existingInvoice) {
      invoiceNo = generateInvoiceNo() + Math.floor(Math.random() * 10).toString();
    }

    // Create transaction with items in a transaction
    const transaction = await db.$transaction(async (tx) => {
      // Create the transaction
      const txn = await tx.transaction.create({
        data: {
          userId: user.id,
          storeId,
          customerId: customerId || null,
          cashierName: cashierName || user.name,
          invoiceNo,
          type: type || 'sale',
          subtotal,
          discount: discountAmount,
          total,
          paid: paidAmount,
          change: changeAmount,
          paymentMethod: paymentMethod || 'cash',
          paymentRef: paymentRef || null,
          status: 'completed',
          items: {
            create: transactionItems,
          },
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
          store: { select: { id: true, name: true, address: true, phone: true, whatsapp: true } },
        },
      });

      // Update product stock
      for (const item of transactionItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Create cashflow entry for income
      await tx.cashflow.create({
        data: {
          userId: user.id,
          storeId,
          type: 'income',
          category: type === 'pulsa' ? 'pulsa' : 'sales',
          amount: total,
          description: `Penjualan - ${invoiceNo}`,
          reference: invoiceNo,
        },
      });

      return txn;
    });

    // Build receipt snapshot
    const receiptData = {
      store: {
        name: store.name,
        address: store.address,
        phone: store.phone,
        whatsapp: store.whatsapp,
      },
      cashier: cashierName || user.name,
      invoiceNo,
      items: transactionItems.map((item) => ({
        name: item.productName,
        category: item.category,
        qty: item.quantity,
        price: item.sellPrice,
        total: item.total,
      })),
      subtotal,
      discount: discountAmount,
      total,
      paid: paidAmount,
      change: changeAmount,
      paymentMethod: paymentMethod || 'cash',
      customer: transaction.customer,
      createdAt: transaction.createdAt.toISOString(),
    };

    // Save receipt snapshot
    await db.transaction.update({
      where: { id: transaction.id },
      data: { receiptData: JSON.stringify(receiptData) },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId,
        action: 'CREATE_TRANSACTION',
        description: `Transaction ${invoiceNo} created - Total: Rp ${total.toLocaleString('id-ID')}`,
        metadata: JSON.stringify({
          invoiceNo,
          total,
          itemCount: items.length,
          paymentMethod,
        }),
      },
    });

    return successResponse({
      transaction,
      receipt: receiptData,
    }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    return errorResponse(message, 500);
  }
}
