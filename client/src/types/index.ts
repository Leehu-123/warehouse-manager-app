// ============ Entity Types ============

export interface User {
  id: number | string;
  username: string;
  email?: string;
  fullName: string;
  role: 'admin' | 'ketoan' | 'thukho' | 'kinhdoanh' | 'giacong' | 'owner' | 'sales' | 'warehouse' | 'viewer' | string;
  roles?: string[];
  permissions?: string[];
  telegramChatId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: number | string;
  code: string;
  sku?: string;
  name: string;
  glassType: string;
  thickness: number;
  color: string;
  standardSize: string;
  lengthMm?: number;
  widthMm?: number;
  areaM2?: number;
  unit: string;
  unitPrice?: number;
  minStock?: number;
  totalStock: number;
  availableStock: number;
  supplierId?: number | string;
  supplier?: Supplier;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number | string;
  code: string;
  sku?: string;
  name: string;
  zone: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number | string;
  code: string;
  sku?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number | string;
  code: string;
  sku?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  projectName?: string;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: number;
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  quantity: number;
  totalAreaSqm?: number;
  condition: string;
  batchNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  type: 'nhap' | 'xuat' | 'chuyen' | 'dieu_chinh' | 'gia_cong_vao' | 'gia_cong_ra';
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  quantity: number;
  referenceType?: string;
  referenceId?: number | string;
  referenceCode?: string;
  notes?: string;
  createdBy: number;
  creator?: User;
  createdAt: string;
}

export interface GoodsReceipt {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  supplierId?: number | string;
  supplier?: Supplier;
  deliveredBy?: string;
  vehicleNo?: string;
  documentNo?: string;
  status: string;
  note?: string;
  createdBy: number;
  creator?: User;
  approvedBy?: number;
  approver?: User;
  createdAt: string;
  updatedAt: string;
  lines?: GoodsReceiptLine[];
}

export interface GoodsReceiptLine {
  id: number;
  receiptId?: number | string;
  itemId?: number | string;
  item?: Item;
  quantity: number;
  locationId?: number | string;
  location?: Location;
  condition: string;
  note?: string;
}

export interface GoodsIssue {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  issueType: string;
  customerId?: number | string;
  customer?: Customer;
  projectName?: string;
  requestedBy?: string;
  receiverName?: string;
  orderRef?: string;
  vehicleNo?: string;
  status: string;
  note?: string;
  createdBy: number;
  creator?: User;
  approvedBy?: number;
  approver?: User;
  createdAt: string;
  updatedAt: string;
  lines?: GoodsIssueLine[];
}

export interface GoodsIssueLine {
  id: number;
  issueId?: number | string;
  itemId?: number | string;
  item?: Item;
  requestedQty: number;
  actualQty?: number;
  locationId?: number | string;
  location?: Location;
  condition: string;
  note?: string;
}

export interface ProcessingOrder {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  customerId?: number | string;
  customer?: Customer;
  projectName?: string;
  requestedBy?: string;
  assignedTo?: string;
  processType: string;
  dueDate?: string;
  status: string;
  note?: string;
  createdBy: number;
  createdUser?: User;
  approvedBy?: number;
  approvedUser?: User;
  createdAt: string;
  updatedAt: string;
  inputs?: ProcessingInput[];
  outputs?: ProcessingOutput[];
  wastes?: ProcessingWaste[];
}

export interface ProcessingInput {
  id: number;
  processingOrderId?: number | string;
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  quantity: number;
  areaM2?: number;
  note?: string;
}

export interface ProcessingOutput {
  id: number;
  processingOrderId?: number | string;
  itemCode?: string;
  itemName: string;
  lengthMm?: number;
  widthMm?: number;
  thickness?: number;
  quantity: number;
  areaM2?: number;
  locationId?: number | string;
  location?: Location;
  customerId?: number | string;
  customer?: Customer;
  projectName?: string;
  note?: string;
}

export interface ProcessingWaste {
  id: number;
  processingOrderId?: number | string;
  wasteType: string;
  itemId?: number | string;
  item?: Item;
  quantity?: number;
  areaM2?: number;
  reason?: string;
  reusable: boolean;
  note?: string;
}

export interface DamageReport {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  reportedBy: number;
  reporter?: User;
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  quantity: number;
  damageType: string;
  reason?: string;
  imagePath?: string;
  handlingPlan: string;
  status: string;
  approvedBy?: number;
  approver?: User;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stocktake {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  zone?: string;
  status: string;
  note?: string;
  createdBy: number;
  creator?: User;
  approvedBy?: number;
  approver?: User;
  lines?: StocktakeLine[];
  createdAt: string;
  updatedAt: string;
}

export interface StocktakeLine {
  id: number;
  stocktakeId?: number | string;
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  systemQty: number;
  actualQty: number;
  difference: number;
  reason?: string;
  proposal?: string;
  note?: string;
}

export interface StockAdjustment {
  id: number | string;
  code: string;
  sku?: string;
  date: string;
  reason: string;
  status: string;
  note?: string;
  createdBy: number;
  creator?: User;
  approvedBy?: number;
  approver?: User;
  lines?: StockAdjustmentLine[];
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustmentLine {
  id: number;
  adjustmentId?: number | string;
  itemId?: number | string;
  item?: Item;
  locationId?: number | string;
  location?: Location;
  qtyBefore: number;
  qtyAfter: number;
  difference: number;
  note?: string;
}

export interface AuditLog {
  id: number;
  userId?: number | string;
  user?: User;
  action: string;
  entityType: string;
  entity?: string;
  entityId?: number | string;
  changes?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Attachment {
  id: number;
  entityType: string;
  entity?: string;
  entityId?: number | string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  uploader?: User;
  createdAt: string;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface DashboardStats {
  totalSKUs: number;
  totalQuantity: number;
  totalAreaM2: number;
  pendingReceipts: number;
  pendingIssues: number;
  pendingProcessing: number;
  finishedProducts: number;
  damagedItems: number;
  lowStockCount: number;
  lowStockItems: any[];
  slowMovingCount: number;
  slowMovingItems: any[];
  recentMovements: StockMovement[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

// ============ Constants ============

export const STATUS_LABELS: Record<string, string> = {
  nhap: 'Nháp',
  cho_duyet: 'Chờ duyệt',
  da_duyet: 'Đã duyệt',
  da_nhap_kho: 'Đã nhập kho',
  da_xuat_kho: 'Đã xuất kho',
  hoan_thanh: 'Hoàn thành',
  huy: 'Đã hủy',
  tu_choi: 'Từ chối',
  cho_xuat: 'Chờ xuất',
  dang_xuat: 'Đang xuất',
  cho_gia_cong: 'Chờ gia công',
  dang_gia_cong: 'Đang gia công',
  cho_vat_tu: 'Chờ vật tư',
  cho_kiem: 'Chờ kiểm',
  dang_kiem: 'Đang kiểm',
  cho_xu_ly: 'Chờ xử lý',
  da_xu_ly: 'Đã xử lý',
  thanh_pham: 'Thành phẩm',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  ketoan: 'Kế toán',
  thukho: 'Thủ kho',
  nhapxuat: 'Nhập xuất',
  giacong: 'Gia công',
};

export const GLASS_TYPE_LABELS: Record<string, string> = {
  kinh_cuong_luc: 'Kính cường lực',
  kinh_dan: 'Kính dán',
  kinh_hop: 'Kính hộp',
  kinh_phao: 'Kính phẳng',
  kinh_mau: 'Kính màu',
  kinh_guong: 'Kính gương',
  kinh_low_e: 'Kính Low-E',
  kinh_khac: 'Kính khác',
};

export const COLOR_LABELS: Record<string, string> = {
  trong_suot: 'Trong suốt',
  xanh_la: 'Xanh lá',
  xanh_duong: 'Xanh dương',
  trang_sua: 'Trắng sữa',
  den: 'Đen',
  xam: 'Xám',
  nau: 'Nâu',
  vang: 'Vàng',
  hong: 'Hồng',
  tra: 'Màu trà',
  xanh_dam: 'Xanh đậm',
  khac: 'Khác',
};

export const UNIT_LABELS: Record<string, string> = {
  tam: 'Tấm',
  m2: 'm²',
  cai: 'Cái',
  bo: 'Bộ',
  kg: 'kg',
  met: 'Mét',
};

export const ZONE_LABELS: Record<string, string> = {
  A: 'Khu A - Kính thô',
  B: 'Khu B - Kính thành phẩm',
  C: 'Khu C - Gia công',
  D: 'Khu D - Hàng chờ xuất',
  E: 'Khu E - Hàng lỗi',
  F: 'Khu F - Kho phụ',
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  ban_hang: 'Bán hàng',
  cong_trinh: 'Công trình',
  gia_cong: 'Gia công',
  noi_bo: 'Nội bộ',
  bao_hanh: 'Bảo hành',
  tra_hang: 'Trả hàng',
  khac: 'Khác',
};

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  cat: 'Cắt',
  mai: 'Mài',
  khoan: 'Khoan',
  toi: 'Tôi',
  dan: 'Dán',
  uon: 'Uốn',
  in: 'In',
  khac: 'Khác',
};

export const DAMAGE_TYPE_LABELS: Record<string, string> = {
  vo: 'Vỡ',
  nut: 'Nứt',
  xuoc: 'Xước',
  me: 'Mẻ',
  bong_trang: 'Bóng tráng',
  loi_san_xuat: 'Lỗi sản xuất',
  
};

export const HANDLING_PLAN_LABELS: Record<string, string> = {
  cho_xu_ly: 'Chờ xử lý', ban_thanh_ly: 'Bán thanh lý', tra_ncc: 'Trả NCC', huy: 'Tiêu hủy', dung_lai: 'Dùng lại', chuyen_gia_cong: 'Chuyển gia công'
};

export const DAMAGE_STATUS_LABELS: Record<string, string> = {
  cho_xu_ly: 'Chờ xử lý', da_xu_ly: 'Đã xử lý', huy: 'Hủy'
};

export const HANDLING_LABELS: Record<string, string> = {
  huy: 'Hủy',
  sua_chua: 'Sửa chữa',
  giam_gia: 'Giảm giá',
  tra_ncc: 'Trả NCC',
  chuyen_kho: 'Chuyển kho',
  tai_che: 'Tái chế',
};

export const ADJUSTMENT_REASON_LABELS: Record<string, string> = {
  kiem_ke: 'Kiểm kê',
  mat_hang: 'Mất hàng',
  hu_hong: 'Hư hỏng',
  sai_so: 'Sai số',
  nhap_du: 'Nhập dư',
  xuat_thieu: 'Xuất thiếu',
  khac: 'Khác',
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  nhap: 'Nhập kho',
  xuat: 'Xuất kho',
  chuyen: 'Chuyển kho',
  dieu_chinh: 'Điều chỉnh',
  gia_cong_vao: 'GC - Nhập',
  gia_cong_ra: 'GC - Xuất',
};

export const CONDITION_LABELS: Record<string, string> = { tot: 'Tốt', cho_kiem: 'Chờ kiểm', xuoc: 'Xước', me: 'Mẻ', vo: 'Vỡ', khac: 'Khác', loi_vo: 'Hàng lỗi/vỡ' };
export const PROCESSING_STATUS_LABELS: Record<string, string> = { nhap: 'Nhap', cho_duyet: 'Cho duyet', cho_vat_tu: 'Cho vat tu', dang_gia_cong: 'Dang gia cong', hoan_thanh: 'Hoan thanh', co_loi: 'Co loi', huy: 'Huy' };
export const WASTE_TYPE_LABELS: Record<string, string> = { cat_quy_cach: 'Cat quy cach', vo_gia_cong: 'Vo', xuoc_me: 'Xuoc/me', sai_quy_cach: 'Sai quy cach', loi_vat_tu: 'Loi vat tu', loi_thao_tac: 'Loi thao tac', khac: 'Khac' };


