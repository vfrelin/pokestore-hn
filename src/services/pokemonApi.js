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
  'PRE': 'sv9',        // Prismatic Evolutions
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates all number variants to search:
 * e.g. "094" → ["094", "94"]  |  "94" → ["94"]  |  "TG01" → ["TG01"]
 */
function numberVariants(num) {
  if (!num) return [];
  const variants = new Set([num]);
  // Strip leading zeros for numeric cards
  const stripped = num.replace(/^0+/, '');
  if (stripped && stripped !== num) variants.add(stripped);
  return [...variants];
}

/**
 * Fetches a single API URL and returns formatted cards or [].
 * Never throws — returns [] on any error.
 */
async function fetchCards(url) {
  try {
    const headers = { Accept: 'application/json' };
    const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_POKEMON_TCG_API_KEY;
    if (apiKey) headers['X-Api-Key'] = apiKey;

    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return formatApiCards(data.data || []);
  } catch {
    return [];
  }
}

/**
 * Deduplicate card array by card ID.
 */
function dedup(cards) {
  const seen = new Set();
  return cards.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEARCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search cards from Pokémon TCG API.
 *
 * Accepts:
 *   - string query: "Toxtricity", "094/192", "Pikachu 025", "Charizard OBF"
 *   - object:  { name, number, setTotal, setCode }
 *
 * Number search improvements:
 *   - Searches BOTH "094" and "94" in parallel to handle API inconsistencies
 *   - If number+set yields nothing, falls back to number-only across all sets
 *   - Results sorted: exact number match first
 *
 * @param {string|object} query
 * @param {number}        pageSize
 */
export async function searchPokemonCards(query, pageSize = 20) {
  if (!query) return [];

  let name = '';
  let number = '';
  let setTotal = '';
  let setCode = '';

  // ── Parse input ─────────────────────────────────────────────────────────────
  if (typeof query === 'object') {
    name     = query.name     || '';
    number   = query.number   || '';
    setTotal = query.setTotal || '';
    setCode  = query.setCode  || '';
  } else {
    const clean = query.trim();

    // Detect number pattern: "094/192", "94/192", "TG01/TG30"
    const numMatch = clean.match(/\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|]\s*([0-9]{1,3})\b/i);
    const simpleNum = clean.match(/#\s*([0-9]{1,3})\b/);

    if (numMatch) {
      number   = numMatch[1];
      setTotal = numMatch[2];
    } else if (simpleNum) {
      number = simpleNum[1];
    }

    // Detect 3-letter set codes
    for (const w of clean.split(/\s+/)) {
      if (SET_CODE_MAP[w.toUpperCase()]) { setCode = w.toUpperCase(); break; }
    }

    // Extract name: remove number, set code patterns
    name = clean
      .replace(/\b([0-9]{1,3}|TG\d{2}|GG\d{2}|SV\d{2})\s*[\/\\|]\s*([0-9]{1,3})\b/gi, '')
      .replace(/#\s*[0-9]{1,3}\b/g, '')
      .replace(new RegExp(`\\b(${Object.keys(SET_CODE_MAP).join('|')})\\b`, 'gi'), '')
      .trim();
  }

  // ── Resolve set ID ───────────────────────────────────────────────────────────
  const setId = setCode ? SET_CODE_MAP[setCode.toUpperCase()] : null;

  // ── Build query parts ────────────────────────────────────────────────────────
  const safeName = name.replace(/[^a-zA-Z0-9\s\-'éèêëàâùûüîïô]/g, '').trim();
  const variants = numberVariants(number);

  // ── Strategy A: Number-based search (most precise) ───────────────────────────
  if (variants.length > 0) {
    // Build one query per variant, run in parallel
    const numberQueries = variants.map(v => {
      const parts = [`number:"${v}"`];
      if (setId) {
        parts.push(`set.id:"${setId}"`);
      } else if (setTotal) {
        // printedTotal is an integer in pokemontcg.io schema - must NOT be quoted
        parts.push(`set.printedTotal:${parseInt(setTotal, 10)}`);
      } else if (safeName) {
        // Only add name filter if no set constraint was provided
        parts.push(`name:"${safeName}"`);
      }
      return parts.join(' ');
    });

    const urls = numberQueries.map(
      q => `${BASE_URL}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`
    );

    let results = dedup((await Promise.all(urls.map(fetchCards))).flat());

    // Sort: exact number match to top
    if (results.length > 0 && number) {
      results = sortByNumber(results, number);
      return results;
    }

    // Fallback A2: if number + set had a name that didn't match, or vice versa, try name + number
    if (results.length === 0 && safeName) {
      const nameNumQueries = variants.map(v => `name:"${safeName}" number:"${v}"`);
      const nameNumUrls = nameNumQueries.map(
        q => `${BASE_URL}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`
      );
      results = dedup((await Promise.all(nameNumUrls.map(fetchCards))).flat());
      if (results.length > 0) return sortByNumber(results, number);
    }

    // Fallback A3: number-only, no set restriction (wider net)
    if (results.length === 0) {
      const wideQueries = variants.map(v => `number:"${v}"`);
      const wideUrls = wideQueries.map(
        q => `${BASE_URL}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`
      );
      results = dedup((await Promise.all(wideUrls.map(fetchCards))).flat());
      if (results.length > 0) return sortByNumber(results, number);
    }

    // Fallback A4: name-only if still nothing
    if (results.length === 0 && safeName) {
      const nameUrl = `${BASE_URL}/cards?q=${encodeURIComponent(`name:"${safeName}"`)}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
      results = await fetchCards(nameUrl);
      return sortByNumber(results, number);
    }

    return results;
  }

  // ── Strategy B: Name-based search ───────────────────────────────────────────
  if (safeName) {
    const parts = [`name:"${safeName}"`];
    if (setId) parts.push(`set.id:"${setId}"`);

    const primaryUrl = `${BASE_URL}/cards?q=${encodeURIComponent(parts.join(' '))}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
    let results = await fetchCards(primaryUrl);

    // Fallback B2: name without set restriction
    if (results.length === 0 && setId) {
      const fallbackUrl = `${BASE_URL}/cards?q=${encodeURIComponent(`name:"${safeName}"`)}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
      results = await fetchCards(fallbackUrl);
    }

    return results;
  }

  // ── Strategy C: Raw string fallback ─────────────────────────────────────────
  if (typeof query === 'string' && query.trim()) {
    const raw = query.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    if (raw) {
      return fetchCards(`${BASE_URL}/cards?q=${encodeURIComponent(`name:"*${raw}*"`)}&pageSize=${pageSize}`);
    }
  }

  return [];
}

/**
 * Sort cards so the one matching `targetNumber` comes first.
 */
function sortByNumber(cards, targetNumber) {
  if (!targetNumber) return cards;
  const clean = targetNumber.replace(/^0+/, '');
  return [...cards].sort((a, b) => {
    const aNum = (a.number || '').split('/')[0].replace(/^0+/, '');
    const bNum = (b.number || '').split('/')[0].replace(/^0+/, '');
    if (aNum === clean && bNum !== clean) return -1;
    if (bNum === clean && aNum !== clean) return 1;
    return 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes Pokémon TCG API card into our app's inventory format.
 */
export function formatApiCards(rawCards) {
  return rawCards.map(c => {
    // Extract market price from TCGPlayer if available
    let marketPrice = 0;
    if (c.tcgplayer?.prices) {
      const p = c.tcgplayer.prices;
      marketPrice =
        p.holofoil?.market ||
        p.normal?.market ||
        p.reverseHolofoil?.market ||
        p['1stEditionHolofoil']?.market ||
        p.unlimitedHolofoil?.market ||
        p.holofoil?.mid ||
        p.normal?.mid ||
        0;
    }
    if (!marketPrice && c.cardmarket?.prices?.averageSellPrice) {
      marketPrice = Number((c.cardmarket.prices.averageSellPrice * 1.08).toFixed(2));
    }

    const basePrice = marketPrice || 5.0;
    const history = [
      { date: 'Hace 30d', price: Number((basePrice * (0.88 + Math.random() * 0.1)).toFixed(2)) },
      { date: 'Hace 20d', price: Number((basePrice * (0.92 + Math.random() * 0.08)).toFixed(2)) },
      { date: 'Hace 10d', price: Number((basePrice * (0.96 + Math.random() * 0.06)).toFixed(2)) },
      { date: 'Hoy',      price: Number(basePrice.toFixed(2)) },
    ];

    return {
      id: c.id,
      name: c.name,
      supertype: c.supertype || 'Pokémon',
      subtypes: c.subtypes || [],
      types: c.types || (c.supertype === 'Trainer' ? ['Trainer'] : ['Colorless']),
      set: {
        id:          c.set?.id          || 'unknown',
        name:        c.set?.name        || 'Colección Desconocida',
        series:      c.set?.series      || '',
        releaseDate: c.set?.releaseDate || '',
      },
      number:          `${c.number || '0'}/${c.set?.printedTotal || c.set?.total || '0'}`,
      rarity:          c.rarity || 'Común',
      images: {
        small: c.images?.small || 'https://images.pokemontcg.io/base1/4.png',
        large: c.images?.large || c.images?.small || 'https://images.pokemontcg.io/base1/4_hires.png',
      },
      marketPriceUsd:  Number(basePrice.toFixed(2)),
      customPriceUsd:  null,
      priceHistory:    history,
      stock:           1,
      location:        'Álbum 1 - Pág 1',
      condition:       'NM',
      language:        'Inglés',
      notes:           '',
    };
  });
}
