import { Router } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logAction } from '../utils/auditLogger';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'thukho', 'ketoan', 'kinhdoanh', 'giacong']),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1),
  role: z.enum(['admin', 'thukho', 'ketoan', 'kinhdoanh', 'giacong']),
  active: z.boolean(),
});

// Lấy danh sách users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// Lấy chi tiết user
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Tạo user mới
router.post('/', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
      },
    });

    await logAction(req.user!.id, 'CREATE', 'user', user.id, user);

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Cập nhật user (không cập nhật password)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const oldUser = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!oldUser) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        fullName: data.fullName,
        role: data.role,
        active: data.active,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        active: true,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'user', user.id, { old: oldUser, new: user });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { passwordHash },
    });

    await logAction(req.user!.id, 'RESET_PASSWORD', 'user', Number(id));

    res.json({ success: true, message: 'Đã đặt lại mật khẩu' });
  } catch (error) {
    next(error);
  }
});

// Vô hiệu hóa user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user!.id) {
      return res.status(400).json({ success: false, error: 'Không thể tự vô hiệu hóa tài khoản của mình' });
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { active: false },
    });

    await logAction(req.user!.id, 'DEACTIVATE', 'user', user.id);

    res.json({ success: true, message: 'Đã vô hiệu hóa tài khoản' });
  } catch (error) {
    next(error);
  }
});

export default router;
