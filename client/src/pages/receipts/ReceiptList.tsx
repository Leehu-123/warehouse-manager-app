import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import type { GoodsReceipt, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ReceiptList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({
    status: '',
  });
  
  const [confirmItem, setConfirmItem] = useState<GoodsReceipt | null>(null);
  const [cancelItem, setCancelItem] = useState<GoodsReceipt | null>(null);
  const [hardDeleteItem, setHardDeleteItem] = useState<GoodsReceipt | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<PaginatedResponse<GoodsReceipt>>(`/goods-receipts?${params}`);
      setData(res.data);
      setTotal(res.total);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConfirm = async () => {
    if (!confirmItem) return;
    try {
      await api.post(`/goods-receipts/${confirmItem.id}/confirm`);
      toast.success(`Đã xác nhận nhập kho phiếu ${confirmItem.code}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setConfirmItem(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelItem) return;
    try {
      await api.post(`/goods-receipts/${cancelItem.id}/cancel`);
      toast.success(`Đã hủy phiếu ${cancelItem.code}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setCancelItem(null);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteItem) return;
    try {
      await api.delete(`/goods-receipts/${hardDeleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn dữ liệu');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Không thể xóa');
    } finally {
      setHardDeleteItem(null);
    }
  };

  const filterOptions: FilterOption[] = [
    { 
      key: 'status', 
      label: 'Trạng thái', 
      options: [
        { value: 'nhap', label: 'Nháp' },
        { value: 'cho_duyet', label: 'Chờ duyệt' },
        { value: 'da_duyet', label: 'Đã duyệt' },
        { value: 'da_nhap_kho', label: 'Đã nhập kho' },
        { value: 'huy', label: 'Đã hủy' }
      ] 
    },
  ];

  const columns: Column<GoodsReceipt>[] = [
    { key: 'code', label: 'Mã phiếu', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'date', label: 'Ngày nhập', render: (r) => <span>{format(new Date(r.date || r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span> },
    { key: 'supplier', label: 'Nhà cung cấp', render: (r) => <span>{r.supplier?.name || '-'}</span> },
    { key: 'creator', label: 'Người tạo', render: (r) => <span>{r.creator?.fullName || '-'}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/goods-receipts/${r.id}/edit`)} className="btn-icon text-brand-600" title="Chi tiết / Sửa">
          <FileText className="w-4 h-4" />
        </button>
        {r.status === 'da_duyet' && (
          <button onClick={() => setConfirmItem(r)} className="btn-icon text-emerald-600" title="Xác nhận nhập kho">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        {(r.status === 'nhap' || r.status === 'cho_duyet') && (
          <button onClick={() => setCancelItem(r)} className="btn-icon text-orange-500" title="Hủy phiếu">
            <FileText className="w-4 h-4" />
          </button>
        )}
        {isAdmin && ['nhap', 'cho_duyet', 'huy'].includes(r.status) && (
          <button onClick={() => setHardDeleteItem(r)} className="btn-icon hover:bg-red-50 text-red-600" title="Xóa vĩnh viễn">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Phiếu Nhập Kho</h1>
        <button onClick={() => navigate('/goods-receipts/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo phiếu nhập
        </button>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm theo mã phiếu..." />
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => { setFilters(prev => ({ ...prev, [k]: v })); setPage(1); }} onClearAll={() => setFilters({ status: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Chưa có phiếu nhập nào"
        emptyDescription="Nhấn 'Tạo phiếu nhập' để bắt đầu ghi nhận hàng hóa"
        emptyAction={<button onClick={() => navigate('/goods-receipts/new')} className="btn-primary">Tạo phiếu nhập</button>}
        onRowClick={(row) => navigate(`/goods-receipts/${row.id}/edit`)}
        keyExtractor={(row) => row.id}
        pagination={{ page, totalPages: Math.ceil(total / limit), total, limit, onPageChange: setPage, onLimitChange: (l) => { setLimit(l); setPage(1); } }}
      />

      <ConfirmDialog
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleConfirm}
        title="Xác nhận nhập kho"
        message={`Bạn có chắc chắn muốn xác nhận nhập kho cho phiếu "${confirmItem?.code}"? Hành động này sẽ cộng trực tiếp vào số lượng tồn kho và không thể hoàn tác.`}
        variant="info"
        confirmText="Xác nhận nhập kho"
      />

      <ConfirmDialog
        isOpen={!!cancelItem}
        onClose={() => setCancelItem(null)}
        onConfirm={handleCancel}
        title="Hủy phiếu nhập"
        message={`Bạn muốn hủy phiếu nhập "${cancelItem?.code}"? Phiếu đã hủy sẽ không thể sử dụng lại.`}
        variant="warning"
        confirmText="Hủy phiếu"
      />

      <ConfirmDialog
        isOpen={!!hardDeleteItem}
        onClose={() => setHardDeleteItem(null)}
        onConfirm={handleHardDelete}
        title="Xóa vĩnh viễn"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn phiếu "${hardDeleteItem?.code}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
