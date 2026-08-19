import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Download, AlertTriangle, X } from 'lucide-react';
import { api } from '../../api/client';
import DataTable, { type Column } from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar, { type FilterOption } from '../../components/shared/FilterBar';
import StatusBadge from '../../components/shared/StatusBadge';
import type { Inventory, PaginatedResponse } from '../../types';
import { GLASS_TYPE_LABELS, COLOR_LABELS, CONDITION_LABELS, ZONE_LABELS } from '../../types';
import TransferModal from '../../components/inventory/TransferModal';
import { ArrowRightLeft } from 'lucide-react';

export default function InventoryList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Record<string, string>>({
    glassType: searchParams.get('glassType') || '',
    color: searchParams.get('color') || '',
    condition: searchParams.get('condition') || '',
    locationId: searchParams.get('locationId') || '',
  });
  
  const [locations, setLocations] = useState<any[]>([]);
  useEffect(() => {
    api.get('/locations').then((res: any) => setLocations(res.data || res)).catch(() => {});
  }, []);
  const [transferItem, setTransferItem] = useState<Inventory | null>(null);
  
  // Status change modal state
  const [statusModal, setStatusModal] = useState<{ item: any; isOpen: boolean }>({ item: null, isOpen: false });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { 
        if (v) {
          if (k === 'condition') params.set('status', v as string);
          else params.set(k, v as string);
        }
      });

      const res: any = await api.get<PaginatedResponse<Inventory>>(`/inventory?${params}`);
      setData(res.data.data || res.data);
      setTotal(res.data.meta?.totalItems || res.data.length || 0);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Lỗi khi tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.post(`/inventory/${id}/status`, { status: newStatus });
      toast.success('Đã cập nhật tình trạng');
      setStatusModal({ item: null, isOpen: false });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật tình trạng');
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ glassType: '', color: '', condition: '', locationId: '' });
    setPage(1);
  };

  const exportCSV = async () => {
    try {
      let exportData: any[] = [];
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
        const res: any = await api.get(`/inventory?${queryString}`);
        const pageData = res.data || res.items || res || [];
        if (!Array.isArray(pageData) || !pageData.length) break;
        exportData = exportData.concat(pageData);
        if (pageData.length < limit || (res.total && exportData.length >= res.total)) break;
        currentPage++;
      }
      if (!Array.isArray(exportData) || !exportData.length) {
        alert('Không có dữ liệu để xuất');
        return;
      }
      const headers = ['Mã SP', 'Tên SP', 'Loại kính', 'Màu sắc', 'Độ dày (mm)', 'Kích thước (mm)', 'Vị trí', 'Số lượng', 'Tình trạng'];
      const rows = exportData.map((item: any) => {
         const p = item.item || item.product || {};
         const loc = item.location || {};
         return [
           p.code || '',
           p.name || '',
           GLASS_TYPE_LABELS[p.glassType as keyof typeof GLASS_TYPE_LABELS] || p.glassType || '',
           COLOR_LABELS[p.color as keyof typeof COLOR_LABELS] || p.color || '',
           p.thickness || '',
           `${p.lengthMm || 0}x${p.widthMm || 0}`,
           loc.code || '',
           item.quantity || 0,
           CONDITION_LABELS[item.condition as keyof typeof CONDITION_LABELS] || item.condition || item.status || ''
         ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      });
      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'inventory.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch (e: any) { 
      console.error('CSV Export Error:', e);
      alert('Lỗi khi xuất file: ' + (e.message || 'Unknown error')); 
    }
  };

  const filterOptions: FilterOption[] = [
    { key: 'glassType', label: 'Loại kính', options: Object.entries(GLASS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'color', label: 'Màu sắc', options: Object.entries(COLOR_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'condition', label: 'Tình trạng', options: Object.entries(CONDITION_LABELS).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'locationId', label: 'Vị trí', options: locations.map(l => ({ value: String(l.id), label: l.code })) },
  ];

  const columns: Column<Inventory>[] = [
    { key: 'itemCode', label: 'Mã hàng', render: (r) => (
      <div>
        <p className="font-medium text-surface-900">{r.item?.code}</p>
        {r.item && r.item.totalStock <= (r.item.minStock || 0) && (
          <span className="inline-flex items-center gap-1 text-red-500 text-xs mt-0.5">
            <AlertTriangle className="w-3 h-3" /> Tồn thấp
          </span>
        )}
      </div>
    )},
    { key: 'itemName', label: 'Tên hàng', render: (r) => <span className="text-surface-700">{r.item?.name}</span> },
    { key: 'glassType', label: 'Loại', render: (r) => <span className="text-xs">{GLASS_TYPE_LABELS[r.item?.glassType || ''] || r.item?.glassType}</span> },
    { key: 'thickness', label: 'Dày', render: (r) => <span>{r.item?.thickness}mm</span> },
    { key: 'color', label: 'Màu', render: (r) => <span className="text-xs">{COLOR_LABELS[r.item?.color || ''] || r.item?.color}</span> },
    { key: 'standardSize', label: 'Quy cách', render: (r) => <span className="text-xs">{r.item?.standardSize}</span> },
    { key: 'quantity', label: 'SL tồn', render: (r) => <span className="font-semibold text-surface-900">{r.quantity}</span> },
    { key: 'totalArea', label: 'Tổng m²', render: (r) => <span>{r.totalAreaSqm?.toFixed(2) || '-'}</span> },
    { key: 'location', label: 'Vị trí', render: (r) => (
      <span className="badge bg-surface-100 text-surface-700">{r.location?.code || '-'}</span>
    )},
    { key: 'condition', label: 'Tình trạng', render: (r: any) => (
      <button
        onClick={(e) => { e.stopPropagation(); setStatusModal({ item: r, isOpen: true }); }}
        className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        title="Bấm để đổi tình trạng"
      >
        <StatusBadge status={r.status || r.condition} />
        <span className="text-surface-400 text-xs">✎</span>
      </button>
    ) },
    { key: 'batch', label: 'Lô', render: (r: any) => <span className="text-xs text-surface-500">{r.batchNumber || r.batch || '-'}</span> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex justify-end pr-2">
        <button
          onClick={(e) => { e.stopPropagation(); setTransferItem(r); }}
          className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          title="Chuyển vị trí nhanh"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Tồn kho hiện tại</h1>
        <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
          <Download className="w-4 h-4" /> Xuất CSV
        </button>
      </div>

      <div className="space-y-3">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Tìm theo mã hàng, tên hàng..."
        />
        <FilterBar
          filters={filterOptions}
          values={filters}
          onChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle="Không có dữ liệu tồn kho"
        emptyDescription="Hãy tạo phiếu nhập kho để bắt đầu"
        onRowClick={(row) => navigate(`/items/${row.itemId}/edit`)}
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

      <TransferModal
        isOpen={!!transferItem}
        onClose={() => setTransferItem(null)}
        onSuccess={loadData}
        inventory={transferItem}
      />

      {/* Status Change Modal */}
      {statusModal.isOpen && statusModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setStatusModal({ item: null, isOpen: false })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h3 className="text-lg font-semibold text-surface-900">Đổi tình trạng hàng hóa</h3>
              <button onClick={() => setStatusModal({ item: null, isOpen: false })} className="p-1 rounded-md hover:bg-surface-100">
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4 p-3 bg-surface-50 rounded-lg">
                <p className="text-sm text-surface-600">Mã hàng: <span className="font-semibold text-surface-900">{statusModal.item.item?.code || statusModal.item.product?.code}</span></p>
                <p className="text-sm text-surface-600">Tên: <span className="font-medium">{statusModal.item.item?.name || statusModal.item.product?.name}</span></p>
                <p className="text-sm text-surface-600">Vị trí: <span className="font-medium">{statusModal.item.location?.code || '-'}</span></p>
                <p className="text-sm text-surface-600 mt-1">Tình trạng hiện tại: <StatusBadge status={statusModal.item.status || statusModal.item.condition} /></p>
              </div>
              <p className="text-sm font-medium text-surface-700 mb-3">Chọn tình trạng mới:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CONDITION_LABELS)
                  .filter(([key]) => key !== 'loi_vo') // exclude alias
                  .map(([value, label]) => {
                  const currentStatus = statusModal.item.status || statusModal.item.condition;
                  const isActive = currentStatus === value;
                  return (
                    <button
                      key={value}
                      onClick={() => !isActive && handleStatusChange(statusModal.item.id, value)}
                      disabled={isActive}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-100 text-brand-700 border-2 border-brand-500 cursor-default'
                          : 'bg-surface-50 text-surface-700 border border-surface-200 hover:bg-surface-100 hover:border-surface-300'
                      }`}
                    >
                      {label}
                      {isActive && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-surface-100 flex justify-end">
              <button onClick={() => setStatusModal({ item: null, isOpen: false })} className="btn-secondary text-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
