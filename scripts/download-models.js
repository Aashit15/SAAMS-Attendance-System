/**
 * Downloads face-api.js model weights to client/public/models/
 * Run: node scripts/download-models.js
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '..', 'client', 'public', 'models');

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

  console.log(`📦 Downloading face-api.js models to ${MODELS_DIR}...\n`);
  for (const file of files) {
    const url = `${BASE_URL}/${file}`;
    const dest = path.join(MODELS_DIR, file);
    if (fs.existsSync(dest)) { console.log(`   ✓ ${file} (exists)`); continue; }
    process.stdout.write(`   ⬇ ${file}...`);
    try {
      await download(url, dest);
      console.log(' ✓');
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }
  }
  console.log('\n✅ Done! Models are in client/public/models/');
}

main();
