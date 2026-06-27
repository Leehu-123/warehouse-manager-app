import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

router.get('/xnt', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Thiếu ngày bắt đầu hoặc kết thúc' });
    }

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);
    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    // Get all items to compute report
    const items = await prisma.item.findMany({
      where: { active: true },
    });

    // Get all movements to compute correctly
    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { lte: end },
      },
      select: {
        itemId: true,
        fromLocationId: true,
        toLocationId: true,
        quantity: true,
        createdAt: true,
      }
    });

    const reportMap = new Map<number, any>();
    for (const item of items) {
      reportMap.set(item.id, {
        itemId: item.id,
        item: item,
        startQty: 0,
        inQty: 0,
        outQty: 0,
        endQty: 0,
      });
    }

    for (const mv of movements) {
      if (!reportMap.has(mv.itemId)) continue;
      
      const isBeforeStart = mv.createdAt < start;
      const isTransfer = mv.fromLocationId !== null && mv.toLocationId !== null;
      const isIncrease = mv.toLocationId !== null && mv.fromLocationId === null;
      const isDecrease = mv.fromLocationId !== null && mv.toLocationId === null;

      const row = reportMap.get(mv.itemId);

      if (isBeforeStart) {
        if (isIncrease) row.startQty += mv.quantity;
        if (isDecrease) row.startQty -= mv.quantity;
        // transfers don't change global item startQty
      } else {
        if (isIncrease) row.inQty += mv.quantity;
        if (isDecrease) row.outQty += mv.quantity;
      }
    }

    // Calculate endQty and convert map to array
    const data = Array.from(reportMap.values()).map(row => {
      row.endQty = row.startQty + row.inQty - row.outQty;
      return row;
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/inventory', async (req, res, next) => {
  try {
    const { groupBy } = req.query; // e.g. 'glassType', 'locationId', 'status'
    
    if (groupBy === 'glassType') {
      const result = await prisma.item.groupBy({
        by: ['glassType'],
        _sum: {
          areaM2: true,
        },
      });
      return res.json({ success: true, data: result });
    }

    if (groupBy === 'status') {
      const result = await prisma.inventory.groupBy({
        by: ['status'],
        _sum: { quantity: true },
      });
      return res.json({ success: true, data: result });
    }

    // Default: Return all joined for a flat report
    const inventory = await prisma.inventory.findMany({
      where: { quantity: { gt: 0 } },
      include: {
        item: true,
        location: true,
      },
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
});

router.get('/stock-in-out', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Very simplified report logic: just fetching movements
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
});

export default router;
