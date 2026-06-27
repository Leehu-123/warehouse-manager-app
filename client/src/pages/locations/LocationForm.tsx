import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { ZONE_LABELS } from '../../types';
import type { Location } from '../../types';

export default function LocationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    code: '',
    name: '',
    zone: 'A',
    description: '',
    active: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const loadLocation = async () => {
      try {
        const res = await api.get<{data: Location}>(`/locations/${id}`);
        const loc = res.data;
        setForm({
          code: loc.code,
          name: loc.name,
          zone: loc.zone,
          description: loc.description || '',
          active: loc.active,
        });
      } catch {
        toast.error('Không thể tải thông tin vị trí');
        navigate('/locations');
      } finally {
        setLoading(false);
      }
    };
    loadLocation();
  }, [id, isEdit, navigate]);

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Vui lòng nhập mã và tên vị trí');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/locations/${id}`, form);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/locations', form);
        toast.success('Thêm vị trí thành công');
      }
      navigate('/locations');
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/locations')} className="p-2 hover:bg-surface-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
        <h1 className="page-title">{isEdit ? 'Chỉnh sửa Vị trí kho' : 'Thêm Vị trí kho'}</h1>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Mã vị trí <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              disabled={isEdit}
              className="input-field uppercase"
              placeholder="VD: A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Tên vị trí <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="VD: Khu nhập hàng A1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">
            Phân khu <span className="text-red-500">*</span>
          </label>
          <select
            value={form.zone}
            onChange={(e) => setForm(p => ({ ...p, zone: e.target.value }))}
            className="select-field"
          >
            {Object.entries(ZONE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            className="input-field"
            rows={3}
            placeholder="Ghi chú thêm về vị trí này..."
          />
        </div>

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
              Đang hoạt động
            </label>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-100">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu lại'}
          </button>
        </div>
      </div>
    </div>
  );
}
