import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Download, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import DataTable, { type Column } from '../../components/shared/DataTable';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import SearchBar from '../../components/shared/SearchBar';
import StatusBadge from '../../components/shared/StatusBadge';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { DAMAGE_TYPE_LABELS, DAMAGE_STATUS_LABELS } from '../../types';
import type { DamageReport, PaginatedResponse } from '../../types';

export default function DamageReportList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({
    damageType: '', status: '',
  });
  const [hardDeleteItem, setHardDeleteItem] = useState<DamageReport | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res: any = await api.get<PaginatedResponse<DamageReport>>(`/damage-reports?${params}`);
      setData(res.data);
      setTotal(res.total);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportCSV = async () => {
    try {
      const allFilters = { ...filters, page: 1, limit: 100000 };
      const params = new URLSearchParams(allFilters as any).toString();
      const res: any = await api.get(`/damage-reports?${params}`);
      const data = res.data || res.items || [];
      if (!data.length) { alert('Không có dữ liệu để xuất'); return; }
      const headers = ['Mã Phiếu', 'Ngày báo cáo', 'Người báo cáo', 'Trạng thái', 'Ghi chú'];
      const rows = data.map((item: any) => [
         item.code || '',
         new Date(item.date || item.createdAt).toLocaleDateString('vi-VN'),
         item.reportedBy?.fullName || item.reportedBy?.username || '',
         item.status || '',
         item.note || ''
      ].map(v => `"${v}"`));
      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'damage_reports.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) { alert('Lỗi khi xuất file'); }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteItem) return;
    try {
      await api.delete(`/damage-reports/${hardDeleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn dữ liệu');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Không thể xóa');
    } finally {
      setHardDeleteItem(null);
    }
  };

  const filterOptions: FilterOption[] = [
    { key: 'damageType', label: 'Loại lỗi vỡ', options: Object.entries(DAMAGE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'status', label: 'Trạng thái', options: Object.entries(DAMAGE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  ];

  const columns: Column<DamageReport>[] = [
    { key: 'code', label: 'Mã BB', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'date', label: 'Ngày báo cáo', render: (r) => <span>{format(new Date(r.date || r.createdAt), 'dd/MM/yyyy', { locale: vi })}</span> },
    { key: 'item', label: 'Sản phẩm', render: (r) => <span>{r.item?.name || '-'}</span> },
    { key: 'quantity', label: 'Số lượng', render: (r) => <span className="font-medium text-red-600">{r.quantity}</span> },
    { key: 'damageType', label: 'Loại lỗi', render: (r) => <span>{DAMAGE_TYPE_LABELS[r.damageType] || r.damageType}</span> },
    { key: 'reporter', label: 'Người báo cáo', render: (r) => <span>{r.reporter?.fullName || '-'}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/damage-reports/${r.id}/edit`)} className="btn-icon" title="Sửa/Xem">
          <Edit2 className="w-4 h-4" />
        </button>
        {isAdmin && ['cho_xu_ly', 'huy'].includes(r.status) && (
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
        <h1 className="page-title">Báo cáo Lỗi / Vỡ</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={() => navigate('/damage-reports/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tạo Báo cáo
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm theo mã BB..." />
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onClearAll={() => setFilters({ damageType: '', status: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Không có dữ liệu báo cáo lỗi vỡ"
        onRowClick={(row) => navigate(`/damage-reports/${row.id}/edit`)}
        keyExtractor={(row) => row.id}
        pagination={{
          page,
          totalPages: Math.ceil(total / limit),
          total,
          limit,
          onPageChange: setPage,
          onLimitChange: (l) => { setLimit(l); setPage(1); },
        }}
      />

      <ConfirmDialog
        isOpen={!!hardDeleteItem}
        onClose={() => setHardDeleteItem(null)}
        onConfirm={handleHardDelete}
        title="Xóa vĩnh viễn"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn báo cáo "${hardDeleteItem?.code}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
