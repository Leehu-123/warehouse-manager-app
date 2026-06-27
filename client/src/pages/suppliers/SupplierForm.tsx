import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import type { Supplier } from '../../types';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    note: '',
    active: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const loadData = async () => {
      try {
        const res = await api.get<{data: Supplier}>(`/suppliers/${id}`);
        const s = res.data;
        setForm({
          code: s.code || '',
          name: s.name,
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          note: s.note || '',
          active: s.active !== false,
        });
      } catch {
        toast.error('Không thể tải thông tin nhà cung cấp');
        navigate('/suppliers');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEdit, navigate]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/suppliers/${id}`, form);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/suppliers', form);
        toast.success('Thêm nhà cung cấp thành công');
      }
      navigate('/suppliers');
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
        <button onClick={() => navigate('/suppliers')} className="p-2 hover:bg-surface-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
        <h1 className="page-title">{isEdit ? 'Chỉnh sửa Nhà cung cấp' : 'Thêm Nhà cung cấp'}</h1>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Mã nhà cung cấp</label>
              <input type="text" value={form.code} disabled className="input-field bg-surface-100 font-semibold text-brand-600" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Tên nhà cung cấp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="VD: Công ty TNHH Kính ABC"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Số điện thoại</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
              className="input-field"
              placeholder="09xx xxx xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              className="input-field"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Địa chỉ</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
            className="input-field"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
            className="input-field"
            rows={3}
            placeholder="Ghi chú thêm..."
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
              Đang hợp tác (hoạt động)
            </label>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-100">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu lại'}
          </button>
        </div>
      </div>
    </div>
  );
}
