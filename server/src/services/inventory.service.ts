import { prisma } from '../index';
import { Prisma } from '@prisma/client';

interface InventoryFilters {
  search?: string;
  glassType?: string;
  thickness?: number;
  color?: string;
  locationId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getInventory(filters: InventoryFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.locationId) {
    where.locationId = filters.locationId;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  // Item-level filters
  const itemWhere: any = { active: true };
  if (filters.search) {
    itemWhere.OR = [
      { code: { contains: filters.search } },
      { name: { contains: filters.search } },
    ];
  }
  if (filters.glassType) {
    itemWhere.glassType = filters.glassType;
  }
  if (filters.thickness) {
    itemWhere.thickness = filters.thickness;
  }
  if (filters.color) {
    itemWhere.color = filters.color;
  }

  where.item = itemWhere;

  const [data, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            glassType: true,
            thickness: true,
            color: true,
            standardSize: true,
            areaM2: true,
            unit: true,
            unitPrice: true,
            minStock: true,
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            zone: true,
          },
        },
      },
      orderBy: [{ item: { code: 'asc' } }, { location: { code: 'asc' } }],
      skip,
      take: limit,
    }),
    prisma.inventory.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getInventoryByItem(itemId: number) {
  return prisma.inventory.findMany({
    where: { itemId },
    include: {
      location: {
        select: { id: true, code: true, name: true, zone: true },
      },
    },
    orderBy: { location: { code: 'asc' } },
  });
}

export async function getAvailableQuantity(itemId: number, locationId?: number) {
  const where: any = {
    itemId,
    status: 'tot',
  };
  if (locationId) {
    where.locationId = locationId;
  }

  const result = await prisma.inventory.aggregate({
    where,
    _sum: { quantity: true },
  });

  return result._sum.quantity || 0;
}

export async function getLowStockItems() {
  const items = await prisma.item.findMany({
    where: { active: true, minStock: { gt: 0 } },
    include: {
      inventory: {
        where: { status: 'tot' },
      },
      supplier: { select: { name: true } },
    },
  });

  return items
    .map((item) => {
      const totalQty = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        glassType: item.glassType,
        thickness: item.thickness,
        color: item.color,
        unit: item.unit,
        minStock: item.minStock,
        currentStock: totalQty,
        shortage: item.minStock - totalQty,
        supplier: item.supplier?.name || null,
      };
    })
    .filter((item) => item.currentStock < item.minStock)
    .sort((a, b) => b.shortage - a.shortage);
}

export async function getSlowMovingItems(daysThreshold = 60) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const items = await prisma.item.findMany({
    where: { 
      active: true, 
      inventory: { some: { quantity: { gt: 0 }, status: 'tot' } }
    },
    include: {
      inventory: { where: { status: 'tot' } },
      stockMovements: {
        where: { type: { in: ['xuat', 'gia_cong_xuat'] } },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  const result = items.map((item) => {
    const totalQty = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const lastOut = item.stockMovements.length > 0 ? item.stockMovements[0].createdAt : null;
    
    const compareDate = lastOut || item.createdAt;
    const daysInStock = Math.floor((Date.now() - compareDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      glassType: item.glassType,
      thickness: item.thickness,
      color: item.color,
      currentStock: totalQty,
      lastOutDate: lastOut,
      daysInStock,
    };
  }).filter(item => item.daysInStock >= daysThreshold)
    .sort((a, b) => b.daysInStock - a.daysInStock);

  return result;
}

export async function getDashboardStats() {
  const [
    totalSKUs,
    inventoryAgg,
    pendingReceipts,
    pendingIssues,
    pendingProcessing,
    damageCount,
    lowStockItems,
    slowMovingItems,
    recentMovements,
  ] = await Promise.all([
    prisma.item.count({ where: { active: true } }),
    prisma.inventory.aggregate({
      where: { item: { active: true }, location: { active: true } },
      _sum: { quantity: true },
    }),
    prisma.goodsReceipt.count({ where: { status: { in: ['nhap', 'cho_duyet', 'da_duyet'] } } }),
    prisma.goodsIssue.count({ where: { status: { in: ['nhap', 'cho_duyet', 'da_duyet'] } } }),
    prisma.processingOrder.count({ where: { status: { in: ['nhap', 'cho_duyet', 'cho_vat_tu', 'dang_gia_cong'] } } }),
    prisma.inventory.aggregate({
      where: { 
        status: { in: ['vo', 'xuoc', 'me', 'loi', 'cho_xu_ly'] },
        item: { active: true }, 
        location: { active: true } 
      },
      _sum: { quantity: true },
    }),
    getLowStockItems(),
    getSlowMovingItems(60),
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
    }),
  ]);

  // Compute total area
  const inventoryWithArea = await prisma.inventory.findMany({
    where: { item: { active: true }, location: { active: true } },
    include: { item: { select: { areaM2: true } } },
  });
  const totalAreaM2 = inventoryWithArea.reduce(
    (sum, inv) => sum + inv.quantity * inv.item.areaM2,
    0
  );

  // Finished products count
  const finishedProducts = await prisma.inventory.aggregate({
    where: { 
      status: 'thanh_pham',
      item: { active: true },
      location: { active: true }
    },
    _sum: { quantity: true },
  });

  return {
    totalSKUs,
    totalQuantity: inventoryAgg._sum.quantity || 0,
    totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
    pendingReceipts,
    pendingIssues,
    pendingProcessing,
    finishedProducts: finishedProducts._sum.quantity || 0,
    damagedItems: damageCount._sum.quantity || 0,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 10),
    slowMovingCount: slowMovingItems.length,
    slowMovingItems: slowMovingItems.slice(0, 10),
    recentMovements,
  };
}
