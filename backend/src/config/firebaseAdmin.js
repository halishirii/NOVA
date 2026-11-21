import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
      projectId: parsed.project_id || 'nova-archive01',
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'nova-archive01',
      });
    } else {
      admin.initializeApp({ projectId: 'nova-archive01' });
    }
  } else {
    admin.initializeApp({ projectId: 'nova-archive01' });
  }

  return admin.firestore();
}

export const db = initFirebaseAdmin();
