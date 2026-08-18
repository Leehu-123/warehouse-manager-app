import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Boxes, Square, Truck, Settings, CheckCircle,
  AlertTriangle, TrendingDown, ArrowRight, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import StatusBadge from '../components/shared/StatusBadge';
import { MOVEMENT_TYPE_LABELS } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DashboardData {
  totalItems: number;
  totalStock: number;
  totalAreaSqm: number;
  pendingIssues: number;
  pendingProcessing: number;
  finishedGoods: number;
  damagedItems: number;
  lowStockAlerts: number;
  pendingApprovals: {
    receipts: number;
    issues: number;
    processing: number;
    damages: number;
    adjustments: number;
  };
  recentMovements: Array<{
    id: number;
    type: string;
    item?: { code: string; name: string };
    quantity: number;
    creator?: { fullName: string };
    createdAt: string;
  }>;
  stockByType: Array<{ type: string; quantity: number }>;
  stockByCondition: Array<{ condition: string; quantity: number }>;
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get<any>('/dashboard');
      const d = res?.data || res;
      setData({
        totalItems: d.totalItems ?? d.totalSKUs ?? 0,
        totalStock: d.totalStock ?? d.totalQuantity ?? 0,
        totalAreaSqm: d.totalAreaSqm ?? d.totalAreaM2 ?? 0,
        pendingIssues: d.pendingIssues ?? 0,
        pendingProcessing: d.pendingProcessing ?? 0,
        finishedGoods: d.finishedGoods ?? d.finishedProducts ?? 0,
        damagedItems: d.damagedItems ?? 0,
        lowStockAlerts: d.lowStockAlerts ?? d.lowStockCount ?? 0,
        pendingApprovals: d.pendingApprovals ?? {
          receipts: d.pendingReceipts ?? 0,
          issues: d.pendingIssues ?? 0,
          processing: d.pendingProcessing ?? 0,
          damages: 0,
          adjustments: 0,
        },
        recentMovements: (d.recentMovements || []).map((m: any) => ({
          ...m,
          item: m.product || m.item,
          creator: m.user || m.creator,
        })),
        stockByType: d.stockByType || [],
        stockByCondition: d.stockByCondition || [],
      });
    } catch {
      // Use defaults if API not available
      setData({
        totalItems: 0, totalStock: 0, totalAreaSqm: 0,
        pendingIssues: 0, pendingProcessing: 0, finishedGoods: 0,
        damagedItems: 0, lowStockAlerts: 0,
        pendingApprovals: { receipts: 0, issues: 0, processing: 0, damages: 0, adjustments: 0 },
        recentMovements: [], stockByType: [], stockByCondition: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const stats = [
    { label: 'Tổng mã hàng', value: data.totalItems, icon: <Package className="w-6 h-6" />, color: 'text-blue-600 bg-blue-50', path: '/items' },
    { label: 'Tổng tồn kho', value: data.totalStock, icon: <Boxes className="w-6 h-6" />, color: 'text-emerald-600 bg-emerald-50', path: '/inventory' },
    { label: 'Tổng diện tích m²', value: Math.round(data.totalAreaSqm * 100) / 100, icon: <Square className="w-6 h-6" />, color: 'text-purple-600 bg-purple-50', path: '/inventory' },
    { label: 'Hàng chờ xuất', value: data.pendingIssues, icon: <Truck className="w-6 h-6" />, color: 'text-amber-600 bg-amber-50', path: '/goods-issues?status=cho_xuat' },
    { label: 'Chờ gia công', value: data.pendingProcessing, icon: <Settings className="w-6 h-6" />, color: 'text-orange-600 bg-orange-50', path: '/processing' },
    { label: 'Thành phẩm', value: data.finishedGoods, icon: <CheckCircle className="w-6 h-6" />, color: 'text-emerald-600 bg-emerald-50', path: '/inventory?condition=thanh_pham' },
    { label: 'Hàng lỗi/vỡ', value: data.damagedItems, icon: <AlertTriangle className="w-6 h-6" />, color: 'text-red-600 bg-red-50', path: '/inventory?condition=loi_vo' },
    { label: 'Cảnh báo tồn thấp', value: data.lowStockAlerts, icon: <TrendingDown className="w-6 h-6" />, color: 'text-red-600 bg-red-50', path: '/inventory?lowStock=true' },
  ];

  const totalPendingApprovals = Object.values(data.pendingApprovals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="page-title">
          Xin chào, {user?.fullName}! 👋
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Tổng quan hoạt động kho ngày {format(new Date(), 'dd/MM/yyyy', { locale: vi })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="stat-card text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-surface-900">{stat.value.toLocaleString('vi-VN')}</p>
            <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Pending Approvals */}
      {totalPendingApprovals > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Chờ duyệt ({totalPendingApprovals})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Phiếu nhập', count: data.pendingApprovals.receipts, path: '/goods-receipts?status=cho_duyet' },
              { label: 'Phiếu xuất', count: data.pendingApprovals.issues, path: '/goods-issues?status=cho_duyet' },
              { label: 'Gia công', count: data.pendingApprovals.processing, path: '/processing?status=cho_duyet' },
              { label: 'Hàng lỗi', count: data.pendingApprovals.damages, path: '/damage-reports?status=cho_duyet' },
              { label: 'Điều chỉnh', count: data.pendingApprovals.adjustments, path: '/adjustments?status=cho_duyet' },
            ].filter(a => a.count > 0).map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-center"
              >
                <p className="text-xl font-bold text-amber-700">{item.count}</p>
                <p className="text-xs text-amber-600">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.stockByType.length > 0 && (
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Tồn kho theo loại kính</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stockByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="type" fontSize={12} tick={{ fill: '#868e96' }} />
                <YAxis fontSize={12} tick={{ fill: '#868e96' }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#A0522D" radius={[4, 4, 0, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.stockByCondition.length > 0 && (
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Phân bổ tình trạng</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.stockByCondition}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="quantity"
                  nameKey="condition"
                  label={({ condition, percent }) => `${condition} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.stockByCondition.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Movements */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900">Hoạt động gần đây</h2>
          <button onClick={() => navigate('/audit-log')} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            Xem tất cả →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Loại</th>
                <th className="px-4 py-3 text-left">Mã hàng</th>
                <th className="px-4 py-3 text-left">Số lượng</th>
                <th className="px-4 py-3 text-left">Người thực hiện</th>
                <th className="px-4 py-3 text-left">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data.recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-surface-500 text-sm">
                    Chưa có hoạt động nào
                  </td>
                </tr>
              ) : (
                data.recentMovements.slice(0, 20).map((m) => (
                  <tr key={m.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3">
                      <StatusBadge status={m.type} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {m.item?.code || '-'}
                      <span className="block text-xs text-surface-500">{m.item?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {m.type.includes('xuat') ? `-${m.quantity}` : `+${m.quantity}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600">{m.creator?.fullName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-surface-500">
                      {format(new Date(m.createdAt), 'HH:mm dd/MM', { locale: vi })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
