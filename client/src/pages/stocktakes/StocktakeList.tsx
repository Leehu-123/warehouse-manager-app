import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import DataTable, { type Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import type { Stocktake, PaginatedResponse } from '../../types';

export default function StocktakeList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Stocktake[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Stocktake>>(`/stocktakes?page=${page}&limit=${limit}`);
      setData(res.data);
      setTotal(res.total);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { loadData(); }, [loadData]);

  const columns: Column<Stocktake>[] = [
    { key: 'code', label: 'Mã phiếu', render: (r) => <span className="font-medium text-brand-600">{r.code}</span> },
    { key: 'stocktakeDate', label: 'Ngày kiểm kê', render: (r) => <span>{format(new Date(r.date || r.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span> },
    { key: 'creator', label: 'Người tạo', render: (r) => <span>{r.creator?.fullName || '-'}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => navigate(`/stocktakes/${r.id}/edit`)} className="btn-icon" title="Sửa/Xem">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Phiếu kiểm kê</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/stocktakes/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tạo Phiếu Kiểm Kê
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Không có dữ liệu phiếu kiểm kê"
        onRowClick={(row) => navigate(`/stocktakes/${row.id}/edit`)}
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
    </div>
  );
}
