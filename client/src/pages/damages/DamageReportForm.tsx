import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { DAMAGE_TYPE_LABELS, HANDLING_PLAN_LABELS, DAMAGE_STATUS_LABELS } from '../../types';
import type { DamageReport, Item, Location } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function DamageReportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState<Partial<DamageReport>>({
    damageType: 'vo',
    handlingPlan: 'cho_xu_ly',
    status: 'cho_xu_ly',
    quantity: 1,
    reason: '',
    note: ''
  });

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [itemsRes, locsRes] = await Promise.all([
          api.get<{data: Item[]}>('/items?limit=1000'),
          api.get<{data: Location[]}>('/locations')
        ]);
        setItems(itemsRes.data);
        setLocations(locsRes.data);
      } catch {
        toast.error('Lỗi tải dữ liệu tham chiếu');
      }
    };

    const loadData = async () => {
      if (!isEdit) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<{data: DamageReport}>(`/damage-reports/${id}`);
        setForm(res.data);
      } catch {
        toast.error('Không thể tải báo cáo');
        navigate('/damage-reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReferences().then(loadData);
  }, [id, isEdit, navigate]);

  const updateField = (field: keyof DamageReport, value: any) => {
    setForm(p => ({ ...p, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.itemId || !form.locationId || !form.quantity) {
      toast.error('Vui lòng chọn vật tư, vị trí và nhập số lượng');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        itemId: Number(form.itemId),
        locationId: Number(form.locationId),
        quantity: Number(form.quantity)
      };

      if (isEdit) {
        await api.put(`/damage-reports/${id}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/damage-reports', payload);
        toast.success('Tạo báo cáo thành công');
      }
      navigate('/damage-reports');
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.post(`/damage-reports/${id}/approve`);
        toast.success('Đã duyệt báo cáo và trừ tồn kho');
      } else {
        await api.post(`/damage-reports/${id}/reject`);
        toast.success('Đã hủy báo cáo');
      }
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thao tác');
    }
  };

  if (loading) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/damage-reports')} className="p-2 hover:bg-surface-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
        <h1 className="page-title">{isEdit ? `Biên bản: ${form.code}` : 'Tạo Báo Cáo Lỗi / Vỡ'}</h1>
        {isEdit && (
          <span className={`ml-4 badge ${form.status === 'da_xu_ly' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
            {DAMAGE_STATUS_LABELS[form.status || ''] || form.status}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Vật tư / Sản phẩm <span className="text-red-500">*</span></label>
            <select value={form.itemId || ''} onChange={(e) => updateField('itemId', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="select-field">
              <option value="">-- Chọn vật tư --</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Vị trí phát hiện <span className="text-red-500">*</span></label>
            <select value={form.locationId || ''} onChange={(e) => updateField('locationId', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="select-field">
              <option value="">-- Chọn vị trí --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Số lượng lỗi <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={form.quantity || ''} onChange={(e) => updateField('quantity', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Loại lỗi <span className="text-red-500">*</span></label>
            <select value={form.damageType || ''} onChange={(e) => updateField('damageType', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="select-field">
              {Object.entries(DAMAGE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Hướng xử lý đề xuất <span className="text-red-500">*</span></label>
            <select value={form.handlingPlan || ''} onChange={(e) => updateField('handlingPlan', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="select-field">
              {Object.entries(HANDLING_PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Nguyên nhân cụ thể</label>
            <textarea value={form.reason || ''} onChange={(e) => updateField('reason', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="input-field" rows={2} placeholder="Nêu rõ nguyên nhân..." />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú thêm</label>
            <input type="text" value={form.note || ''} onChange={(e) => updateField('note', e.target.value)} disabled={form.status !== 'cho_xu_ly'} className="input-field" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-surface-200">
          {form.status === 'cho_xu_ly' && (
            <button onClick={handleSubmit} disabled={saving} className="btn-outline flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu báo cáo'}
            </button>
          )}
          
          {isEdit && form.status === 'cho_xu_ly' && (hasRole('admin') || hasRole('ketoan')) && (
            <>
              <button onClick={() => handleAction('reject')} className="btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Hủy bỏ
              </button>
              <button onClick={() => handleAction('approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                <CheckCircle className="w-4 h-4" /> Duyệt & Trừ Tồn Kho
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
