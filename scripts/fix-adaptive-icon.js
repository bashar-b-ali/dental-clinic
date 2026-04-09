/**
 * Generate a properly padded adaptive icon for Android.
 *
 * Android adaptive icons need ~20% padding on each side so the logo
 * doesn't get clipped by different device icon masks (circle, squircle, etc).
 *
 * Usage:
 *   npm install sharp --save-dev
 *   node scripts/fix-adaptive-icon.js
 */

const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'assets', 'icon.png');
const OUTPUT = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');

const CANVAS_SIZE = 1024;  // output size
const PADDING_PERCENT = 0.25; // 25% padding on each side
const LOGO_SIZE = Math.round(CANVAS_SIZE * (1 - PADDING_PERCENT * 2)); // 512px logo in 1024px canvas
const OFFSET = Math.round((CANVAS_SIZE - LOGO_SIZE) / 2);

async function main() {
  const logo = await sharp(INPUT)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 232, g: 244, b: 253, alpha: 255 }, // #E8F4FD - matches splash bg
    },
  })
    .composite([{ input: logo, left: OFFSET, top: OFFSET }])
    .png()
    .toFile(OUTPUT);

  console.log(`Created adaptive icon: ${OUTPUT}`);
  console.log(`Canvas: ${CANVAS_SIZE}x${CANVAS_SIZE}, Logo: ${LOGO_SIZE}x${LOGO_SIZE}, Padding: ${OFFSET}px`);
}

main().catch(console.error);
