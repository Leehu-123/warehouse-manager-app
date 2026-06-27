import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Power, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import DataTable, { type Column } from '../../components/shared/DataTable';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { ZONE_LABELS } from '../../types';
import type { Location } from '../../types';

export default function LocationList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({
    zone: '', active: '',
  });
  const [deactivateItem, setDeactivateItem] = useState<Location | null>(null);
  const [deleteItem, setDeleteItem] = useState<Location | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<{ data: Location[] }>(`/locations?${params}`);
      setData(res.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleActive = async () => {
    if (!deactivateItem) return;
    try {
      if (deactivateItem.active) {
        await api.delete(`/locations/${deactivateItem.id}`);
      } else {
        await api.put(`/locations/${deactivateItem.id}`, { active: true });
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
      await api.delete(`/locations/${deleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn dữ liệu');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Không thể xóa');
    } finally {
      setDeleteItem(null);
    }
  };

  const filterOptions: FilterOption[] = [
    { key: 'zone', label: 'Khu vực', options: Object.entries(ZONE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'active', label: 'Trạng thái', options: [{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Ngừng' }] },
  ];

  const columns: Column<Location>[] = [
    { key: 'code', label: 'Mã vị trí', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'name', label: 'Tên vị trí', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'zone', label: 'Khu vực', render: (r) => <span>{ZONE_LABELS[r.zone] || r.zone}</span> },
    { key: 'description', label: 'Mô tả', render: (r) => <span className="text-sm text-surface-500">{r.description || '-'}</span> },
    { key: 'active', label: 'Trạng thái', render: (r) => (
      <span className={`badge ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {r.active ? 'Hoạt động' : 'Ngừng'}
      </span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/locations/${r.id}/edit`)} className="btn-icon" title="Sửa">
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
        <h1 className="page-title">Danh sách Vị trí kho</h1>
        <button onClick={() => navigate('/locations/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm vị trí
        </button>
      </div>

      <div className="space-y-3">
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onClearAll={() => setFilters({ zone: '', active: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Không có dữ liệu vị trí kho"
        onRowClick={(row) => navigate(`/locations/${row.id}/edit`)}
        keyExtractor={(row) => row.id}
      />

      <ConfirmDialog
        isOpen={!!deactivateItem}
        onClose={() => setDeactivateItem(null)}
        onConfirm={handleToggleActive}
        title={deactivateItem?.active ? 'Ngưng hoạt động?' : 'Kích hoạt lại?'}
        message={`Bạn muốn ${deactivateItem?.active ? 'ngưng' : 'kích hoạt lại'} vị trí "${deactivateItem?.name}"?`}
        variant={deactivateItem?.active ? 'warning' : 'info'}
        confirmText={deactivateItem?.active ? 'Ngưng' : 'Kích hoạt'}
      />

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleHardDelete}
        title="Xóa vĩnh viễn?"
        message={`Bạn có chắc muốn xóa vĩnh viễn vị trí "${deleteItem?.name}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
