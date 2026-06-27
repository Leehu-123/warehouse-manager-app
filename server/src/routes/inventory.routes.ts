import { Router, Request, Response } from 'express';
import { authorize } from '../middleware/rbac';
import { prisma } from '../index';
import { generateAdjustmentCode } from '../utils/codeGenerator';
import { applyMovement } from '../services/stockMovement.service';
import {
  getInventory,
  getInventoryByItem,
  getLowStockItems,
  getDashboardStats,
} from '../services/inventory.service';
import { getMovementsByItem } from '../services/stockMovement.service';
import { logAction } from '../utils/auditLogger';

const router = Router();

// GET /inventory
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, glassType, thickness, color, locationId, status, page, limit } = req.query;
    const result = await getInventory({
      search: search as string,
      glassType: glassType as string,
      thickness: thickness ? parseFloat(thickness as string) : undefined,
      color: color as string,
      locationId: locationId ? parseInt(locationId as string) : undefined,
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /inventory/low-stock
router.get('/low-stock', async (_req: Request, res: Response) => {
  try {
    const items = await getLowStockItems();
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Get low stock error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /inventory/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    console.log('Fetching dashboard stats...');
    const stats = await getDashboardStats();
    console.log('Dashboard stats returned:', stats);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /inventory/:itemId/history
router.get('/:itemId/history', async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const [inventory, movements] = await Promise.all([
      getInventoryByItem(itemId),
      getMovementsByItem(itemId),
    ]);
    res.json({ success: true, data: { inventory, movements } });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// POST /inventory/transfer
router.post('/transfer', authorize('admin', 'thukho', 'ketoan'), async (req: Request, res: Response) => {
  try {
    const { itemId, fromLocationId, toLocationId, quantity, status, note } = req.body;
    const itemStatus = status || 'tot';
    
    if (!itemId || !fromLocationId || !toLocationId || !quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: 'Thông tin chuyển vị trí không hợp lệ' });
      return;
    }

    if (fromLocationId === toLocationId) {
      res.status(400).json({ success: false, error: 'Vị trí nguồn và đích phải khác nhau' });
      return;
    }

    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      // Create an adjustment record for audit trail
      const code = await generateAdjustmentCode(new Date());
      const adjustment = await tx.stockAdjustment.create({
        data: {
          code,
          date: new Date(),
          reason: 'chuyen_vi_tri',
          status: 'da_duyet', // Auto approved for quick transfer
          note: note || 'Chuyển vị trí nhanh',
          createdBy: userId,
          approvedBy: userId,
        }
      });

      // Get current quantities
      const fromInv = await tx.inventory.findFirst({
        where: { itemId, locationId: fromLocationId, status: itemStatus }
      });
      const toInv = await tx.inventory.findFirst({
        where: { itemId, locationId: toLocationId, status: itemStatus }
      });

      const qtyBeforeFrom = fromInv?.quantity || 0;
      const qtyBeforeTo = toInv?.quantity || 0;

      if (qtyBeforeFrom < quantity) {
        throw new Error(`Kho nguồn không đủ số lượng. Tồn hiện tại: ${qtyBeforeFrom}`);
      }

      // Create line for source
      await tx.stockAdjustmentLine.create({
        data: {
          adjustmentId: adjustment.id,
          itemId,
          locationId: fromLocationId,
          qtyBefore: qtyBeforeFrom,
          qtyAfter: qtyBeforeFrom - quantity,
          difference: -quantity,
          note: 'Xuất chuyển vị trí',
        }
      });

      // Create line for destination
      await tx.stockAdjustmentLine.create({
        data: {
          adjustmentId: adjustment.id,
          itemId,
          locationId: toLocationId,
          qtyBefore: qtyBeforeTo,
          qtyAfter: qtyBeforeTo + quantity,
          difference: quantity,
          note: 'Nhập chuyển vị trí',
        }
      });

      return adjustment;
    });

    // Execute actual inventory update outside the adjustment transaction (applyMovement handles its own tx)
    await applyMovement({
      type: 'chuyen_vi_tri',
      refType: 'stock_adjustment',
      refId: result.id,
      itemId,
      fromLocationId,
      toLocationId,
      quantity,
      statusBefore: itemStatus,
      statusAfter: itemStatus,
      note: note || 'Chuyển vị trí nhanh',
      createdBy: userId,
    });

    await logAction(userId, 'CREATE', 'stock_transfer', result.id, { itemId, fromLocationId, toLocationId, quantity }, req.ip);

    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Transfer error:', err);
    res.status(400).json({ success: false, error: err.message || 'Lỗi xử lý chuyển vị trí' });
  }
});

export default router;
