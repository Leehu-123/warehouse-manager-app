import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Plus, Trash2, CheckCircle, FileText } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { exportToDocx } from '../../utils/docxExport';
import { format } from 'date-fns';
import type { GoodsIssue, GoodsIssueLine, Customer, Item, Location } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { ISSUE_TYPE_LABELS } from '../../types';

export default function IssueForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  
  const [issue, setIssue] = useState<Partial<GoodsIssue>>({
    status: 'nhap',
    issueType: 'ban_hang',
    lines: []
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const loadDependencies = useCallback(async () => {
    try {
      const [custRes, itemsRes, locRes] = await Promise.all([
        api.get<{data: Customer[]}>('/customers?limit=100'),
        api.get<{data: Item[]}>('/items?limit=500&isActive=true'),
        api.get<{data: Location[]}>('/locations?limit=100&isActive=true')
      ]);
      setCustomers(custRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) {
      toast.error('Không thể tải dữ liệu danh mục');
    }
  }, []);

  const loadIssue = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{data: GoodsIssue}>(`/goods-issues/${id}`);
      setIssue(res.data);
    } catch (err: unknown) {
      toast.error('Không thể tải thông tin phiếu');
      navigate('/goods-issues');
    } finally {
      setFetching(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDependencies();
    loadIssue();
  }, [loadDependencies, loadIssue]);

  const addLine = () => {
    setIssue(prev => ({
      ...prev,
      lines: [...(prev.lines || []), { requestedQty: 1, condition: 'tot' } as GoodsIssueLine]
    }));
  };

  const removeLine = (index: number) => {
    setIssue(prev => ({
      ...prev,
      lines: prev.lines?.filter((_, i) => i !== index)
    }));
  };

  const updateLine = (index: number, field: keyof GoodsIssueLine, value: any) => {
    setIssue(prev => {
      const newLines = [...(prev.lines || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const handleSave = async (submitForApproval = false) => {
    if (!issue.lines?.length) return toast.error('Vui lòng thêm ít nhất một mặt hàng');
    
    for (let i = 0; i < issue.lines.length; i++) {
      const line = issue.lines[i];
      if (!line.itemId || !line.locationId || !line.requestedQty) {
        return toast.error(`Dòng ${i + 1} thiếu thông tin (Hàng hóa, Vị trí, Số lượng)`);
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...issue,
        date: issue.date ? new Date(issue.date).toISOString() : undefined,
        customerId: issue.customerId || undefined,
        receiverName: issue.receiverName,
        vehicleNo: issue.vehicleNo,
        note: issue.note,
        lines: issue.lines.map(l => ({
          itemId: l.itemId,
          locationId: l.locationId,
          requestedQty: Number(l.requestedQty),
          actualQty: Number(l.actualQty || l.requestedQty),
          condition: l.condition || 'tot',
          note: l.note
        }))
      };

      if (id) {
        await api.put(`/goods-issues/${id}`, payload);
        if (submitForApproval) {
          await api.post(`/goods-issues/${id}/submit`);
        }
        toast.success(submitForApproval ? 'Đã trình duyệt phiếu' : 'Đã cập nhật phiếu');
      } else {
        const res = await api.post<{data: GoodsIssue}>('/goods-issues', payload);
        if (submitForApproval) {
          await api.post(`/goods-issues/${res.data.id}/submit`);
        }
        toast.success(submitForApproval ? 'Đã tạo và trình duyệt phiếu' : 'Đã tạo phiếu nháp');
      }
      navigate('/goods-issues');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setLoading(true);
      await api.post(`/goods-issues/${id}/approve`);
      toast.success('Đã duyệt phiếu xuất kho');
      loadIssue();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDoc = () => {
    if (!issue || !issue.code) return;
    const partner = customers.find(c => c.id === issue.customerId);
    exportToDocx({
      title: 'PHIẾU XUẤT KHO',
      code: issue.code,
      date: format(new Date(issue.date || issue.createdAt || Date.now()), 'dd/MM/yyyy HH:mm'),
      partnerName: partner?.name || issue.receiverName || '',
      vehicleNo: issue.vehicleNo,
      driverName: issue.receiverName,
      note: issue.note,
      isReceipt: false,
      lines: (issue.lines || []).map((l, idx) => {
        const item = items.find(i => i.id === l.itemId);
        return {
          stt: idx + 1,
          itemName: item ? `${item.code} - ${item.name}` : '',
          unit: item?.unit || '',
          quantity: l.requestedQty,
          condition: l.condition
        };
      })
    });
  };

  if (fetching) return <LoadingSpinner />;

  const isEditable = !id || issue.status === 'nhap' || issue.status === 'cho_duyet';
  const canApprove = issue.status === 'cho_duyet' && (hasRole('admin') || hasRole('ketoan'));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/goods-issues')} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{id ? `Phiếu xuất ${issue.code}` : 'Tạo Phiếu Xuất Kho'}</h1>
            {id && <p className="text-sm text-surface-500 mt-1">Trạng thái: <span className="font-semibold text-brand-600">{issue.status}</span></p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {id && (
            <button onClick={handleExportDoc} className="btn-outline flex items-center gap-2 mr-2">
              <FileText className="w-4 h-4" /> Xuất Biên Bản
            </button>
          )}
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
          {canApprove && (
            <button disabled={loading} onClick={handleApprove} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4" /> Phê duyệt phiếu
            </button>
          )}
        </div>
      </div>

      {/* Info Form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" /> Thông tin chung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Loại xuất <span className="text-red-500">*</span></label>
            <select
              disabled={!isEditable}
              value={issue.issueType || ''}
              onChange={e => setIssue(p => ({ ...p, issueType: e.target.value }))}
              className="input-field"
            >
              {Object.entries(ISSUE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Khách hàng</label>
            <select
              disabled={!isEditable}
              value={issue.customerId || ''}
              onChange={e => setIssue(p => ({ ...p, customerId: Number(e.target.value) }))}
              className="input-field"
            >
              <option value="">-- Khách lẻ / Nội bộ --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Công trình</label>
            <input
              type="text"
              disabled={!isEditable}
              value={issue.projectName || ''}
              onChange={e => setIssue(p => ({ ...p, projectName: e.target.value }))}
              className="input-field"
              placeholder="VD: Vinpearl Nam Hội An"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Ngày xuất kho</label>
            <input 
              type="datetime-local" 
              value={issue.date ? new Date(issue.date).toISOString().slice(0,16) : ''} 
              onChange={e => setIssue({...issue, date: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Người nhận hàng</label>
            <input 
              type="text" 
              value={issue.receiverName || ''} 
              onChange={e => setIssue({...issue, receiverName: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Số xe / Biển số</label>
            <input 
              type="text" 
              value={issue.vehicleNo || ''} 
              onChange={e => setIssue({...issue, vehicleNo: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
            <textarea
              disabled={!isEditable}
              value={issue.note || ''}
              onChange={e => setIssue(p => ({ ...p, note: e.target.value }))}
              className="input-field"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> Hàng hóa xuất kho
          </h2>
          {isEditable && (
            <button onClick={addLine} className="btn-secondary text-sm py-1.5 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Thêm dòng
            </button>
          )}
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-surface-600 font-medium">
                <th className="px-4 py-3 text-left w-12">STT</th>
                <th className="px-4 py-3 text-left min-w-[250px]">Mã hàng hóa <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 text-left min-w-[150px]">Vị trí xuất <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 text-left w-32">Số lượng YC <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 text-left w-32">SL Thực tế</th>
                {isEditable && <th className="px-4 py-3 text-center w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {issue.lines?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-surface-500">
                    Chưa có hàng hóa nào. Bấm "Thêm dòng" để thêm.
                  </td>
                </tr>
              ) : (
                issue.lines?.map((line, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-center text-surface-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <select
                        disabled={!isEditable}
                        value={line.itemId || ''}
                        onChange={e => updateLine(index, 'itemId', Number(e.target.value))}
                        className="input-field py-1.5 px-2"
                      >
                        <option value="">-- Chọn --</option>
                        {items.map(item => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={!isEditable}
                        value={line.locationId || ''}
                        onChange={e => updateLine(index, 'locationId', Number(e.target.value))}
                        className="input-field py-1.5 px-2"
                      >
                        <option value="">-- Chọn --</option>
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.code} - {loc.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        disabled={!isEditable}
                        value={line.requestedQty || ''}
                        onChange={e => updateLine(index, 'requestedQty', Number(e.target.value))}
                        className="input-field py-1.5 px-2"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        disabled={!isEditable}
                        value={line.actualQty || line.requestedQty || ''}
                        onChange={e => updateLine(index, 'actualQty', Number(e.target.value))}
                        className="input-field py-1.5 px-2 bg-emerald-50"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
