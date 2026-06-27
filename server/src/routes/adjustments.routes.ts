import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateAdjustmentCode } from '../utils/codeGenerator';
import { applyMovement } from '../services/stockMovement.service';

const router = Router();

// GET /adjustments
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, reason, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (reason) where.reason = reason as string;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
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
      prisma.stockAdjustment.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get adjustments error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /adjustments/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adjustment = await prisma.stockAdjustment.findUnique({
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

    if (!adjustment) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu điều chỉnh' });
      return;
    }

    res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('Get adjustment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /adjustments
router.post('/', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const { date, reason, note, lines } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, error: 'Vui lòng chọn lý do điều chỉnh' });
      return;
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ success: false, error: 'Phiếu điều chỉnh phải có ít nhất 1 dòng chi tiết' });
      return;
    }

    const code = await generateAdjustmentCode(date ? new Date(date) : new Date());

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        reason,
        status: 'nhap',
        note: note || null,
        createdBy: req.user!.id,
        lines: {
          create: lines.map((line: any) => ({
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            qtyBefore: parseInt(line.qtyBefore),
            qtyAfter: parseInt(line.qtyAfter),
            difference: parseInt(line.qtyAfter) - parseInt(line.qtyBefore),
            note: line.note || null,
          })),
        },
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

    await logAction(req.user!.id, 'CREATE', 'stock_adjustment', adjustment.id, { after: { code: adjustment.code } }, req.ip);

    res.status(201).json({ success: true, data: adjustment });
  } catch (err) {
    console.error('Create adjustment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /adjustments/:id
router.put('/:id', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stockAdjustment.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu điều chỉnh' });
      return;
    }
    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt' });
      return;
    }

    const { reason, note, lines } = req.body;

    await prisma.$transaction(async (tx: any) => {
      await tx.stockAdjustment.update({
        where: { id },
        data: {
          reason: reason || existing.reason,
          note: note !== undefined ? note : existing.note,
        },
      });

      if (lines && Array.isArray(lines)) {
        await tx.stockAdjustmentLine.deleteMany({ where: { adjustmentId: id } });
        await tx.stockAdjustmentLine.createMany({
          data: lines.map((line: any) => ({
            adjustmentId: id,
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            qtyBefore: parseInt(line.qtyBefore),
            qtyAfter: parseInt(line.qtyAfter),
            difference: parseInt(line.qtyAfter) - parseInt(line.qtyBefore),
            note: line.note || null,
          })),
        });
      }
    });

    await logAction(req.user!.id, 'UPDATE', 'stock_adjustment', id, null, req.ip);

    const updated = await prisma.stockAdjustment.findUnique({
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
    console.error('Update adjustment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /adjustments/:id/submit
router.post('/:id/submit', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stockAdjustment.findUnique({ where: { id } });

    if (!existing || existing.status !== 'nhap') {
      res.status(400).json({ success: false, error: 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp' });
      return;
    }

    const adjustment = await prisma.stockAdjustment.update({ where: { id }, data: { status: 'cho_duyet' } });
    await logAction(req.user!.id, 'SUBMIT', 'stock_adjustment', id, { after: { status: 'cho_duyet' } }, req.ip);

    res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('Submit adjustment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /adjustments/:id/approve - Apply adjustment to inventory
router.post('/:id/approve', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu điều chỉnh' });
      return;
    }
    if (existing.status !== 'cho_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt' });
      return;
    }

    // Apply each adjustment line to inventory
    for (const line of existing.lines) {
      if (line.difference > 0) {
        // Increase: add to inventory
        await applyMovement({
          type: 'dieu_chinh',
          refType: 'stock_adjustment',
          refId: id,
          itemId: line.itemId,
          toLocationId: line.locationId,
          quantity: line.difference,
          statusAfter: 'tot',
          note: `Điều chỉnh tăng theo phiếu ${existing.code}`,
          createdBy: req.user!.id,
        });
      } else if (line.difference < 0) {
        // Decrease: remove from inventory
        await applyMovement({
          type: 'dieu_chinh',
          refType: 'stock_adjustment',
          refId: id,
          itemId: line.itemId,
          fromLocationId: line.locationId,
          quantity: Math.abs(line.difference),
          statusBefore: 'tot',
          note: `Điều chỉnh giảm theo phiếu ${existing.code}`,
          createdBy: req.user!.id,
        });
      }
    }

    const adjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: { status: 'da_duyet', approvedBy: req.user!.id },
    });

    await logAction(req.user!.id, 'APPROVE', 'stock_adjustment', id, { after: { status: 'da_duyet' } }, req.ip);

    res.json({ success: true, data: adjustment });
  } catch (err: any) {
    console.error('Approve adjustment error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /adjustments/:id/cancel
router.post('/:id/cancel', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stockAdjustment.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu điều chỉnh' });
      return;
    }
    if (existing.status === 'da_duyet') {
      res.status(400).json({ success: false, error: 'Không thể hủy phiếu đã duyệt' });
      return;
    }

    const adjustment = await prisma.stockAdjustment.update({ where: { id }, data: { status: 'huy' } });
    await logAction(req.user!.id, 'CANCEL', 'stock_adjustment', id, { after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('Cancel adjustment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.stockAdjustment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.stockAdjustment.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'stock_adjustment', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
