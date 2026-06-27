import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authorize } from '../middleware/rbac';
import { logAction } from '../utils/auditLogger';

const router = Router();

// GET /locations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { zone, active } = req.query;
    const where: any = {};
    if (zone) where.zone = zone as string;
    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: { select: { inventory: true } },
      },
      orderBy: { code: 'asc' },
    });

    res.json({ success: true, data: locations });
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /locations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            item: {
              select: { id: true, code: true, name: true, glassType: true, thickness: true, color: true, unit: true },
            },
          },
        },
      },
    });

    if (!location) {
      res.status(404).json({ success: false, error: 'Không tìm thấy vị trí kho' });
      return;
    }

    res.json({ success: true, data: location });
  } catch (err) {
    console.error('Get location error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /locations
router.post('/', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { code, name, zone, description } = req.body;
    if (!code || !name || !zone) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mã, tên và khu vực' });
      return;
    }

    const location = await prisma.location.create({
      data: { code, name, zone, description: description || null },
    });

    await logAction(req.user!.id, 'CREATE', 'location', location.id, { after: location }, req.ip);

    res.status(201).json({ success: true, data: location });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Mã vị trí đã tồn tại' });
      return;
    }
    console.error('Create location error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /locations/:id
router.put('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy vị trí kho' });
      return;
    }

    const { name, zone, description, active } = req.body;
    const location = await prisma.location.update({
      where: { id },
      data: {
        name: name || existing.name,
        zone: zone || existing.zone,
        description: description !== undefined ? description : existing.description,
        active: active !== undefined ? active : existing.active,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'location', id, { before: existing, after: location }, req.ip);

    res.json({ success: true, data: location });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /locations/:id - soft delete
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const location = await prisma.location.update({
      where: { id },
      data: { active: false },
    });

    await logAction(req.user!.id, 'DELETE', 'location', id, { action: 'soft_delete' }, req.ip);

    res.json({ success: true, data: location });
  } catch (err) {
    console.error('Delete location error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// DELETE /locations/:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Attempt to delete
    const location = await prisma.location.delete({
      where: { id },
    });

    await logAction(req.user!.id, 'DELETE', 'location', id, { action: 'hard_delete', location }, req.ip);

    res.json({ success: true, data: location });
  } catch (err: any) {
    if (err.code === 'P2003') {
      res.status(400).json({ success: false, error: 'Không thể xóa vì vị trí này đã được sử dụng (tồn kho/phiếu nhập xuất).' });
      return;
    }
    console.error('Hard delete location error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
