import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import type { GoodsIssue, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ISSUE_TYPE_LABELS } from '../../types';

export default function IssueList() {
  const navigate = useNavigate();
  const [data, setData] = useState<GoodsIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({
    status: searchParams.get('status') || '',
    issueType: ''
  });

  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    setFilters(prev => ({ ...prev, status: urlStatus }));
    setPage(1);
  }, [searchParams]);
  
  const [confirmItem, setConfirmItem] = useState<GoodsIssue | null>(null);
  const [deleteItem, setDeleteItem] = useState<GoodsIssue | null>(null);
  const [hardDeleteItem, setHardDeleteItem] = useState<GoodsIssue | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<PaginatedResponse<GoodsIssue>>(`/goods-issues?${params}`);
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
      await api.post(`/goods-issues/${confirmItem.id}/confirm`);
      toast.success(`Đã xác nhận xuất kho phiếu ${confirmItem.code}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setConfirmItem(null);
    }
  };

  const handleCancel = async () => {
    if (!deleteItem) return;
    try {
      await api.post(`/goods-issues/${deleteItem.id}/cancel`);
      toast.success(`Đã hủy phiếu ${deleteItem.code}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setDeleteItem(null);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteItem) return;
    try {
      await api.delete(`/goods-issues/${hardDeleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Có lỗi xảy ra');
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
        { value: 'da_xuat_kho', label: 'Đã xuất kho' },
        { value: 'huy', label: 'Đã hủy' }
      ] 
    },
    {
      key: 'issueType',
      label: 'Loại xuất',
      options: Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))
    }
  ];

  const columns: Column<GoodsIssue>[] = [
    { key: 'code', label: 'Mã phiếu', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'date', label: 'Ngày xuất', render: (r) => <span>{format(new Date(r.date || r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span> },
    { key: 'type', label: 'Loại xuất', render: (r) => <span>{ISSUE_TYPE_LABELS[r.issueType] || r.issueType}</span> },
    { key: 'customer', label: 'Khách hàng', render: (r) => <span>{r.customer?.name || r.receiverName || '-'}</span> },
    { key: 'creator', label: 'Người tạo', render: (r) => <span>{r.creator?.fullName || '-'}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/goods-issues/${r.id}/edit`)} className="btn-icon text-brand-600" title="Chi tiết / Sửa">
          <FileText className="w-4 h-4" />
        </button>
        {r.status === 'da_duyet' && (
          <button onClick={() => setConfirmItem(r)} className="btn-icon text-emerald-600" title="Xác nhận xuất kho">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        {(r.status === 'nhap' || r.status === 'cho_duyet') && (
          <button onClick={() => setDeleteItem(r)} className="btn-icon text-red-500" title="Hủy phiếu">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Phiếu Xuất Kho</h1>
        <button onClick={() => navigate('/goods-issues/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo phiếu xuất
        </button>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm theo mã phiếu, khách hàng..." />
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => { setFilters(prev => ({ ...prev, [k]: v })); setPage(1); }} onClearAll={() => setFilters({ status: '', issueType: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Chưa có phiếu xuất nào"
        emptyDescription="Nhấn 'Tạo phiếu xuất' để bắt đầu ghi nhận xuất kho"
        emptyAction={<button onClick={() => navigate('/goods-issues/new')} className="btn-primary">Tạo phiếu xuất</button>}
        onRowClick={(row) => navigate(`/goods-issues/${row.id}/edit`)}
        keyExtractor={(row) => row.id}
        pagination={{ page, totalPages: Math.ceil(total / limit), total, limit, onPageChange: setPage, onLimitChange: (l) => { setLimit(l); setPage(1); } }}
      />

      <ConfirmDialog
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleConfirm}
        title="Xác nhận xuất kho"
        message={`Bạn có chắc chắn muốn xác nhận xuất kho cho phiếu "${confirmItem?.code}"? Hành động này sẽ trừ trực tiếp vào số lượng tồn kho hiện tại.`}
        variant="info"
        confirmText="Xác nhận xuất kho"
      />

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleCancel}
        title="Hủy phiếu xuất"
        message={`Bạn muốn hủy phiếu xuất "${deleteItem?.code}"? Phiếu đã hủy sẽ không thể sử dụng lại.`}
        variant="danger"
        confirmText="Hủy phiếu"
      />
    </div>
  );
}
