import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconMap = {
    danger: <AlertCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />,
  };

  const btnClass = {
    danger: 'btn-danger',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200',
    info: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-2xl p-6 text-center">
        <div className="flex justify-center mb-4">{iconMap[variant]}</div>
        <h3 className="text-lg font-semibold text-surface-900 mb-2">{title}</h3>
        <p className="text-sm text-surface-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-secondary" disabled={isLoading}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={btnClass[variant]} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
