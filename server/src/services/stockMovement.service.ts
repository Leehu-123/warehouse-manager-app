import { prisma } from '../index';

interface MovementData {
  type: string;
  refType: string;
  refId: number;
  itemId: number;
  fromLocationId?: number | null;
  toLocationId?: number | null;
  quantity: number;
  statusBefore?: string | null;
  statusAfter?: string | null;
  note?: string | null;
  createdBy: number;
}

export async function applyMovement(data: MovementData) {
  return prisma.$transaction(async (tx: any) => {
    // 1. Create the stock movement record
    const movement = await tx.stockMovement.create({
      data: {
        type: data.type,
        refType: data.refType,
        refId: data.refId,
        itemId: data.itemId,
        fromLocationId: data.fromLocationId || null,
        toLocationId: data.toLocationId || null,
        quantity: data.quantity,
        statusBefore: data.statusBefore || null,
        statusAfter: data.statusAfter || null,
        note: data.note || null,
        createdBy: data.createdBy,
      },
    });

    // 2. Decrease inventory at source (if fromLocationId is specified)
    if (data.fromLocationId) {
      const sourceStatus = data.statusBefore || 'tot';
      const existing = await tx.inventory.findUnique({
        where: {
          itemId_locationId_status: {
            itemId: data.itemId,
            locationId: data.fromLocationId,
            status: sourceStatus,
          },
        },
      });

      if (!existing || existing.quantity < data.quantity) {
        throw new Error(
          `Không đủ tồn kho: cần ${data.quantity}, hiện có ${existing?.quantity || 0} (mặt hàng ID: ${data.itemId}, vị trí ID: ${data.fromLocationId}, trạng thái: ${sourceStatus})`
        );
      }

      const newQty = existing.quantity - data.quantity;
      if (newQty === 0) {
        await tx.inventory.delete({
          where: { id: existing.id },
        });
      } else {
        await tx.inventory.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      }
    }

    // 3. Increase inventory at destination (if toLocationId is specified)
    if (data.toLocationId) {
      const destStatus = data.statusAfter || 'tot';
      await tx.inventory.upsert({
        where: {
          itemId_locationId_status: {
            itemId: data.itemId,
            locationId: data.toLocationId,
            status: destStatus,
          },
        },
        update: {
          quantity: { increment: data.quantity },
        },
        create: {
          itemId: data.itemId,
          locationId: data.toLocationId,
          quantity: data.quantity,
          status: destStatus,
        },
      });
    }

    return movement;
  });
}

export async function getMovementsByItem(itemId: number) {
  return prisma.stockMovement.findMany({
    where: { itemId },
    include: {
      item: { select: { code: true, name: true } },
      fromLocation: { select: { code: true, name: true } },
      toLocation: { select: { code: true, name: true } },
      user: { select: { fullName: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMovementsByRef(refType: string, refId: number) {
  return prisma.stockMovement.findMany({
    where: { refType, refId },
    include: {
      item: { select: { code: true, name: true } },
      fromLocation: { select: { code: true, name: true } },
      toLocation: { select: { code: true, name: true } },
      user: { select: { fullName: true, username: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
