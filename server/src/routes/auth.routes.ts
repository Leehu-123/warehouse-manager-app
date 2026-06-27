import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { generateToken } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';
import { logAction } from '../utils/auditLogger';

const router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.active) {
      res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    await logAction(user.id, 'LOGIN', 'user', user.id, null, req.ip);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// GET /auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

// PUT /auth/change-password
router.put('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không đúng' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAction(user.id, 'CHANGE_PASSWORD', 'user', user.id, null, req.ip);

    res.json({ success: true, data: { message: 'Đổi mật khẩu thành công' } });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
  }
});

export default router;
