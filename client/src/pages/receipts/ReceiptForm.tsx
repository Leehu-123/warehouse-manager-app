import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Plus, Trash2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { exportToDocx } from '../../utils/docxExport';
import { format } from 'date-fns';
import type { GoodsReceipt, GoodsReceiptLine, Supplier, Item, Location } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function ReceiptForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  
  const [receipt, setReceipt] = useState<Partial<GoodsReceipt>>({
    status: 'nhap',
    lines: []
  });
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const loadDependencies = useCallback(async () => {
    try {
      const [suppRes, itemsRes, locRes] = await Promise.all([
        api.get<{data: Supplier[]}>('/suppliers?limit=100'),
        api.get<{data: Item[]}>('/items?limit=500&isActive=true'),
        api.get<{data: Location[]}>('/locations?limit=100&isActive=true')
      ]);
      setSuppliers(suppRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) {
      toast.error('Không thể tải dữ liệu danh mục');
    }
  }, []);

  const loadReceipt = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{data: GoodsReceipt}>(`/goods-receipts/${id}`);
      setReceipt(res.data);
    } catch (err: unknown) {
      toast.error('Không thể tải thông tin phiếu');
      navigate('/goods-receipts');
    } finally {
      setFetching(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDependencies();
    loadReceipt();
  }, [loadDependencies, loadReceipt]);

  const addLine = () => {
    setReceipt(prev => ({
      ...prev,
      lines: [...(prev.lines || []), { quantity: 1, condition: 'tot' } as GoodsReceiptLine]
    }));
  };

  const removeLine = (index: number) => {
    setReceipt(prev => ({
      ...prev,
      lines: prev.lines?.filter((_, i) => i !== index)
    }));
  };

  const updateLine = (index: number, field: keyof GoodsReceiptLine, value: any) => {
    setReceipt(prev => {
      const newLines = [...(prev.lines || [])];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const handleSave = async (submitForApproval = false) => {
    if (!receipt.supplierId) return toast.error('Vui lòng chọn nhà cung cấp');
    if (!receipt.lines?.length) return toast.error('Vui lòng thêm ít nhất một mặt hàng');
    
    // Validate lines
    for (let i = 0; i < receipt.lines.length; i++) {
      const line = receipt.lines[i];
      if (!line.itemId || !line.locationId || !line.quantity) {
        return toast.error(`Dòng ${i + 1} thiếu thông tin (Hàng hóa, Vị trí, Số lượng)`);
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...receipt,
        date: receipt.date ? new Date(receipt.date).toISOString() : undefined,
        supplierId: receipt.supplierId || undefined,
        deliveredBy: receipt.deliveredBy,
        vehicleNo: receipt.vehicleNo,
        documentNo: receipt.documentNo,
        note: receipt.note,
        lines: receipt.lines.map(l => ({
          itemId: l.itemId,
          locationId: l.locationId,
          quantity: Number(l.quantity),
          condition: l.condition || 'tot',
          note: l.note
        }))
      };

      if (id) {
        await api.put(`/goods-receipts/${id}`, payload);
        if (submitForApproval) {
          await api.post(`/goods-receipts/${id}/submit`);
        }
        toast.success(submitForApproval ? 'Đã trình duyệt phiếu' : 'Đã cập nhật phiếu');
      } else {
        const res = await api.post<{data: GoodsReceipt}>('/goods-receipts', payload);
        if (submitForApproval) {
          await api.post(`/goods-receipts/${res.data.id}/submit`);
        }
        toast.success(submitForApproval ? 'Đã tạo và trình duyệt phiếu' : 'Đã tạo phiếu nháp');
      }
      navigate('/goods-receipts');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await api.post(`/goods-receipts/${id}/approve`);
      toast.success('Đã duyệt phiếu nhập kho');
      navigate('/goods-receipts');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi duyệt phiếu');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDoc = () => {
    if (!receipt || !receipt.code) return;
    const partner = suppliers.find(s => s.id === receipt.supplierId);
    exportToDocx({
      title: 'PHIẾU NHẬP KHO',
      code: receipt.code,
      date: format(new Date(receipt.date || receipt.createdAt || Date.now()), 'dd/MM/yyyy HH:mm'),
      partnerName: partner?.name || '',
      vehicleNo: receipt.vehicleNo,
      driverName: receipt.deliveredBy,
      note: receipt.note,
      isReceipt: true,
      lines: (receipt.lines || []).map((l, idx) => {
        const item = items.find(i => i.id === l.itemId);
        return {
          stt: idx + 1,
          itemName: item ? `${item.code} - ${item.name}` : '',
          unit: item?.unit || '',
          quantity: l.quantity,
          condition: l.condition
        };
      })
    });
  };

  if (fetching) return <LoadingSpinner />;

  const isEditable = !id || receipt.status === 'nhap' || receipt.status === 'cho_duyet';
  const canApprove = receipt.status === 'cho_duyet' && (hasRole('admin') || hasRole('ketoan'));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/goods-receipts')} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">{id ? `Phiếu nhập ${receipt.code}` : 'Tạo Phiếu Nhập Kho'}</h1>
            {id && <p className="text-sm text-surface-500 mt-1">Trạng thái: <span className="font-semibold text-brand-600">{receipt.status}</span></p>}
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
            <label className="block text-sm font-medium text-surface-700 mb-1">Nhà cung cấp <span className="text-red-500">*</span></label>
            <select
              disabled={!isEditable}
              value={receipt.supplierId || ''}
              onChange={e => setReceipt(p => ({ ...p, supplierId: Number(e.target.value) }))}
              className="input-field"
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Ngày nhập kho</label>
            <input 
              type="datetime-local" 
              value={receipt.date ? new Date(receipt.date).toISOString().slice(0,16) : ''} 
              onChange={e => setReceipt({...receipt, date: e.target.value})}
              disabled={!isEditable}
              className="input-field" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Số chứng từ gốc</label>
            <input
              type="text"
              disabled={!isEditable}
              value={receipt.documentNo || ''}
              onChange={e => setReceipt(p => ({ ...p, documentNo: e.target.value }))}
              className="input-field"
              placeholder="VD: HD-00123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Biển số xe</label>
            <input
              type="text"
              disabled={!isEditable}
              value={receipt.vehicleNo || ''}
              onChange={e => setReceipt(p => ({ ...p, vehicleNo: e.target.value }))}
              className="input-field"
              placeholder="VD: 51C-123.45"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-surface-700 mb-1">Ghi chú</label>
            <textarea
              disabled={!isEditable}
              value={receipt.note || ''}
              onChange={e => setReceipt(p => ({ ...p, note: e.target.value }))}
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
            <CheckCircle className="w-5 h-5 text-emerald-500" /> Hàng hóa nhập kho
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
                <th className="px-4 py-3 text-left min-w-[150px]">Vị trí nhập <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 text-left w-32">Số lượng <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 text-left w-32">Tình trạng</th>
                {isEditable && <th className="px-4 py-3 text-center w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {receipt.lines?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-surface-500">
                    Chưa có hàng hóa nào. Bấm "Thêm dòng" để thêm.
                  </td>
                </tr>
              ) : (
                receipt.lines?.map((line, index) => (
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
                        value={line.quantity || ''}
                        onChange={e => updateLine(index, 'quantity', Number(e.target.value))}
                        className="input-field py-1.5 px-2"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={!isEditable}
                        value={line.condition || 'tot'}
                        onChange={e => updateLine(index, 'condition', e.target.value)}
                        className="input-field py-1.5 px-2"
                      >
                        <option value="tot">Tốt</option>
                        <option value="cho_kiem">Chờ kiểm</option>
                        <option value="vo">Vỡ</option>
                        <option value="xuoc">Xước</option>
                        <option value="me">Mẻ</option>
                      </select>
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
