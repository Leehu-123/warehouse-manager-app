import React, { useState, useEffect } from 'react';
import { User as UserIcon, Save, MessageCircle, ArrowLeft, Bot, Shield } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  ketoan: 'Kế toán',
  thukho: 'Thủ kho',
  kinhdoanh: 'Kinh doanh',
  giacong: 'Xưởng gia công',
  viewer: 'Người xem',
  owner: 'Chủ sở hữu',
  sales: 'Nhân viên bán hàng',
};

const ProfilePage: React.FC = () => {
  const { user: currentUser, canAccess } = useAuth();
  const [telegramChatId, setTelegramChatId] = useState('');
  const [phone, setPhone] = useState('');
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const isAdmin = canAccess(['admin', 'owner']) || currentUser?.role === 'admin' || currentUser?.role === 'owner';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get<any>('/users/me/profile');
      const profile = res.data || res;
      setTelegramChatId(profile.telegramChatId || profile.telegram_chat_id || '');
      setPhone(profile.phone || '');

      if (isAdmin) {
        const compRes = await api.get<any>('/companies/me').catch(() => null);
        if (compRes) {
          const companyData = compRes.data || compRes;
          setBotToken(companyData.telegramBotToken || companyData.telegram_bot_token || '');
        }
      }
    } catch (error) {
      setTelegramChatId('');
      setPhone('');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patch('/users/me/profile', {
        telegramChatId: telegramChatId || null,
        phone: phone || null,
      });

      if (isAdmin) {
        await api.patch('/companies/me', {
          telegramBotToken: botToken || null,
        });
      }

      toast.success('Cập nhật thông tin thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân & Cấu hình</h1>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{currentUser?.fullName || 'N/A'}</h2>
            <p className="text-sm text-gray-500">@{currentUser?.username || 'N/A'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
              {ROLE_LABELS[currentUser?.role || ''] || currentUser?.role || 'N/A'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="Ví dụ: 0901234567"
            />
          </div>
        </div>
      </div>

      {/* Telegram Integration Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Thông báo Telegram cá nhân</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Kết nối tài khoản Telegram để nhận thông báo khi có phiếu nhập/xuất kho cần phê duyệt hoặc đã được phê duyệt.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 font-medium mb-2">📌 Hướng dẫn lấy Chat ID:</p>
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Mở ứng dụng Telegram trên điện thoại/máy tính</li>
            <li>Tìm kiếm <strong>@userinfobot</strong> và bấm <strong>Start</strong></li>
            <li>Bot sẽ trả về thông tin, copy số <strong>Id</strong> (ví dụ: 123456789)</li>
            <li>Dán số đó vào ô bên dưới</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID cá nhân</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value.replace(/[^0-9-]/g, ''))}
            className="input-field"
            placeholder="Ví dụ: 123456789"
          />
        </div>
      </div>

      {/* Admin Bot Token Configuration Card */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-brand-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <Shield className="w-3 h-3" /> Quyền Quản Trị
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-6 h-6 text-brand-600" />
            <h3 className="text-lg font-semibold text-gray-900">Cấu hình Bot Token Hệ Thống</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Thiết lập Token của Bot Telegram chuyên dùng để gửi thông báo tự động từ doanh nghiệp của bạn. Cấu hình này chỉ hiển thị với Quản Trị Viên và áp dụng cho toàn bộ ứng dụng.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Bot Token</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="input-field font-mono text-sm"
              placeholder="Ví dụ: 8878436482:AAFKlyhW8qDq7YGtULZO9LkiPZLEzMf8IGU"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 Để trống sẽ áp dụng Token mặc định của server (nếu có).
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2 py-2.5 px-6 shadow-md"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
