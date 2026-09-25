import { createWorker } from 'tesseract.js';
import { searchPokemonCards } from './pokemonApi';

/**
 * Cuts a specific vertical zone from an image and enhances contrast
 * @param {string} imageSrc Data URL or image path
 * @param {number} startY Top fraction (0.0 - 1.0)
 * @param {number} heightY Height fraction (0.0 - 1.0)
 * @param {number} scale Zoom multiplier for tiny text
 */
function cropAndEnhanceZone(imageSrc, startY, heightY, scale = 2.5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcY = Math.floor(img.height * startY);
      const srcHeight = Math.floor(img.height * heightY);
      const srcWidth = img.width;

      canvas.width = Math.floor(srcWidth * scale);
      canvas.height = Math.floor(srcHeight * scale);

      // Disable smoothing for sharp pixelated font edges in OCR
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);

      // Enhance contrast and binarize
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // High threshold binarization for clear text
        const threshold = 135;
        const val = gray > threshold ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Parses raw text extracted from bottom footer for card numbers and set codes
 */
export function parseFooterNomenclature(rawText) {
  if (!rawText) return { number: '', setTotal: '', setCode: '' };

  let number = '';
  let setTotal = '';
  let setCode = '';

  // Common set symbols on modern SV/SWSH cards
  const setCodes = [
    'OBF', 'MEW', 'PAL', 'SVI', 'PAR', 'PAF', 'TEF', 'TWM', 'SFA', 'SCR', 'SSP',
    'CRZ', 'SIT', 'LOR', 'ASR', 'BRS', 'FST', 'CEL', 'EVS', 'CRE', 'BST', 'SHF',
    'VIV', 'DAA', 'RCL', 'SSH', 'HIF', 'UNM', 'UNB', 'TEU', 'LOT', 'GRI', 'SUM',
    'SV1', 'SV2', 'SV3', 'SV4', 'SV5', 'SV6', 'SV7', 'SV8', 'EN', 'ES'
  ];

  // Pattern: "072/197", "72/197", "199/165", "025/165", "4/102", "TG01/TG30"
  const numMatch = rawText.match(/\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|Il]\s*([0-9]{1,3})\b/i);
  if (numMatch) {
    number = numMatch[1].replace(/^[oO]/, '0'); // Fix common OCR 'O' -> '0'
    setTotal = numMatch[2];
  }

  // Look for 3-letter set codes
  for (const code of setCodes) {
    const reg = new RegExp(`\\b${code}\\b`, 'i');
    if (reg.test(rawText)) {
      setCode = code.toUpperCase();
      break;
    }
  }

  return { number, setTotal, setCode };
}

/**
 * Parses raw text extracted from top header for Pokemon Name
 */
export function parseHeaderName(rawText) {
  if (!rawText) return '';

  const stopWords = new Set([
    'BASIC', 'STAGE', 'STAGE1', 'STAGE2', 'TRAINER', 'ITEM', 'SUPPORTER', 'STADIUM',
    'ENERGY', 'POKEMON', 'POKÉMON', 'HP', 'VMAX', 'VSTAR', 'EX', 'GX', 'EVOLVES', 'FROM'
  ]);

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Remove HP numbers and symbols (e.g. "Toxtricity HP 140" -> "Toxtricity")
    const cleanLine = line
      .replace(/\bHP\s*[0-9]{2,3}\b/gi, '')
      .replace(/[0-9]/g, '')
      .replace(/[^a-zA-Z\s\-]/g, '')
      .trim();

    const words = cleanLine.split(/\s+/).filter(w => w.length > 2);
    const validWords = words.filter(w => !stopWords.has(w.toUpperCase()));

    if (validWords.length > 0 && validWords.length <= 3) {
      return validWords.join(' ');
    }
  }

  return '';
}

/**
 * Multi-Zone Card Scanner: Scans Top Header for Name, and Bottom Footer for 072/197 & OBF
 */
export async function scanAndIdentifyCard(imageSrc, onProgress) {
  let worker = null;

  try {
    if (onProgress) onProgress({ status: 'preprocessing', percent: 15, message: 'Preparando zonas de la carta...' });

    // Zone 1: Top Header (0% to 22% of height) -> Name & HP
    const headerImage = await cropAndEnhanceZone(imageSrc, 0.0, 0.22, 2.0);

    // Zone 2: Bottom Footer (82% to 100% of height) -> Card Number (072/197) & Set Code (OBF)
    const footerImage = await cropAndEnhanceZone(imageSrc, 0.82, 0.18, 3.0);

    if (onProgress) onProgress({ status: 'ocr_loading', percent: 35, message: 'Iniciando escáner óptico de doble zona...' });

    worker = await createWorker('eng');

    // 1. Scan Header for Name
    if (onProgress) onProgress({ status: 'reading_name', percent: 50, message: 'Leyendo nombre del Pokémon...' });
    const headerRet = await worker.recognize(headerImage);
    const detectedName = parseHeaderName(headerRet.data.text);

    // 2. Scan Footer for Number & Set
    if (onProgress) onProgress({ status: 'reading_number', percent: 70, message: 'Extrayendo número de carta (ej: 072/197) y colección...' });
    const footerRet = await worker.recognize(footerImage);
    const footerData = parseFooterNomenclature(footerRet.data.text);

    await worker.terminate();
    worker = null;

    // Build rich search criteria
    const parsed = {
      name: detectedName || '',
      number: footerData.number || '',
      setTotal: footerData.setTotal || '',
      setCode: footerData.setCode || '',
      raw: `${headerRet.data.text}\n---\n${footerRet.data.text}`
    };

    if (onProgress) {
      const summaryTag = [
        parsed.name,
        parsed.number ? `#${parsed.number}${parsed.setTotal ? `/${parsed.setTotal}` : ''}` : '',
        parsed.setCode
      ].filter(Boolean).join(' ');

      onProgress({
        status: 'searching_api',
        percent: 85,
        message: `Buscando "${summaryTag || 'Carta'}" con coincidencia exacta...`
      });
    }

    // Query API with precise name + number + set
    const matchingCards = await searchPokemonCards(parsed, 15);

    if (onProgress) onProgress({ status: 'done', percent: 100, message: '¡Carta identificada!' });

    return {
      success: true,
      parsed,
      cards: matchingCards,
      rawText: parsed.raw
    };
  } catch (error) {
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    console.error('Scan error:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar la imagen'
    };
  }
}
