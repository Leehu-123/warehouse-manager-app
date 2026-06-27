import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateStocktakeCode } from '../utils/codeGenerator';

const router = Router();

// GET /stocktakes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, zone, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (zone) where.zone = zone as string;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.stocktake.findMany({
        where,
        include: {
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.stocktake.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get stocktakes error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /stocktakes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const stocktake = await prisma.stocktake.findUnique({
      where: { id },
      include: {
        createdUser: { select: { id: true, fullName: true, username: true } },
        approvedUser: { select: { id: true, fullName: true, username: true } },
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!stocktake) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu kiểm kê' });
      return;
    }

    res.json({ success: true, data: stocktake });
  } catch (err) {
    console.error('Get stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /stocktakes
router.post('/', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const { date, zone, note, lines } = req.body;

    const code = await generateStocktakeCode(date ? new Date(date) : new Date());

    // If zone is specified, auto-populate lines from current inventory
    let stocktakeLines = lines;
    if (!stocktakeLines && zone) {
      const inventory = await prisma.inventory.findMany({
        where: {
          location: { zone: zone },
          status: 'tot',
        },
        include: { item: true, location: true },
      });

      stocktakeLines = inventory.map((inv) => ({
        itemId: inv.itemId,
        locationId: inv.locationId,
        systemQty: inv.quantity,
        actualQty: inv.quantity, // Default to same, user will update
        difference: 0,
      }));
    }

    const stocktake = await prisma.stocktake.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        zone: zone || null,
        status: 'dang_kiem',
        note: note || null,
        createdBy: req.user!.id,
        lines: stocktakeLines && stocktakeLines.length > 0
          ? {
              create: stocktakeLines.map((line: any) => ({
                itemId: parseInt(line.itemId),
                locationId: parseInt(line.locationId),
                systemQty: parseInt(line.systemQty),
                actualQty: parseInt(line.actualQty),
                difference: parseInt(line.actualQty) - parseInt(line.systemQty),
                reason: line.reason || null,
                proposal: line.proposal || null,
                note: line.note || null,
              })),
            }
          : undefined,
      },
      include: {
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    await logAction(req.user!.id, 'CREATE', 'stocktake', stocktake.id, { after: { code: stocktake.code } }, req.ip);

    res.status(201).json({ success: true, data: stocktake });
  } catch (err) {
    console.error('Create stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /stocktakes/:id
router.put('/:id', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stocktake.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu kiểm kê' });
      return;
    }
    if (!['dang_kiem'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa phiếu đang kiểm' });
      return;
    }

    const { note, lines } = req.body;

    await prisma.$transaction(async (tx: any) => {
      await tx.stocktake.update({
        where: { id },
        data: { note: note !== undefined ? note : existing.note },
      });

      if (lines && Array.isArray(lines)) {
        await tx.stocktakeLine.deleteMany({ where: { stocktakeId: id } });
        await tx.stocktakeLine.createMany({
          data: lines.map((line: any) => ({
            stocktakeId: id,
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            systemQty: parseInt(line.systemQty),
            actualQty: parseInt(line.actualQty),
            difference: parseInt(line.actualQty) - parseInt(line.systemQty),
            reason: line.reason || null,
            proposal: line.proposal || null,
            note: line.note || null,
          })),
        });
      }
    });

    await logAction(req.user!.id, 'UPDATE', 'stocktake', id, null, req.ip);

    const updated = await prisma.stocktake.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /stocktakes/:id/submit
router.post('/:id/submit', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stocktake.findUnique({ where: { id } });

    if (!existing || existing.status !== 'dang_kiem') {
      res.status(400).json({ success: false, error: 'Chỉ có thể gửi đối chiếu phiếu đang kiểm' });
      return;
    }

    const stocktake = await prisma.stocktake.update({ where: { id }, data: { status: 'cho_doi_chieu' } });
    await logAction(req.user!.id, 'SUBMIT', 'stocktake', id, { after: { status: 'cho_doi_chieu' } }, req.ip);

    res.json({ success: true, data: stocktake });
  } catch (err) {
    console.error('Submit stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /stocktakes/:id/complete
router.post('/:id/complete', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { createAdjustment } = req.body;

    const existing = await prisma.stocktake.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu kiểm kê' });
      return;
    }
    if (existing.status !== 'cho_doi_chieu') {
      res.status(400).json({ success: false, error: 'Chỉ có thể hoàn thành phiếu đang đối chiếu' });
      return;
    }

    const stocktake = await prisma.stocktake.update({
      where: { id },
      data: { status: 'hoan_thanh', approvedBy: req.user!.id },
    });

    // Optionally create stock adjustment for differences
    if (createAdjustment) {
      const linesWithDiff = existing.lines.filter((l) => l.difference !== 0);
      if (linesWithDiff.length > 0) {
        const { generateAdjustmentCode } = await import('../utils/codeGenerator');
        const adjCode = await generateAdjustmentCode();

        await prisma.stockAdjustment.create({
          data: {
            code: adjCode,
            date: new Date(),
            reason: 'kiem_ke',
            status: 'cho_duyet',
            note: `Điều chỉnh theo kiểm kê ${existing.code}`,
            createdBy: req.user!.id,
            lines: {
              create: linesWithDiff.map((line) => ({
                itemId: line.itemId,
                locationId: line.locationId,
                qtyBefore: line.systemQty,
                qtyAfter: line.actualQty,
                difference: line.difference,
                note: line.reason || null,
              })),
            },
          },
        });
      }
    }

    await logAction(req.user!.id, 'COMPLETE', 'stocktake', id, { after: { status: 'hoan_thanh' } }, req.ip);

    res.json({ success: true, data: stocktake });
  } catch (err) {
    console.error('Complete stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /stocktakes/:id/cancel
router.post('/:id/cancel', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const stocktake = await prisma.stocktake.update({
      where: { id },
      data: { status: 'huy' },
    });

    await logAction(req.user!.id, 'CANCEL', 'stocktake', id, { after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: stocktake });
  } catch (err) {
    console.error('Cancel stocktake error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stocktake.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.stocktake.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'stocktake', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
