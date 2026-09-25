import { createWorker } from 'tesseract.js';
import { searchPokemonCards } from './pokemonApi';

/**
 * Crops the bottom footer strip of a card image and enhances it for OCR.
 * The card number (e.g. "072/197") appears in small but high-contrast text
 * on a white/light strip at the very bottom of every Pokémon card.
 *
 * Strategy: NO binarization — use adaptive grayscale + mild contrast boost only.
 * Aggressive binarization destroys the text when card has slight shadow/glare.
 *
 * @param {string} imageSrc Data URL
 * @param {number} startYFrac  Top edge of crop as fraction of image height (0.0–1.0)
 * @param {number} heightFrac  Height of crop as fraction of image height (0.0–1.0)
 * @param {number} scale       Upscale multiplier (≥3 recommended for tiny footer text)
 * @returns {Promise<string>} Canvas data URL of the cropped+enhanced region
 */
function cropFooterStrip(imageSrc, startYFrac = 0.82, heightFrac = 0.18, scale = 4) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const srcY      = Math.floor(img.height * startYFrac);
      const srcHeight = Math.floor(img.height * heightFrac);
      const srcWidth  = img.width;

      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(srcWidth  * scale);
      canvas.height = Math.floor(srcHeight * scale);

      const ctx = canvas.getContext('2d');

      // Smooth scaling for small text — bilinear interpolation keeps curves intact
      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = 'high';
      ctx.drawImage(img, 0, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);

      // Grayscale + mild contrast boost (no hard binarization)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        // Weighted luminance (perceptual)
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Contrast stretch: darken darks, brighten brights (S-curve approximation)
        const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
        d[i]     = boosted;
        d[i + 1] = boosted;
        d[i + 2] = boosted;
        // alpha stays
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png')); // PNG for lossless OCR input
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Extracts a "###/###" style card number from raw OCR text.
 * Handles common OCR misreads:
 *   - 'O' → '0' (letter O misread as zero)
 *   - 'l' or 'I' → '/' (slash misread as pipe/lowercase-L)
 *   - spaces around the slash
 *   - TG01/TG30 trainer gallery format
 *
 * @param {string} rawText
 * @returns {{ number: string, setTotal: string }}
 */
export function parseCardNumber(rawText) {
  if (!rawText) return { number: '', setTotal: '' };

  // Normalise common OCR mistakes before matching
  const normalised = rawText
    .replace(/[oO]/g, '0')           // O → 0
    .replace(/[lI|\\]/g, '/')        // l/I/pipe/backslash → forward slash
    .replace(/\s+/g, ' ');

  // Pattern A: standard "072/197"  or  "72/197"
  const stdMatch = normalised.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (stdMatch) {
    return {
      number:   stdMatch[1].padStart(3, '0'),
      setTotal: stdMatch[2],
    };
  }

  // Pattern B: Trainer Gallery "TG01/TG30" or "GG01/GG30"
  const tgMatch = normalised.match(/\b(TG\d{2}|GG\d{2}|SV\d{2})\s*\/\s*(TG\d{2}|GG\d{2}|\d{2,3})\b/i);
  if (tgMatch) {
    return {
      number:   tgMatch[1].toUpperCase(),
      setTotal: tgMatch[2].toUpperCase(),
    };
  }

  return { number: '', setTotal: '' };
}

/**
 * Performs a quick full-image OCR pass with PSM 6 to extract the Pokémon name
 * from the top region of the card.
 *
 * @param {string} imageSrc Data URL of full card image
 * @param {object} worker   Active Tesseract worker
 * @returns {Promise<string>} Detected name or empty string
 */
async function extractNameFromFullImage(imageSrc, worker) {
  // Crop just the top 20% for name (no processing — raw crop only)
  const nameImage = await cropFooterStrip(imageSrc, 0.0, 0.20, 2.5);

  // PSM 6 = assume a uniform block of text — good for 1–2 word name lines
  await worker.setParameters({ tessedit_pageseg_mode: '6' });
  const ret = await worker.recognize(nameImage);
  return parseRawName(ret.data.text);
}

/**
 * Clean name text extracted from the header region.
 */
function parseRawName(rawText) {
  if (!rawText) return '';

  const stopWords = new Set([
    'BASIC','STAGE','STAGE1','STAGE2','TRAINER','ITEM','SUPPORTER','STADIUM',
    'ENERGY','POKEMON','POKÉMON','HP','VMAX','VSTAR','EX','GX','EVOLVES','FROM',
    'RESTORED','ANCIENT','FUTURE','ACE','SPEC',
  ]);

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const clean = line
      .replace(/\bHP\s*\d{2,3}\b/gi, '')
      .replace(/\d/g, '')
      .replace(/[^a-zA-ZÀ-ÿ\s\-]/g, '')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length > 2);
    const valid = words.filter(w => !stopWords.has(w.toUpperCase()));

    if (valid.length >= 1 && valid.length <= 3) {
      return valid.join(' ');
    }
  }
  return '';
}

/**
 * Main entry point: scans a captured card image, extracts number + name,
 * then queries the Pokémon TCG API for matching cards.
 *
 * OCR Strategy (optimized):
 *   1. Crop bottom 18% of image (card number footer)
 *   2. Upscale 4× with smooth interpolation
 *   3. Grayscale + mild S-curve contrast (NO hard binarization)
 *   4. Tesseract PSM 7 (single text line) → extract "072/197" pattern
 *   5. If number found → also do quick name OCR on top 20%
 *   6. Query API: number-first for precision; name-only fallback
 *
 * @param {string} imageSrc    Data URL of captured image
 * @param {Function} onProgress Progress callback ({status, percent, message})
 */
export async function scanAndIdentifyCard(imageSrc, onProgress) {
  let worker = null;

  try {
    // ── Step 1: Pre-process the bottom footer strip ──────────────────────────
    if (onProgress) onProgress({
      status: 'preprocessing',
      percent: 15,
      message: 'Recortando zona del número de carta...',
    });

    const footerImage = await cropFooterStrip(imageSrc, 0.82, 0.18, 4);

    // ── Step 2: Init Tesseract ───────────────────────────────────────────────
    if (onProgress) onProgress({
      status: 'ocr_loading',
      percent: 30,
      message: 'Iniciando reconocimiento óptico...',
    });

    worker = await createWorker('eng');

    // Allowlist only digits and slash — reduces OCR noise dramatically
    await worker.setParameters({
      tessedit_pageseg_mode: '7',           // PSM 7 = single text line
      tessedit_char_whitelist: '0123456789/\\|lIOoTGGgSV ',
    });

    // ── Step 3: OCR the footer strip ─────────────────────────────────────────
    if (onProgress) onProgress({
      status: 'reading_number',
      percent: 55,
      message: 'Extrayendo número de carta (ej: 072/197)...',
    });

    const footerRet = await worker.recognize(footerImage);
    const { number, setTotal } = parseCardNumber(footerRet.data.text);

    // ── Step 4: Try to get name if we have a card number ─────────────────────
    let detectedName = '';
    if (number) {
      if (onProgress) onProgress({
        status: 'reading_name',
        percent: 70,
        message: 'Leyendo nombre del Pokémon...',
      });
      // Reset whitelist for name scan
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        tessedit_char_whitelist: '',        // allow all chars for name
      });
      const nameImage = await cropFooterStrip(imageSrc, 0.0, 0.20, 2.5);
      const nameRet   = await worker.recognize(nameImage);
      detectedName    = parseRawName(nameRet.data.text);
    }

    await worker.terminate();
    worker = null;

    // ── Step 5: Build search query ────────────────────────────────────────────
    const parsed = {
      name:     detectedName,
      number,
      setTotal,
      setCode:  '',            // set code detection removed (unreliable from OCR)
      raw:      footerRet.data.text,
    };

    const hasNumber = !!number;
    const hasName   = !!detectedName;

    const summaryTag = [
      hasName   ? detectedName : '',
      hasNumber ? `${number}/${setTotal}` : '',
    ].filter(Boolean).join(' ');

    if (onProgress) onProgress({
      status: 'searching_api',
      percent: 85,
      message: `Buscando "${summaryTag || 'carta'}" en la base de datos...`,
    });

    // Prefer number-first search for maximum precision
    // Fall back to name-only if no number found
    let matchingCards = [];
    if (hasNumber) {
      matchingCards = await searchPokemonCards(parsed, 20);
    } else if (hasName) {
      matchingCards = await searchPokemonCards(detectedName, 15);
    }
    // If nothing detected at all, return empty (UI handles with editable field)

    if (onProgress) onProgress({
      status: 'done',
      percent: 100,
      message: hasNumber
        ? `¡Número detectado: ${number}/${setTotal}!`
        : hasName
          ? `¡Nombre detectado: ${detectedName}!`
          : 'OCR completado — edita la búsqueda manualmente.',
    });

    return {
      success: true,
      parsed,
      cards:   matchingCards,
      rawText: footerRet.data.text,
    };

  } catch (error) {
    if (worker) {
      try { await worker.terminate(); } catch (_) { /* ignore */ }
    }
    console.error('[CardScanner] Error:', error);
    return {
      success: false,
      error:   error.message || 'Error al procesar la imagen',
    };
  }
}
