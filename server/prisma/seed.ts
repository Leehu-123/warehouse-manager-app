import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockAdjustmentLine.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stocktakeLine.deleteMany();
  await prisma.stocktake.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.processingWaste.deleteMany();
  await prisma.processingOutput.deleteMany();
  await prisma.processingInput.deleteMany();
  await prisma.processingOrder.deleteMany();
  await prisma.goodsIssueLine.deleteMany();
  await prisma.goodsIssue.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // ===== USERS =====
  const passwordHash = await bcrypt.hash('admin123', 10);
  const thukhoHash = await bcrypt.hash('thukho123', 10);
  const ketoanHash = await bcrypt.hash('ketoan123', 10);
  const kinhdoanhHash = await bcrypt.hash('kinhdoanh123', 10);

  const admin = await prisma.user.create({
    data: { username: 'admin', passwordHash, fullName: 'Quản trị viên', role: 'admin' },
  });
  const thukho = await prisma.user.create({
    data: { username: 'thukho', passwordHash: thukhoHash, fullName: 'Nhân viên Kho', role: 'thukho' },
  });
  const ketoan = await prisma.user.create({
    data: { username: 'ketoan', passwordHash: ketoanHash, fullName: 'Nhân viên Kế toán', role: 'ketoan' },
  });
  const kinhdoanh = await prisma.user.create({
    data: { username: 'kinhdoanh', passwordHash: kinhdoanhHash, fullName: 'Nhân viên Kinh doanh', role: 'kinhdoanh' },
  });

  console.log('✅ Đã tạo 4 người dùng');

  // ===== SUPPLIERS =====
  const supplier1 = await prisma.supplier.create({
    data: { code: 'NCC-0001', name: 'NCC Kính Việt Nhật', phone: '0901234567', address: 'KCN Bình Dương', email: 'vietnhat@glass.vn' },
  });
  const supplier2 = await prisma.supplier.create({
    data: { code: 'NCC-0002', name: 'NCC Kính Hải Long', phone: '0912345678', address: 'KCN Đồng Nai', email: 'hailong@glass.vn' },
  });
  const supplier3 = await prisma.supplier.create({
    data: { code: 'NCC-0003', name: 'NCC Phụ kiện ABC', phone: '0923456789', address: 'Q.Tân Bình, TP.HCM', email: 'abc@phukien.vn' },
  });

  console.log('✅ Đã tạo 3 nhà cung cấp');

  // ===== CUSTOMERS =====
  const customer1 = await prisma.customer.create({
    data: { code: 'KH-0001', name: 'Công trình Vinhomes Grand Park', phone: '0934567890', address: 'Q.9, TP.HCM', projectName: 'Vinhomes Grand Park - Tòa S5' },
  });
  const customer2 = await prisma.customer.create({
    data: { code: 'KH-0002', name: 'Khách lẻ Nguyễn Văn A', phone: '0945678901', address: 'Q.7, TP.HCM' },
  });
  const customer3 = await prisma.customer.create({
    data: { code: 'KH-0003', name: 'Công ty Nội thất XYZ', phone: '0956789012', address: 'Q.Bình Thạnh, TP.HCM', email: 'xyz@noithat.vn' },
  });

  console.log('✅ Đã tạo 3 khách hàng');

  // ===== LOCATIONS =====
  const locA1 = await prisma.location.create({ data: { code: 'A1', name: 'Khu nhập hàng', zone: 'A', description: 'Khu vực tiếp nhận hàng nhập' } });
  const locB1 = await prisma.location.create({ data: { code: 'B1', name: 'Tồn kính trắng', zone: 'B', description: 'Khu tồn trữ kính trắng' } });
  const locB2 = await prisma.location.create({ data: { code: 'B2', name: 'Tồn kính màu', zone: 'B', description: 'Khu tồn trữ kính màu' } });
  const locC1 = await prisma.location.create({ data: { code: 'C1', name: 'Hàng chờ xuất', zone: 'C', description: 'Khu hàng chờ xuất kho' } });
  const locD1 = await prisma.location.create({ data: { code: 'D1', name: 'Hàng chờ gia công', zone: 'D', description: 'Khu hàng chờ gia công' } });
  const locE1 = await prisma.location.create({ data: { code: 'E1', name: 'Thành phẩm', zone: 'E', description: 'Khu thành phẩm sau gia công' } });
  const locF1 = await prisma.location.create({ data: { code: 'F1', name: 'Hàng lỗi/vỡ', zone: 'F', description: 'Khu hàng lỗi, vỡ chờ xử lý' } });

  console.log('✅ Đã tạo 7 vị trí kho');

  // ===== ITEMS =====
  const item1 = await prisma.item.create({
    data: {
      code: 'DAFA-KT-10-TR-2440x3660', name: 'Kính thường 10mm trắng 2440x3660',
      glassType: 'kinh_thuong', thickness: 10, color: 'trang', standardSize: '2440x3660',
      lengthMm: 3660, widthMm: 2440, areaM2: 3660 * 2440 / 1000000,
      unit: 'tam', unitPrice: 350000, minStock: 10, supplierId: supplier1.id,
    },
  });
  const item2 = await prisma.item.create({
    data: {
      code: 'DAFA-KT-8-TR-2440x3660', name: 'Kính thường 8mm trắng 2440x3660',
      glassType: 'kinh_thuong', thickness: 8, color: 'trang', standardSize: '2440x3660',
      lengthMm: 3660, widthMm: 2440, areaM2: 3660 * 2440 / 1000000,
      unit: 'tam', unitPrice: 280000, minStock: 15, supplierId: supplier1.id,
    },
  });
  const item3 = await prisma.item.create({
    data: {
      code: 'DAFA-KCL-12-TR-2140x3300', name: 'Kính cường lực 12mm trắng 2140x3300',
      glassType: 'kinh_cuong_luc', thickness: 12, color: 'trang', standardSize: '2140x3300',
      lengthMm: 3300, widthMm: 2140, areaM2: 3300 * 2140 / 1000000,
      unit: 'tam', unitPrice: 520000, minStock: 8, supplierId: supplier2.id,
    },
  });
  const item4 = await prisma.item.create({
    data: {
      code: 'DAFA-KD-6.38-TR-1830x2440', name: 'Kính dán 6.38mm trắng 1830x2440',
      glassType: 'kinh_dan', thickness: 6.38, color: 'trang', standardSize: '1830x2440',
      lengthMm: 2440, widthMm: 1830, areaM2: 2440 * 1830 / 1000000,
      unit: 'tam', unitPrice: 450000, minStock: 5, supplierId: supplier2.id,
    },
  });
  const item5 = await prisma.item.create({
    data: {
      code: 'DAFA-KT-5-XD-2440x3660', name: 'Kính thường 5mm xanh dương 2440x3660',
      glassType: 'kinh_thuong', thickness: 5, color: 'xanh', standardSize: '2440x3660',
      lengthMm: 3660, widthMm: 2440, areaM2: 3660 * 2440 / 1000000,
      unit: 'tam', unitPrice: 220000, minStock: 10, supplierId: supplier1.id,
    },
  });
  const item6 = await prisma.item.create({
    data: {
      code: 'DAFA-KPQ-8-XAM-2140x3300', name: 'Kính phản quang 8mm xám 2140x3300',
      glassType: 'kinh_phan_quang', thickness: 8, color: 'xam', standardSize: '2140x3300',
      lengthMm: 3300, widthMm: 2140, areaM2: 3300 * 2140 / 1000000,
      unit: 'tam', unitPrice: 480000, minStock: 5, supplierId: supplier2.id,
    },
  });

  console.log('✅ Đã tạo 6 mặt hàng kính');

  // ===== INVENTORY =====
  await prisma.inventory.createMany({
    data: [
      { itemId: item1.id, locationId: locB1.id, quantity: 25, status: 'tot' },
      { itemId: item1.id, locationId: locC1.id, quantity: 3, status: 'cho_xuat' },
      { itemId: item2.id, locationId: locB1.id, quantity: 40, status: 'tot' },
      { itemId: item3.id, locationId: locB1.id, quantity: 12, status: 'tot' },
      { itemId: item3.id, locationId: locD1.id, quantity: 2, status: 'cho_gia_cong' },
      { itemId: item4.id, locationId: locB1.id, quantity: 8, status: 'tot' },
      { itemId: item5.id, locationId: locB2.id, quantity: 30, status: 'tot' },
      { itemId: item6.id, locationId: locB2.id, quantity: 15, status: 'tot' },
      { itemId: item1.id, locationId: locF1.id, quantity: 2, status: 'vo' },
      { itemId: item2.id, locationId: locF1.id, quantity: 1, status: 'xuoc' },
    ],
  });

  console.log('✅ Đã tạo 10 bản ghi tồn kho');

  // ===== SAMPLE GOODS RECEIPT =====
  const receipt = await prisma.goodsReceipt.create({
    data: {
      code: 'NK-20250610-001',
      date: new Date('2025-06-10'),
      supplierId: supplier1.id,
      deliveredBy: 'Nguyễn Văn Tài',
      vehicleNo: '51C-123.45',
      receivedBy: thukho.id,
      documentNo: 'HĐ-2025-0610',
      status: 'da_nhap_kho',
      note: 'Nhập kính thường đợt 1 tháng 6',
      createdBy: thukho.id,
      approvedBy: admin.id,
      lines: {
        create: [
          { itemId: item1.id, locationId: locB1.id, quantity: 20, condition: 'tot' },
          { itemId: item2.id, locationId: locB1.id, quantity: 30, condition: 'tot' },
        ],
      },
    },
  });

  console.log('✅ Đã tạo phiếu nhập kho mẫu');

  // ===== SAMPLE GOODS ISSUE =====
  const issue = await prisma.goodsIssue.create({
    data: {
      code: 'XK-20250612-001',
      date: new Date('2025-06-12'),
      issueType: 'xuat_ban',
      customerId: customer1.id,
      projectName: 'Vinhomes Grand Park - Tòa S5',
      requestedBy: 'Trần Văn B',
      receiverName: 'Lê Văn C',
      vehicleNo: '51D-456.78',
      status: 'da_xuat_kho',
      note: 'Xuất kính cho công trình Vinhomes',
      createdBy: thukho.id,
      approvedBy: admin.id,
      lines: {
        create: [
          { itemId: item1.id, locationId: locB1.id, requestedQty: 5, actualQty: 5, condition: 'tot' },
        ],
      },
    },
  });

  console.log('✅ Đã tạo phiếu xuất kho mẫu');

  // ===== STOCK MOVEMENTS =====
  await prisma.stockMovement.createMany({
    data: [
      {
        type: 'nhap', refType: 'goods_receipt', refId: receipt.id,
        itemId: item1.id, toLocationId: locB1.id, quantity: 20,
        statusAfter: 'tot', note: 'Nhập kho từ NCC Việt Nhật', createdBy: thukho.id,
        createdAt: new Date('2025-06-10T08:00:00'),
      },
      {
        type: 'nhap', refType: 'goods_receipt', refId: receipt.id,
        itemId: item2.id, toLocationId: locB1.id, quantity: 30,
        statusAfter: 'tot', note: 'Nhập kho từ NCC Việt Nhật', createdBy: thukho.id,
        createdAt: new Date('2025-06-10T08:15:00'),
      },
      {
        type: 'xuat', refType: 'goods_issue', refId: issue.id,
        itemId: item1.id, fromLocationId: locB1.id, quantity: 5,
        statusBefore: 'tot', note: 'Xuất cho công trình Vinhomes', createdBy: thukho.id,
        createdAt: new Date('2025-06-12T10:00:00'),
      },
    ],
  });

  console.log('✅ Đã tạo 3 stock movements mẫu');

  // ===== AUDIT LOGS =====
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id, action: 'CREATE', entityType: 'user', entityId: thukho.id,
        changes: JSON.stringify({ after: { username: 'thukho', role: 'thukho' } }),
        createdAt: new Date('2025-06-01T08:00:00'),
      },
      {
        userId: thukho.id, action: 'CREATE', entityType: 'goods_receipt', entityId: receipt.id,
        changes: JSON.stringify({ after: { code: 'NK-20250610-001', status: 'nhap' } }),
        createdAt: new Date('2025-06-10T07:30:00'),
      },
      {
        userId: admin.id, action: 'APPROVE', entityType: 'goods_receipt', entityId: receipt.id,
        changes: JSON.stringify({ before: { status: 'cho_duyet' }, after: { status: 'da_duyet' } }),
        createdAt: new Date('2025-06-10T07:45:00'),
      },
      {
        userId: thukho.id, action: 'CONFIRM', entityType: 'goods_receipt', entityId: receipt.id,
        changes: JSON.stringify({ before: { status: 'da_duyet' }, after: { status: 'da_nhap_kho' } }),
        createdAt: new Date('2025-06-10T08:00:00'),
      },
      {
        userId: thukho.id, action: 'CREATE', entityType: 'goods_issue', entityId: issue.id,
        changes: JSON.stringify({ after: { code: 'XK-20250612-001', status: 'nhap' } }),
        createdAt: new Date('2025-06-12T09:00:00'),
      },
    ],
  });

  console.log('✅ Đã tạo 5 audit logs mẫu');
  console.log('🎉 Seed dữ liệu hoàn tất!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Lỗi seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
