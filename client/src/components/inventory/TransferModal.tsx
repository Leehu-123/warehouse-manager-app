import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import toast from 'react-hot-toast';
import type { Inventory, Location } from '../../types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventory: Inventory | null;
}

export default function TransferModal({ isOpen, onClose, onSuccess, inventory }: TransferModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      setQuantity('');
      setToLocationId('');
      setNote('');
    }
  }, [isOpen]);

  const loadLocations = async () => {
    try {
      const res = await api.get<{ data: Location[] }>('/locations?active=true');
      setLocations(res.data);
    } catch {
      toast.error('Lỗi tải danh sách vị trí');
    }
  };

  const handleTransfer = async () => {
    if (!inventory) return;
    if (!toLocationId) return toast.error('Vui lòng chọn vị trí đích');
    
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return toast.error('Số lượng không hợp lệ');
    if (qty > inventory.quantity) return toast.error('Số lượng vượt quá tồn kho hiện tại');
    
    if (parseInt(toLocationId) === inventory.locationId) {
      return toast.error('Vị trí đích phải khác vị trí hiện tại');
    }

    setLoading(true);
    try {
      await api.post('/inventory/transfer', {
        itemId: inventory.itemId,
        fromLocationId: inventory.locationId,
        toLocationId: parseInt(toLocationId),
        quantity: qty,
        status: (inventory as any).condition || (inventory as any).status || 'tot',
        note: note || 'Chuyển vị trí nhanh qua hệ thống',
      });
      toast.success('Chuyển vị trí thành công');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý chuyển vị trí');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !inventory) return null;

  return (
    <div className="fixed inset-0 bg-surface-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-surface-900">Chuyển vị trí nhanh</h2>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-surface-50 p-4 rounded-lg flex items-center justify-between border border-surface-200">
            <div>
              <p className="text-xs text-surface-500 font-medium">Sản phẩm</p>
              <p className="font-semibold text-surface-900 mt-0.5">{inventory.item?.code} - {inventory.item?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-1">Vị trí hiện tại</label>
              <input value={inventory.location?.code || inventory.location?.name || '-'} disabled className="input-field bg-surface-100 font-semibold" />
            </div>
            <ArrowRight className="w-5 h-5 text-surface-400 mt-6 shrink-0" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-1">Vị trí đích <span className="text-red-500">*</span></label>
              <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className="select-field">
                <option value="">-- Chọn --</option>
                {locations.filter(l => l.id !== inventory.locationId).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-1">Tồn kho hiện tại</label>
              <input value={inventory.quantity} disabled className="input-field bg-surface-100 font-semibold" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-1">Số lượng chuyển <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                min="1" 
                max={inventory.quantity} 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                className="input-field" 
                placeholder="Nhập số lượng..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Lý do / Ghi chú</label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              className="input-field" 
              rows={2} 
              placeholder="VD: Chuyển hàng chờ xuất..." 
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary">Hủy</button>
          <button onClick={handleTransfer} disabled={loading || !toLocationId || !quantity} className="btn-primary">
            {loading ? 'Đang chuyển...' : 'Xác nhận chuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}
