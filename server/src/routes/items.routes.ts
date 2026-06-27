import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateItemCode } from '../utils/codeGenerator';
import { getMovementsByItem } from '../services/stockMovement.service';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /items - list items with search/filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, glassType, thickness, color, supplierId, active, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }
    if (glassType) where.glassType = glassType as string;
    if (thickness) where.thickness = parseFloat(thickness as string);
    if (color) where.color = color as string;
    if (supplierId) where.supplierId = parseInt(supplierId as string);
    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    const [data, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          inventory: {
            select: { quantity: true, status: true, locationId: true },
          },
        },
        orderBy: { code: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.item.count({ where }),
    ]);

    // Compute total stock for each item
    const itemsWithStock = data.map((item) => {
      const totalStock = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const availableStock = item.inventory
        .filter((inv) => inv.status === 'tot')
        .reduce((sum, inv) => sum + inv.quantity, 0);
      return { ...item, totalStock, availableStock };
    });

    res.json({ success: true, data: itemsWithStock, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /items/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        inventory: {
          include: {
            location: { select: { id: true, code: true, name: true, zone: true } },
          },
        },
      },
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'Không tìm thấy mặt hàng' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /items - create item
router.post('/', authorize('admin', 'thukho', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const {
      code, name, glassType, thickness, color, standardSize,
      lengthMm, widthMm, unit, unitPrice, minStock, supplierId, note,
    } = req.body;

    if (!name || !glassType || !thickness || !color || !lengthMm || !widthMm) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
      return;
    }

    const itemCode = code || generateItemCode(glassType, thickness, color, standardSize || `${widthMm}x${lengthMm}`);
    const areaM2 = (lengthMm * widthMm) / 1000000;

    const item = await prisma.item.create({
      data: {
        code: itemCode,
        name,
        glassType,
        thickness: parseFloat(thickness),
        color,
        standardSize: standardSize || `${widthMm}x${lengthMm}`,
        lengthMm: parseFloat(lengthMm),
        widthMm: parseFloat(widthMm),
        areaM2,
        unit: unit || 'tam',
        unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
        minStock: minStock ? parseInt(minStock) : 0,
        supplierId: supplierId ? parseInt(supplierId) : null,
        note: note || null,
      },
    });

    await logAction(req.user!.id, 'CREATE', 'item', item.id, { after: item }, req.ip);

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Mã mặt hàng đã tồn tại' });
      return;
    }
    console.error('Create item error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /items/:id
router.put('/:id', authorize('admin', 'thukho', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy mặt hàng' });
      return;
    }

    const {
      name, glassType, thickness, color, standardSize,
      lengthMm, widthMm, unit, unitPrice, minStock, supplierId, note, active
    } = req.body;

    const newLengthMm = lengthMm ? parseFloat(lengthMm) : existing.lengthMm;
    const newWidthMm = widthMm ? parseFloat(widthMm) : existing.widthMm;
    const areaM2 = (newLengthMm * newWidthMm) / 1000000;

    const item = await prisma.item.update({
      where: { id },
      data: {
        name: name || existing.name,
        glassType: glassType || existing.glassType,
        thickness: thickness ? parseFloat(thickness) : existing.thickness,
        color: color || existing.color,
        standardSize: standardSize || existing.standardSize,
        lengthMm: newLengthMm,
        widthMm: newWidthMm,
        areaM2,
        unit: unit || existing.unit,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : existing.unitPrice,
        minStock: minStock !== undefined ? parseInt(minStock) : existing.minStock,
        supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId) : null) : existing.supplierId,
        note: note !== undefined ? note : existing.note,
        active: active !== undefined ? active : existing.active,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'item', item.id, { before: existing, after: item }, req.ip);

    res.json({ success: true, data: item });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Mã mặt hàng đã tồn tại' });
      return;
    }
    console.error('Update item error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /items/:id - soft delete
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.item.update({
      where: { id },
      data: { active: false },
    });

    await logAction(req.user!.id, 'DELETE', 'item', id, { action: 'soft_delete' }, req.ip);

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /items/:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Attempt to delete
    const item = await prisma.item.delete({
      where: { id },
    });

    await logAction(req.user!.id, 'DELETE', 'item', id, { action: 'hard_delete', item }, req.ip);

    res.json({ success: true, data: item });
  } catch (err: any) {
    if (err.code === 'P2003') {
      res.status(400).json({ success: false, error: 'Không thể xóa vì mặt hàng này đã phát sinh giao dịch/tồn kho.' });
      return;
    }
    console.error('Hard delete item error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /items/:id/movements
router.get('/:id/movements', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const movements = await getMovementsByItem(id);
    res.json({ success: true, data: movements });
  } catch (err) {
    console.error('Get item movements error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /items/generate-code
router.post('/generate-code', async (req: Request, res: Response) => {
  try {
    const { glassType, thickness, color, size } = req.body;
    if (!glassType || !thickness || !color || !size) {
      res.status(400).json({ success: false, error: 'Thiếu thông tin để tạo mã' });
      return;
    }
    const code = generateItemCode(glassType, parseFloat(thickness), color, size);
    res.json({ success: true, data: { code } });
  } catch (err) {
    console.error('Generate code error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
