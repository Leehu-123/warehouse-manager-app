# DAFA Warehouse - Hệ thống Quản lý Kho Kính Xây dựng

> **DAFA Glass** - Kính chuẩn. Nhà sang.

Hệ thống quản lý kho kính xây dựng cho DAFA Glass, bao gồm quản lý nhập kho, xuất kho, tồn kho, gia công kính, hàng lỗi/vỡ, kiểm kê và báo cáo.

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- **Node.js** >= 18.x
- **npm** >= 9.x

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Khởi tạo database và seed data

```bash
npm run db:push
npm run db:seed
```

### Bước 3: Chạy ứng dụng (development)

```bash
npm run dev
```

Ứng dụng sẽ chạy tại:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Hoặc setup một bước:

```bash
npm run setup
npm run dev
```

## 🔑 Tài khoản đăng nhập mẫu

| Vai trò | Username | Password | Quyền |
|---------|----------|----------|-------|
| Admin/Giám đốc | `admin` | `admin123` | Toàn quyền |
| Thủ kho | `thukho` | `thukho123` | Nhập/Xuất/Kiểm kê/Tồn kho |
| Kế toán | `ketoan` | `ketoan123` | Duyệt/Báo cáo/Điều chỉnh |
| Kinh doanh | `kinhdoanh` | `kinhdoanh123` | Xem tồn/Tạo yêu cầu xuất |

## 📋 Tính năng chính

### ✅ Đã hoàn thành (Pha 1 - Core MVP)
- [x] **Đăng nhập/Phân quyền**: JWT + RBAC 5 vai trò
- [x] **Dashboard**: Tổng quan tồn kho, cảnh báo, hoạt động gần đây
- [x] **Danh mục hàng hóa**: CRUD mã hàng kính, tự sinh mã
- [x] **Vị trí kho**: Quản lý khu vực A-F
- [x] **Nhà cung cấp**: CRUD
- [x] **Khách hàng/Công trình**: CRUD
- [x] **Tồn kho**: Xem, tìm kiếm, lọc, cảnh báo tồn thấp
- [x] **Nhập kho**: Tạo/Duyệt/Xác nhận phiếu nhập, workflow trạng thái
- [x] **Xuất kho**: Tạo/Duyệt/Xác nhận phiếu xuất, kiểm tồn
- [x] **Audit log**: Nhật ký thao tác
- [x] **Responsive**: Mobile-first, hoạt động tốt trên điện thoại
- [x] **PWA**: Add to Home Screen

### ✅ Đã hoàn thành (Pha 2 - Nghiệp vụ)
- [x] **Gia công kính**: Lệnh gia công, vật tư đầu vào/thành phẩm/hao hụt
- [x] **Hàng lỗi/vỡ**: Biên bản, workflow xử lý
- [x] **Hàng chờ xuất**: Quản lý soạn hàng
- [x] **Kiểm kê**: Phiếu kiểm kê, đối chiếu chênh lệch
- [x] **Điều chỉnh tồn**: Phiếu điều chỉnh (admin/kế toán)

### ✅ Đã hoàn thành (Pha 3 - Báo cáo)
- [x] **Báo cáo tồn kho**: Theo mã hàng, loại, độ dày, vị trí, tình trạng
- [x] **Báo cáo nhập xuất tồn**: Theo kỳ
- [x] **Quản lý người dùng**: CRUD (admin)
- [x] **Xuất CSV**: Export báo cáo

### 📝 Đề xuất Giai đoạn 2
- [ ] Xuất PDF phiếu in (layout chữ ký)
- [ ] QR Code mã hàng/vị trí + quét trên mobile
- [ ] Upload ảnh cho biên bản lỗi/phiếu nhập
- [ ] Offline PWA (service worker cache)
- [ ] Thông báo realtime (WebSocket)
- [ ] Nhân viên gia công role
- [ ] Multi-language (EN/VI)
- [ ] Docker deployment
- [ ] Migration sang PostgreSQL

## 🏗️ Cấu trúc dự án

```
├── package.json          # Root workspace
├── README.md
├── .gitignore
│
├── server/               # Backend (Express + Prisma + SQLite)
│   ├── prisma/
│   │   ├── schema.prisma # Database schema (20+ tables)
│   │   └── seed.ts       # Seed data
│   └── src/
│       ├── index.ts      # Express entry
│       ├── middleware/    # Auth, RBAC, Error handling
│       ├── routes/       # API routes (16 files)
│       ├── services/     # Business logic
│       └── utils/        # JWT, code generator, audit logger
│
└── client/               # Frontend (React + Vite + Tailwind)
    ├── public/           # Static assets, PWA manifest
    └── src/
        ├── api/          # API client
        ├── components/   # Reusable components
        │   ├── layout/   # AppLayout, Sidebar, Header, MobileNav
        │   └── shared/   # DataTable, Modal, StatusBadge...
        ├── contexts/     # AuthContext
        ├── pages/        # All page components
        ├── types/        # TypeScript interfaces
        └── utils/        # Formatters, helpers
```

## 🔧 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (dev) → PostgreSQL (prod) |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Charts | Recharts |
| Icons | Lucide React |

## 📊 Database Schema

20+ bảng bao gồm: users, items, suppliers, customers, locations, inventory, stock_movements, goods_receipts, goods_receipt_lines, goods_issues, goods_issue_lines, processing_orders, processing_inputs, processing_outputs, processing_wastes, damage_reports, stocktakes, stocktake_lines, stock_adjustments, stock_adjustment_lines, audit_logs, attachments.

## ⚠️ Quy tắc nghiệp vụ

1. Tồn kho CHỈ thay đổi thông qua `stock_movements`
2. Không cho sửa phiếu đã xác nhận nhập/xuất
3. Không cho xuất quá tồn khả dụng
4. Hàng lỗi/vỡ tách riêng, không tính tồn khả dụng
5. Mọi thao tác quan trọng được ghi audit log
6. Không xóa cứng chứng từ, chỉ hủy

## 📱 PWA

Để thêm app vào màn hình điện thoại:
1. Mở Chrome trên điện thoại
2. Truy cập http://[server-ip]:5173
3. Nhấn menu ⋮ → "Add to Home Screen" / "Thêm vào màn hình chính"

## 📄 License

Private - DAFA Glass © 2025
