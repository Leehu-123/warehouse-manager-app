import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ZONE_LABELS } from '../../types';
import type { Stocktake, StocktakeLine } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function StocktakeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [zone, setZone] = useState('');
  
  const [stocktake, setStocktake] = useState<Partial<Stocktake>>({
    status: 'dang_kiem',
    lines: []
  });

  useEffect(() => {
    const loadStocktake = async () => {
      if (!id) return;
      try {
        const res = await api.get<{data: Stocktake}>(`/stocktakes/${id}`);
        setStocktake(res.data);
      } catch (err) {
        toast.error('Không thể tải thông tin phiếu');
        navigate('/stocktakes');
      } finally {
        setFetching(false);
      }
    };
    if (id) loadStocktake();
  }, [id, navigate]);

  const updateLine = (index: number, field: keyof StocktakeLine, value: any) => {
    setStocktake(prev => {
      const newLines = [...(prev.lines || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      if (field === 'actualQty') {
        newLines[index].difference = value - newLines[index].systemQty;
      }
      return { ...prev, lines: newLines };
    });
  };

  const handleSave = async (submitForApproval = false) => {
    try {
      setLoading(true);
      if (!id) {
        if (!zone) return toast.error('Vui lòng chọn khu vực kiểm kê');
        const res = await api.post<{data: Stocktake}>('/stocktakes', { zone });
        toast.success('Đã tạo phiếu kiểm kê');
        navigate(`/stocktakes/${res.data.id}/edit`);
      } else {
        await api.put(`/stocktakes/${id}`, {
          note: stocktake.note,
          lines: stocktake.lines
        });
        toast.success('Đã lưu thông tin kiểm kê');
        if (submitForApproval) {
          await api.post(`/stocktakes/${id}/submit`);
          toast.success('Đã nộp phiếu để đối chiếu');
          window.location.reload();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (createAdjustment: boolean) => {
    try {
      setLoading(true);
      await api.post(`/stocktakes/${id}/complete`, { createAdjustment });
      toast.success('Đã hoàn thành kiểm kê');
      navigate('/stocktakes');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi hoàn thành phiếu');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  const isEditable = !id || stocktake.status === 'dang_kiem';
  const canApprove = stocktake.status === 'cho_doi_chieu' && (hasRole('admin') || hasRole('ketoan'));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stocktakes')} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{id ? `Phiếu kiểm kê ${stocktake.code}` : 'Tạo Phiếu Kiểm Kê'}</h1>
            {id && <p className="text-sm text-surface-500 mt-1">Trạng thái: <span className="font-semibold text-brand-600">{stocktake.status}</span></p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <button disabled={loading} onClick={() => handleSave(false)} className="btn-secondary flex items-center gap-2">
                <Save className="w-4 h-4" /> Lưu số liệu
              </button>
              {id && (
                <button disabled={loading} onClick={() => handleSave(true)} className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" /> Gửi đối chiếu
                </button>
              )}
            </>
          )}
          {canApprove && (
            <>
              <button disabled={loading} onClick={() => handleComplete(false)} className="btn-outline flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <CheckCircle className="w-4 h-4" /> Hoàn thành (Không điều chỉnh)
              </button>
              <button disabled={loading} onClick={() => handleComplete(true)} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4" /> Duyệt & Tạo điều chỉnh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!id && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Khu vực kiểm kê <span className="text-red-500">*</span></label>
              <select value={zone} onChange={(e) => setZone(e.target.value)} className="select-field">
                <option value="">-- Chọn khu vực --</option>
                {Object.entries(ZONE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
            <input 
              type="text" 
              value={stocktake.note || ''} 
              onChange={e => setStocktake({...stocktake, note: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
        </div>
      </div>

      {id && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
            <h3 className="font-semibold text-surface-900">Chi tiết kiểm kê</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã/Tên vật tư</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium text-right">Tồn hệ thống</th>
                  <th className="px-4 py-3 font-medium text-center">Tồn thực tế</th>
                  <th className="px-4 py-3 font-medium text-right">Chênh lệch</th>
                  <th className="px-4 py-3 font-medium">Lý do / Đề xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {stocktake.lines?.map((line, index) => (
                  <tr key={index} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-900">{line.item?.code}</div>
                      <div className="text-xs text-surface-500">{line.item?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-surface-600">{line.location?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{line.systemQty}</td>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="number" 
                        min="0"
                        disabled={!isEditable}
                        value={line.actualQty !== undefined ? line.actualQty : ''}
                        onChange={e => updateLine(index, 'actualQty', parseInt(e.target.value) || 0)}
                        className="input-field py-1.5 px-2 w-24 mx-auto text-center font-bold text-brand-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${line.difference < 0 ? 'text-red-600' : line.difference > 0 ? 'text-emerald-600' : 'text-surface-400'}`}>
                        {line.difference > 0 ? '+' : ''}{line.difference || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        disabled={!isEditable}
                        value={line.note || ''}
                        onChange={e => updateLine(index, 'note', e.target.value)}
                        className="input-field py-1.5 px-2 w-full"
                        placeholder="Nguyên nhân lệch..."
                      />
                    </td>
                  </tr>
                ))}
                {(!stocktake.lines || stocktake.lines.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                      Không có vật tư nào trong khu vực này để kiểm kê.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
