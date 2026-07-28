import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';
import DataTable, { type Column } from '../../components/shared/DataTable';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Filter, Calendar, RefreshCw, XCircle, Clock, Search, ShieldCheck } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  CREATED: 'Tạo mới',
  update: 'Cập nhật',
  UPDATED: 'Cập nhật',
  delete: 'Xóa',
  DELETED: 'Xóa',
  SOFT_DELETED: 'Xóa mềm',
  approve: 'Duyệt',
  APPROVED: 'Duyệt',
  cancel: 'Hủy',
  CANCELLED: 'Hủy',
  confirm: 'Xác nhận',
  SUBMITTED: 'Trình duyệt',
  COMPLETED: 'Hoàn thành',
  LOGIN_SUCCESS: 'Đăng nhập',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  RESTORED: 'Khôi phục',
};

const ENTITY_LABELS: Record<string, string> = {
  goods_receipt: 'Phiếu nhập',
  GoodsReceipt: 'Phiếu nhập',
  goods_issue: 'Phiếu xuất',
  GoodsIssue: 'Phiếu xuất',
  processing_order: 'Lệnh gia công',
  ProcessingOrder: 'Lệnh gia công',
  damage_report: 'Báo lỗi/vỡ',
  DamageReport: 'Báo lỗi/vỡ',
  stocktake: 'Kiểm kê',
  Stocktake: 'Kiểm kê',
  stock_adjustment: 'Điều chỉnh tồn',
  StockAdjustment: 'Điều chỉnh tồn',
  Adjustment: 'Điều chỉnh tồn',
  item: 'Vật tư / Sản phẩm',
  Product: 'Sản phẩm',
  location: 'Vị trí kho',
  Location: 'Vị trí kho',
  customer: 'Khách hàng',
  Customer: 'Khách hàng',
  supplier: 'Nhà cung cấp',
  Supplier: 'Nhà cung cấp',
  user: 'Người dùng & Đăng nhập',
  User: 'Người dùng',
  StockMovement: 'Biến động kho',
  AuditLog: 'Lịch sử thao tác',
};

// Các đối tượng ngoại lai thuộc ứng dụng khác (Sale, CRM, HR) cần ẩn khỏi phần mềm Quản lý Kho
const NON_WAREHOUSE_ENTITIES = [
  'Opportunity', 'SalesTask', 'Quote', 'SalesOrder', 'SalesOrderPayment',
  'KPI', 'CustomerInteraction', 'BusinessTrip', 'kpi_record', 'work_report',
  'Lead', 'Contract', 'OpportunityProduct'
];

const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs(1);
  }, [entityFilter, limit]);

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
      });

      if (entityFilter) {
        queryParams.append('entity', entityFilter);
      }
      if (startDate) {
        // Gán thời gian bắt đầu từ 00:00:00
        queryParams.append('startDate', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        // Gán thời gian kết thúc đến 23:59:59
        queryParams.append('endDate', `${endDate}T23:59:59.999Z`);
      }

      const res = await api.get<{ data: AuditLog[]; meta?: { total: number; totalPages: number; page: number } }>(
        `/audit-logs?${queryParams.toString()}`
      );

      const rawData = res.data || [];
      
      // Lọc bỏ các thao tác từ ứng dụng Sales/HR nếu người dùng chọn "Tất cả nghiệp vụ Kho"
      const filteredData = entityFilter 
        ? rawData 
        : rawData.filter((log) => !NON_WAREHOUSE_ENTITIES.includes(log.entity || ''));

      setLogs(filteredData);
      if (res.meta) {
        setTotal(res.meta.total || 0);
        setTotalPages(res.meta.totalPages || 1);
        setPage(res.meta.page || 1);
      } else {
        setTotal(filteredData.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setEntityFilter('');
    setPage(1);
    setTimeout(() => fetchLogs(1), 0);
  };

  const columns: Column<AuditLog>[] = [
    { 
      key: 'createdAt', 
      label: 'Thời gian', 
      width: '180px',
      render: (l: AuditLog) => (
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {format(new Date(l.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
        </span>
      ) 
    },
    { 
      key: 'user', 
      label: 'Người dùng', 
      render: (l: AuditLog) => (
        <span className="font-semibold text-gray-900">
          {l.user?.fullName || l.user?.username || `ID: ${l.userId}`}
        </span>
      ) 
    },
    { 
      key: 'action', 
      label: 'Thao tác', 
      render: (l: AuditLog) => {
        const isDelete = l.action?.toLowerCase().includes('delete') || l.action?.toLowerCase().includes('cancel');
        const isCreate = l.action?.toLowerCase().includes('create');
        const isApprove = l.action?.toLowerCase().includes('approve') || l.action?.toLowerCase().includes('submit');
        
        let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
        if (isDelete) colorClass = 'bg-red-50 text-red-700 border-red-200';
        else if (isCreate) colorClass = 'bg-green-50 text-green-700 border-green-200';
        else if (isApprove) colorClass = 'bg-blue-50 text-blue-700 border-blue-200';

        return (
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${colorClass}`}>
            {ACTION_LABELS[l.action] || l.action}
          </span>
        );
      }
    },
    { 
      key: 'entity', 
      label: 'Đối tượng', 
      render: (l: AuditLog) => (
        <span className="font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full text-xs">
          {ENTITY_LABELS[l.entity!] || l.entity}
        </span>
      ) 
    },
    { 
      key: 'entityId', 
      label: 'ID / Mã chứng từ', 
      render: (l: AuditLog) => <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{l.entityId}</span> 
    },
    { 
      key: 'ip', 
      label: 'IP', 
      render: (l: AuditLog) => <span className="text-xs font-mono text-gray-400">{l.ipAddress || '-'}</span> 
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-brand-600" />
            Lịch sử thao tác nghiệp vụ Kho
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Chỉ hiển thị các hoạt động liên quan đến hàng hóa, kho bãi và tài khoản trên hệ thống DAFA Warehouse.
          </p>
        </div>

        <button 
          onClick={() => fetchLogs(page)} 
          className="btn btn-secondary flex items-center gap-2 text-sm self-start sm:self-auto"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleApplyDateFilter} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mr-2">
            <Filter className="w-4 h-4 text-brand-600" />
            <span>Bộ lọc:</span>
          </div>

          {/* Lọc đối tượng nghiệp vụ */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Loại nghiệp vụ</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="">✨ Tất cả nghiệp vụ Kho (Đã ẩn dữ liệu Sale)</option>
              <option value="GoodsReceipt">📥 Phiếu nhập kho</option>
              <option value="GoodsIssue">📤 Phiếu xuất kho</option>
              <option value="Product">📦 Danh mục & Sản phẩm</option>
              <option value="ProcessingOrder">⚙️ Lệnh gia công</option>
              <option value="DamageReport">⚠️ Báo hàng lỗi / vỡ</option>
              <option value="Stocktake">📝 Kiểm kê & Điều chỉnh tồn</option>
              <option value="Location">📍 Vị trí kho</option>
              <option value="Supplier">🏢 Nhà cung cấp</option>
              <option value="Customer">👥 Khách hàng</option>
              <option value="User">🔐 Tài khoản & Đăng nhập</option>
            </select>
          </div>

          {/* Từ ngày */}
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field text-sm py-1.5"
            />
          </div>

          {/* Đến ngày */}
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field text-sm py-1.5"
            />
          </div>

          {/* Hiển thị số dòng */}
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-500 mb-1">Số dòng / trang</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input-field text-sm py-1.5 font-semibold"
            >
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={200}>200 dòng</option>
              <option value={500}>500 dòng</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 mt-auto sm:mt-6">
            <button
              type="submit"
              className="btn btn-primary text-sm py-2 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-4 h-4" /> Lọc
            </button>
            
            {(startDate || endDate || entityFilter || limit !== 100) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="btn btn-secondary text-sm py-2 px-3 flex items-center gap-1 text-gray-600 hover:text-red-600"
              >
                <XCircle className="w-4 h-4" /> Đặt lại
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Data Table with custom pagination */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          loading={loading}
          emptyTitle="Không tìm thấy lịch sử thao tác"
          emptyDescription="Chưa có dữ liệu nào phù hợp với khoảng thời gian và bộ lọc bạn chọn."
          pagination={{
            page,
            totalPages,
            total,
            limit,
            onPageChange: (newPage) => {
              setPage(newPage);
              fetchLogs(newPage);
            },
            onLimitChange: (newLimit) => {
              setLimit(newLimit);
            }
          }}
        />
      </div>
    </div>
  );
};

export default AuditLogList;
