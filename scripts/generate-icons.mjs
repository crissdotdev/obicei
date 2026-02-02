/**
 * Generate PWA icons from SVG source using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import { createRequire } from 'module';
import { mkdirSync } from 'fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

// SVG icon: "O" ring with checkmark inside — the habit completion mark
const makeSvg = (size, rounded = true) => {
  const scale = size / 512;
  const rx = rounded ? 108 * scale : 0;
  const s = (v) => Math.round(v * scale);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#D0021B"/>
  <circle cx="${s(256)}" cy="${s(256)}" r="${s(120)}" fill="none" stroke="white" stroke-width="${s(40)}" stroke-linecap="round"/>
  <polyline points="${s(200)},${s(264)} ${s(244)},${s(308)} ${s(312)},${s(204)}" fill="none" stroke="white" stroke-width="${s(36)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);
};

const makeMaskableSvg = (size) => {
  const scale = size / 512;
  const s = (v) => Math.round(v * scale);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#D0021B"/>
  <circle cx="${s(256)}" cy="${s(256)}" r="${s(100)}" fill="none" stroke="white" stroke-width="${s(34)}" stroke-linecap="round"/>
  <polyline points="${s(210)},${s(262)} ${s(248)},${s(300)} ${s(302)},${s(210)}" fill="none" stroke="white" stroke-width="${s(30)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);
};

mkdirSync('public/icons', { recursive: true });

async function generate() {
  // Standard icons
  for (const size of [192, 512]) {
    await sharp(makeSvg(size))
      .png()
      .toFile(`public/icons/icon-${size}.png`);
    console.log(`Generated icon-${size}.png`);
  }

  // Maskable
  await sharp(makeMaskableSvg(512))
    .png()
    .toFile('public/icons/icon-maskable-512.png');
  console.log('Generated icon-maskable-512.png');

  // Apple touch icon
  await sharp(makeSvg(180))
    .png()
    .toFile('public/icons/apple-touch-icon.png');
  console.log('Generated apple-touch-icon.png');

  // Favicon 32x32
  await sharp(makeSvg(32, false))
    .png()
    .toFile('public/favicon.png');
  console.log('Generated favicon.png');

  console.log('Done!');
}

generate().catch(console.error);
