import type { ReactNode } from 'react';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4">
        {icon || <Package className="w-8 h-8 text-surface-400" />}
      </div>
      <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-surface-500 max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
