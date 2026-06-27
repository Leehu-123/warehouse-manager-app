import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Không có token xác thực' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload as AuthUser;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
    return;
  }
}
