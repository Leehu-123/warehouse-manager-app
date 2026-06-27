import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="btn-icon lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span className="text-white font-bold text-xs">DF</span>
          </div>
          <span className="font-bold text-surface-900 text-sm">DAFA Warehouse</span>
        </div>
      </div>

      <div className="flex items-center gap-3" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-surface-50 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-4 h-4 text-brand-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-surface-900">{user?.fullName}</p>
              <p className="text-xs text-surface-500">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-400 hidden sm:block" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-100">
                <p className="text-sm font-medium text-surface-900">{user?.fullName}</p>
                <p className="text-xs text-surface-500">{user?.username}</p>
                <span className="badge bg-brand-100 text-brand-700 mt-1">
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </span>
              </div>
              <button
                onClick={() => { logout(); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
