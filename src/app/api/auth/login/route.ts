import { db } from '@/lib/db';
import { comparePassword, generateToken, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Find user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Check account status
    if (user.status === 'suspended') {
      return errorResponse('Account is suspended. Please contact support.', 403);
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Check subscription status
    const now = new Date();
    if (user.subscriptionStatus === 'trial' && user.trialEnd && now > user.trialEnd) {
      // Update subscription to expired
      await db.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' },
      });
      user.subscriptionStatus = 'expired';
    } else if (user.subscriptionStatus === 'active' && user.subscriptionEnd && now > user.subscriptionEnd) {
      await db.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' },
      });
      user.subscriptionStatus = 'expired';
    }

    // Get stores
    const stores = await db.store.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, name: true, address: true, phone: true },
    });

    // Generate token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        description: 'User logged in',
      },
    });

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        subscriptionStatus: user.subscriptionStatus,
        trialStart: user.trialStart,
        trialEnd: user.trialEnd,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        planType: user.planType,
        createdAt: user.createdAt,
      },
      token,
      stores,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return errorResponse(message, 500);
  }
}
