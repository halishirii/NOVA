import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from './config/firebaseAdmin.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'تعداد تلاش‌ها بیش از حد مجاز است؛ لطفاً کمی بعد تلاش کنید.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'nova-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspace', workspaceRoutes);

async function seedDefaultAdminIfMissing() {
  try {
    const adminRef = db.collection('nova_users').doc('admin');
    const snap = await adminRef.get();
    if (!snap.exists) {
      const passwordHash = await bcrypt.hash('1234', 12);
      await adminRef.set({
        id: 'u-admin',
        username: 'admin',
        fullName: 'حسین علی‌شیری',
        passwordHash,
        role: 'admin',
        roleLabel: 'مدیر سیستم / نماینده علمی',
        createdAt: Date.now(),
      });
      console.log('Seeded default admin account in Firestore with bcrypt hash.');
    }
  } catch (err) {
    console.warn('Could not verify/seed admin user on startup:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`NOVA Backend running on http://localhost:${PORT}`);
  await seedDefaultAdminIfMissing();
});
