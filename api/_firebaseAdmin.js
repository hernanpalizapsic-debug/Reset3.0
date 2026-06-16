import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle both literal \n (from env var copy-paste) and real newlines (from file stdin)
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n')
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

initAdmin();
export const adminDb = getFirestore();
