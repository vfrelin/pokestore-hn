// Service to interact with the Pokemon TCG API (pokemontcg.io)

const BASE_URL = 'https://api.pokemontcg.io/v2';

// Common 3-letter set codes mapping to Pokemon TCG API set IDs
const SET_CODE_MAP = {
  'OBF': 'sv3',        // Obsidian Flames
  'MEW': 'sv3pt5',    // 151
  '151': 'sv3pt5',    // 151
  'PAL': 'sv2',        // Paldea Evolved
  'SVI': 'sv1',        // Scarlet & Violet Base
  'PAR': 'sv4',        // Paradox Rift
  'PAF': 'sv4a',       // Paldean Fates
  'TEF': 'sv5',        // Temporal Forces
  'TWM': 'sv6',        // Twilight Masquerade
  'SFA': 'sv6pt5',    // Shrouded Fable
  'SCR': 'sv7',        // Stellar Crown
  'SSP': 'sv8',        // Surging Sparks
  'CRZ': 'swsh12pt5', // Crown Zenith
  'SIT': 'swsh12',    // Silver Tempest
  'LOR': 'swsh11',    // Lost Origin
  'ASR': 'swsh10',    // Astral Radiance
  'BRS': 'swsh9',     // Brilliant Stars
  'FST': 'swsh8',     // Fusion Strike
  'CEL': 'cel25',     // Celebrations
  'EVS': 'swsh7',     // Evolving Skies
  'CRE': 'swsh6',     // Chilling Reign
  'BST': 'swsh5',     // Battle Styles
  'SHF': 'swsh45',    // Shining Fates
  'VIV': 'swsh4',     // Vivid Voltage
  'DAA': 'swsh3',     // Darkness Ablaze
  'RCL': 'swsh2',     // Rebel Clash
  'SSH': 'swsh1',     // Sword & Shield Base
  'HIF': 'sma',       // Hidden Fates
  'UNM': 'sm11',      // Unified Minds
  'UNB': 'sm10',      // Unbroken Bonds
  'TEU': 'sm9',       // Team Up
  'LOT': 'sm8',       // Lost Thunder
  'GRI': 'sm2',       // Guardians Rising
  'SUM': 'sm1',       // Sun & Moon Base
  'EVO': 'xy12',      // Evolutions
  'GEN': 'g1',        // Generations
  'ROS': 'xy6',       // Roaring Skies
  'BASE': 'base1',    // Base Set
  'JUNGLE': 'base2',  // Jungle
  'FOSSIL': 'base3'   // Fossil
};

/**
 * Advanced search cards from Pokemon TCG API
 * @param {string|object} query Search query string or structured object { name, number, setCode, setTotal }
 * @param {number} pageSize Number of results to return
 */
export async function searchPokemonCards(query, pageSize = 20) {
  if (!query) return [];

  let name = '';
  let number = '';
  let setTotal = '';
  let setCode = '';

  if (typeof query === 'object') {
    name = query.name || '';
    number = query.number || '';
    setTotal = query.setTotal || '';
    setCode = query.setCode || '';
  } else {
    // Parse string query (e.g. "Toxtricity 072/197" or "Charizard 199/165 OBF")
    const clean = query.trim();

    // Check for number pattern "072/197", "72/197", "199/165", "#072"
    const numberMatch = clean.match(/\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|]\s*([0-9]{1,3})\b/i);
    const simpleNumMatch = clean.match(/#\s*([0-9]{1,3})\b/);

    if (numberMatch) {
      number = numberMatch[1];
      setTotal = numberMatch[2];
    } else if (simpleNumMatch) {
      number = simpleNumMatch[1];
    }

    // Check for 3-letter set codes like "OBF", "PAL", "PAR"
    const words = clean.split(/\s+/);
    for (const w of words) {
      const upper = w.toUpperCase();
      if (SET_CODE_MAP[upper]) {
        setCode = upper;
        break;
      }
    }

    // Extract name by removing number and set code patterns
    name = clean
      .replace(/\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|]\s*([0-9]{1,3})\b/gi, '')
      .replace(/#\s*[0-9]{1,3}\b/g, '')
      .replace(new RegExp(`\\b(${Object.keys(SET_CODE_MAP).join('|')})\\b`, 'gi'), '')
      .trim();
  }

  // Clean numbers (remove leading zeros for matching: "072" -> "72")
  const numVariants = [];
  if (number) {
    numVariants.push(`"${number}"`);
    const noLeadingZeros = number.replace(/^0+/, '');
    if (noLeadingZeros && noLeadingZeros !== number) {
      numVariants.push(`"${noLeadingZeros}"`);
    }
  }

  // Build Lucene query for Pokemon TCG API
  const queryParts = [];

  if (name) {
    // Clean name from special chars for api
    const safeName = name.replace(/[^a-zA-Z0-9\s\-']/g, '').trim();
    if (safeName) {
      queryParts.push(`name:"*${safeName}*"`);
    }
  }

  if (numVariants.length > 0) {
    if (numVariants.length === 1) {
      queryParts.push(`number:${numVariants[0]}`);
    } else {
      queryParts.push(`(number:${numVariants.join(' or number:')})`);
    }
  }

  if (setCode && SET_CODE_MAP[setCode.toUpperCase()]) {
    const setId = SET_CODE_MAP[setCode.toUpperCase()];
    queryParts.push(`set.id:"${setId}"`);
  } else if (setTotal) {
    queryParts.push(`set.printedTotal:"${setTotal}"`);
  }

  let apiQuery = queryParts.join(' ');
  if (!apiQuery) {
    apiQuery = typeof query === 'string' ? `name:"*${query.trim()}*"` : 'name:"*Pikachu*"';
  }

  try {
    const url = `${BASE_URL}/cards?q=${encodeURIComponent(apiQuery)}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return formatApiCards(data.data);
      }
    }

    // Fallback: If combined query was too restrictive, search with name only
    if (name && (number || setCode || setTotal)) {
      const fallbackUrl = `${BASE_URL}/cards?q=name:"*${encodeURIComponent(name.replace(/[^a-zA-Z0-9\s]/g, ''))}*"&pageSize=${pageSize}&orderBy=-set.releaseDate`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const formatted = formatApiCards(fallbackData.data || []);
        
        // Sort matching card number to top
        if (number) {
          const cleanNum = number.replace(/^0+/, '');
          formatted.sort((a, b) => {
            const aNum = a.number.split('/')[0].replace(/^0+/, '');
            const bNum = b.number.split('/')[0].replace(/^0+/, '');
            if (aNum === cleanNum && bNum !== cleanNum) return -1;
            if (bNum === cleanNum && aNum !== cleanNum) return 1;
            return 0;
          });
        }
        return formatted;
      }
    }

    return [];
  } catch (error) {
    console.warn('Error fetching from Pokémon TCG API:', error);
    return [];
  }
}

/**
 * Normalizes Pokemon TCG API card into our app's inventory format
 */
export function formatApiCards(rawCards) {
  return rawCards.map(c => {
    // Extract market price from TCGPlayer if available
    let marketPrice = 0;
    if (c.tcgplayer && c.tcgplayer.prices) {
      const p = c.tcgplayer.prices;
      if (p.holofoil?.market) marketPrice = p.holofoil.market;
      else if (p.normal?.market) marketPrice = p.normal.market;
      else if (p.reverseHolofoil?.market) marketPrice = p.reverseHolofoil.market;
      else if (p['1stEditionHolofoil']?.market) marketPrice = p['1stEditionHolofoil'].market;
      else if (p.unlimitedHolofoil?.market) marketPrice = p.unlimitedHolofoil.market;
      else if (p.holofoil?.mid) marketPrice = p.holofoil.mid;
      else if (p.normal?.mid) marketPrice = p.normal.mid;
    }

    if (!marketPrice && c.cardmarket?.prices?.averageSellPrice) {
      marketPrice = Number((c.cardmarket.prices.averageSellPrice * 1.08).toFixed(2));
    }

    // Generate realistic historical snapshots for graph visualization
    const basePrice = marketPrice || 5.0;
    const history = [
      { date: 'Hace 30d', price: Number((basePrice * (0.88 + Math.random() * 0.1)).toFixed(2)) },
      { date: 'Hace 20d', price: Number((basePrice * (0.92 + Math.random() * 0.08)).toFixed(2)) },
      { date: 'Hace 10d', price: Number((basePrice * (0.96 + Math.random() * 0.06)).toFixed(2)) },
      { date: 'Hoy', price: Number(basePrice.toFixed(2)) }
    ];

    return {
      id: c.id,
      name: c.name,
      supertype: c.supertype || 'Pokémon',
      subtypes: c.subtypes || [],
      types: c.types || (c.supertype === 'Trainer' ? ['Trainer'] : ['Colorless']),
      set: {
        id: c.set?.id || 'unknown',
        name: c.set?.name || 'Colección Desconocida',
        series: c.set?.series || '',
        releaseDate: c.set?.releaseDate || ''
      },
      number: `${c.number || '0'}/${c.set?.printedTotal || c.set?.total || '0'}`,
      rarity: c.rarity || 'Común',
      images: {
        small: c.images?.small || 'https://images.pokemontcg.io/base1/4.png',
        large: c.images?.large || c.images?.small || 'https://images.pokemontcg.io/base1/4_hires.png'
      },
      marketPriceUsd: Number(basePrice.toFixed(2)),
      customPriceUsd: null,
      priceHistory: history,
      stock: 1,
      location: 'Álbum 1 - Pág 1',
      condition: 'NM',
      language: 'Inglés',
      notes: ''
    };
  });
}
