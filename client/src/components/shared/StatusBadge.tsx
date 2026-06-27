import { STATUS_LABELS } from '../../types';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  tot: 'bg-emerald-100 text-emerald-700',
  da_nhap_kho: 'bg-emerald-100 text-emerald-700',
  da_xuat_kho: 'bg-emerald-100 text-emerald-700',
  hoan_thanh: 'bg-emerald-100 text-emerald-700',
  da_duyet: 'bg-emerald-100 text-emerald-700',
  da_xu_ly: 'bg-emerald-100 text-emerald-700',
  cho_duyet: 'bg-amber-100 text-amber-700',
  cho_kiem: 'bg-amber-100 text-amber-700',
  dang_kiem: 'bg-amber-100 text-amber-700',
  cho_xuat: 'bg-amber-100 text-amber-700',
  cho_gia_cong: 'bg-amber-100 text-amber-700',
  cho_vat_tu: 'bg-amber-100 text-amber-700',
  nhap: 'bg-blue-100 text-blue-700',
  dang_gia_cong: 'bg-blue-100 text-blue-700',
  dang_xuat: 'bg-blue-100 text-blue-700',
  loi: 'bg-red-100 text-red-700',
  vo: 'bg-red-100 text-red-700',
  xuoc: 'bg-red-100 text-red-700',
  me: 'bg-red-100 text-red-700',
  co_loi: 'bg-red-100 text-red-700',
  huy: 'bg-red-100 text-red-700',
  tu_choi: 'bg-red-100 text-red-700',
  cho_xu_ly: 'bg-orange-100 text-orange-700',
  thanh_pham: 'bg-emerald-100 text-emerald-700',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = colorMap[status] || 'bg-surface-100 text-surface-700';
  const label = STATUS_LABELS[status] || status;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${colors} ${sizeClass}`}>
      {label}
    </span>
  );
}
