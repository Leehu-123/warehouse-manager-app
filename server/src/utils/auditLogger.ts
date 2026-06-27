import { prisma } from '../index';

export async function logAction(
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  changes?: object | null,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi ghi audit log:', err);
    // Don't throw - audit logging should not break the main operation
  }
}
