import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebaseAdmin.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// Challenge captcha endpoint (server-verified short-lived token)
router.get('/captcha', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const captchaToken = jwt.sign({ captcha: code }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ ok: true, code, captchaToken });
});

// Login with username, password (hashed via bcrypt) & captchaToken
router.post('/login', async (req, res) => {
  try {
    const { username, password, captchaInput, captchaToken } = req.body || {};
    if (!username || !password || !captchaInput || !captchaToken) {
      return res.status(400).json({ ok: false, message: 'نام کاربری، رمز عبور و عبارت امنیتی الزامی است.' });
    }

    try {
      const decodedCaptcha = jwt.verify(captchaToken, JWT_SECRET);
      if (String(captchaInput).trim().toUpperCase() !== String(decodedCaptcha.captcha).toUpperCase()) {
        return res.status(400).json({ ok: false, message: 'عبارت امنیتی اشتباه است.' });
      }
    } catch {
      return res.status(400).json({ ok: false, message: 'عبارت امنیتی منقضی شده است؛ کد جدید بگیرید.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const userSnap = await db.collection('nova_users').doc(cleanUsername).get();

    if (!userSnap.exists) {
      return res.status(401).json({ ok: false, message: 'نام کاربری یا رمز عبور نادرست است.' });
    }

    const userDoc = userSnap.data();
    const isPasswordValid = await bcrypt.compare(String(password), String(userDoc.passwordHash || ''));
    if (!isPasswordValid) {
      return res.status(401).json({ ok: false, message: 'نام کاربری یا رمز عبور نادرست است.' });
    }

    const safeUser = {
      id: userDoc.id || cleanUsername,
      username: cleanUsername,
      fullName: userDoc.fullName,
      role: userDoc.role || 'rep',
      roleLabel: userDoc.roleLabel || 'نماینده علمی',
    };

    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ ok: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'خطای سرور هنگام ورود.' });
  }
});

// Verify current token & get logged-in user profile (never returns passwordHash)
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Admin-only: list users (without passwordHash!)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('nova_users').get();
    const users = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      users.push({
        id: d.id || docSnap.id,
        username: docSnap.id,
        fullName: d.fullName,
        role: d.role || 'rep',
        roleLabel: d.roleLabel || 'نماینده علمی',
      });
    });
    res.json({ ok: true, users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ ok: false, message: 'خطا در دریافت لیست کاربران.' });
  }
});

// Admin-only: create a new employee user with bcrypt-hashed password
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { fullName, username, password, role, roleLabel } = req.body || {};
    if (!fullName || !username || !password || String(password).length < 4) {
      return res.status(400).json({ ok: false, message: 'اطلاعات کاربری کامل نیست یا رمز عبور کوتاه است.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await db.collection('nova_users').doc(cleanUsername).get();
    if (existing.exists) {
      return res.status(409).json({ ok: false, message: 'این نام کاربری قبلاً ثبت شده است.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const normalizedRole = role === 'admin' ? 'admin' : 'rep';
    const userRecord = {
      id: 'u-' + Date.now(),
      username: cleanUsername,
      fullName: String(fullName).trim(),
      passwordHash,
      role: normalizedRole,
      roleLabel: roleLabel || (normalizedRole === 'admin' ? 'مدیر سیستم' : 'نماینده علمی'),
      createdAt: Date.now(),
    };

    await db.collection('nova_users').doc(cleanUsername).set(userRecord);
    res.status(201).json({
      ok: true,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        fullName: userRecord.fullName,
        role: userRecord.role,
        roleLabel: userRecord.roleLabel,
      },
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ ok: false, message: 'خطا در ایجاد حساب کاربری.' });
  }
});

// Admin-only: delete non-admin user
router.delete('/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const target = String(req.params.username || '').trim().toLowerCase();
    if (target === 'admin') {
      return res.status(400).json({ ok: false, message: 'حساب مدیر اصلی قابل حذف نیست.' });
    }
    await db.collection('nova_users').doc(target).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ ok: false, message: 'خطا در حذف کاربر.' });
  }
});

export default router;
