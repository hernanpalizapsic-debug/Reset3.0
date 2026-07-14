#!/usr/bin/env node
/**
 * CLI: genera un token de assessment y lo escribe en Firestore.
 *
 * Uso:
 *   node scripts/generateAssessment.mjs \
 *     --empresa "Acme Corp" \
 *     --nombre "Juan Pérez" \
 *     --email "juan@acme.com" \
 *     [--dias 14]
 *
 * Imprime la URL /assessment/<token> lista para pegar en WhatsApp/email.
 * Requiere FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * en .env.local (los mismos que usa deployRules.mjs).
 * URL base configurable con PUBLIC_APP_URL en .env; default reset30.vercel.app.
 */

import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function parseArgs() {
  const out = { dias: 14 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      out[key] = val;
      i++;
    }
  }
  return out;
}

function loadEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(rootDir, name);
    if (!existsSync(p)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx < 1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
      env[key] = val;
    });
  }
  return env;
}

const args = parseArgs();
if (!args.empresa || !args.nombre || !args.email) {
  console.error(
    'Usage: node scripts/generateAssessment.mjs --empresa "Acme" --nombre "Juan" --email "juan@acme.com" [--dias 14]'
  );
  process.exit(1);
}

const env = loadEnv();
const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY?.includes('\\n')
  ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});
const db = admin.firestore();

const tokenId = randomBytes(16).toString('hex');
const dias = Number(args.dias) || 14;
const now = admin.firestore.Timestamp.now();
const expiraEn = admin.firestore.Timestamp.fromMillis(now.toMillis() + dias * 86400000);

await db.collection('assessments').doc(tokenId).set({
  tokenId,
  empresa: args.empresa,
  ejecutivoNombre: args.nombre,
  ejecutivoEmail: args.email,
  creadoEn: now,
  expiraEn,
  estado: 'pendiente',
  respuestas: null,
  scores: null,
  completadoEn: null,
});

const baseUrl = env.PUBLIC_APP_URL || 'https://reset30.vercel.app';

console.log('');
console.log('✓ Assessment creado en Firestore.');
console.log('');
console.log('  tokenId:  ' + tokenId);
console.log('  empresa:  ' + args.empresa);
console.log('  ejec.:    ' + args.nombre + ' <' + args.email + '>');
console.log('  expira:   ' + expiraEn.toDate().toISOString() + '  (' + dias + ' días)');
console.log('');
console.log('  URL:      ' + baseUrl + '/assessment/' + tokenId);
console.log('');
console.log('Pegá esa URL en WhatsApp / email al ejecutivo.');
process.exit(0);
