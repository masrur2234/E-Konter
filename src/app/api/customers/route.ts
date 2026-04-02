import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

// GET - List customers
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    return successResponse({
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
    return errorResponse(message, 500);
  }
}

// POST - Create customer
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { storeId, name, phone, address, email } = body;

    if (!storeId || !name) return errorResponse('storeId and name are required');

    // Verify store belongs to user
    const store = await db.store.findFirst({ where: { id: storeId, userId: user.id } });
    if (!store) return errorResponse('Store not found', 404);

    const customer = await db.customer.create({
      data: {
        userId: user.id,
        storeId,
        name,
        phone: phone || null,
        address: address || null,
        email: email || null,
      },
    });

    return successResponse(customer, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    return errorResponse(message, 500);
  }
}

// PUT - Update customer
export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { id, name, phone, address, email, debt } = body;

    if (!id) return errorResponse('Customer ID is required');

    // Verify ownership
    const existing = await db.customer.findFirst({ where: { id, userId: user.id } });
    if (!existing) return errorResponse('Customer not found', 404);

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (email !== undefined) data.email = email;
    if (debt !== undefined) data.debt = debt;

    const customer = await db.customer.update({
      where: { id },
      data,
    });

    return successResponse(customer);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update customer';
    return errorResponse(message, 500);
  }
}

// DELETE - Delete customer
export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return errorResponse('Customer ID is required');

    // Verify ownership
    const existing = await db.customer.findFirst({ where: { id, userId: user.id } });
    if (!existing) return errorResponse('Customer not found', 404);

    await db.customer.delete({ where: { id } });

    return successResponse({ message: 'Customer deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete customer';
    return errorResponse(message, 500);
  }
}
