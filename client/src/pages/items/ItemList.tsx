import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Power, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import DataTable, { type Column } from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import type { Item, PaginatedResponse } from '../../types';
import { GLASS_TYPE_LABELS, COLOR_LABELS, UNIT_LABELS } from '../../types';
import toast from 'react-hot-toast';

export default function ItemList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({
    glassType: '', color: '', active: '',
  });
  const [deactivateItem, setDeactivateItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
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
      const res = await api.get<PaginatedResponse<Item>>(`/items?${params}`);
      setData(res.data);
      setTotal(res.total);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleActive = async () => {
    if (!deactivateItem) return;
    try {
      if (deactivateItem.active) {
        await api.delete(`/items/${deactivateItem.id}`);
      } else {
        // We might not have a way to restore soft-deleted items unless we do api.put
        await api.put(`/items/${deactivateItem.id}`, { active: true });
      }
      toast.success(deactivateItem.active ? 'Đã ngưng hoạt động' : 'Đã kích hoạt lại');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setDeactivateItem(null);
    }
  };

  const handleHardDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/items/${deleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn dữ liệu');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Không thể xóa');
    } finally {
      setDeleteItem(null);
    }
  };

  const filterOptions: FilterOption[] = [
    { key: 'glassType', label: 'Loại kính', options: Object.entries(GLASS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'color', label: 'Màu sắc', options: Object.entries(COLOR_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'active', label: 'Trạng thái', options: [{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Ngừng' }] },
  ];

  const columns: Column<Item>[] = [
    { key: 'code', label: 'Mã hàng', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'name', label: 'Tên hàng', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'glassType', label: 'Loại', render: (r) => <span className="text-xs">{GLASS_TYPE_LABELS[r.glassType] || r.glassType}</span> },
    { key: 'thickness', label: 'Dày (mm)', render: (r) => <span>{r.thickness}</span> },
    { key: 'color', label: 'Màu', render: (r) => <span className="text-xs">{COLOR_LABELS[r.color] || r.color}</span> },
    { key: 'standardSize', label: 'Quy cách', render: (r) => <span className="text-xs">{r.standardSize}</span> },
    { key: 'unit', label: 'ĐVT', render: (r) => <span>{UNIT_LABELS[r.unit] || r.unit}</span> },
    { key: 'unitPrice', label: 'Đơn giá', render: (r) => <span>{r.unitPrice?.toLocaleString('vi-VN') || '-'}</span> },
    { key: 'totalStock', label: 'Tồn TT', render: (r) => <span className="font-semibold">{r.totalStock}</span> },
    { key: 'active', label: 'Trạng thái', render: (r) => (
      <span className={`badge ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {r.active ? 'Hoạt động' : 'Ngừng'}
      </span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/items/${r.id}/edit`)} className="btn-icon" title="Sửa">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => setDeactivateItem(r)} className="btn-icon" title={r.active ? 'Ngưng' : 'Kích hoạt'}>
          <Power className={`w-4 h-4 ${r.active ? 'text-red-500' : 'text-emerald-500'}`} />
        </button>
        {isAdmin && (
          <button onClick={() => setDeleteItem(r)} className="btn-icon hover:bg-red-50" title="Xóa vĩnh viễn">
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Danh mục hàng hóa</h1>
        <button onClick={() => navigate('/items/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm theo mã, tên hàng..." />
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => { setFilters(prev => ({ ...prev, [k]: v })); setPage(1); }} onClearAll={() => setFilters({ glassType: '', color: '', active: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Chưa có hàng hóa nào"
        emptyDescription="Nhấn 'Thêm mới' để tạo danh mục hàng"
        emptyAction={<button onClick={() => navigate('/items/new')} className="btn-primary">Thêm hàng mới</button>}
        onRowClick={(row) => navigate(`/items/${row.id}/edit`)}
        keyExtractor={(row) => row.id}
        pagination={{ page, totalPages: Math.ceil(total / limit), total, limit, onPageChange: setPage, onLimitChange: (l) => { setLimit(l); setPage(1); } }}
      />

      <ConfirmDialog
        isOpen={!!deactivateItem}
        onClose={() => setDeactivateItem(null)}
        onConfirm={handleToggleActive}
        title={deactivateItem?.active ? 'Ngưng hoạt động?' : 'Kích hoạt lại?'}
        message={`Bạn muốn ${deactivateItem?.active ? 'ngưng' : 'kích hoạt lại'} hàng hóa "${deactivateItem?.name}"?`}
        variant={deactivateItem?.active ? 'warning' : 'info'}
        confirmText={deactivateItem?.active ? 'Ngưng' : 'Kích hoạt'}
      />

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleHardDelete}
        title="Xóa vĩnh viễn?"
        message={`Bạn có chắc muốn xóa vĩnh viễn "${deleteItem?.name}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
