import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { userId, entityType, startDate, endDate, page = '1', limit = '50' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (entityType) where.entityType = String(entityType);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: { select: { username: true, fullName: true } }
        }
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await prisma.auditLog.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { username: true, fullName: true } }
      }
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy log' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

export default router;
