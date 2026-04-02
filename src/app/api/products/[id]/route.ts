import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - Get single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    const product = await db.product.findFirst({
      where: { id, userId: user.id },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!product) return errorResponse('Product not found', 404);

    return successResponse(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return errorResponse(message, 500);
  }
}

// PUT - Update product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const body = await request.json();

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
      if (body[field] !== undefined) {
        data[field] = body[field];
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

// DELETE - Delete product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    // Verify ownership
    const existing = await db.product.findFirst({ where: { id, userId: user.id } });
    if (!existing) return errorResponse('Product not found', 404);

    await db.product.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        storeId: existing.storeId,
        action: 'DELETE_PRODUCT',
        description: `Product "${existing.name}" deleted`,
        metadata: JSON.stringify({ productId: id }),
      },
    });

    return successResponse({ message: 'Product deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    return errorResponse(message, 500);
  }
}
