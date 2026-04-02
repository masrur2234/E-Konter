export const preferredRegion = "sin1";

import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get stores
    const stores = await db.store.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, address: true, phone: true, whatsapp: true, logo: true, isActive: true },
    });

    return successResponse({
      user,
      stores,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Session validation failed';
    return errorResponse(message, 500);
  }
}
