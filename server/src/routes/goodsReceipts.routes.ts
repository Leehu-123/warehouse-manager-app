import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateReceiptCode } from '../utils/codeGenerator';
import { applyMovement, getMovementsByRef } from '../services/stockMovement.service';

const router = Router();

// GET /goods-receipts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, supplierId, dateFrom, dateTo, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (supplierId) where.supplierId = parseInt(supplierId as string);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { documentNo: { contains: search as string } },
        { note: { contains: search as string } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get receipts error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /goods-receipts/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdUser: { select: { id: true, fullName: true, username: true } },
        approvedUser: { select: { id: true, fullName: true, username: true } },
        receivedUser: { select: { id: true, fullName: true, username: true } },
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!receipt) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }

    // Get related movements
    const movements = await getMovementsByRef('goods_receipt', id);

    res.json({ success: true, data: { ...receipt, movements } });
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-receipts
router.post('/', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const {
      date, supplierId, deliveredBy, vehicleNo, receivedBy,
      documentNo, note, lines,
    } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ success: false, error: 'Phiếu nhập phải có ít nhất 1 dòng chi tiết' });
      return;
    }

    const code = await generateReceiptCode(date ? new Date(date) : new Date());

    const receipt = await prisma.goodsReceipt.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        supplierId: supplierId ? parseInt(supplierId) : null,
        deliveredBy: deliveredBy || null,
        vehicleNo: vehicleNo || null,
        receivedBy: receivedBy ? parseInt(receivedBy) : null,
        documentNo: documentNo || null,
        status: 'nhap',
        note: note || null,
        createdBy: req.user!.id,
        lines: {
          create: lines.map((line: any) => ({
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            quantity: parseInt(line.quantity),
            condition: line.condition || 'tot',
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

    await logAction(req.user!.id, 'CREATE', 'goods_receipt', receipt.id, { after: { code: receipt.code, status: 'nhap' } }, req.ip);

    res.status(201).json({ success: true, data: receipt });
  } catch (err) {
    console.error('Create receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /goods-receipts/:id
router.put('/:id', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }

    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt' });
      return;
    }

    const { date, supplierId, deliveredBy, vehicleNo, receivedBy, documentNo, note, lines } = req.body;

    const receipt = await prisma.$transaction(async (tx: any) => {
      // Update receipt header
      const updated = await tx.goodsReceipt.update({
        where: { id },
        data: {
          date: date ? new Date(date) : existing.date,
          supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId) : null) : existing.supplierId,
          deliveredBy: deliveredBy !== undefined ? deliveredBy : existing.deliveredBy,
          vehicleNo: vehicleNo !== undefined ? vehicleNo : existing.vehicleNo,
          receivedBy: receivedBy !== undefined ? (receivedBy ? parseInt(receivedBy) : null) : existing.receivedBy,
          documentNo: documentNo !== undefined ? documentNo : existing.documentNo,
          note: note !== undefined ? note : existing.note,
        },
      });

      // If lines are provided, replace them
      if (lines && Array.isArray(lines)) {
        await tx.goodsReceiptLine.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceiptLine.createMany({
          data: lines.map((line: any) => ({
            receiptId: id,
            itemId: parseInt(line.itemId),
            locationId: parseInt(line.locationId),
            quantity: parseInt(line.quantity),
            condition: line.condition || 'tot',
            note: line.note || null,
          })),
        });
      }

      return updated;
    });

    await logAction(req.user!.id, 'UPDATE', 'goods_receipt', id, { before: existing, after: receipt }, req.ip);

    // Fetch updated receipt
    const updated = await prisma.goodsReceipt.findUnique({
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
    console.error('Update receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-receipts/:id/submit
router.post('/:id/submit', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }
    if (existing.status !== 'nhap') {
      res.status(400).json({ success: false, error: 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp' });
      return;
    }

    const receipt = await prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await logAction(req.user!.id, 'SUBMIT', 'goods_receipt', id, { before: { status: 'nhap' }, after: { status: 'cho_duyet' } }, req.ip);

    res.json({ success: true, data: receipt });
  } catch (err) {
    console.error('Submit receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-receipts/:id/approve
router.post('/:id/approve', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }
    if (existing.status !== 'cho_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt' });
      return;
    }

    const receipt = await prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'da_duyet', approvedBy: req.user!.id },
    });

    await logAction(req.user!.id, 'APPROVE', 'goods_receipt', id, { before: { status: 'cho_duyet' }, after: { status: 'da_duyet' } }, req.ip);

    res.json({ success: true, data: receipt });
  } catch (err) {
    console.error('Approve receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /goods-receipts/:id/confirm - Confirm receipt into stock
router.post('/:id/confirm', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }
    if (existing.status !== 'da_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể xác nhận nhập kho phiếu đã duyệt' });
      return;
    }

    // Apply stock movements for each line
    for (const line of existing.lines) {
      await applyMovement({
        type: 'nhap',
        refType: 'goods_receipt',
        refId: id,
        itemId: line.itemId,
        toLocationId: line.locationId,
        quantity: line.quantity,
        statusAfter: line.condition === 'tot' ? 'tot' : line.condition,
        note: `Nhập kho từ phiếu ${existing.code}`,
        createdBy: req.user!.id,
      });
    }

    // Update receipt status
    const receipt = await prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'da_nhap_kho' },
    });

    await logAction(req.user!.id, 'CONFIRM', 'goods_receipt', id, { before: { status: 'da_duyet' }, after: { status: 'da_nhap_kho' } }, req.ip);

    res.json({ success: true, data: receipt });
  } catch (err: any) {
    console.error('Confirm receipt error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /goods-receipts/:id/cancel
router.post('/:id/cancel', authorize('admin', 'thukho'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu nhập kho' });
      return;
    }
    if (existing.status === 'da_nhap_kho') {
      res.status(400).json({ success: false, error: 'Không thể hủy phiếu đã nhập kho' });
      return;
    }

    const receipt = await prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'huy' },
    });

    await logAction(req.user!.id, 'CANCEL', 'goods_receipt', id, { before: { status: existing.status }, after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: receipt });
  } catch (err) {
    console.error('Cancel receipt error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.goodsReceipt.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.goodsReceipt.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'goods_receipt', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
