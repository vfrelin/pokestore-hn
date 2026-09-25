import { createWorker } from 'tesseract.js';
import { searchPokemonCards } from './pokemonApi';

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads an image from a DataURL and returns {img, width, height}.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Applies a 3×3 sharpening kernel via convolution.
 * Enhances edges so Tesseract can read thin card fonts better.
 */
function applySharpening(data, width, height) {
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0,
  ];
  const src = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pi = ((y + ky) * width + (x + kx)) * 4;
          const k  = kernel[(ky + 1) * 3 + (kx + 1)];
          r += src[pi]     * k;
          g += src[pi + 1] * k;
          b += src[pi + 2] * k;
        }
      }
      const i = (y * width + x) * 4;
      data[i]     = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
}

/**
 * Full pre-processing pipeline for OCR:
 *  1. Upscale 3× (more pixels → better glyph recognition)
 *  2. Grayscale conversion
 *  3. Sharpening kernel
 *  4. Adaptive/Otsu-like binarisation (black text on white background)
 *
 * @param {string}  imageSrc   DataURL
 * @param {number}  scale      Upscale factor (default 3)
 * @param {boolean} binarize   Whether to apply hard black/white threshold (default true)
 * @returns {Promise<string>}  DataURL of processed image
 */
async function preprocessForOCR(imageSrc, scale = 3, binarize = true) {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width  = Math.floor(img.width  * scale);
  canvas.height = Math.floor(img.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Step 1 — grayscale
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
  }

  // Step 2 — sharpen
  applySharpening(d, canvas.width, canvas.height);

  // Step 3 — compute histogram for Otsu threshold
  if (binarize) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
    const total = canvas.width * canvas.height;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0, wB = 0, wF = 0;
    let maxVar = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) ** 2;
      if (between > maxVar) { maxVar = between; threshold = t; }
    }

    // Apply threshold — dark text → black, light background → white
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i] < threshold ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Crops the top N% of an image (where the Pokémon name lives on every card).
 * Pokémon TCG layout: name is always in the top ~18% of the card frame.
 *
 * @param {string} imageSrc  DataURL
 * @param {number} topFrac   Fraction of height to keep (0.18 = top 18%)
 * @returns {Promise<string>} DataURL of cropped strip
 */
async function cropNameZone(imageSrc, topFrac = 0.20) {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  // Keep full width, crop height
  canvas.width  = img.width;
  canvas.height = Math.ceil(img.height * topFrac);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Crops the bottom 15% of an image (where the card number lives: e.g. 072/197).
 *
 * @param {string} imageSrc  DataURL
 * @param {number} botFrac   Fraction of height from bottom (0.15 = last 15%)
 * @returns {Promise<string>} DataURL of cropped strip
 */
async function cropNumberZone(imageSrc, botFrac = 0.15) {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const cropH = Math.ceil(img.height * botFrac);
  canvas.width  = img.width;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, img.height - cropH, img.width, cropH, 0, 0, img.width, cropH);
  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT PARSERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a card number (e.g. "072/197") from raw OCR text.
 * Handles common OCR errors: O→0, l/I/|→1 or /, spaces around slash.
 */
export function parseCardNumber(text) {
  if (!text) return { number: '', setTotal: '' };

  // Normalise OCR errors in number-only context
  const norm = text
    .replace(/[oO]/g, '0')
    .replace(/[lI|\\]/g, '/');

  // Standard: "072/197"  or  "72/197"
  const m = norm.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (m) {
    return {
      number:   m[1].padStart(3, '0'),
      setTotal: m[2],
    };
  }

  // Trainer Gallery: "TG01/TG30"
  const tg = norm.match(/\b(TG\d{2}|GG\d{2}|SV\d{2})\s*\/\s*(\S{2,5})\b/i);
  if (tg) {
    return { number: tg[1].toUpperCase(), setTotal: tg[2].toUpperCase() };
  }

  return { number: '', setTotal: '' };
}

/**
 * Extracts the most likely Pokémon name from raw OCR text.
 *
 * Strategy (in priority order):
 *  1. The first 1-3 capitalised words NOT in the stop-list
 *  2. Any word ≥ 4 chars that looks like a proper name (capitalised)
 *
 * @param {string} text
 * @returns {string}
 */
export function parsePokemonName(text) {
  if (!text) return '';

  const STOP = new Set([
    'BASIC','STAGE','STAGE1','STAGE2','TRAINER','ITEM','SUPPORTER','STADIUM',
    'ENERGY','POKEMON','POKÉMON','HP','VMAX','VSTAR','EX','GX','EVOLVES',
    'FROM','RESTORED','ANCIENT','FUTURE','ACE','SPEC','RULE','BOX',
    'ABILITY','ATTACK','RETREAT','WEAKNESS','RESISTANCE','DAMAGE',
  ]);

  // Clean text lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Score candidates: prefer earlier lines, longer words, fewer ALL-CAPS
  const candidates = [];

  for (const line of lines) {
    const clean = line
      .replace(/\bHP\s*\d{2,3}\b/gi, '')
      .replace(/\d/g, '')
      .replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length >= 3);
    const valid = words.filter(w => !STOP.has(w.toUpperCase()));

    if (valid.length >= 1 && valid.length <= 4) {
      const joined = valid.join(' ');
      // Skip pure ALL-CAPS short lines (likely OCR noise or keywords)
      if (joined === joined.toUpperCase() && joined.length < 8) continue;
      // Prefer Title Case or Mixed Case (real names)
      const score = valid.reduce((s, w) => {
        const firstCap = w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
        return s + (firstCap ? 2 : 0) + w.length;
      }, 0);
      candidates.push({ name: joined, score });
    }
  }

  // Sort by score descending, take best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.name || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCANNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans a card image with a 3-pass OCR strategy:
 *
 *   Pass 1 — Top 20% crop (name zone), PSM 7 (single line), binarized.
 *             Most reliable for the Pokémon name in the card header.
 *
 *   Pass 2 — Bottom 15% crop (number zone), PSM 7, binarized.
 *             Targeted read of the "072/197" number at the card bottom.
 *
 *   Pass 3 — Full image, PSM 3 (auto layout), no binarization fallback.
 *             Used when Passes 1 & 2 miss name or number.
 *
 * @param {string}   imageSrc    DataURL from canvas capture (not saved to device)
 * @param {Function} onProgress  ({ status, percent, message }) callback
 */
export async function scanAndIdentifyCard(imageSrc, onProgress) {
  let worker = null;

  const progress = (status, percent, message) => {
    if (onProgress) onProgress({ status, percent, message });
  };

  try {
    // ── Crop zones ────────────────────────────────────────────────────────────
    progress('preprocessing', 10, 'Recortando zona del nombre...');
    const nameZoneRaw   = await cropNameZone(imageSrc, 0.20);
    const numberZoneRaw = await cropNumberZone(imageSrc, 0.15);

    // ── Pre-process each zone ─────────────────────────────────────────────────
    progress('preprocessing', 18, 'Mejorando imagen para OCR...');
    const [nameZoneOCR, numberZoneOCR, fullImageOCR] = await Promise.all([
      preprocessForOCR(nameZoneRaw,   3, true),   // name: sharp binarize
      preprocessForOCR(numberZoneRaw, 3, true),   // number: sharp binarize
      preprocessForOCR(imageSrc,      2, false),  // full: mild (no binarize)
    ]);

    // ── Init Tesseract ────────────────────────────────────────────────────────
    progress('ocr_loading', 28, 'Iniciando motor de reconocimiento...');
    worker = await createWorker('eng');

    // ── Pass 1: Name zone, PSM 7 (single text line) ───────────────────────────
    progress('ocr_pass1', 42, 'Leyendo nombre de la carta...');
    await worker.setParameters({
      tessedit_pageseg_mode: '7',   // Treat image as a single text line
      tessedit_char_whitelist: '',
    });
    const pass1 = await worker.recognize(nameZoneOCR);
    let name = parsePokemonName(pass1.data.text);

    // ── Pass 2: Number zone, PSM 7 ────────────────────────────────────────────
    progress('ocr_pass2', 60, 'Leyendo número de carta...');
    await worker.setParameters({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: '0123456789/TGGSVtggsv',
    });
    const pass2 = await worker.recognize(numberZoneOCR);
    let { number, setTotal } = parseCardNumber(pass2.data.text);

    // ── Pass 3: Full image fallback ───────────────────────────────────────────
    let text3 = '';
    if (!name || !number) {
      progress('ocr_pass3', 74, 'Pasada completa de respaldo...');
      await worker.setParameters({
        tessedit_pageseg_mode: '3',
        tessedit_char_whitelist: '',
      });
      const pass3 = await worker.recognize(fullImageOCR);
      text3 = pass3.data.text;

      if (!name)   name   = parsePokemonName(text3);
      if (!number) {
        const r3 = parseCardNumber(text3);
        if (r3.number) { number = r3.number; setTotal = r3.setTotal; }
      }
    }

    await worker.terminate();
    worker = null;

    const allText = [pass1.data.text, pass2.data.text, text3].filter(Boolean).join('\n---\n');

    // ── Build parsed result ───────────────────────────────────────────────────
    const parsed = { name, number, setTotal, setCode: '', raw: allText };

    const tag = [
      name,
      number ? `${number}${setTotal ? `/${setTotal}` : ''}` : '',
    ].filter(Boolean).join(' ');

    progress('searching_api', 84, `Buscando "${tag || 'carta'}" en la base de datos...`);

    // Search: number takes priority (more precise), fallback to name
    let cards = [];
    if (number) {
      cards = await searchPokemonCards(parsed, 20);
    } else if (name) {
      cards = await searchPokemonCards(name, 20);
    }

    progress('done', 100,
      number ? `¡Número detectado: ${number}/${setTotal}!` :
      name   ? `¡Nombre detectado: ${name}!` :
               'OCR completado — escribe el número manualmente.'
    );

    return { success: true, parsed, cards, rawText: allText };

  } catch (error) {
    if (worker) { try { await worker.terminate(); } catch (_) {} }
    console.error('[CardScanner]', error);
    return { success: false, error: error.message || 'Error al escanear la imagen' };
  }
}
