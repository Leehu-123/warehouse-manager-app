import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateSupplierCode } from '../utils/codeGenerator';

const router = Router();

// GET /suppliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, active, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }
    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /suppliers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        items: { where: { active: true }, select: { id: true, code: true, name: true } },
        _count: { select: { goodsReceipts: true } },
      },
    });

    if (!supplier) {
      res.status(404).json({ success: false, error: 'Không tìm thấy nhà cung cấp' });
      return;
    }

    res.json({ success: true, data: supplier });
  } catch (err) {
    console.error('Get supplier error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /suppliers
router.post('/', authorize('admin', 'thukho', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const { name, phone, address, email, note } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên nhà cung cấp' });
      return;
    }

    const code = await generateSupplierCode();
    const supplier = await prisma.supplier.create({
      data: { code, name, phone: phone || null, address: address || null, email: email || null, note: note || null },
    });

    await logAction(req.user!.id, 'CREATE', 'supplier', supplier.id, { after: supplier }, req.ip);

    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /suppliers/:id
router.put('/:id', authorize('admin', 'thukho', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy nhà cung cấp' });
      return;
    }

    const { name, phone, address, email, note, active } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name || existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        email: email !== undefined ? email : existing.email,
        note: note !== undefined ? note : existing.note,
        active: active !== undefined ? active : existing.active,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'supplier', id, { before: existing, after: supplier }, req.ip);

    res.json({ success: true, data: supplier });
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /suppliers/:id - soft delete
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { active: false },
    });

    await logAction(req.user!.id, 'DELETE', 'supplier', id, { action: 'soft_delete' }, req.ip);

    res.json({ success: true, data: supplier });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /suppliers/:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Attempt to delete
    const supplier = await prisma.supplier.delete({
      where: { id },
    });

    await logAction(req.user!.id, 'DELETE', 'supplier', id, { action: 'hard_delete', supplier }, req.ip);

    res.json({ success: true, data: supplier });
  } catch (err: any) {
    if (err.code === 'P2003') {
      res.status(400).json({ success: false, error: 'Không thể xóa vì nhà cung cấp này đã phát sinh giao dịch.' });
      return;
    }
    console.error('Hard delete supplier error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
