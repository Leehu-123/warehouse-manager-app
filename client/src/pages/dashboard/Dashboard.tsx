import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Package, Box, AlertTriangle, Layers, TrendingUp, TrendingDown,
  ArrowRightLeft, Settings, ClipboardList, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DashboardStats, Item } from '../../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<{ data: DashboardStats }>('/inventory/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-6">Đang tải dữ liệu tổng quan...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Không thể tải dữ liệu. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Tổng quan kho hàng</h1>
          <p className="text-sm text-surface-500 mt-1">Cập nhật lúc {format(new Date(), 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 mb-1">Mặt hàng quản lý</p>
            <h3 className="text-2xl font-bold text-surface-900">{stats.totalSKUs.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 mb-1">Tổng tồn kho (tấm/kiện)</p>
            <h3 className="text-2xl font-bold text-surface-900">{stats.totalQuantity.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 mb-1">Tổng diện tích</p>
            <h3 className="text-2xl font-bold text-surface-900">{stats.totalAreaM2.toLocaleString()} <span className="text-base font-medium text-surface-500">m²</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 mb-1">Thành phẩm & Lỗi vỡ</p>
            <h3 className="text-2xl font-bold text-surface-900">
              <span className="text-emerald-600" title="Thành phẩm">{stats.finishedProducts}</span> 
              <span className="text-surface-300 mx-1">/</span> 
              <span className="text-red-500" title="Lỗi vỡ">{stats.damagedItems}</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Grid for Alerts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Alerts & Low Stock */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-base font-semibold text-surface-900">Cảnh báo tồn kho</h2>
            </div>
            <div className="p-5">
              {stats.lowStockCount === 0 ? (
                <div className="text-center py-6 text-surface-500">
                  <CheckCircleIcon className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                  <p>Tồn kho ở mức an toàn.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 border border-red-100 flex gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>Có <strong>{stats.lowStockCount}</strong> mặt hàng dưới định mức tối thiểu cần nhập hàng.</p>
                  </div>
                  <div className="space-y-2">
                    {stats.lowStockItems?.map((item: Item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 hover:bg-surface-50 rounded-lg transition-colors border border-surface-100">
                        <div>
                          <p className="text-sm font-medium text-surface-900 line-clamp-1" title={item.name}>{item.code}</p>
                          <p className="text-xs text-surface-500 mt-0.5">Tối thiểu: {item.minStock}</p>
                        </div>
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {item.totalStock} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-base font-semibold text-surface-900">Hàng chậm luân chuyển (&ge; 60 ngày)</h2>
            </div>
            <div className="p-5">
              {stats.slowMovingCount === 0 ? (
                <div className="text-center py-6 text-surface-500">
                  <CheckCircleIcon className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                  <p>Không có hàng hóa nào nằm kho quá lâu.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm mb-4 border border-amber-100 flex gap-2">
                    <Clock className="w-5 h-5 shrink-0" />
                    <p>Có <strong>{stats.slowMovingCount}</strong> mặt hàng chưa được xuất đi trong 60 ngày qua.</p>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {stats.slowMovingItems?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 hover:bg-surface-50 rounded-lg transition-colors border border-surface-100">
                        <div>
                          <p className="text-sm font-medium text-surface-900 line-clamp-1" title={item.name}>{item.code}</p>
                          <p className="text-xs text-amber-600 font-medium mt-0.5">
                            Đã nằm kho {item.daysInStock} ngày
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 text-surface-700">
                          {item.currentStock} {item.unit || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-base font-semibold text-surface-900">Công việc chờ duyệt</h2>
            </div>
            <div className="p-2">
              <ul className="divide-y divide-surface-100">
                <li className="p-3 flex justify-between items-center hover:bg-surface-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-surface-700">Phiếu nhập kho</span>
                  </div>
                  <span className="badge bg-surface-100 text-surface-700">{stats.pendingReceipts}</span>
                </li>
                <li className="p-3 flex justify-between items-center hover:bg-surface-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-surface-700">Phiếu xuất kho</span>
                  </div>
                  <span className="badge bg-surface-100 text-surface-700">{stats.pendingIssues}</span>
                </li>
                <li className="p-3 flex justify-between items-center hover:bg-surface-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium text-surface-700">Lệnh gia công</span>
                  </div>
                  <span className="badge bg-surface-100 text-surface-700">{stats.pendingProcessing}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-surface-100 bg-surface-50/50 flex justify-between items-center">
              <h2 className="text-base font-semibold text-surface-900">Biến động tồn kho gần đây</h2>
              <span className="text-xs text-surface-500 flex items-center gap-1"><ClipboardList className="w-4 h-4"/> 10 bản ghi mới nhất</span>
            </div>
            
            {!stats.recentMovements || stats.recentMovements.length === 0 ? (
              <div className="p-8 text-center text-surface-500">Chưa có giao dịch nhập/xuất nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-surface-600">
                  <thead className="text-xs uppercase bg-surface-50 text-surface-500 border-b border-surface-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Thời gian</th>
                      <th className="px-4 py-3 font-medium">Hành động</th>
                      <th className="px-4 py-3 font-medium">Mặt hàng</th>
                      <th className="px-4 py-3 font-medium text-right">SL</th>
                      <th className="px-4 py-3 font-medium">Thực hiện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {stats.recentMovements?.map((mov: any) => {
                      const isPositive = mov.type.includes('nhap');
                      const isNegative = mov.type.includes('xuat') || mov.type === 'huy';
                      return (
                        <tr key={mov.id} className="hover:bg-surface-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {format(new Date(mov.createdAt), 'dd/MM HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${
                              isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              isNegative ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : isNegative ? <TrendingDown className="w-3.5 h-3.5" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                              {mov.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-surface-900">{mov.item.code}</div>
                            <div className="text-xs text-surface-500 line-clamp-1" title={mov.item.name}>{mov.item.name}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            <span className={isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-amber-600'}>
                              {isPositive ? '+' : isNegative ? '-' : ''}{Math.abs(mov.quantity)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                            {mov.user?.fullName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
