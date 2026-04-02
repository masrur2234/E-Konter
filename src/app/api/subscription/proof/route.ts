export const preferredRegion = "sin1";

import { db } from '@/lib/db';
import { getUserFromRequest, successResponse, errorResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { planType, description, fileName, fileSize, proofImage } = body;

    if (!planType) return errorResponse('planType is required');

    // Store proof as activity log with metadata
    // In production, the proofImage (base64) would be saved to cloud storage
    // and only the URL would be stored here
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPLOAD_PAYMENT_PROOF',
        description: `Payment proof uploaded for ${planType} plan${description ? `: ${description}` : ''}`,
        metadata: JSON.stringify({
          planType,
          fileName: fileName || 'unknown',
          fileSize: fileSize || 0,
          hasProofImage: !!proofImage,
          proofImageLength: proofImage ? proofImage.length : 0,
          description: description || '',
          status: 'pending_verification',
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    return successResponse({
      message: 'Bukti pembayaran berhasil diupload',
      status: 'pending_verification',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload proof';
    return errorResponse(message, 500);
  }
}
