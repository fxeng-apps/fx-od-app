const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 calculation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// PNG Chunk helper
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Generate raw PNG with drawing
function generateAppIcon(width, height, isMaskable = false) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  // FX Theme colors: #0B426E (Primary Navy), #FFFFFF (White), #E2E8F0 (Accent)
  const bgR = 11, bgG = 66, bgB = 110;

  const centerX = width / 2;
  const centerY = height / 2;
  const cornerRadius = isMaskable ? 0 : Math.round(width * 0.22);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle test for icon background
      let inBounds = true;
      if (!isMaskable) {
        const dx = Math.abs(x - centerX) - (centerX - cornerRadius);
        const dy = Math.abs(y - centerY) - (centerY - cornerRadius);
        if (dx > 0 && dy > 0) {
          if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
            inBounds = false;
          }
        }
      }

      if (!inBounds) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // Transparent
        continue;
      }

      // Inside Icon Background: Subtle gradient
      const gradFactor = (y / height) * 20;
      let r = Math.max(0, bgR - Math.round(gradFactor));
      let g = Math.max(0, bgG - Math.round(gradFactor));
      let b = Math.min(255, bgB + Math.round(gradFactor * 0.5));
      let a = 255;

      // Draw stylized Graduation Cap in center
      // Cap scale factor
      const scale = width / 192;
      const relX = (x - centerX) / scale;
      const relY = (y - centerY) / scale;

      // 1. Cap Diamond (top rhombus): |relX| / 48 + |relY + 12| / 20 <= 1
      const capDiamond = Math.abs(relX) / 52 + Math.abs(relY + 14) / 22 <= 1;

      // 2. Cap Skull Base (curve under diamond): relY between 6 and 28, |relX| <= 30
      const capBase =
        relY >= -4 &&
        relY <= 26 &&
        Math.abs(relX) <= 32 &&
        (relX * relX) / (32 * 32) + ((relY - 6) * (relY - 6)) / (32 * 32) <= 1;

      // 3. Tassel (side strand on right):
      const tasselStrand =
        relX >= 36 && relX <= 42 && relY >= -8 && relY <= 30;

      // 4. White Crest Letters "FX": centered lower crest or emblem
      if (capDiamond || capBase || tasselStrand) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Inner cap cutout for stylish 3D effect
      if (relY >= 0 && relY <= 22 && Math.abs(relX) <= 24 && !capDiamond) {
        r = 240;
        g = 245;
        b = 250;
      }

      // Gold tassel knob
      if (Math.abs(relX - 39) <= 4 && Math.abs(relY - 26) <= 6) {
        r = 245;
        g = 158;
        b = 11; // Amber Gold
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.resolve(__dirname, '..', 'public');

const icon192 = generateAppIcon(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('Generated public/pwa-192x192.png (' + icon192.length + ' bytes)');

const icon512 = generateAppIcon(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('Generated public/pwa-512x512.png (' + icon512.length + ' bytes)');

const maskable512 = generateAppIcon(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);
console.log('Generated public/pwa-maskable-512x512.png (' + maskable512.length + ' bytes)');

const appleIcon = generateAppIcon(180, 180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Generated public/apple-touch-icon.png (' + appleIcon.length + ' bytes)');
