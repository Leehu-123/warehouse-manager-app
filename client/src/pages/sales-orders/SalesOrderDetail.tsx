import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, FileOutput, User, MapPin, Phone, Calendar, Package, Layers } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SalesOrderItemWarehouse {
  id: string;
  productId?: string;
  description: string;
  specification?: string;
  thickness?: string;
  length?: number;
  width?: number;
  area?: number;
  quantity: number;
  unit?: string;
  sortOrder: number;
  product?: {
    id: string; code: string; name: string;
    glassType: string; unit: string;
    standardSize?: string; piecesPerPack?: number;
    thickness?: number; color?: string;
  };
}

interface SalesOrderDetail {
  id: string;
  code: string;
  status: string;
  projectName?: string;
  expectedDeliveryDate?: string;
  signedDate?: string;
  notes?: string;
  createdAt: string;
  customer?: { id: string; name: string; phone?: string; address?: string };
  assignedTo?: { id: string; fullName: string };
  items: SalesOrderItemWarehouse[];
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

const GLASS_TYPE_LABELS: Record<string, string> = {
  kinh_thuong: 'Kính thường',
  kinh_cuong_luc: 'Kính cường lực',
  kinh_dan: 'Kính dán',
  kinh_phan_quang: 'Kính phản quang',
  kinh_low_e: 'Kính Low-E',
  kinh_hop: 'Kính hộp',
  khac: 'Khác',
};

const UNIT_LABELS: Record<string, string> = {
  tam: 'Tấm', kien: 'Kiện', m2: 'm²', cai: 'Cái', kg: 'kg', met: 'Mét', bo: 'Kiện',
};

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<any>(`/orders/warehouse/${id}`);
      setOrder(res?.data || res);
    } catch (err: any) {
      toast.error('Không thể tải thông tin đơn hàng');
      navigate('/sales-orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleCreateGoodsIssue = () => {
    if (!order) return;

    const prefill = {
      issueType: 'ban_hang',
      customerId: order.customer?.id || '',
      projectName: order.projectName || '',
      receiverName: order.customer?.name || '',
      note: `Xuất theo đơn hàng ${order.code}`,
      lines: order.items
        .filter((item) => item.productId)
        .map((item) => ({
          itemId: item.productId,
          requestedQty: item.quantity || 1,
          condition: 'tot',
        })),
    };

    navigate('/goods-issues/new', { state: { prefill } });
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sales-orders')} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-brand-500" />
              Đơn hàng {order.code}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-surface-100 text-surface-800'}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
              <span className="text-sm text-surface-500">
                Tạo lúc {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </span>
            </div>
          </div>
        </div>

        {['CONFIRMED', 'DELIVERING'].includes(order.status) && (
          <button
            onClick={handleCreateGoodsIssue}
            className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <FileOutput className="w-4 h-4" />
            Tạo phiếu xuất kho
          </button>
        )}
      </div>

      {/* Order Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-500" />
          Thông tin đơn hàng
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-surface-400 mt-0.5" />
              <div>
                <p className="text-xs text-surface-500">Khách hàng</p>
                <p className="font-medium text-surface-900">{order.customer?.name || '-'}</p>
              </div>
            </div>
            {order.customer?.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-surface-400 mt-0.5" />
                <div>
                  <p className="text-xs text-surface-500">Số điện thoại</p>
                  <p className="text-sm text-surface-900">{order.customer.phone}</p>
                </div>
              </div>
            )}
            {order.customer?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-surface-400 mt-0.5" />
                <div>
                  <p className="text-xs text-surface-500">Địa chỉ giao hàng</p>
                  <p className="text-sm text-surface-900">{order.customer.address}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {order.projectName && (
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-surface-400 mt-0.5" />
                <div>
                  <p className="text-xs text-surface-500">Công trình</p>
                  <p className="font-medium text-surface-900">{order.projectName}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-surface-400 mt-0.5" />
              <div>
                <p className="text-xs text-surface-500">Ngày hẹn giao</p>
                <p className="text-sm text-surface-900">
                  {order.expectedDeliveryDate
                    ? format(new Date(order.expectedDeliveryDate), 'dd/MM/yyyy', { locale: vi })
                    : 'Chưa xác định'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-surface-400 mt-0.5" />
              <div>
                <p className="text-xs text-surface-500">NV phụ trách</p>
                <p className="text-sm text-surface-900">{order.assignedTo?.fullName || '-'}</p>
              </div>
            </div>
          </div>
        </div>
        {order.notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1">Ghi chú đơn hàng:</p>
            <p className="text-sm text-amber-900">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            Hàng hóa cần chuẩn bị ({order.items.length} loại)
          </h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-surface-600 font-medium">
                <th className="px-4 py-3 text-left w-12">STT</th>
                <th className="px-4 py-3 text-left">Mã hàng</th>
                <th className="px-4 py-3 text-left">Tên sản phẩm</th>
                <th className="px-4 py-3 text-left">Loại kính</th>
                <th className="px-4 py-3 text-center">Độ dày</th>
                <th className="px-4 py-3 text-left">Quy cách</th>
                <th className="px-4 py-3 text-center">KT (R×D mm)</th>
                <th className="px-4 py-3 text-center">SL</th>
                <th className="px-4 py-3 text-center">ĐVT</th>
                <th className="px-4 py-3 text-center">Diện tích m²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {order.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-surface-500">
                    Đơn hàng chưa có hàng hóa
                  </td>
                </tr>
              ) : (
                order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 text-center text-surface-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-brand-600">
                        {item.product?.code || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-900">{item.product?.name || item.description}</p>
                      {item.specification && (
                        <p className="text-xs text-surface-500 mt-0.5">QC: {item.specification}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.product?.glassType ? (GLASS_TYPE_LABELS[item.product.glassType] || item.product.glassType) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.thickness || item.product?.thickness || '-'}
                      {(item.thickness || item.product?.thickness) ? 'mm' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.product?.standardSize && item.product.standardSize !== '-' ? item.product.standardSize : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.width && item.length ? `${item.width}×${item.length}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-surface-900 text-base">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {UNIT_LABELS[item.unit || item.product?.unit || ''] || item.unit || item.product?.unit || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.area ? item.area.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary & Actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/sales-orders')} className="btn-secondary">
          ← Quay lại danh sách
        </button>
        {['CONFIRMED', 'DELIVERING'].includes(order.status) && (
          <button
            onClick={handleCreateGoodsIssue}
            className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <FileOutput className="w-4 h-4" />
            Tạo phiếu xuất kho từ đơn này
          </button>
        )}
      </div>
    </div>
  );
}
