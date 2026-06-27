import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import itemsRoutes from './items.routes';
import locationsRoutes from './locations.routes';
import suppliersRoutes from './suppliers.routes';
import customersRoutes from './customers.routes';
import inventoryRoutes from './inventory.routes';
import goodsReceiptsRoutes from './goodsReceipts.routes';
import goodsIssuesRoutes from './goodsIssues.routes';
import processingOrdersRoutes from './processingOrders.routes';
import damageReportsRoutes from './damageReports.routes';
import stocktakesRoutes from './stocktakes.routes';
import adjustmentsRoutes from './adjustments.routes';
import dashboardRoutes from './dashboard.routes';
import auditLogRoutes from './auditLog.routes';
import reportsRoutes from './reports.routes';

export const apiRouter = Router();

// Auth không cần token
apiRouter.use('/auth', authRoutes);

// Tất cả route bên dưới đều cần token
apiRouter.use(authenticateToken);

apiRouter.use('/users', usersRoutes);
apiRouter.use('/items', itemsRoutes);
apiRouter.use('/locations', locationsRoutes);
apiRouter.use('/suppliers', suppliersRoutes);
apiRouter.use('/customers', customersRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/goods-receipts', goodsReceiptsRoutes);
apiRouter.use('/goods-issues', goodsIssuesRoutes);
apiRouter.use('/processing-orders', processingOrdersRoutes);
apiRouter.use('/damage-reports', damageReportsRoutes);
apiRouter.use('/stocktakes', stocktakesRoutes);
apiRouter.use('/adjustments', adjustmentsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/audit-log', auditLogRoutes);
apiRouter.use('/reports', reportsRoutes);
