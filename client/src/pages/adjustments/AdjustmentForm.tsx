import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADJUSTMENT_REASON_LABELS } from '../../types';
import type { StockAdjustment, StockAdjustmentLine, Item, Location } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function AdjustmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [adjustment, setAdjustment] = useState<Partial<StockAdjustment>>({
    status: 'nhap',
    reason: 'khac',
    lines: []
  });

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

    const loadAdjustment = async () => {
      if (!id) return;
      try {
        const res = await api.get<{data: StockAdjustment}>(`/adjustments/${id}`);
        setAdjustment(res.data);
      } catch (err) {
        toast.error('Không thể tải thông tin phiếu');
        navigate('/adjustments');
      } finally {
        setFetching(false);
      }
    };

    fetchReferences().then(loadAdjustment);
  }, [id, navigate]);

  const addLine = () => {
    setAdjustment(prev => ({
      ...prev,
      lines: [...(prev.lines || []), { id: Date.now(), adjustmentId: 0, itemId: 0, locationId: 0, qtyBefore: 0, qtyAfter: 0, difference: 0 }] as unknown as StockAdjustmentLine[]
    }));
  };

  const removeLine = (index: number) => {
    setAdjustment(prev => {
      const newLines = [...(prev.lines || [])];
      newLines.splice(index, 1);
      return { ...prev, lines: newLines };
    });
  };

  const updateLine = (index: number, field: keyof StockAdjustmentLine, value: any) => {
    setAdjustment(prev => {
      const newLines = [...(prev.lines || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      
      if (field === 'qtyBefore' || field === 'qtyAfter') {
        const before = newLines[index].qtyBefore || 0;
        const after = newLines[index].qtyAfter || 0;
        newLines[index].difference = after - before;
      }
      return { ...prev, lines: newLines };
    });
  };

  const handleSave = async (submitForApproval = false) => {
    if (!adjustment.lines || adjustment.lines.length === 0) {
      return toast.error('Vui lòng thêm ít nhất 1 dòng chi tiết');
    }
    
    // Validate lines
    for (let i = 0; i < adjustment.lines.length; i++) {
      const line = adjustment.lines[i];
      if (!line.itemId || !line.locationId) {
        return toast.error(`Dòng ${i + 1}: Vui lòng chọn vật tư và vị trí`);
      }
    }

    try {
      setLoading(true);
      const payload = {
        ...adjustment,
        lines: adjustment.lines.map(l => ({
          itemId: Number(l.itemId),
          locationId: Number(l.locationId),
          qtyBefore: Number(l.qtyBefore),
          qtyAfter: Number(l.qtyAfter)
        }))
      };

      if (!id) {
        const res = await api.post<{data: StockAdjustment}>('/adjustments', payload);
        toast.success('Đã tạo phiếu điều chỉnh');
        if (submitForApproval) {
          await api.post(`/adjustments/${res.data.id}/submit`);
          toast.success('Đã trình duyệt phiếu');
        }
        navigate('/adjustments');
      } else {
        await api.put(`/adjustments/${id}`, payload);
        toast.success('Đã lưu thông tin');
        if (submitForApproval) {
          await api.post(`/adjustments/${id}/submit`);
          toast.success('Đã trình duyệt phiếu');
          navigate('/adjustments');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'submit' | 'approve') => {
    try {
      setLoading(true);
      await api.post(`/adjustments/${id}/${action}`);
      toast.success(action === 'approve' ? 'Đã duyệt phiếu điều chỉnh' : 'Đã trình duyệt phiếu');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thao tác');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  const isEditable = !id || adjustment.status === 'nhap' || adjustment.status === 'cho_duyet';
  const canApprove = adjustment.status === 'cho_duyet' && (hasRole('admin') || hasRole('ketoan'));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/adjustments')} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{id ? `Phiếu điều chỉnh ${adjustment.code}` : 'Tạo Phiếu Điều Chỉnh'}</h1>
            {id && <p className="text-sm text-surface-500 mt-1">Trạng thái: <span className="font-semibold text-brand-600">{adjustment.status}</span></p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <button disabled={loading} onClick={() => handleSave(false)} className="btn-secondary flex items-center gap-2">
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button disabled={loading} onClick={() => handleSave(true)} className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" /> Trình duyệt
              </button>
            </>
          )}
          {!isEditable && adjustment.status === 'nhap' && (
            <button disabled={loading} onClick={() => handleAction('submit')} className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" /> Trình duyệt
            </button>
          )}
          {canApprove && (
            <button disabled={loading} onClick={() => handleAction('approve')} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4" /> Duyệt & Cập nhật kho
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Lý do điều chỉnh <span className="text-red-500">*</span></label>
            <select value={adjustment.reason || ''} onChange={(e) => setAdjustment({...adjustment, reason: e.target.value})} disabled={!isEditable} className="select-field">
              {Object.entries(ADJUSTMENT_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
            <input 
              type="text" 
              value={adjustment.note || ''} 
              onChange={e => setAdjustment({...adjustment, note: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
          <h3 className="font-semibold text-surface-900">Chi tiết điều chỉnh</h3>
          {isEditable && (
            <button onClick={addLine} className="btn-secondary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm dòng
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
              <tr>
                <th className="px-4 py-3 font-medium">Vật tư / Sản phẩm</th>
                <th className="px-4 py-3 font-medium">Vị trí kho</th>
                <th className="px-4 py-3 font-medium text-center">Tồn trước (Sổ sách)</th>
                <th className="px-4 py-3 font-medium text-center">Tồn sau (Thực tế)</th>
                <th className="px-4 py-3 font-medium text-right">Chênh lệch</th>
                <th className="px-4 py-3 font-medium">Ghi chú</th>
                {isEditable && <th className="px-4 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {adjustment.lines?.map((line, index) => (
                <tr key={index} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <select
                      value={line.itemId || ''}
                      onChange={e => updateLine(index, 'itemId', e.target.value)}
                      disabled={!isEditable}
                      className="select-field py-1.5 px-2"
                    >
                      <option value="">-- Chọn --</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={line.locationId || ''}
                      onChange={e => updateLine(index, 'locationId', e.target.value)}
                      disabled={!isEditable}
                      className="select-field py-1.5 px-2"
                    >
                      <option value="">-- Chọn --</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="number" 
                      min="0"
                      disabled={!isEditable}
                      value={line.qtyBefore !== undefined ? line.qtyBefore : ''}
                      onChange={e => updateLine(index, 'qtyBefore', parseInt(e.target.value) || 0)}
                      className="input-field py-1.5 px-2 w-20 mx-auto text-center"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="number" 
                      min="0"
                      disabled={!isEditable}
                      value={line.qtyAfter !== undefined ? line.qtyAfter : ''}
                      onChange={e => updateLine(index, 'qtyAfter', parseInt(e.target.value) || 0)}
                      className="input-field py-1.5 px-2 w-20 mx-auto text-center font-bold text-brand-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${(line.difference || 0) < 0 ? 'text-red-600' : (line.difference || 0) > 0 ? 'text-emerald-600' : 'text-surface-400'}`}>
                      {(line.difference || 0) > 0 ? '+' : ''}{line.difference || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="text" 
                      disabled={!isEditable}
                      value={line.note || ''}
                      onChange={e => updateLine(index, 'note', e.target.value)}
                      className="input-field py-1.5 px-2 w-full"
                    />
                  </td>
                  {isEditable && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => removeLine(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {(!adjustment.lines || adjustment.lines.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                    Chưa có dòng chi tiết nào. Bấm "Thêm dòng" để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
