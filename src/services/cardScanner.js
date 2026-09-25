import { createWorker } from 'tesseract.js';
import { searchPokemonCards } from './pokemonApi';

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE PRE-PROCESSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an image to grayscale + mild contrast boost on a new canvas.
 * We intentionally avoid hard binarization — holographic cards have variable
 * contrast and a fixed threshold destroys more text than it reveals.
 *
 * @param {string} imageSrc  DataURL of source image
 * @param {number} scale     Upscale factor (2.0 = double resolution for OCR)
 * @returns {Promise<string>} DataURL of processed image
 */
function preprocessForOCR(imageSrc, scale = 2.0) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(img.width  * scale);
      canvas.height = Math.floor(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Grayscale + mild contrast boost (no binarization)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d    = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray    = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.4 + 128));
        d[i] = d[i + 1] = d[i + 2] = boosted;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT PARSERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a card number (e.g. "072/197") from raw OCR text.
 * Handles common OCR errors: O→0, l/I/|→/, spaces around slash.
 *
 * @param {string} text
 * @returns {{ number: string, setTotal: string }}
 */
export function parseCardNumber(text) {
  if (!text) return { number: '', setTotal: '' };

  // Normalise OCR errors
  const norm = text
    .replace(/[oO]/g, '0')
    .replace(/[lIi|\\]/g, '/');

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
 * Extracts a likely Pokémon name from raw OCR text.
 * Looks for short (1–3 word) capitalised lines, ignoring TCG keywords.
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
  ]);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Strip HP values, numbers, punctuation
    const clean = line
      .replace(/\bHP\s*\d{2,3}\b/gi, '')
      .replace(/\d/g, '')
      .replace(/[^a-zA-ZÀ-ÿ\s\-]/g, '')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length >= 3);
    const valid = words.filter(w => !STOP.has(w.toUpperCase()));

    // Accept 1–3 word names; reject if all uppercase (likely a keyword line)
    if (valid.length >= 1 && valid.length <= 3) {
      const joined = valid.join(' ');
      // Skip ALL-CAPS short strings that are usually section headers
      if (joined === joined.toUpperCase() && joined.length < 6) continue;
      return joined;
    }
  }

  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCANNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans a captured card image with a two-pass OCR strategy:
 *
 *   Pass 1 — Full image, PSM 3 (auto layout), no whitelist.
 *             Reliable for finding the Pokémon name in the card header.
 *
 *   Pass 2 — Full image, PSM 6 (block of text), no whitelist.
 *             Second attempt to find "072/197" number if Pass 1 missed it.
 *
 * Why full image instead of cropped zones?
 *   The camera viewfinder guide is CSS-only — the actual captured canvas is
 *   the full camera sensor frame (e.g. 1280×720). The card may occupy only
 *   40–70% of that frame. Cropping by fixed % of the canvas often misses the
 *   card entirely. Scanning the full image is more robust.
 *
 * @param {string} imageSrc    DataURL from canvas capture
 * @param {Function} onProgress  ({ status, percent, message }) callback
 */
export async function scanAndIdentifyCard(imageSrc, onProgress) {
  let worker = null;

  const progress = (status, percent, message) => {
    if (onProgress) onProgress({ status, percent, message });
  };

  try {
    // ── Pre-process ───────────────────────────────────────────────────────────
    progress('preprocessing', 15, 'Preparando imagen para OCR...');
    const processedImage = await preprocessForOCR(imageSrc, 2.0);

    // ── Init Tesseract ────────────────────────────────────────────────────────
    progress('ocr_loading', 28, 'Iniciando motor de reconocimiento...');
    worker = await createWorker('eng');

    // ── Pass 1: PSM 3 — Auto layout detection ─────────────────────────────────
    progress('ocr_pass1', 45, 'Leyendo carta completa (pasada 1)...');
    await worker.setParameters({
      tessedit_pageseg_mode: '3',   // Fully automatic page segmentation
      tessedit_char_whitelist: '',  // NO whitelist — read everything
    });
    const pass1 = await worker.recognize(processedImage);
    const text1 = pass1.data.text;

    // Try to extract number and name from Pass 1
    let { number, setTotal } = parseCardNumber(text1);
    let name = parsePokemonName(text1);

    // ── Pass 2: PSM 6 — if number still missing ───────────────────────────────
    let text2 = '';
    if (!number) {
      progress('ocr_pass2', 68, 'Segunda pasada para buscar número...');
      await worker.setParameters({
        tessedit_pageseg_mode: '6',  // Assume a single uniform block of text
        tessedit_char_whitelist: '',
      });
      const pass2 = await worker.recognize(processedImage);
      text2 = pass2.data.text;

      const r2 = parseCardNumber(text2);
      if (r2.number) { number = r2.number; setTotal = r2.setTotal; }
      if (!name) name = parsePokemonName(text2);
    }

    await worker.terminate();
    worker = null;

    const fullRawText = [text1, text2].filter(Boolean).join('\n---\n');

    // ── Build parsed result ───────────────────────────────────────────────────
    const parsed = { name, number, setTotal, setCode: '', raw: fullRawText };

    const tag = [
      name,
      number ? `${number}${setTotal ? `/${setTotal}` : ''}` : '',
    ].filter(Boolean).join(' ');

    progress('searching_api', 82, `Buscando "${tag || 'carta'}" en la base de datos...`);

    // Search strategy: number → name → empty (UI handles with manual field)
    let cards = [];
    if (number) {
      cards = await searchPokemonCards(parsed, 20);
    } else if (name) {
      cards = await searchPokemonCards(name, 20);
    }

    progress('done', 100,
      number  ? `¡Número detectado: ${number}/${setTotal}!` :
      name    ? `¡Nombre detectado: ${name}!` :
                'OCR completado — escribe el número manualmente.'
    );

    return { success: true, parsed, cards, rawText: fullRawText };

  } catch (error) {
    if (worker) { try { await worker.terminate(); } catch (_) {} }
    console.error('[CardScanner]', error);
    return { success: false, error: error.message || 'Error al escanear la imagen' };
  }
}
