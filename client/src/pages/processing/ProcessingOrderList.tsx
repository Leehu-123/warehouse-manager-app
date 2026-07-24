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
import { PROCESS_TYPE_LABELS, PROCESSING_STATUS_LABELS } from '../../types';
import type { ProcessingOrder, PaginatedResponse } from '../../types';

export default function ProcessingOrderList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState<ProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({
    processType: '', status: '',
  });
  const [hardDeleteItem, setHardDeleteItem] = useState<ProcessingOrder | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res: any = await api.get<PaginatedResponse<ProcessingOrder>>(`/processing-orders?${params}`);
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
      let data: any[] = [];
      let currentPage = 1;
      const limit = 100;
      while (true) {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(limit));
        if (typeof search !== 'undefined' && search) params.set('search', search);
        Object.entries(filters).forEach(([k, v]) => { 
          if (v) {
             if (k === 'condition') params.set('status', v as string);
             else params.set(k, v as string);
          }
        });
        const queryString = params.toString();
        const res: any = await api.get(`/processing-orders?${queryString}`);
        const pageData = res.data || res.items || [];
        if (!Array.isArray(pageData) || !pageData.length) break;
        data = data.concat(pageData);
        if (pageData.length < limit || (res.total && data.length >= res.total)) break;
        currentPage++;
      }
      if (!data.length) { alert('Không có dữ liệu để xuất'); return; }
      const headers = ['Mã Lệnh', 'Ngày tạo', 'Ngày dự kiến', 'Loại gia công', 'Khách hàng', 'Dự án', 'Trạng thái', 'Ghi chú'];
      const rows = data.map((item: any) => [
         item.code || '',
         new Date(item.date || item.createdAt).toLocaleDateString('vi-VN'),
         item.expectedDate ? new Date(item.expectedDate).toLocaleDateString('vi-VN') : '',
         item.type || '',
         item.customer?.name || '',
         item.projectName || '',
         item.status || '',
         item.note || ''
      ].map(v => `"${v}"`));
      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'processing_orders.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e) { alert('Lỗi khi xuất file'); }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteItem) return;
    try {
      await api.delete(`/processing-orders/${hardDeleteItem.id}/hard`);
      toast.success('Đã xóa vĩnh viễn');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Có lỗi xảy ra');
    } finally {
      setHardDeleteItem(null);
    }
  };

  const filterOptions: FilterOption[] = [
    { key: 'processType', label: 'Loại gia công', options: Object.entries(PROCESS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'status', label: 'Trạng thái', options: Object.entries(PROCESSING_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  ];

  const columns: Column<ProcessingOrder>[] = [
    { key: 'code', label: 'Mã lệnh', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'date', label: 'Ngày tạo', render: (r) => <span>{format(new Date(r.date || r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span> },
    { key: 'processType', label: 'Loại gia công', render: (r) => <span>{PROCESS_TYPE_LABELS[r.processType] || r.processType}</span> },
    { key: 'customer', label: 'Khách hàng', render: (r) => <span>{r.customer?.name || r.requestedBy || '-'}</span> },
    { key: 'creator', label: 'Người tạo', render: (r) => <span>{r.createdUser?.fullName || '-'}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/processing-orders/${r.id}/edit`)} className="btn-icon" title="Sửa/Xem">
          <Edit2 className="w-4 h-4" />
        </button>
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
        <h1 className="page-title">Lệnh gia công</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={() => navigate('/processing-orders/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tạo Lệnh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm theo mã, khách hàng..." />
        <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onClearAll={() => setFilters({ processType: '', status: '' })} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Không có dữ liệu lệnh gia công"
        onRowClick={(row) => navigate(`/processing-orders/${row.id}/edit`)}
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
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn lệnh "${hardDeleteItem?.code}"? Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
}
