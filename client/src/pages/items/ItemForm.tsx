import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { api } from '../../api/client';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Item, Supplier } from '../../types';
import { GLASS_TYPE_LABELS, COLOR_LABELS, UNIT_LABELS, CONDITION_LABELS } from '../../types';
import StatusBadge from '../../components/shared/StatusBadge';
import toast from 'react-hot-toast';

interface ItemFormData {
  code: string;
  name: string;
  glassType: string;
  thickness: number | '';
  color: string;
  size: string; // Keep size as a UI state, but backend uses standardSize
  lengthMm: number | '';
  widthMm: number | '';
  areaM2: number | '';
  unit: string;
  unitPrice: number | '';
  minStock: number | '';
  supplierId: number | string | '';
  note: string;
  active: boolean;
}

const initialForm: ItemFormData = {
  code: '', name: '', glassType: '', thickness: '', color: '', size: '',
  lengthMm: '', widthMm: '', areaM2: '', unit: 'tam',
  unitPrice: '', minStock: '', supplierId: '', note: '', active: true,
};

export default function ItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState<ItemFormData>(initialForm);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inventoryData, setInventoryData] = useState<any[]>([]);

  useEffect(() => {
    loadSuppliers();
    if (isEdit) {
      loadItem();
      loadInventory();
    }
  }, [id]);

  const loadInventory = async () => {
    try {
      const res: any = await api.get(`/inventory?search=&page=1&limit=100`);
      const allInv = res.data?.data || res.data || [];
      const filtered = allInv.filter((inv: any) => {
        const productId = inv.productId || inv.item?.id || inv.product?.id;
        return productId === id;
      });
      setInventoryData(filtered);
    } catch { /* empty */ }
  };

  const handleInventoryStatusChange = async (invId: string, newStatus: string) => {
    try {
      await api.post(`/inventory/${invId}/status`, { status: newStatus });
      toast.success('Đã cập nhật tình trạng');
      loadInventory();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật tình trạng');
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get<{ data: Supplier[] }>('/suppliers?limit=100');
      setSuppliers(res.data);
    } catch { /* empty */ }
  };

  const loadItem = async () => {
    try {
      const res = await api.get<{data: Item}>(`/products/${id}`);
      const item = res.data;
      setForm({
        code: item.code, name: item.name, glassType: item.glassType,
        thickness: item.thickness, color: item.color, size: item.standardSize || '',
        lengthMm: item.lengthMm || '', widthMm: item.widthMm || '',
        areaM2: item.areaM2 || '', unit: item.unit,
        unitPrice: item.unitPrice || '', minStock: item.minStock || '',
        supplierId: item.supplierId || '', note: item.note || '',
        active: item.active !== false,
      });
    } catch (err: unknown) {
      toast.error('Không thể tải thông tin hàng hóa');
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: keyof ItemFormData, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-calc area
      if ((key === 'lengthMm' || key === 'widthMm') && next.lengthMm && next.widthMm) {
        next.areaM2 = Math.round((Number(next.lengthMm) * Number(next.widthMm)) / 1000000 * 10000) / 10000;
      }
      // Auto-calc size
      if (key === 'lengthMm' || key === 'widthMm') {
        if (next.lengthMm && next.widthMm) {
          next.size = `${next.lengthMm}x${next.widthMm}`;
        }
      }
      // Auto-generate code
      if (['glassType', 'thickness', 'color', 'size'].includes(key)) {
        const typeMap: Record<string, string> = {
          kinh_thuong: 'KT', kinh_cuong_luc: 'KCL', kinh_dan: 'KD', kinh_hop: 'KH',
          kinh_phan_quang: 'KPQ', kinh_mau: 'KM', kinh_low_e: 'KLE', kinh_phao: 'KP'
        };
        const colorMap: Record<string, string> = {
          trong_suot: 'TR', xanh_la: 'XL', xanh_duong: 'XD', trang_sua: 'TS',
          den: 'DEN', xam: 'XAM', nau: 'NAU', vang: 'VANG', hong: 'HONG'
        };
        
        const typeCode = typeMap[next.glassType] || (next.glassType || '').substring(0, 3).toUpperCase();
        const thCode = next.thickness ? `${next.thickness}` : '';
        const colorCode = colorMap[next.color] || (next.color || '').substring(0, 3).toUpperCase();
        
        if (typeCode && thCode && colorCode) {
          next.code = `DAFA-${typeCode}-${thCode}-${colorCode}-${next.size || ''}`.replace(/--+/g, '-').replace(/-$/g, '');
        }
      }
      return next;
    });
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'Vui lòng nhập tên hàng';
    if (!form.glassType) errs.glassType = 'Vui lòng chọn loại kính';
    if (!form.thickness) errs.thickness = 'Vui lòng nhập độ dày';
    if (!form.color) errs.color = 'Vui lòng chọn màu';
    if (!form.unit) errs.unit = 'Vui lòng chọn đơn vị';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        standardSize: form.size, // Map to backend
        thickness: Number(form.thickness),
        lengthMm: form.lengthMm ? Number(form.lengthMm) : null,
        widthMm: form.widthMm ? Number(form.widthMm) : null,
        areaM2: form.areaM2 ? Number(form.areaM2) : null,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        minStock: form.minStock ? Number(form.minStock) : null,
        supplierId: form.supplierId || null,
        active: form.active,
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/products', payload);
        toast.success('Tạo hàng hóa thành công!');
      }
      navigate('/items');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/items')} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="page-title">{isEdit ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}</h1>
      </div>

      <div className="card">
        <div className="card-body space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Mã hàng</label>
              <input value={form.code} onChange={(e) => updateField('code', e.target.value)} className="input-field bg-surface-50" placeholder="Tự động tạo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Tên hàng <span className="text-red-500">*</span>
              </label>
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="Nhập tên hàng hóa" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Loại kính <span className="text-red-500">*</span>
              </label>
              <select value={form.glassType} onChange={(e) => updateField('glassType', e.target.value)} className={`select-field ${errors.glassType ? 'border-red-400' : ''}`}>
                <option value="">-- Chọn loại --</option>
                {Object.entries(GLASS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {errors.glassType && <p className="text-xs text-red-500 mt-1">{errors.glassType}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Độ dày (mm) <span className="text-red-500">*</span>
              </label>
              <input type="number" step="0.1" value={form.thickness} onChange={(e) => updateField('thickness', e.target.value)} className={`input-field ${errors.thickness ? 'border-red-400' : ''}`} placeholder="VD: 5, 8, 10" />
              {errors.thickness && <p className="text-xs text-red-500 mt-1">{errors.thickness}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Màu sắc <span className="text-red-500">*</span>
              </label>
              <select value={form.color} onChange={(e) => updateField('color', e.target.value)} className={`select-field ${errors.color ? 'border-red-400' : ''}`}>
                <option value="">-- Chọn màu --</option>
                {Object.entries(COLOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {errors.color && <p className="text-xs text-red-500 mt-1">{errors.color}</p>}
            </div>
          </div>

          {/* Row 3 - Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Chiều dài (mm)</label>
              <input type="number" value={form.lengthMm} onChange={(e) => updateField('lengthMm', e.target.value)} className="input-field" placeholder="mm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Chiều rộng (mm)</label>
              <input type="number" value={form.widthMm} onChange={(e) => updateField('widthMm', e.target.value)} className="input-field" placeholder="mm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Diện tích (m²)</label>
              <input type="number" value={form.areaM2} readOnly className="input-field bg-surface-50" placeholder="Tự tính" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Quy cách</label>
              <input value={form.size} onChange={(e) => updateField('size', e.target.value)} className="input-field" placeholder="VD: 2440x1830" />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Đơn vị tính <span className="text-red-500">*</span>
              </label>
              <select value={form.unit} onChange={(e) => updateField('unit', e.target.value)} className={`select-field ${errors.unit ? 'border-red-400' : ''}`}>
                {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Đơn giá (VNĐ)</label>
              <input type="number" value={form.unitPrice} onChange={(e) => updateField('unitPrice', e.target.value)} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Tồn tối thiểu</label>
              <input type="number" value={form.minStock} onChange={(e) => updateField('minStock', e.target.value)} className="input-field" placeholder="0" />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">NCC mặc định</label>
              <select value={form.supplierId} onChange={(e) => updateField('supplierId', e.target.value)} className="select-field">
                <option value="">-- Chọn NCC --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
              <textarea value={form.note} onChange={(e) => updateField('note', e.target.value)} className="input-field" rows={2} placeholder="Ghi chú..." />
            </div>
          </div>

          {/* Row 6 */}
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm(p => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 text-brand-600 rounded border-surface-300 focus:ring-brand-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-surface-700">
                Mặt hàng đang kinh doanh (hoạt động)
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={() => navigate('/items')} className="btn-secondary">Hủy</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>

      {/* Inventory Status Section */}
      {isEdit && inventoryData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-surface-900">Tồn kho & Tình trạng</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-surface-600 font-medium">
                  <th className="px-4 py-3 text-left">Vị trí</th>
                  <th className="px-4 py-3 text-center">Số lượng</th>
                  <th className="px-4 py-3 text-left">Tình trạng hiện tại</th>
                  <th className="px-4 py-3 text-left">Đổi tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {inventoryData.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">
                      <span className="badge bg-surface-100 text-surface-700">{inv.location?.code || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{inv.quantity}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status || inv.condition} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status || inv.condition || ''}
                        onChange={(e) => handleInventoryStatusChange(inv.id, e.target.value)}
                        className="select-field py-1.5 px-2 text-sm w-40"
                      >
                        {Object.entries(CONDITION_LABELS)
                          .filter(([key]) => key !== 'loi_vo')
                          .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
