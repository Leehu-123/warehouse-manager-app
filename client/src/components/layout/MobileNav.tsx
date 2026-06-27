import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileInput, FileOutput, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Settings, AlertTriangle, ClipboardList, BarChart3, Users, Building2, UserCircle, MapPin, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function MobileNav() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const { canAccess } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const mainItems = [
    { label: 'Tổng quan', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Tồn kho', path: '/inventory', icon: <Package className="w-5 h-5" /> },
    { label: 'Nhập kho', path: '/goods-receipts', icon: <FileInput className="w-5 h-5" /> },
    { label: 'Xuất kho', path: '/goods-issues', icon: <FileOutput className="w-5 h-5" /> },
  ];

  const moreItems = [
    { label: 'Danh mục hàng', path: '/items', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Vị trí kho', path: '/locations', icon: <MapPin className="w-5 h-5" /> },
    { label: 'Gia công', path: '/processing', icon: <Settings className="w-5 h-5" /> },
    { label: 'Hàng lỗi', path: '/damage-reports', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Kiểm kê', path: '/stocktakes', icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'Điều chỉnh', path: '/adjustments', icon: <SlidersHorizontal className="w-5 h-5" />, roles: ['admin', 'ketoan'] },
    { label: 'Nhà cung cấp', path: '/suppliers', icon: <Building2 className="w-5 h-5" /> },
    { label: 'Khách hàng', path: '/customers', icon: <UserCircle className="w-5 h-5" /> },
    { label: 'Báo cáo', path: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Người dùng', path: '/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  ];

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-surface-300 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {moreItems
                .filter((item) => !item.roles || canAccess(item.roles))
                .map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-colors ${
                      isActive(item.path)
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-surface-600 hover:bg-surface-50'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </NavLink>
                ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-30 lg:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {mainItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive(item.path) ? 'text-brand-600' : 'text-surface-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive(item.path) && (
                <div className="absolute top-0 w-8 h-0.5 bg-brand-500 rounded-full" />
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              showMore ? 'text-brand-600' : 'text-surface-500'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Thêm</span>
          </button>
        </div>
      </nav>
    </>
  );
}
