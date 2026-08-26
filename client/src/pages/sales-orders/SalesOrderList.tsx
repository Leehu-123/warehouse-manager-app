import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, Calendar, User } from 'lucide-react';
import { api } from '../../api/client';
import DataTable, { type Column } from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import type { PaginatedResponse } from '../../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SalesOrderWarehouse {
  id: string;
  code: string;
  status: string;
  projectName?: string;
  expectedDeliveryDate?: string;
  signedDate?: string;
  notes?: string;
  createdAt: string;
  customer?: { id: string; name: string; phone?: string };
  assignedTo?: { id: string; fullName: string };
  _count?: { items: number };
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  DEBT_TRACKING: 'Theo dõi công nợ',
  COMPLETED: 'Hoàn thành',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  DELIVERING: 'bg-amber-100 text-amber-800',
  DEBT_TRACKING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function SalesOrderList() {
  const navigate = useNavigate();
  const [data, setData] = useState<SalesOrderWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({ status: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await api.get<any>(`/orders/warehouse?${params}`);
      const items = res?.data || [];
      setData(Array.isArray(items) ? items : []);
      setTotal(res?.meta?.total || res?.total || 0);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Trạng thái',
      options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
    },
  ];

  const columns: Column<SalesOrderWarehouse>[] = [
    {
      key: 'code',
      label: 'Mã đơn',
      render: (r) => <span className="font-semibold text-brand-600">{r.code}</span>,
    },
    {
      key: 'customer',
      label: 'Khách hàng',
      render: (r) => (
        <div>
          <p className="font-medium text-surface-900">{r.customer?.name || '-'}</p>
          {r.projectName && <p className="text-xs text-surface-500 mt-0.5">{r.projectName}</p>}
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Mặt hàng',
      render: (r) => <span className="text-sm">{r._count?.items || 0} loại</span>,
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Ngày hẹn giao',
      render: (r) => (
        <span className="text-sm">
          {r.expectedDeliveryDate
            ? format(new Date(r.expectedDeliveryDate), 'dd/MM/yyyy', { locale: vi })
            : '-'}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'NV phụ trách',
      render: (r) => <span className="text-sm">{r.assignedTo?.fullName || '-'}</span>,
    },
    {
      key: 'createdAt',
      label: 'Ngày tạo',
      render: (r) => (
        <span className="text-sm text-surface-500">
          {format(new Date(r.createdAt), 'dd/MM/yyyy', { locale: vi })}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (r) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-surface-100 text-surface-800'}`}>
          {STATUS_LABELS[r.status] || r.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/sales-orders/${r.id}`)}
            className="btn-icon text-brand-600"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-500" />
            Đơn hàng
          </h1>
          <p className="text-sm text-surface-500 mt-1">Đơn hàng từ bộ phận kinh doanh — Chuẩn bị hàng hóa để xuất kho</p>
        </div>
      </div>

      <div className="space-y-3">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Tìm theo mã đơn, tên khách hàng, công trình..."
        />
        <FilterBar
          filters={filterOptions}
          values={filters}
          onChange={(k, v) => { setFilters((prev) => ({ ...prev, [k]: v })); setPage(1); }}
          onClearAll={() => setFilters({ status: '' })}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Chưa có đơn hàng nào"
        emptyDescription="Đơn hàng sẽ hiển thị tại đây khi bộ phận kinh doanh xác nhận đơn trên App Sale"
        emptyAction={
          <div className="flex items-center gap-2 text-surface-400">
            <ShoppingCart className="w-5 h-5" />
            <span>Chờ đơn hàng mới...</span>
          </div>
        }
        onRowClick={(row) => navigate(`/sales-orders/${row.id}`)}
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
