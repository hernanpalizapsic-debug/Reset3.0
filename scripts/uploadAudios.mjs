/**
 * Script para subir los audios de Reset 3.0 a Firebase Storage.
 *
 * Requisitos:
 *   1. Tener un archivo serviceAccountKey.json en la raíz del proyecto
 *      (descargalo desde Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada)
 *   2. Tener la variable VITE_FIREBASE_STORAGE_BUCKET en el .env
 *
 * Uso:
 *   node scripts/uploadAudios.mjs
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Cargar variables de entorno desde .env manualmente
function loadEnv() {
  const candidates = ['.env.local', '.env'];
  const env = {};
  for (const name of candidates) {
    const envPath = path.join(rootDir, name);
    if (!existsSync(envPath)) continue;
    readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) env[key.trim()] = rest.join('=').trim();
    });
  }
  return env;
}

const env = loadEnv();
const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;

const candidates = [
  'serviceAccountKey.json',
  'ServiceAccountKey.json',
  'ServiceAccountKey.json.json',
  'serviceAccountKey.json.json',
];
const serviceAccountPath = candidates
  .map((f) => path.join(rootDir, f))
  .find(existsSync);

if (!serviceAccountPath) {
  console.error('❌ No se encontró serviceAccountKey.json en la raíz del proyecto.');
  console.error('   Descargalo desde Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada');
  process.exit(1);
}

if (!storageBucket) {
  console.error('❌ No se encontró VITE_FIREBASE_STORAGE_BUCKET en el .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket,
});

const bucket = admin.storage().bucket();

const audioFiles = [
  {
    local: 'Ejercicio Maestro Reset_mezcla.mp3',
    remote: 'audios/ejercicio-maestro.mp3',
  },
  {
    local: 'AUDIO 1.mp3',
    remote: 'audios/audio-1.mp3',
  },
  {
    local: 'AUDIO 2- RESET VERDADERO.mp3',
    remote: 'audios/audio-2.mp3',
  },
  {
    local: 'Reset Audio 3 ok_mezcla.mp3',
    remote: 'audios/audio-3.mp3',
  },
  {
    local: 'Audio Nocturno_mezcla.mp3',
    remote: 'audios/audio-nocturno.mp3',
  },
  {
    local: 'Audio 4_mezcla.mp3',
    remote: 'audios/audio-4.mp3',
  },
];

async function upload() {
  const audiosDir = path.join(rootDir, 'audios');
  console.log(`\n📦 Subiendo audios a Firebase Storage (bucket: ${storageBucket})\n`);

  for (const file of audioFiles) {
    const localPath = path.join(audiosDir, file.local);
    if (!existsSync(localPath)) {
      console.warn(`⚠️  No encontrado: ${file.local} — saltando`);
      continue;
    }
    process.stdout.write(`   Subiendo "${file.local}"... `);
    await bucket.upload(localPath, {
      destination: file.remote,
      metadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log(`✓`);
  }

  console.log('\n✅ Todos los audios subidos correctamente.');
  console.log('\n📋 Reglas de Firebase Storage recomendadas:');
  console.log(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audios/{audio} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
`);
}

upload().catch((err) => {
  console.error('❌ Error al subir:', err.message);
  process.exit(1);
});
