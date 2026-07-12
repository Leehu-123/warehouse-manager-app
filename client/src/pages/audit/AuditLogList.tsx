import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';
import DataTable, { type Column } from '../../components/shared/DataTable';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  Adjustment: 'Điều chỉnh tồn',
  item: 'Vật tư',
  Product: 'Sản phẩm',
  location: 'Vị trí',
  Location: 'Vị trí',
  customer: 'Khách hàng',
  Customer: 'Khách hàng',
  supplier: 'Nhà cung cấp',
  Supplier: 'Nhà cung cấp',
  user: 'Người dùng',
  User: 'Người dùng',
};

const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get<{ data: AuditLog[] }>('/audit-logs');
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', label: 'Thời gian', render: (l: AuditLog) => <span className="text-sm">{format(new Date(l.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}</span> },
    { key: 'user', label: 'Người dùng', render: (l: AuditLog) => <span className="font-medium">{l.user?.fullName || l.user?.username || `ID: ${l.userId}`}</span> },
    { key: 'action', label: 'Thao tác', render: (l: AuditLog) => (
      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
        {ACTION_LABELS[l.action] || l.action}
      </span>
    )},
    { key: 'entity', label: 'Đối tượng', render: (l: AuditLog) => <span>{ENTITY_LABELS[l.entity!] || l.entity}</span> },
    { key: 'entityId', label: 'ID/Mã', render: (l: AuditLog) => <span className="font-mono text-sm">{l.entityId}</span> },
    { key: 'ip', label: 'IP', render: (l: AuditLog) => <span className="text-xs text-gray-500">{l.ipAddress || '-'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử thao tác</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataTable
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AuditLogList;
