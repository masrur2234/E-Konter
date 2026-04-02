import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - List products with filters
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const lowStock = searchParams.get('lowStock') === 'true';

    if (!storeId) return errorResponse('storeId is required');

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const where: Record<string, unknown> = {
      userId: user.id,
      storeId,
      isActive: true,
    };

    if (type) where.type = type;
    if (category) where.categoryId = category;
    if (lowStock) {
      // Products where stock <= minStock
      where.stock = { lte: 10 };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return successResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    return errorResponse(message, 500);
  }
}

// POST - Create product
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const {
      storeId, name, sku, type, description,
      brand, model, ram, storage, color, imei, condition,
      buyPrice, sellPrice, stock, minStock, categoryId,
    } = body;

    if (!storeId || !name || !type) {
      return errorResponse('storeId, name, and type are required');
    }

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const validTypes = ['phone', 'accessory', 'pulsa', 'paket_data', 'token_listrik'];
    if (!validTypes.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const product = await db.product.create({
      data: {
        userId: user.id,
        storeId,
        name,
        sku: sku || null,
        type,
        description: description || null,
        brand: brand || null,
        model: model || null,
        ram: ram || null,
        storage: storage || null,
        color: color || null,
        imei: imei || null,
        condition: condition || null,
        buyPrice: buyPrice || 0,
        sellPrice: sellPrice || 0,
        stock: stock || 0,
        minStock: minStock || 5,
        categoryId: categoryId || null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId,
        action: 'CREATE_PRODUCT',
        description: `Product "${name}" created`,
        metadata: JSON.stringify({ productId: product.id, type, sellPrice }),
      },
    });

    return successResponse(product, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return errorResponse(message, 500);
  }
}

// PUT - Update product
export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return errorResponse('Product ID is required');

    // Verify ownership
    const existing = await db.product.findFirst({ where: { id, userId: user.id } });
    if (!existing) return errorResponse('Product not found', 404);

    // Build update payload
    const data: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'sku', 'type', 'description', 'brand', 'model', 'ram',
      'storage', 'color', 'imei', 'condition', 'buyPrice', 'sellPrice',
      'stock', 'minStock', 'categoryId', 'isActive',
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field];
      }
    }

    const product = await db.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId: product.storeId,
        action: 'UPDATE_PRODUCT',
        description: `Product "${product.name}" updated`,
      },
    });

    return successResponse(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return errorResponse(message, 500);
  }
}
