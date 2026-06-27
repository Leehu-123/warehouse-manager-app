const fs = require('fs');
const path = require('path');

const routesDir = 'f:/Antigrapvity/Stock manager/server/src/routes';

const updates = [
  { file: 'goodsReceipts.routes.ts', model: 'goodsReceipt', name: 'goods_receipt' },
  { file: 'goodsIssues.routes.ts', model: 'goodsIssue', name: 'goods_issue' },
  { file: 'processingOrders.routes.ts', model: 'processingOrder', name: 'processing_order' },
  { file: 'damageReports.routes.ts', model: 'damageReport', name: 'damage_report' },
  { file: 'stocktakes.routes.ts', model: 'stocktake', name: 'stocktake' },
  { file: 'adjustments.routes.ts', model: 'stockAdjustment', name: 'stock_adjustment' }
];

updates.forEach(u => {
  const filePath = path.join(routesDir, u.file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes("router.delete('/:id/hard'")) {
    console.log('Skipping ' + u.file + ' (already has hard delete)');
    return;
  }

  const endpoint = `
// DELETE /:id/hard - hard delete
router.delete('/:id/hard', authorize('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.${u.model}.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy phiếu' });
      return;
    }
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      res.status(400).json({ success: false, error: 'Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy' });
      return;
    }
    await prisma.${u.model}.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', '${u.name}', id, { action: 'hard_delete' }, req.ip);
    res.json({ success: true, message: 'Đã xóa phiếu thành công' });
  } catch (err) {
    console.error('Hard delete error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

`;

  content = content.replace('export default router;', endpoint + 'export default router;');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated ' + u.file);
});
