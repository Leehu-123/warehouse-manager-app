import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../api/client';
import { User } from '../../types';
import DataTable, { type Column } from '../../components/shared/DataTable';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  ketoan: 'Kế toán',
  thukho: 'Thủ kho',
  kinhdoanh: 'Kinh doanh',
  giacong: 'Gia công',
  viewer: 'Người xem',
  warehouse: 'Quản lý kho'
};

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get<{ data: User[] }>('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<User>[] = [
    { key: 'username', label: 'Tài khoản', render: (u) => <span className="font-medium">{u.username}</span> },
    { key: 'fullName', label: 'Họ tên', render: (u) => <span>{u.fullName}</span> },
    { key: 'role', label: 'Phân quyền', render: (u) => {
      const warehouseRoles = ['admin', 'thukho', 'ketoan', 'viewer', 'warehouse', 'kinhdoanh', 'giacong'];
      const role = ((u as any).roles || []).find((r: string) => warehouseRoles.includes(r)) || u.role || '';
      return <span>{ROLE_LABELS[role] || role}</span>;
    }},
    { key: 'active', label: 'Trạng thái', render: (u) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {u.active ? 'Hoạt động' : 'Đã khóa'}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Người dùng hệ thống</h1>
        <button onClick={() => navigate('/users/new')} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          loading={loading}
          onRowClick={(u) => navigate(`/users/${u.id}/edit`)}
        />
      </div>
    </div>
  );
};

export default UserList;
