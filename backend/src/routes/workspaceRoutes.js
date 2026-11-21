import { Router } from 'express';
import { db } from '../config/firebaseAdmin.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const WORKSPACE_DOC = db.collection('nova_system').doc('nova_archive01_workspace');

router.get('/state', requireAuth, async (req, res) => {
  try {
    const snap = await WORKSPACE_DOC.get();
    if (!snap.exists) {
      return res.json({ ok: true, customers: [], visits: [] });
    }
    const data = snap.data() || {};
    return res.json({
      ok: true,
      customers: Array.isArray(data.customers) ? data.customers : [],
      visits: Array.isArray(data.visits) ? data.visits : [],
      updatedAt: data.updatedAt || Date.now(),
    });
  } catch (err) {
    console.error('Get workspace error:', err);
    return res.status(500).json({ ok: false, message: 'خطا در خواندن اطلاعات از دیتابیس.' });
  }
});

router.put('/state', requireAuth, async (req, res) => {
  try {
    const { customers, visits } = req.body || {};
    const payload = {
      updatedAt: Date.now(),
      updatedBy: req.user.username,
    };
    if (Array.isArray(customers)) payload.customers = customers;
    if (Array.isArray(visits)) payload.visits = visits;

    await WORKSPACE_DOC.set(payload, { merge: true });
    return res.json({ ok: true, updatedAt: payload.updatedAt });
  } catch (err) {
    console.error('Save workspace error:', err);
    return res.status(500).json({ ok: false, message: 'خطا در ذخیره اطلاعات در دیتابیس.' });
  }
});

export default router;
