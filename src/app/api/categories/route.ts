import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - List categories (with optional storeId filter)
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = { userId: user.id };
    if (storeId) where.storeId = storeId;
    if (type) where.type = type;

    const categories = await db.category.findMany({
      where,
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(categories);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    return errorResponse(message, 500);
  }
}

// POST - Create category
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { name, type, storeId } = body;

    if (!name || !type) return errorResponse('Name and type are required');

    const validTypes = ['phone', 'accessory', 'pulsa', 'paket_data', 'token_listrik'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const category = await db.category.create({
      data: {
        userId: user.id,
        storeId: storeId || null,
        name,
        type,
      },
    });

    return successResponse(category, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return errorResponse(message, 500);
  }
}
