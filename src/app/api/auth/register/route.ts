import { db } from '@/lib/db';
import { hashPassword, generateToken, successResponse, errorResponse } from '@/lib/auth';

const DEFAULT_CATEGORIES = [
  { name: 'Pulsa', type: 'pulsa' },
  { name: 'Paket Data', type: 'paket_data' },
  { name: 'Token Listrik', type: 'token_listrik' },
  { name: 'Aksesoris HP', type: 'accessory' },
  { name: 'Handphone', type: 'phone' },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, storeName } = body;

    if (!email || !password || !name || !storeName) {
      return errorResponse('Email, password, name, and storeName are required');
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 5);

    const hashedPassword = await hashPassword(password);

    // Create user with trial subscription
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        subscriptionStatus: 'trial',
        trialStart: now,
        trialEnd,
      },
    });

    // Create first store
    const store = await db.store.create({
      data: {
        userId: user.id,
        name: storeName,
        phone: phone || null,
      },
    });

    // Create default categories
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
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
        action: 'REGISTER',
        description: 'New user registered and store created',
        metadata: JSON.stringify({ email, storeName }),
      },
    });

    // Generate token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          trialStart: user.trialStart,
          trialEnd: user.trialEnd,
          createdAt: user.createdAt,
        },
        token,
        store: {
          id: store.id,
          name: store.name,
        },
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return errorResponse(message, 500);
  }
}
