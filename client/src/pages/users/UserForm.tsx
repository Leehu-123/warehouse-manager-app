import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../api/client';
import { User } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const UserForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [user, setUser] = useState<Partial<User>>({
    role: 'thukho',
    active: true
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await api.get<{ data: any[] }>(`/users`);
      const found = res.data.find((u: any) => String(u.id) === String(id));
      if (found) {
        // Core API returns roles[] array, extract warehouse role
        const warehouseRoles = ['admin', 'thukho', 'ketoan', 'viewer', 'warehouse', 'kinhdoanh', 'giacong'];
        const role = (found.roles || []).find((r: string) => warehouseRoles.includes(r)) || found.role || 'viewer';
        setUser({ ...found, role, active: found.isActive !== false && found.active !== false });
      }
    } catch (error) {
      toast.error('Lỗi khi tải thông tin người dùng');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/users/${id}`, { ...user });
        if (password) {
          await api.post(`/users/${id}/reset-password`, { password });
        }
        toast.success('Cập nhật người dùng thành công');
      } else {
        await api.post('/users', { ...user, password });
        toast.success('Thêm mới người dùng thành công');
      }
      navigate('/users');
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Only admin can create/edit users
  if (currentUser?.role !== 'admin') {
    return <div className="p-6">Bạn không có quyền truy cập chức năng này</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Tài khoản đăng nhập <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              disabled={isEdit}
              value={user.username || ''} 
              onChange={e => setUser({...user, username: e.target.value})}
              className="input-field" 
              placeholder="Ví dụ: thukho01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={user.fullName || ''} 
              onChange={e => setUser({...user, fullName: e.target.value})}
              className="input-field" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Mật khẩu {isEdit ? '(Để trống nếu không muốn đổi)' : '<span className="text-red-500">*</span>'}</label>
            <input 
              type="password" 
              required={!isEdit}
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="input-field" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Vai trò <span className="text-red-500">*</span></label>
            <select 
              value={user.role || 'thukho'} 
              onChange={e => setUser({...user, role: e.target.value as User['role']})}
              className="input-field"
            >
              <option value="admin">Quản trị viên (Toàn quyền)</option>
              <option value="ketoan">Kế toán</option>
              <option value="thukho">Thủ kho</option>
              <option value="kinhdoanh">Kinh doanh</option>
              <option value="giacong">Xưởng gia công</option>
              <option value="viewer">Người xem</option>
            </select>
          </div>

          {isEdit && (
            <div className="flex items-center mt-4">
              <input
                id="active"
                type="checkbox"
                checked={user.active}
                onChange={e => setUser({...user, active: e.target.checked})}
                className="w-4 h-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500"
              />
              <label htmlFor="active" className="ml-2 text-sm text-surface-700">
                Tài khoản đang hoạt động
              </label>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/users')} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
