import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PROCESS_TYPE_LABELS, PROCESSING_STATUS_LABELS } from '../../types';
import type { ProcessingOrder, ProcessingInput, ProcessingOutput, ProcessingWaste, Item, Location, Customer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function ProcessingOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState<Partial<ProcessingOrder>>({
    processType: 'cat',
    status: 'nhap',
    inputs: [],
    outputs: [],
    wastes: [],
    customerId: undefined,
    projectName: '',
    requestedBy: '',
    assignedTo: '',
    dueDate: '',
    note: ''
  });

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [itemsRes, locsRes, custsRes] = await Promise.all([
          api.get<{data: Item[]}>('/products?limit=100'),
          api.get<{data: Location[]}>('/locations'),
          api.get<{data: Customer[]}>('/customers?limit=100')
        ]);
        setItems(itemsRes.data);
        setLocations(locsRes.data);
        setCustomers(custsRes.data);
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
        const res = await api.get<{data: ProcessingOrder}>(`/processing-orders/${id}`);
        setForm({
          ...res.data,
          dueDate: res.data.dueDate ? format(new Date(res.data.dueDate), 'yyyy-MM-dd') : ''
        });
      } catch {
        toast.error('Không thể tải lệnh gia công');
        navigate('/processing-orders');
      } finally {
        setLoading(false);
      }
    };

    fetchReferences().then(loadData);
  }, [id, isEdit, navigate]);

  const updateField = (field: keyof ProcessingOrder, value: any) => {
    setForm(p => ({ ...p, [field]: value }));
  };

  const addInput = () => {
    setForm(p => ({
      ...p,
      inputs: [...(p.inputs || []), { id: Date.now(), processingOrderId: 0, itemId: 0, locationId: 0, quantity: 1 } as ProcessingInput]
    }));
  };

  const removeInput = (index: number) => {
    setForm(p => {
      const newArr = [...(p.inputs || [])];
      newArr.splice(index, 1);
      return { ...p, inputs: newArr };
    });
  };

  const updateInput = (index: number, field: keyof ProcessingInput, value: any) => {
    setForm(p => {
      const newArr = [...(p.inputs || [])];
      newArr[index] = { ...newArr[index], [field]: value };
      return { ...p, inputs: newArr };
    });
  };

  // Tương tự cho Output và Waste (giản lược logic)
  const addOutput = () => {
    setForm(p => ({
      ...p,
      outputs: [...(p.outputs || []), { id: Date.now(), processingOrderId: 0, itemName: '', quantity: 1 } as ProcessingOutput]
    }));
  };

  const removeOutput = (index: number) => {
    setForm(p => {
      const newArr = [...(p.outputs || [])];
      newArr.splice(index, 1);
      return { ...p, outputs: newArr };
    });
  };

  const updateOutput = (index: number, field: keyof ProcessingOutput, value: any) => {
    setForm(p => {
      const newArr = [...(p.outputs || [])];
      newArr[index] = { ...newArr[index], [field]: value };
      return { ...p, outputs: newArr };
    });
  };

  const handleSubmit = async () => {
    if (!form.processType) {
      toast.error('Vui lòng chọn loại gia công');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        customerId: form.customerId ? Number(form.customerId) : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        inputs: form.inputs?.map(i => ({ ...i, itemId: Number(i.itemId), locationId: Number(i.locationId), quantity: Number(i.quantity) })),
        outputs: form.outputs?.map(o => ({ ...o, quantity: Number(o.quantity) }))
      };

      if (isEdit) {
        await api.put(`/processing-orders/${id}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/processing-orders', payload);
        toast.success('Tạo lệnh thành công');
      }
      navigate('/processing-orders');
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'start' | 'complete') => {
    try {
      await api.post(`/processing-orders/${id}/${action}`);
      toast.success('Cập nhật trạng thái thành công');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thao tác');
    }
  };

  if (loading) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/processing-orders')} className="p-2 hover:bg-surface-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
        <h1 className="page-title">{isEdit ? `Lệnh gia công: ${form.code}` : 'Tạo Lệnh Gia Công'}</h1>
        {isEdit && (
          <span className={`ml-4 badge bg-brand-100 text-brand-700`}>
            {PROCESSING_STATUS_LABELS[form.status || ''] || form.status}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6 shadow-sm">
        <h2 className="text-lg font-semibold text-surface-900 border-b pb-2">Thông tin chung</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Loại gia công <span className="text-red-500">*</span></label>
            <select value={form.processType} onChange={(e) => updateField('processType', e.target.value)} disabled={form.status !== 'nhap'} className="select-field">
              {Object.entries(PROCESS_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Khách hàng</label>
            <select value={form.customerId || ''} onChange={(e) => updateField('customerId', e.target.value)} disabled={form.status !== 'nhap'} className="select-field">
              <option value="">-- Trống --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Dự án</label>
            <input type="text" value={form.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} disabled={form.status !== 'nhap'} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Hạn chót</label>
            <input type="date" value={form.dueDate || ''} onChange={(e) => updateField('dueDate', e.target.value)} disabled={form.status !== 'nhap'} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
            <input type="text" value={form.note || ''} onChange={(e) => updateField('note', e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-semibold text-surface-900">Vật tư đầu vào (Inputs)</h2>
          {form.status === 'nhap' && (
            <button onClick={addInput} className="btn-secondary text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Thêm vật tư</button>
          )}
        </div>
        
        {form.inputs?.length === 0 && <p className="text-surface-500 text-sm text-center py-4">Chưa có vật tư nào</p>}
        {form.inputs?.map((input, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-surface-50 p-3 rounded-lg">
            <div className="col-span-5">
              <label className="block text-xs text-surface-500 mb-1">Mã vật tư</label>
              <select value={input.itemId || ''} onChange={(e) => updateInput(idx, 'itemId', e.target.value)} disabled={form.status !== 'nhap'} className="select-field text-sm">
                <option value="">Chọn vật tư</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-surface-500 mb-1">Vị trí lấy</label>
              <select value={input.locationId || ''} onChange={(e) => updateInput(idx, 'locationId', e.target.value)} disabled={form.status !== 'nhap'} className="select-field text-sm">
                <option value="">Chọn vị trí</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-surface-500 mb-1">Số lượng</label>
              <input type="number" min="1" value={input.quantity || 1} onChange={(e) => updateInput(idx, 'quantity', e.target.value)} disabled={form.status !== 'nhap'} className="input-field text-sm" />
            </div>
            {form.status === 'nhap' && (
              <div className="col-span-2 flex justify-end pt-5">
                <button onClick={() => removeInput(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-semibold text-surface-900">Thành phẩm đầu ra (Outputs)</h2>
          {(form.status === 'nhap' || form.status === 'dang_gia_cong') && (
            <button onClick={addOutput} className="btn-secondary text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Thêm thành phẩm</button>
          )}
        </div>
        
        {form.outputs?.length === 0 && <p className="text-surface-500 text-sm text-center py-4">Chưa có thành phẩm nào</p>}
        {form.outputs?.map((output, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-surface-50 p-3 rounded-lg">
            <div className="col-span-4">
              <label className="block text-xs text-surface-500 mb-1">Tên thành phẩm</label>
              <input type="text" value={output.itemName} onChange={(e) => updateOutput(idx, 'itemName', e.target.value)} disabled={form.status !== 'nhap' && form.status !== 'dang_gia_cong'} className="input-field text-sm" placeholder="Kính cắt 1000x2000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-surface-500 mb-1">Dài (mm)</label>
              <input type="number" value={output.lengthMm || ''} onChange={(e) => updateOutput(idx, 'lengthMm', Number(e.target.value))} disabled={form.status !== 'nhap' && form.status !== 'dang_gia_cong'} className="input-field text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-surface-500 mb-1">Rộng (mm)</label>
              <input type="number" value={output.widthMm || ''} onChange={(e) => updateOutput(idx, 'widthMm', Number(e.target.value))} disabled={form.status !== 'nhap' && form.status !== 'dang_gia_cong'} className="input-field text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-surface-500 mb-1">Số lượng</label>
              <input type="number" min="1" value={output.quantity || 1} onChange={(e) => updateOutput(idx, 'quantity', e.target.value)} disabled={form.status !== 'nhap' && form.status !== 'dang_gia_cong'} className="input-field text-sm" />
            </div>
            {(form.status === 'nhap' || form.status === 'dang_gia_cong') && (
              <div className="col-span-2 flex justify-end pt-5">
                <button onClick={() => removeOutput(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-surface-200">
        {(form.status === 'nhap' || form.status === 'dang_gia_cong') && (
          <button onClick={handleSubmit} disabled={saving} className="btn-outline flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
        )}
        
        {isEdit && form.status === 'nhap' && (
          <button onClick={() => handleAction('submit')} className="btn-primary flex items-center gap-2">Trình duyệt</button>
        )}
        {isEdit && form.status === 'cho_duyet' && (hasRole('admin') || hasRole('ketoan')) && (
          <button onClick={() => handleAction('approve')} className="btn-primary flex items-center gap-2">Phê duyệt</button>
        )}
        {isEdit && form.status === 'da_duyet' && (hasRole('admin') || hasRole('thukho') || hasRole('giacong')) && (
          <button onClick={() => handleAction('start')} className="btn-primary flex items-center gap-2">Bắt đầu gia công</button>
        )}
        {isEdit && form.status === 'dang_gia_cong' && (hasRole('admin') || hasRole('thukho') || hasRole('giacong')) && (
          <button onClick={() => handleAction('complete')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <CheckCircle className="w-4 h-4" /> Hoàn thành lệnh
          </button>
        )}
      </div>
    </div>
  );
}
