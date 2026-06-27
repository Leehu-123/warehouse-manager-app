import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateIssueCode } from '../utils/codeGenerator';
import { applyMovement, getMovementsByRef } from '../services/stockMovement.service';
import { getAvailableQuantity } from '../services/inventory.service';

const router = Router();

// GET /goods-issues
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, issueType, customerId, dateFrom, dateTo, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (issueType) where.issueType = issueType as string;
    if (customerId) where.customerId = parseInt(customerId as string);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { projectName: { contains: search as string } },
        { orderRef: { contains: search as string } },
        { note: { contains: search as string } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.goodsIssue.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.goodsIssue.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get issues error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /goods-issues/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const issue = await prisma.goodsIssue.findUnique({
      where: { id },
      include: {
        customer: true,
        createdUser: { select: { id: true, fullName: true, username: true } },
        approvedUser: { select: { id: true, fullName: true, username: true } },
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!issue) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }

    const movements = await getMovementsByRef('goods_issue', id);

    res.json({ success: true, data: { ...issue, movements } });
  } catch (err) {
    console.error('Get issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-issues
router.post('/', authorize('admin', 'thukho', 'kinhdoanh'), async (req: Request, res: Response) => {
  try {
    const {
      date, issueType, customerId, projectName, requestedBy,
      receiverName, orderRef, vehicleNo, note, lines,
    } = req.body;

    if (!issueType) {
      res.status(400).json({ success: false, error: 'Vui lòng chọn loại xuất kho' });
      return;
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ success: false, error: 'Phiếu xuất phải có ít nhất 1 dòng chi tiết' });
      return;
    }

    const code = await generateIssueCode(date ? new Date(date) : new Date());

    const issue = await prisma.goodsIssue.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        issueType,
        customerId: customerId ? parseInt(customerId) : null,
        projectName: projectName || null,
        requestedBy: requestedBy || null,
        receiverName: receiverName || null,
        orderRef: orderRef || null,
        vehicleNo: vehicleNo || null,
        status: 'nhap',
        note: note || null,
        createdBy: req.user!.id,
        lines: {
          create: lines.map((line: any) => ({
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            requestedQty: parseInt(line.requestedQty || line.quantity),
            actualQty: parseInt(line.actualQty || 0),
            condition: line.condition || null,
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

    await logAction(req.user!.id, 'CREATE', 'goods_issue', issue.id, { after: { code: issue.code, status: 'nhap' } }, req.ip);

    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    console.error('Create issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /goods-issues/:id
router.put('/:id', authorize('admin', 'thukho', 'kinhdoanh'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }
    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt' });
      return;
    }

    const { date, issueType, customerId, projectName, requestedBy, receiverName, orderRef, vehicleNo, note, lines } = req.body;

    const issue = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.goodsIssue.update({
        where: { id },
        data: {
          date: date ? new Date(date) : existing.date,
          issueType: issueType || existing.issueType,
          customerId: customerId !== undefined ? (customerId ? parseInt(customerId) : null) : existing.customerId,
          projectName: projectName !== undefined ? projectName : existing.projectName,
          requestedBy: requestedBy !== undefined ? requestedBy : existing.requestedBy,
          receiverName: receiverName !== undefined ? receiverName : existing.receiverName,
          orderRef: orderRef !== undefined ? orderRef : existing.orderRef,
          vehicleNo: vehicleNo !== undefined ? vehicleNo : existing.vehicleNo,
          note: note !== undefined ? note : existing.note,
        },
      });

      if (lines && Array.isArray(lines)) {
        await tx.goodsIssueLine.deleteMany({ where: { issueId: id } });
        await tx.goodsIssueLine.createMany({
          data: lines.map((line: any) => ({
            issueId: id,
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            requestedQty: parseInt(line.requestedQty || line.quantity),
            actualQty: parseInt(line.actualQty || 0),
            condition: line.condition || null,
            note: line.note || null,
          })),
        });
      }

      return updated;
    });

    await logAction(req.user!.id, 'UPDATE', 'goods_issue', id, { before: existing, after: issue }, req.ip);

    const updated = await prisma.goodsIssue.findUnique({
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
    console.error('Update issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-issues/:id/submit
router.post('/:id/submit', authorize('admin', 'thukho', 'kinhdoanh'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }
    if (existing.status !== 'nhap') {
      res.status(400).json({ success: false, error: 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp' });
      return;
    }

    const issue = await prisma.goodsIssue.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await logAction(req.user!.id, 'SUBMIT', 'goods_issue', id, { before: { status: 'nhap' }, after: { status: 'cho_duyet' } }, req.ip);

    res.json({ success: true, data: issue });
  } catch (err) {
    console.error('Submit issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-issues/:id/approve
router.post('/:id/approve', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }
    if (existing.status !== 'cho_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt' });
      return;
    }

    const issue = await prisma.goodsIssue.update({
      where: { id },
      data: { status: 'da_duyet', approvedBy: req.user!.id },
    });

    await logAction(req.user!.id, 'APPROVE', 'goods_issue', id, { before: { status: 'cho_duyet' }, after: { status: 'da_duyet' } }, req.ip);

    res.json({ success: true, data: issue });
  } catch (err) {
    console.error('Approve issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-issues/:id/confirm - Confirm issue from stock
router.post('/:id/confirm', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }
    if (existing.status !== 'da_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể xác nhận xuất kho phiếu đã duyệt' });
      return;
    }

    // Check available quantities
    for (const line of existing.lines) {
      const qty = line.actualQty > 0 ? line.actualQty : line.requestedQty;
      const available = await getAvailableQuantity(line.itemId, line.locationId);
      if (available < qty) {
        const item = await prisma.item.findUnique({ where: { id: line.itemId }, select: { code: true, name: true } });
        const location = await prisma.location.findUnique({ where: { id: line.locationId }, select: { code: true } });
        res.status(400).json({
          success: false,
          error: `Không đủ tồn kho: ${item?.code} tại ${location?.code} - cần ${qty}, còn ${available}`,
        });
        return;
      }
    }

    // Apply stock movements for each line
    for (const line of existing.lines) {
      const qty = line.actualQty > 0 ? line.actualQty : line.requestedQty;

      if (existing.issueType === 'xuat_gia_cong') {
        // For processing issue: change status to cho_gia_cong
        await applyMovement({
          type: 'gia_cong_xuat',
          refType: 'goods_issue',
          refId: id,
          itemId: line.itemId,
          fromLocationId: line.locationId,
          toLocationId: line.locationId,
          quantity: qty,
          statusBefore: 'tot',
          statusAfter: 'cho_gia_cong',
          note: `Xuất gia công từ phiếu ${existing.code}`,
          createdBy: req.user!.id,
        });
      } else {
        await applyMovement({
          type: 'xuat',
          refType: 'goods_issue',
          refId: id,
          itemId: line.itemId,
          fromLocationId: line.locationId,
          quantity: qty,
          statusBefore: 'tot',
          note: `Xuất kho từ phiếu ${existing.code}`,
          createdBy: req.user!.id,
        });
      }

      // Update actualQty if not set
      if (line.actualQty === 0) {
        await prisma.goodsIssueLine.update({
          where: { id: line.id },
          data: { actualQty: qty },
        });
      }
    }

    const issue = await prisma.goodsIssue.update({
      where: { id },
      data: { status: 'da_xuat_kho' },
    });

    await logAction(req.user!.id, 'CONFIRM', 'goods_issue', id, { before: { status: 'da_duyet' }, after: { status: 'da_xuat_kho' } }, req.ip);

    res.json({ success: true, data: issue });
  } catch (err: any) {
    console.error('Confirm issue error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /goods-issues/:id/cancel
router.post('/:id/cancel', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu xuất kho' });
      return;
    }
    if (existing.status === 'da_xuat_kho') {
      res.status(400).json({ success: false, error: 'Không thể hủy phiếu đã xuất kho' });
      return;
    }

    const issue = await prisma.goodsIssue.update({
      where: { id },
      data: { status: 'huy' },
    });

    await logAction(req.user!.id, 'CANCEL', 'goods_issue', id, { before: { status: existing.status }, after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: issue });
  } catch (err) {
    console.error('Cancel issue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsIssue.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.goodsIssue.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'goods_issue', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
