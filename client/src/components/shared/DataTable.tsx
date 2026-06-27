import type { ReactNode } from 'react';
import EmptyState from './EmptyState';
import Pagination from './Pagination';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  keyExtractor?: (row: T) => string | number;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-surface-200 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,
  onRowClick,
  pagination,
  keyExtractor,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left whitespace-nowrap" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {data.map((row, index) => (
              <tr
                key={keyExtractor ? keyExtractor(row) : index}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-surface-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${index % 2 === 1 ? 'bg-surface-50/50' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="border-t border-surface-100">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
