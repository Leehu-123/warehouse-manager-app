import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('❌ Server Error:', err);

  // Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Dữ liệu đã tồn tại (trùng lặp)',
        details: prismaErr.meta?.target,
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Không tìm thấy dữ liệu',
      });
      return;
    }
  }

  // Prisma validation errors
  if (err.constructor.name === 'PrismaClientValidationError') {
    res.status(400).json({
      success: false,
      error: 'Dữ liệu không hợp lệ',
      details: err.message,
    });
    return;
  }

  // Default
  res.status(500).json({
    success: false,
    error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}
