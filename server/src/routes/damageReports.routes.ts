import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateDamageCode } from '../utils/codeGenerator';
import { applyMovement } from '../services/stockMovement.service';

const router = Router();

const damageInventoryStatusMap: Record<string, string> = {
  vo: 'vo',
  xuoc: 'xuoc',
  me: 'me',
  sai_quy_cach: 'loi',
  loi_gia_cong: 'loi',
  loi_van_chuyen: 'loi',
  loi_nha_cung_cap: 'loi',
  khac: 'cho_xu_ly',
};

function getDamageInventoryStatus(damageType: string) {
  return damageInventoryStatusMap[damageType] || 'cho_xu_ly';
}

// GET /damage-reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, damageType, dateFrom, dateTo, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (damageType) where.damageType = damageType as string;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { reason: { contains: search as string } },
        { note: { contains: search as string } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.damageReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          item: { select: { id: true, code: true, name: true, unit: true } },
          location: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.damageReport.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get damage reports error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /damage-reports/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const report = await prisma.damageReport.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        item: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
        location: { select: { id: true, code: true, name: true, zone: true } },
      },
    });

    if (!report) {
      res.status(404).json({ success: false, error: 'Không tìm thấy biên bản lỗi' });
      return;
    }

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Get damage report error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /damage-reports
router.post('/', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const { date, itemId, locationId, quantity, damageType, reason, imagePath, handlingPlan, note } = req.body;

    if (!itemId || !locationId || !quantity || !damageType || !handlingPlan) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
      return;
    }

    const code = await generateDamageCode(date ? new Date(date) : new Date());

    const damageStatus = getDamageInventoryStatus(damageType);

    // Find F zone location for damaged goods
    const fZoneLocation = await prisma.location.findFirst({
      where: { zone: 'F', active: true },
    });
    const destLocationId = fZoneLocation?.id || parseInt(locationId);

    // Move to damaged status
    await applyMovement({
      type: 'dieu_chinh',
      refType: 'damage_report',
      refId: 0, // Will update after create
      itemId: parseInt(itemId),
      fromLocationId: parseInt(locationId),
      toLocationId: destLocationId,
      quantity: parseInt(quantity),
      statusBefore: 'tot',
      statusAfter: damageStatus,
      note: `Báo lỗi: ${reason || damageType}`,
      createdBy: req.user!.id,
    });

    const report = await prisma.damageReport.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        reportedBy: req.user!.id,
        itemId: parseInt(itemId),
        locationId: parseInt(locationId),
        quantity: parseInt(quantity),
        damageType,
        reason: reason || null,
        imagePath: imagePath || null,
        handlingPlan,
        status: 'cho_xu_ly',
        note: note || null,
      },
      include: {
        item: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    });

    await logAction(req.user!.id, 'CREATE', 'damage_report', report.id, { after: { code: report.code, damageType, quantity } }, req.ip);

    res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    console.error('Create damage report error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// PUT /damage-reports/:id
router.put('/:id', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.damageReport.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy biên bản lỗi' });
      return;
    }
    if (existing.status !== 'cho_xu_ly') {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa biên bản chờ xử lý' });
      return;
    }

    const { reason, handlingPlan, note, imagePath } = req.body;
    const report = await prisma.damageReport.update({
      where: { id },
      data: {
        reason: reason !== undefined ? reason : existing.reason,
        handlingPlan: handlingPlan || existing.handlingPlan,
        note: note !== undefined ? note : existing.note,
        imagePath: imagePath !== undefined ? imagePath : existing.imagePath,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'damage_report', id, { before: existing, after: report }, req.ip);

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Update damage report error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /damage-reports/:id/resolve
router.post('/:id/resolve', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.damageReport.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy biên bản lỗi' });
      return;
    }
    if (existing.status !== 'cho_xu_ly') {
      res.status(400).json({ success: false, error: 'Biên bản đã được xử lý' });
      return;
    }

    const { handlingPlan, note } = req.body;

    const report = await prisma.damageReport.update({
      where: { id },
      data: {
        status: 'da_xu_ly',
        handlingPlan: handlingPlan || existing.handlingPlan,
        approvedBy: req.user!.id,
        note: note || existing.note,
      },
    });

    // If handling is 'huy', remove from inventory
    if ((handlingPlan || existing.handlingPlan) === 'huy') {
      const fZoneLocation = await prisma.location.findFirst({ where: { zone: 'F', active: true } });
      if (fZoneLocation) {
        const statusMap: Record<string, string> = { vo: 'vo', xuoc: 'xuoc', me: 'me' };
        const damageStatus = statusMap[existing.damageType] || 'cho_xu_ly';

        try {
          await applyMovement({
            type: 'huy',
            refType: 'damage_report',
            refId: id,
            itemId: existing.itemId,
            fromLocationId: fZoneLocation.id,
            quantity: existing.quantity,
            statusBefore: damageStatus,
            note: `Hủy hàng lỗi theo biên bản ${existing.code}`,
            createdBy: req.user!.id,
          });
        } catch (e) {
          // Ignore if already removed
        }
      }
    }

    await logAction(req.user!.id, 'RESOLVE', 'damage_report', id, { after: { status: 'da_xu_ly', handlingPlan: handlingPlan || existing.handlingPlan } }, req.ip);

    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Resolve damage report error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /damage-reports/:id/approve
// Frontend calls this route from the "Duyệt & Trừ Tồn Kho" button.
router.post('/:id/approve', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.damageReport.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy biên bản lỗi' });
      return;
    }
    if (existing.status !== 'cho_xu_ly') {
      res.status(400).json({ success: false, error: 'Biên bản đã được xử lý' });
      return;
    }

    const damageStatus = getDamageInventoryStatus(existing.damageType);
    const fZoneLocation = await prisma.location.findFirst({ where: { zone: 'F', active: true } });
    const fromLocationId = fZoneLocation?.id || existing.locationId;

    await applyMovement({
      type: 'huy',
      refType: 'damage_report',
      refId: id,
      itemId: existing.itemId,
      fromLocationId,
      quantity: existing.quantity,
      statusBefore: damageStatus,
      note: `Duyệt và trừ tồn kho hàng lỗi theo biên bản ${existing.code}`,
      createdBy: req.user!.id,
    });

    const report = await prisma.damageReport.update({
      where: { id },
      data: {
        status: 'da_xu_ly',
        handlingPlan: 'huy',
        approvedBy: req.user!.id,
      },
    });

    await logAction(req.user!.id, 'APPROVE', 'damage_report', id, { after: { status: 'da_xu_ly', handlingPlan: 'huy' } }, req.ip);

    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Approve damage report error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /damage-reports/:id/reject
// Cancel the report and return the previously moved damaged stock back to original good stock.
router.post('/:id/reject', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.damageReport.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy biên bản lỗi' });
      return;
    }
    if (existing.status !== 'cho_xu_ly') {
      res.status(400).json({ success: false, error: 'Biên bản đã được xử lý' });
      return;
    }

    const damageStatus = getDamageInventoryStatus(existing.damageType);
    const fZoneLocation = await prisma.location.findFirst({ where: { zone: 'F', active: true } });
    const fromLocationId = fZoneLocation?.id || existing.locationId;

    await applyMovement({
      type: 'dieu_chinh',
      refType: 'damage_report',
      refId: id,
      itemId: existing.itemId,
      fromLocationId,
      toLocationId: existing.locationId,
      quantity: existing.quantity,
      statusBefore: damageStatus,
      statusAfter: 'tot',
      note: `Hủy biên bản lỗi và hoàn tồn kho ${existing.code}`,
      createdBy: req.user!.id,
    });

    const report = await prisma.damageReport.update({
      where: { id },
      data: {
        status: 'huy',
        approvedBy: req.user!.id,
      },
    });

    await logAction(req.user!.id, 'REJECT', 'damage_report', id, { after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Reject damage report error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// DELETE /damage-reports/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const report = await prisma.damageReport.update({
      where: { id },
      data: { status: 'huy' },
    });

    await logAction(req.user!.id, 'CANCEL', 'damage_report', id, { after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Delete damage report error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.damageReport.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.damageReport.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'damage_report', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
