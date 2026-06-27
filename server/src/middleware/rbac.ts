import { Request, Response, NextFunction } from 'express';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Bạn không có quyền thực hiện thao tác này',
      });
      return;
    }

    next();
  };
}
