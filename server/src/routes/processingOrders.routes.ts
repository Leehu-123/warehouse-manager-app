import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateProcessingCode } from '../utils/codeGenerator';
import { applyMovement, getMovementsByRef } from '../services/stockMovement.service';

const router = Router();

// GET /processing-orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, processType, customerId, dateFrom, dateTo, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;
    if (processType) where.processType = processType as string;
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
        { note: { contains: search as string } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.processingOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { inputs: true, outputs: true, wastes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.processingOrder.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get processing orders error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /processing-orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.processingOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdUser: { select: { id: true, fullName: true, username: true } },
        approvedUser: { select: { id: true, fullName: true, username: true } },
        inputs: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
        outputs: {
          include: {
            location: { select: { id: true, code: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
        wastes: {
          include: {
            item: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh gia công' });
      return;
    }

    const movements = await getMovementsByRef('processing_order', id);

    res.json({ success: true, data: { ...order, movements } });
  } catch (err) {
    console.error('Get processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /processing-orders
router.post('/', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const {
      date, customerId, projectName, requestedBy, assignedTo,
      dueDate, processType, note, inputs,
    } = req.body;

    if (!processType) {
      res.status(400).json({ success: false, error: 'Vui lòng chọn loại gia công' });
      return;
    }
    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      res.status(400).json({ success: false, error: 'Lệnh gia công phải có ít nhất 1 vật tư đầu vào' });
      return;
    }

    const code = await generateProcessingCode(date ? new Date(date) : new Date());

    const order = await prisma.processingOrder.create({
      data: {
        code,
        date: date ? new Date(date) : new Date(),
        customerId: customerId ? parseInt(customerId) : null,
        projectName: projectName || null,
        requestedBy: requestedBy || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        processType,
        status: 'nhap',
        note: note || null,
        createdBy: req.user!.id,
        inputs: {
          create: inputs.map((input: any) => ({
            itemId: parseInt(input.itemId),
            locationId: parseInt(input.locationId),
            quantity: parseInt(input.quantity),
            areaM2: input.areaM2 ? parseFloat(input.areaM2) : null,
            note: input.note || null,
          })),
        },
      },
      include: {
        inputs: {
          include: {
            item: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    await logAction(req.user!.id, 'CREATE', 'processing_order', order.id, { after: { code: order.code, status: 'nhap' } }, req.ip);

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('Create processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /processing-orders/:id
router.put('/:id', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh gia công' });
      return;
    }
    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể sửa lệnh ở trạng thái Nháp hoặc Chờ duyệt' });
      return;
    }

    const { customerId, projectName, requestedBy, assignedTo, dueDate, processType, note, inputs } = req.body;

    await prisma.$transaction(async (tx: any) => {
      await tx.processingOrder.update({
        where: { id },
        data: {
          customerId: customerId !== undefined ? (customerId ? parseInt(customerId) : null) : existing.customerId,
          projectName: projectName !== undefined ? projectName : existing.projectName,
          requestedBy: requestedBy !== undefined ? requestedBy : existing.requestedBy,
          assignedTo: assignedTo !== undefined ? assignedTo : existing.assignedTo,
          dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
          processType: processType || existing.processType,
          note: note !== undefined ? note : existing.note,
        },
      });

      if (inputs && Array.isArray(inputs)) {
        await tx.processingInput.deleteMany({ where: { processingOrderId: id } });
        await tx.processingInput.createMany({
          data: inputs.map((input: any) => ({
            processingOrderId: id,
            itemId: parseInt(input.itemId),
            locationId: parseInt(input.locationId),
            quantity: parseInt(input.quantity),
            areaM2: input.areaM2 ? parseFloat(input.areaM2) : null,
            note: input.note || null,
          })),
        });
      }
    });

    await logAction(req.user!.id, 'UPDATE', 'processing_order', id, null, req.ip);

    const updated = await prisma.processingOrder.findUnique({
      where: { id },
      include: {
        inputs: {
          include: {
            item: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /processing-orders/:id/submit
router.post('/:id/submit', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({ where: { id } });

    if (!existing || existing.status !== 'nhap') {
      res.status(400).json({ success: false, error: 'Chỉ có thể gửi duyệt lệnh ở trạng thái Nháp' });
      return;
    }

    const order = await prisma.processingOrder.update({ where: { id }, data: { status: 'cho_duyet' } });
    await logAction(req.user!.id, 'SUBMIT', 'processing_order', id, { before: { status: 'nhap' }, after: { status: 'cho_duyet' } }, req.ip);

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Submit processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /processing-orders/:id/approve
router.post('/:id/approve', authorize('admin', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({ where: { id } });

    if (!existing || existing.status !== 'cho_duyet') {
      res.status(400).json({ success: false, error: 'Chỉ có thể duyệt lệnh ở trạng thái Chờ duyệt' });
      return;
    }

    const order = await prisma.processingOrder.update({
      where: { id },
      data: { status: 'cho_vat_tu', approvedBy: req.user!.id },
    });

    await logAction(req.user!.id, 'APPROVE', 'processing_order', id, { before: { status: 'cho_duyet' }, after: { status: 'cho_vat_tu' } }, req.ip);

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Approve processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /processing-orders/:id/start - Start processing
router.post('/:id/start', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({
      where: { id },
      include: { inputs: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh gia công' });
      return;
    }
    if (!['cho_vat_tu', 'da_duyet'].includes(existing.status) && existing.status !== 'cho_vat_tu') {
      res.status(400).json({ success: false, error: 'Lệnh chưa sẵn sàng để bắt đầu gia công' });
      return;
    }

    // Move input materials to processing status
    for (const input of existing.inputs) {
      await applyMovement({
        type: 'gia_cong_xuat',
        refType: 'processing_order',
        refId: id,
        itemId: input.itemId,
        fromLocationId: input.locationId,
        toLocationId: input.locationId,
        quantity: input.quantity,
        statusBefore: 'tot',
        statusAfter: 'dang_gia_cong',
        note: `Xuất gia công cho lệnh ${existing.code}`,
        createdBy: req.user!.id,
      });
    }

    const order = await prisma.processingOrder.update({
      where: { id },
      data: { status: 'dang_gia_cong' },
    });

    await logAction(req.user!.id, 'START', 'processing_order', id, { after: { status: 'dang_gia_cong' } }, req.ip);

    res.json({ success: true, data: order });
  } catch (err: any) {
    console.error('Start processing error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /processing-orders/:id/complete - Complete processing with outputs and wastes
router.post('/:id/complete', authorize('admin', 'thukho', 'giacong'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { outputs, wastes } = req.body;

    const existing = await prisma.processingOrder.findUnique({
      where: { id },
      include: { inputs: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh gia công' });
      return;
    }
    if (existing.status !== 'dang_gia_cong') {
      res.status(400).json({ success: false, error: 'Chỉ có thể hoàn thành lệnh đang gia công' });
      return;
    }

    await prisma.$transaction(async (tx: any) => {
      // Remove input materials from dang_gia_cong status
      for (const input of existing.inputs) {
        const inv = await tx.inventory.findUnique({
          where: {
            itemId_locationId_status: {
              itemId: input.itemId,
              locationId: input.locationId,
              status: 'dang_gia_cong',
            },
          },
        });
        if (inv) {
          const newQty = inv.quantity - input.quantity;
          if (newQty <= 0) {
            await tx.inventory.delete({ where: { id: inv.id } });
          } else {
            await tx.inventory.update({ where: { id: inv.id }, data: { quantity: newQty } });
          }
        }
      }

      // Create outputs
      if (outputs && Array.isArray(outputs)) {
        for (const output of outputs) {
          await tx.processingOutput.create({
            data: {
              processingOrderId: id,
              itemCode: output.itemCode || null,
              itemName: output.itemName,
              lengthMm: output.lengthMm ? parseFloat(output.lengthMm) : null,
              widthMm: output.widthMm ? parseFloat(output.widthMm) : null,
              thickness: output.thickness ? parseFloat(output.thickness) : null,
              quantity: parseInt(output.quantity),
              areaM2: output.areaM2 ? parseFloat(output.areaM2) : null,
              locationId: output.locationId ? parseInt(output.locationId) : null,
              customerId: output.customerId ? parseInt(output.customerId) : null,
              projectName: output.projectName || null,
              note: output.note || null,
            },
          });

          // Add output to inventory as thanh_pham
          if (output.locationId && output.itemId) {
            await tx.inventory.upsert({
              where: {
                itemId_locationId_status: {
                  itemId: parseInt(output.itemId),
                  locationId: parseInt(output.locationId),
                  status: 'thanh_pham',
                },
              },
              update: { quantity: { increment: parseInt(output.quantity) } },
              create: {
                itemId: parseInt(output.itemId),
                locationId: parseInt(output.locationId),
                quantity: parseInt(output.quantity),
                status: 'thanh_pham',
              },
            });

            await tx.stockMovement.create({
              data: {
                type: 'gia_cong_nhap',
                refType: 'processing_order',
                refId: id,
                itemId: parseInt(output.itemId),
                toLocationId: parseInt(output.locationId),
                quantity: parseInt(output.quantity),
                statusAfter: 'thanh_pham',
                note: `Thành phẩm từ lệnh ${existing.code}`,
                createdBy: req.user!.id,
              },
            });
          }
        }
      }

      // Create wastes
      if (wastes && Array.isArray(wastes)) {
        for (const waste of wastes) {
          await tx.processingWaste.create({
            data: {
              processingOrderId: id,
              wasteType: waste.wasteType,
              itemId: waste.itemId ? parseInt(waste.itemId) : null,
              quantity: waste.quantity ? parseInt(waste.quantity) : null,
              areaM2: waste.areaM2 ? parseFloat(waste.areaM2) : null,
              reason: waste.reason || null,
              reusable: waste.reusable || false,
              note: waste.note || null,
            },
          });
        }
      }

      // Update order status
      await tx.processingOrder.update({
        where: { id },
        data: { status: 'hoan_thanh' },
      });
    });

    await logAction(req.user!.id, 'COMPLETE', 'processing_order', id, { after: { status: 'hoan_thanh' } }, req.ip);

    const updated = await prisma.processingOrder.findUnique({
      where: { id },
      include: {
        inputs: true,
        outputs: true,
        wastes: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Complete processing error:', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /processing-orders/:id/cancel
router.post('/:id/cancel', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh gia công' });
      return;
    }
    if (['hoan_thanh', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Không thể hủy lệnh đã hoàn thành hoặc đã hủy' });
      return;
    }

    const order = await prisma.processingOrder.update({
      where: { id },
      data: { status: 'huy' },
    });

    await logAction(req.user!.id, 'CANCEL', 'processing_order', id, { before: { status: existing.status }, after: { status: 'huy' } }, req.ip);

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Cancel processing order error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});


// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.processingOrder.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.processingOrder.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'processing_order', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
