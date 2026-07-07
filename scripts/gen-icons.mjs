// רסטור אייקון ה-SVG ל-PNG בכל הגדלים הנדרשים ל-PWA.
// הרצה: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svg = readFileSync(resolve(root, 'public/icons/icon.svg'));

const targets = [
  { size: 192, out: 'public/icons/icon-192.png' },
  { size: 512, out: 'public/icons/icon-512.png' },
  { size: 180, out: 'public/icons/apple-touch-icon.png' },
  { size: 32, out: 'public/favicon-32.png' },
];

for (const { size, out } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(root, out));
  console.log(`✓ ${out} (${size}×${size})`);
}
