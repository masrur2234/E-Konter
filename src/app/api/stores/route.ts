import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - List user's stores
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const stores = await db.store.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(stores);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stores';
    return errorResponse(message, 500);
  }
}

// POST - Create store
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { name, address, phone, whatsapp } = body;

    if (!name) return errorResponse('Store name is required');

    const store = await db.store.create({
      data: {
        userId: user.id,
        name,
        address: address || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
      },
    });

    // Create default categories for the new store
    const defaultCategories = [
      { name: 'Pulsa', type: 'pulsa' },
      { name: 'Paket Data', type: 'paket_data' },
      { name: 'Token Listrik', type: 'token_listrik' },
      { name: 'Aksesoris HP', type: 'accessory' },
      { name: 'Handphone', type: 'phone' },
    ];

    await db.category.createMany({
      data: defaultCategories.map((cat) => ({
        userId: user.id,
        storeId: store.id,
        name: cat.name,
        type: cat.type,
      })),
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId: store.id,
        action: 'CREATE_STORE',
        description: `Store "${name}" created`,
      },
    });

    return successResponse(store, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create store';
    return errorResponse(message, 500);
  }
}

// PUT - Update store
export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { id, name, address, phone, whatsapp, logo, isActive } = body;

    if (!id) return errorResponse('Store ID is required');

    // Verify ownership
    const existing = await db.store.findFirst({ where: { id, userId: user.id } });
    if (!existing) return errorResponse('Store not found', 404);

    const store = await db.store.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(logo !== undefined && { logo }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId: store.id,
        action: 'UPDATE_STORE',
        description: `Store "${store.name}" updated`,
      },
    });

    return successResponse(store);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update store';
    return errorResponse(message, 500);
  }
}
