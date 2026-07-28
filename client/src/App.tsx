import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/inventory/InventoryList';
import ItemList from './pages/items/ItemList';
import ItemForm from './pages/items/ItemForm';

import ReceiptList from './pages/receipts/ReceiptList';
import ReceiptForm from './pages/receipts/ReceiptForm';
import IssueList from './pages/issues/IssueList';
import IssueForm from './pages/issues/IssueForm';
import LocationList from './pages/locations/LocationList';
import LocationForm from './pages/locations/LocationForm';
import SupplierList from './pages/suppliers/SupplierList';
import SupplierForm from './pages/suppliers/SupplierForm';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import ProcessingOrderList from './pages/processing/ProcessingOrderList';
import ProcessingOrderForm from './pages/processing/ProcessingOrderForm';
import DamageReportList from './pages/damages/DamageReportList';
import DamageReportForm from './pages/damages/DamageReportForm';
import StocktakeList from './pages/stocktakes/StocktakeList';
import StocktakeForm from './pages/stocktakes/StocktakeForm';
import AdjustmentList from './pages/adjustments/AdjustmentList';
import AdjustmentForm from './pages/adjustments/AdjustmentForm';

import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import AuditLogList from './pages/audit/AuditLogList';
import ReportDashboard from './pages/reports/ReportDashboard';
import ProfilePage from './pages/profile/ProfilePage';

const ProtectedRoute = ({ children, roles }: { children: JSX.Element, roles?: string[] }) => {
  const { isAuthenticated, hasRole, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.some(r => hasRole(r))) return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        
        {/* Kho hàng */}
        <Route path="inventory" element={<InventoryList />} />
        <Route path="items" element={<ItemList />} />
        <Route path="items/new" element={<ItemForm />} />
        <Route path="items/:id/edit" element={<ItemForm />} />
        
        {/* Nhập/Xuất */}
        <Route path="goods-receipts" element={<ReceiptList />} />
        <Route path="goods-receipts/new" element={<ReceiptForm />} />
        <Route path="goods-receipts/:id/edit" element={<ReceiptForm />} />

        <Route path="goods-issues" element={<IssueList />} />
        <Route path="goods-issues/new" element={<IssueForm />} />
        <Route path="goods-issues/:id/edit" element={<IssueForm />} />

        {/* Danh mục đối tác / vị trí */}
        <Route path="locations" element={<LocationList />} />
        <Route path="locations/new" element={<LocationForm />} />
        <Route path="locations/:id/edit" element={<LocationForm />} />
        
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:id/edit" element={<SupplierForm />} />

        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />

        {/* Gia công & Lỗi vỡ */}
        <Route path="processing-orders" element={<ProcessingOrderList />} />
        <Route path="processing-orders/new" element={<ProcessingOrderForm />} />
        <Route path="processing-orders/:id/edit" element={<ProcessingOrderForm />} />

        <Route path="damage-reports" element={<DamageReportList />} />
        <Route path="damage-reports/new" element={<DamageReportForm />} />
        <Route path="damage-reports/:id/edit" element={<DamageReportForm />} />

        {/* Kiểm kê & Điều chỉnh */}
        <Route path="stocktakes" element={<StocktakeList />} />
        <Route path="stocktakes/new" element={<StocktakeForm />} />
        <Route path="stocktakes/:id/edit" element={<StocktakeForm />} />

        <Route path="adjustments" element={<AdjustmentList />} />
        <Route path="adjustments/new" element={<AdjustmentForm />} />
        <Route path="adjustments/:id/edit" element={<AdjustmentForm />} />

        {/* Hệ thống */}
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UserList /></ProtectedRoute>} />
        <Route path="users/new" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />
        <Route path="users/:id/edit" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />
        
        <Route path="audit-log" element={<ProtectedRoute roles={['admin', 'ketoan']}><AuditLogList /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['admin', 'ketoan']}><ReportDashboard /></ProtectedRoute>} />

        {/* Placeholder for others */}
        <Route path="*" element={<div className="p-6">Tính năng đang được phát triển...</div>} />
      </Route>
    </Routes>
  );
}

export default App;
