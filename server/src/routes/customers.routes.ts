import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';
import { generateCustomerCode } from '../utils/codeGenerator';

const router = Router();

// GET /customers
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
        { projectName: { contains: search as string } },
      ];
    }
    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, data, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /customers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { goodsIssues: true, processingOrders: true } },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /customers
router.post('/', authorize('admin', 'thukho', 'ketoan', 'kinhdoanh'), async (req: Request, res: Response) => {
  try {
    const { name, phone, address, email, projectName, note } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên khách hàng' });
      return;
    }

    const code = await generateCustomerCode();
    const customer = await prisma.customer.create({
      data: {
        code,
        name,
        phone: phone || null,
        address: address || null,
        email: email || null,
        projectName: projectName || null,
        note: note || null,
      },
    });

    await logAction(req.user!.id, 'CREATE', 'customer', customer.id, { after: customer }, req.ip);

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /customers/:id
router.put('/:id', authorize('admin', 'thukho', 'ketoan', 'kinhdoanh'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
      return;
    }

    const { name, phone, address, email, projectName, note, active } = req.body;
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        email: email !== undefined ? email : existing.email,
        projectName: projectName !== undefined ? projectName : existing.projectName,
        note: note !== undefined ? note : existing.note,
        active: active !== undefined ? active : existing.active,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'customer', id, { before: existing, after: customer }, req.ip);

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /customers/:id - soft delete
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.update({
      where: { id },
      data: { active: false },
    });

    await logAction(req.user!.id, 'DELETE', 'customer', id, { action: 'soft_delete' }, req.ip);

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /customers/:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Attempt to delete
    const customer = await prisma.customer.delete({
      where: { id },
    });

    await logAction(req.user!.id, 'DELETE', 'customer', id, { action: 'hard_delete', customer }, req.ip);

    res.json({ success: true, data: customer });
  } catch (err: any) {
    if (err.code === 'P2003') {
      res.status(400).json({ success: false, error: 'Không thể xóa vì khách hàng này đã phát sinh giao dịch.' });
      return;
    }
    console.error('Hard delete customer error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
