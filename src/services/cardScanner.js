import { createWorker } from 'tesseract.js';
import { searchPokemonCards, formatApiCards } from './pokemonApi';

/**
 * Pre-processes an image on a hidden canvas to maximize OCR character recognition accuracy
 */
function preprocessImage(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Target size for good OCR performance
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to high-contrast grayscale
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Luminosity algorithm
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Boost contrast
        const factor = (259 * (128 + 50)) / (255 * (259 - 50));
        const contrastVal = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        data[i] = contrastVal;
        data[i + 1] = contrastVal;
        data[i + 2] = contrastVal;
      }
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Parses raw OCR text to extract Pokemon card name and number
 */
export function parsePokemonCardText(rawText) {
  if (!rawText) return { name: '', number: '', raw: '' };

  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2);

  // Common noise words on Pokemon cards
  const stopWords = new Set([
    'BASIC', 'STAGE', 'STAGE1', 'STAGE2', 'TRAINER', 'ITEM', 'SUPPORTER', 'STADIUM',
    'ENERGY', 'POKEMON', 'POKÉMON', 'HP', 'VMAX', 'VSTAR', 'EX', 'GX', 'WEAKNESS',
    'RESISTANCE', 'RETREAT', 'RULE', 'ILLUS', 'NO', 'HT', 'WT', 'GAME', 'FREAK',
    'NINTENDO', 'CREATURES', 'WIZARDS', 'COAST', 'HASBRO', 'SWORD', 'SHIELD', 'SCARLET', 'VIOLET'
  ]);

  let extractedName = '';
  let extractedNumber = '';

  // Look for card number pattern like "199/165", "025/165", "4/102", "TG01/TG30"
  const numberRegex = /\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|]\s*([0-9]{1,3})\b/i;
  for (const line of lines) {
    const match = line.match(numberRegex);
    if (match) {
      extractedNumber = `${match[1]}/${match[2]}`.replace(/\s+/g, '');
      break;
    }
  }

  // Look for Pokemon name (usually first or second non-empty prominent line)
  for (const line of lines) {
    const cleanLine = line.replace(/[^a-zA-Z\s\-]/g, '').trim();
    const words = cleanLine.split(/\s+/).filter(w => w.length > 2);
    
    // Check if this line is likely the card title
    const isNoise = words.every(w => stopWords.has(w.toUpperCase()));
    if (!isNoise && words.length > 0 && words.length <= 4) {
      // Clean out prefix noise like "BASIC" if attached
      const filteredWords = words.filter(w => !stopWords.has(w.toUpperCase()));
      if (filteredWords.length > 0) {
        extractedName = filteredWords.join(' ');
        break;
      }
    }
  }

  return {
    name: extractedName,
    number: extractedNumber,
    raw: rawText
  };
}

/**
 * Runs OCR and automatically queries the Pokemon TCG database
 */
export async function scanAndIdentifyCard(imageSrc, onProgress) {
  try {
    if (onProgress) onProgress({ status: 'preprocessing', percent: 15, message: 'Mejorando nitidez de la foto...' });

    const processedImage = await preprocessImage(imageSrc);

    if (onProgress) onProgress({ status: 'ocr_loading', percent: 35, message: 'Iniciando escáner óptico...' });

    const worker = await createWorker('eng');
    
    if (onProgress) onProgress({ status: 'ocr_scanning', percent: 60, message: 'Leyendo texto de la carta Pokémon...' });

    const ret = await worker.recognize(processedImage);
    await worker.terminate();

    const rawText = ret.data.text;
    const parsed = parsePokemonCardText(rawText);

    if (onProgress) onProgress({ status: 'searching_api', percent: 85, message: `Buscando "${parsed.name || 'Carta'}" en la base oficial...` });

    let matchingCards = [];

    // Strategy 1: Search by name and card number if found
    if (parsed.name) {
      let query = parsed.name;
      matchingCards = await searchPokemonCards(query, 15);
    }

    // If card number was detected (e.g. 199/165), prioritize cards with that number
    if (parsed.number && matchingCards.length > 0) {
      const numOnly = parsed.number.split('/')[0].replace(/^0+/, '');
      matchingCards.sort((a, b) => {
        const aNum = a.number.split('/')[0].replace(/^0+/, '');
        const bNum = b.number.split('/')[0].replace(/^0+/, '');
        if (aNum === numOnly && bNum !== numOnly) return -1;
        if (bNum === numOnly && aNum !== numOnly) return 1;
        return 0;
      });
    }

    if (onProgress) onProgress({ status: 'done', percent: 100, message: '¡Identificación completada!' });

    return {
      success: true,
      parsed,
      cards: matchingCards,
      rawText
    };
  } catch (error) {
    console.error('Scan error:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar la imagen'
    };
  }
}
