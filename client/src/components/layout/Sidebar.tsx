import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, MapPin, FileInput, FileOutput, Settings,
  AlertTriangle, ClipboardList, SlidersHorizontal, Users, History,
  Building2, UserCircle, BarChart3, ChevronLeft, X, Truck, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'TỔNG QUAN',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    ],
  },
  {
    title: 'KHO HÀNG',
    items: [
      { label: 'Tồn kho', path: '/inventory', icon: <Package className="w-5 h-5" /> },
      { label: 'Danh mục hàng', path: '/items', icon: <ClipboardList className="w-5 h-5" /> },
      { label: 'Vị trí kho', path: '/locations', icon: <MapPin className="w-5 h-5" /> },
    ],
  },
  {
    title: 'NGHIỆP VỤ',
    items: [
      { label: 'Phiếu nhập', path: '/goods-receipts', icon: <FileInput className="w-5 h-5" /> },
      { label: 'Phiếu xuất', path: '/goods-issues', icon: <FileOutput className="w-5 h-5" /> },
      { label: 'Đơn hàng', path: '/sales-orders', icon: <ShoppingCart className="w-5 h-5" /> },
      { label: 'Hàng chờ xuất', path: '/goods-issues?status=cho_xuat', icon: <Truck className="w-5 h-5" /> },
    ],
  },
  {
    title: 'GIA CÔNG',
    items: [
      { label: 'Lệnh gia công', path: '/processing-orders', icon: <Settings className="w-5 h-5" /> },
    ],
  },
  {
    title: 'QUẢN LÝ',
    items: [
      { label: 'Hàng lỗi/vỡ', path: '/damage-reports', icon: <AlertTriangle className="w-5 h-5" /> },
      { label: 'Kiểm kê', path: '/stocktakes', icon: <ClipboardList className="w-5 h-5" /> },
      { label: 'Điều chỉnh tồn', path: '/adjustments', icon: <SlidersHorizontal className="w-5 h-5" />, roles: ['admin', 'ketoan'] },
    ],
  },
  {
    title: 'DANH MỤC',
    items: [
      { label: 'Nhà cung cấp', path: '/suppliers', icon: <Building2 className="w-5 h-5" /> },
      { label: 'Khách hàng', path: '/customers', icon: <UserCircle className="w-5 h-5" /> },
    ],
  },
  {
    title: 'BÁO CÁO',
    items: [
      { label: 'Báo cáo', path: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      { label: 'Người dùng', path: '/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
      { label: 'Lịch sử thao tác', path: '/audit-log', icon: <History className="w-5 h-5" />, roles: ['admin'] },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { canAccess } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [base, query] = path.split('?');
      return location.pathname === base && location.search.includes(query);
    }
    if (location.search.includes('status=') && !path.includes('?')) {
      return false;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-surface-200 z-50 transition-all duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-[68px]' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-surface-100 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">DF</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-surface-900">DAFA</h1>
                <p className="text-[10px] text-surface-500 -mt-0.5">Warehouse</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">DF</span>
            </div>
          )}
          <button onClick={onClose} className="btn-icon lg:hidden">
            <X className="w-5 h-5" />
          </button>
          <button onClick={onToggleCollapse} className="btn-icon hidden lg:block">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || canAccess(item.roles)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-4">
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                    {group.title}
                  </p>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`sidebar-link ${isActive(item.path) ? 'sidebar-link-active' : ''} ${
                      collapsed ? 'justify-center px-2' : ''
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
