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

// Decode raw RGBA PNG
function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  let idat = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString();
    if (type === 'IDAT') idat.push(buf.slice(pos + 8, pos + 8 + len));
    pos += 8 + len + 4;
  }
  const decomp = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const rowSize = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);
  let prevRow = Buffer.alloc(rowSize);
  let srcPos = 0;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }

  for (let y = 0; y < height; y++) {
    const filter = decomp[srcPos++];
    const currentRow = Buffer.alloc(rowSize);
    for (let x = 0; x < rowSize; x++) {
      const filt = decomp[srcPos++];
      const left = x >= bpp ? currentRow[x - bpp] : 0;
      const up = prevRow[x];
      const upleft = x >= bpp ? prevRow[x - bpp] : 0;
      let raw = 0;
      if (filter === 0) raw = filt;
      else if (filter === 1) raw = (filt + left) & 0xff;
      else if (filter === 2) raw = (filt + up) & 0xff;
      else if (filter === 3) raw = (filt + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) raw = (filt + paeth(left, up, upleft)) & 0xff;
      currentRow[x] = raw;
    }
    currentRow.copy(pixels, y * rowSize);
    prevRow = currentRow;
  }
  return { width, height, pixels };
}

// Encode raw RGBA pixels to PNG buffer
function encodePNG(width, height, rawRGBA) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    rawRGBA.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
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

// Resample / scale RGBA image with bilinear interpolation
function resample(srcPixels, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = (srcW - 1) / (dstW > 1 ? dstW - 1 : 1);
  const yRatio = (srcH - 1) / (dstH > 1 ? dstH - 1 : 1);

  for (let dy = 0; dy < dstH; dy++) {
    const sy = dy * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const yLerp = sy - y0;

    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const xLerp = sx - x0;

      const dstIdx = (dy * dstW + dx) * 4;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcPixels[idx00 + c] * (1 - xLerp) + srcPixels[idx10 + c] * xLerp;
        const bot = srcPixels[idx01 + c] * (1 - xLerp) + srcPixels[idx11 + c] * xLerp;
        dst[dstIdx + c] = Math.round(top * (1 - yLerp) + bot * yLerp);
      }
    }
  }
  return dst;
}

// Crop rectangle from source RGBA
function crop(srcPixels, srcW, srcH, cx, cy, cw, ch) {
  const dst = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const sy = cy + y;
    if (sy < 0 || sy >= srcH) continue;
    for (let x = 0; x < cw; x++) {
      const sx = cx + x;
      if (sx < 0 || sx >= srcW) continue;
      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (y * cw + x) * 4;
      srcPixels.copy(dst, dstIdx, srcIdx, srcIdx + 4);
    }
  }
  return dst;
}

// Composite crest into square canvas with white or custom background
function createPWAIcon(crestPixels, crestW, crestH, size, paddingPercent = 0.15, bg = [255, 255, 255, 255]) {
  const canvas = Buffer.alloc(size * size * 4);

  // Fill background
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = bg[0];
    canvas[i * 4 + 1] = bg[1];
    canvas[i * 4 + 2] = bg[2];
    canvas[i * 4 + 3] = bg[3];
  }

  // Calculate target crest dimensions
  const maxAvail = size * (1 - paddingPercent * 2);
  const scale = Math.min(maxAvail / crestW, maxAvail / crestH);
  const targetW = Math.round(crestW * scale);
  const targetH = Math.round(crestH * scale);

  const scaledCrest = resample(crestPixels, crestW, crestH, targetW, targetH);

  const offsetX = Math.round((size - targetW) / 2);
  const offsetY = Math.round((size - targetH) / 2);

  for (let y = 0; y < targetH; y++) {
    const dy = offsetY + y;
    if (dy < 0 || dy >= size) continue;
    for (let x = 0; x < targetW; x++) {
      const dx = offsetX + x;
      if (dx < 0 || dx >= size) continue;

      const sIdx = (y * targetW + x) * 4;
      const dIdx = (dy * size + dx) * 4;

      const sa = scaledCrest[sIdx + 3] / 255;
      if (sa <= 0) continue;

      const sr = scaledCrest[sIdx];
      const sg = scaledCrest[sIdx + 1];
      const sb = scaledCrest[sIdx + 2];

      const dr = canvas[dIdx];
      const dg = canvas[dIdx + 1];
      const db = canvas[dIdx + 2];
      const da = canvas[dIdx + 3] / 255;

      const outA = sa + da * (1 - sa);
      if (outA > 0) {
        canvas[dIdx] = Math.round((sr * sa + dr * da * (1 - sa)) / outA);
        canvas[dIdx + 1] = Math.round((sg * sa + dg * da * (1 - sa)) / outA);
        canvas[dIdx + 2] = Math.round((sb * sa + db * da * (1 - sa)) / outA);
        canvas[dIdx + 3] = Math.round(outA * 255);
      }
    }
  }

  return encodePNG(size, size, canvas);
}

const publicDir = path.resolve(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');

console.log('Reading:', logoPath);
const { width: logoW, height: logoH, pixels: logoPixels } = decodePNG(logoPath);

// Crest bounding box: minX: 93, maxX: 459, minY: 74, maxY: 466 (w: 367, h: 393)
const crestX = 93;
const crestY = 74;
const crestW = 459 - 93 + 1; // 367
const crestH = 466 - 74 + 1; // 393

const crestPixels = crop(logoPixels, logoW, logoH, crestX, crestY, crestW, crestH);

// 1. Save transparent cropped college crest (perfect for navbar and in-app badges)
const crestPNG = encodePNG(crestW, crestH, crestPixels);
fs.writeFileSync(path.join(publicDir, 'college-crest.png'), crestPNG);
console.log('Created public/college-crest.png (' + crestW + 'x' + crestH + ')');

// 2. Generate PWA 192x192
const pwa192 = createPWAIcon(crestPixels, crestW, crestH, 192, 0.12, [255, 255, 255, 255]);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Created public/pwa-192x192.png (192x192)');

// 3. Generate PWA 512x512
const pwa512 = createPWAIcon(crestPixels, crestW, crestH, 512, 0.12, [255, 255, 255, 255]);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Created public/pwa-512x512.png (512x512)');

// 4. Generate Maskable PWA 512x512 (padding 20% to fit within Android safe circle)
const pwaMaskable = createPWAIcon(crestPixels, crestW, crestH, 512, 0.20, [255, 255, 255, 255]);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('Created public/pwa-maskable-512x512.png (512x512 maskable)');

// 5. Generate iOS Apple Touch Icon 180x180
const appleIcon = createPWAIcon(crestPixels, crestW, crestH, 180, 0.12, [255, 255, 255, 255]);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created public/apple-touch-icon.png (180x180)');

// 6. Generate SVG Favicon with embedded base64 college crest
const base64Crest = crestPNG.toString('base64');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" rx="20" fill="#ffffff"/>
  <image href="data:image/png;base64,${base64Crest}" x="10" y="8" width="80" height="84" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
console.log('Created public/favicon.svg with College Crest');
