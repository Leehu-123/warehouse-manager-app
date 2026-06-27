import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const totalItems = await prisma.item.count({ where: { active: true } });

    const inventoryRows = await prisma.inventory.findMany({
      include: {
        item: { select: { glassType: true, areaM2: true } },
      },
    });

    const totalStock = inventoryRows.reduce((sum, inv) => sum + inv.quantity, 0);
    const totalAreaSqm = inventoryRows.reduce(
      (sum, inv) => sum + inv.quantity * (inv.item.areaM2 || 0),
      0
    );

    const [pendingReceipts, pendingIssues, pendingProcessing, pendingDamages, pendingAdjustments, finishedGoods, damagedItems] = await Promise.all([
      prisma.goodsReceipt.count({ where: { status: 'cho_duyet' } }),
      prisma.goodsIssue.count({ where: { status: 'cho_duyet' } }),
      prisma.processingOrder.count({ where: { status: { in: ['nhap', 'cho_duyet', 'cho_vat_tu'] } } }),
      prisma.damageReport.count({ where: { status: 'cho_xu_ly' } }),
      prisma.stockAdjustment.count({ where: { status: 'cho_duyet' } }),
      prisma.inventory.aggregate({ where: { status: 'thanh_pham' }, _sum: { quantity: true } }),
      prisma.inventory.aggregate({ where: { status: { in: ['vo', 'loi', 'xuoc', 'me'] } }, _sum: { quantity: true } }),
    ]);

    const items = await prisma.item.findMany({
      where: { active: true },
      include: { inventory: { where: { status: 'tot' } } },
    });

    const lowStockAlerts = items.reduce((count, item) => {
      const availableQty = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      return item.minStock > 0 && availableQty < item.minStock ? count + 1 : count;
    }, 0);

    const recentMovements = await prisma.stockMovement.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
    });

    const stockByTypeMap = new Map<string, number>();
    const stockByConditionMap = new Map<string, number>();

    for (const inv of inventoryRows) {
      if (inv.quantity <= 0) continue;
      stockByTypeMap.set(inv.item.glassType, (stockByTypeMap.get(inv.item.glassType) || 0) + inv.quantity);
      stockByConditionMap.set(inv.status, (stockByConditionMap.get(inv.status) || 0) + inv.quantity);
    }

    res.json({
      totalItems,
      totalStock,
      totalAreaSqm: Math.round(totalAreaSqm * 100) / 100,
      pendingIssues,
      pendingProcessing,
      finishedGoods: finishedGoods._sum.quantity || 0,
      damagedItems: damagedItems._sum.quantity || 0,
      lowStockAlerts,
      pendingApprovals: {
        receipts: pendingReceipts,
        issues: pendingIssues,
        processing: pendingProcessing,
        damages: pendingDamages,
        adjustments: pendingAdjustments,
      },
      recentMovements: recentMovements.map((movement) => ({
        ...movement,
        creator: movement.user,
      })),
      stockByType: Array.from(stockByTypeMap, ([type, quantity]) => ({ type, quantity })),
      stockByCondition: Array.from(stockByConditionMap, ([condition, quantity]) => ({ condition, quantity })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const totalItems = await prisma.item.count({ where: { active: true } });
    
    const inventoryAggr = await prisma.inventory.aggregate({
      _sum: {
        quantity: true,
      },
    });

    const pendingIssues = await prisma.goodsIssue.count({
      where: { status: 'cho_duyet' },
    });

    const pendingProcessing = await prisma.processingOrder.count({
      where: { status: { in: ['nhap', 'cho_duyet', 'cho_vat_tu'] } },
    });

    // We can also compute low stock count
    const items = await prisma.item.findMany({
      where: { active: true },
      include: {
        inventory: {
          where: { status: 'tot' },
        },
      },
    });

    let lowStockCount = 0;
    let totalAreaM2 = 0;

    for (const item of items) {
      const availableQty = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      if (item.minStock > 0 && availableQty < item.minStock) {
        lowStockCount++;
      }
      totalAreaM2 += availableQty * (item.areaM2 || 0);
    }

    const damagedCount = await prisma.inventory.aggregate({
      where: { status: { in: ['vo', 'loi', 'xuoc', 'me'] } },
      _sum: { quantity: true },
    });

    res.json({
      success: true,
      data: {
        totalSKUs: totalItems,
        totalQuantity: inventoryAggr._sum.quantity || 0,
        totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
        pendingIssues,
        pendingProcessing,
        lowStockAlerts: lowStockCount,
        damagedItems: damagedCount._sum.quantity || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/recent-activities', async (req, res, next) => {
  try {
    const activities = await prisma.stockMovement.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

export default router;
