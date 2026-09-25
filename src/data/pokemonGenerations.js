// Mapping of Pokemon names to their original generation (Gen 1 to Gen 9)
// Allows filtering cards by the Pokemon's generation regardless of the set/print date.

export const GEN_1_NAMES = new Set([
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard',
  'squirtle', 'wartortle', 'blastoise', 'caterpie', 'metapod', 'butterfree',
  'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot',
  'rattata', 'raticate', 'spearow', 'fearow', 'ekans', 'arbok',
  'pikachu', 'raichu', 'sandshrew', 'sandslash', 'nidoran♀', 'nidoran♂', 'nidoran',
  'nidorina', 'nidoqueen', 'nidorino', 'nidoking', 'clefairy', 'clefable',
  'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff', 'zubat', 'golbat',
  'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'venonat', 'venomoth',
  'diglett', 'dugtrio', 'meowth', 'persian', 'psyduck', 'golduck',
  'mankey', 'primeape', 'growlithe', 'arcanine', 'poliwag', 'poliwhirl', 'poliwrath',
  'abra', 'kadabra', 'alakazam', 'machop', 'machoke', 'machamp',
  'bellsprout', 'weepinbell', 'victreebel', 'tentacool', 'tentacruel',
  'geodude', 'graveler', 'golem', 'ponyta', 'rapidash', 'slowpoke', 'slowbro',
  'magnemite', 'magneton', "farfetch'd", 'farfetchd', 'doduo', 'dodrio',
  'seel', 'dewgong', 'grimer', 'muk', 'shellder', 'cloyster',
  'gastly', 'haunter', 'gengar', 'onix', 'drowzee', 'hypno',
  'krabby', 'kingler', 'voltorb', 'electrode', 'exeggcute', 'exeggutor',
  'cubone', 'marowak', 'hitmonlee', 'hitmonchan', 'lickitung', 'koffing', 'weezing',
  'rhyhorn', 'rhydon', 'chansey', 'tangela', 'kangaskhan', 'horsea', 'seadra',
  'goldeen', 'seaking', 'staryu', 'starmie', 'mr. mime', 'mr mime', 'scyther',
  'jynx', 'electabuzz', 'magmar', 'pinsir', 'tauros', 'magikarp', 'gyarados',
  'lapras', 'ditto', 'eevee', 'vaporeon', 'jolteon', 'flareon',
  'porygon', 'omanyte', 'omastar', 'kabuto', 'kabutops', 'aerodactyl',
  'snorlax', 'articuno', 'zapdos', 'moltres', 'dratini', 'dragonair', 'dragonite',
  'mewtwo', 'mew'
]);

export const GEN_2_NAMES = new Set([
  'chikorita', 'bayleef', 'meganium', 'cyndaquil', 'quilava', 'typhlosion',
  'totodile', 'croconaw', 'feraligatr', 'sentret', 'furret', 'hoothoot', 'noctowl',
  'ledyba', 'ledian', 'spinarak', 'ariados', 'crobat', 'chinchou', 'lanturn',
  'pichu', 'cleffa', 'igglybuff', 'togepi', 'togetic', 'natu', 'xatu',
  'mareep', 'flaaffy', 'ampharos', 'bellossom', 'marill', 'azumarill',
  'sudowoodo', 'politoed', 'hoppip', 'skiploom', 'jumpluff', 'aipom',
  'sunkern', 'sunflora', 'yanma', 'wooper', 'quagsire', 'espeon', 'umbreon',
  'murkrow', 'slowking', 'misdreavus', 'unown', 'wobbuffet', 'girafarig',
  'pineco', 'forretress', 'dunsparce', 'gligar', 'steelix', 'snubbull', 'granbull',
  'qwilfish', 'scizor', 'shuckle', 'heracross', 'sneasel', 'teddiursa', 'ursaring',
  'slugma', 'magcargo', 'swinub', 'piloswine', 'corsola', 'remoraid', 'octillery',
  'delibird', 'mantine', 'skarmory', 'houndour', 'houndoom', 'kingdra',
  'phanpy', 'donphan', 'porygon2', 'stantler', 'smeargle', 'tyrogue', 'hitmontop',
  'smoochum', 'elekid', 'magby', 'miltank', 'blissey', 'raikou', 'entei', 'suicune',
  'larvitar', 'pupitar', 'tyranitar', 'lugia', 'ho-oh', 'celebi'
]);

export const GEN_3_NAMES = new Set([
  'treecko', 'grovyle', 'sceptile', 'torchic', 'combusken', 'blaziken',
  'mudkip', 'marshtomp', 'swampert', 'poochyena', 'mightyena', 'zigzagoon', 'linoone',
  'wurmple', 'silcoon', 'beautifly', 'cascoon', 'dustox', 'lotad', 'lombre', 'ludicolo',
  'seedot', 'nuzleaf', 'shiftry', 'taillow', 'swellow', 'wingull', 'pelipper',
  'ralts', 'kirlia', 'gardevoir', 'surskit', 'masquerain', 'shroomish', 'breloom',
  'slakoth', 'vigoroth', 'slaking', 'nincada', 'ninjask', 'shedinja',
  'whismur', 'loudred', 'exploud', 'makuhita', 'hariyama', 'azurill', 'nosepass',
  'skitty', 'delcatty', 'sableye', 'mawile', 'aron', 'lairon', 'aggron',
  'meditite', 'medicham', 'electrike', 'manectric', 'plusle', 'minun',
  'volbeat', 'illumise', 'roselia', 'gulpin', 'swalot', 'carvanha', 'sharpedo',
  'wailmer', 'wailord', 'numel', 'camerupt', 'torkoal', 'spoink', 'grumpig',
  'spinda', 'trapinch', 'vibrava', 'flygon', 'cacnea', 'cacturne',
  'swablu', 'altaria', 'zangoose', 'seviper', 'lunatone', 'solrock',
  'barboach', 'whiscash', 'corphish', 'crawdaunt', 'baltoy', 'claydol',
  'lileep', 'cradily', 'anorith', 'armaldo', 'feebas', 'milotic',
  'castform', 'kecleon', 'shuppet', 'banette', 'duskull', 'dusclops',
  'tropius', 'chimecho', 'absol', 'wynaut', 'snorunt', 'glalie',
  'spheal', 'sealeo', 'walrein', 'clamperl', 'huntail', 'gorebyss',
  'relicanth', 'luvdisc', 'bagon', 'shelgon', 'salamence',
  'beldum', 'metang', 'metagross', 'regirock', 'regice', 'registeel',
  'latias', 'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys'
]);

export const GEN_4_NAMES = new Set([
  'turtwig', 'grotle', 'torterra', 'chimchar', 'monferno', 'infernape',
  'piplup', 'prinplup', 'empoleon', 'starly', 'staravia', 'staraptor',
  'bidoof', 'bibarel', 'kricketot', 'kricketune', 'shinx', 'luxio', 'luxray',
  'budew', 'roserade', 'cranidos', 'rampardos', 'shieldon', 'bastiodon',
  'burmy', 'wormadam', 'mothim', 'combee', 'vespiquen', 'pachirisu',
  'buizel', 'floatzel', 'cherubi', 'cherrim', 'shellos', 'gastrodon',
  'ambipom', 'drifloon', 'drifblim', 'buneary', 'lopunny', 'mismagius',
  'honchkrow', 'glameow', 'purugly', 'chingling', 'stunky', 'skuntank',
  'bronzor', 'bronzong', 'bonsly', 'mime jr.', 'mime jr', 'happiny',
  'chatot', 'spiritomb', 'gible', 'gabite', 'garchomp', 'munchlax',
  'riolu', 'lucario', 'hippopotas', 'hippowdon', 'skorupi', 'drapion',
  'croagunk', 'toxicroak', 'carnivine', 'finneon', 'lumineon', 'mantyke',
  'snover', 'abomasnow', 'weavile', 'magnezone', 'lickilicky', 'rhyperior',
  'tangrowth', 'electivire', 'magmortar', 'togekiss', 'yanmega', 'leafeon',
  'glaceon', 'gliscor', 'mamoswine', 'porygon-z', 'gallade', 'probopass',
  'dusknoir', 'froslass', 'rotom', 'uxie', 'mesprit', 'azelf',
  'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia',
  'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus'
]);

// Helper to extract root Pokemon name from card name (e.g. "Charizard ex" -> "charizard", "Galarian Rapidash" -> "rapidash", "Radiant Blastoise" -> "blastoise")
export function getRootPokemonName(cardName) {
  if (!cardName) return '';
  let clean = cardName.toLowerCase();

  // Strip prefixes like "galarian", "alolan", "hisuian", "radiant", "dark", "light", "shining", "team rocket's", etc.
  clean = clean.replace(/^(galarian|alolan|hisuian|paldean|radiant|dark|light|shining|rocket's|giovanni's|brock's|misty's|lt\. surge's|erika's|koga's|sabrina's|blaine's)\s+/i, '');

  // Strip suffixes like "ex", "gx", "vmax", "vstar", "v", "lv.x", "break", "prime", "tag team", etc.
  clean = clean.replace(/\s+(ex|gx|vmax|vstar|v-union|v|prime|break|star|delta|legend|\d+|promo|holo).*$/i, '');

  // Strip words in parentheses
  clean = clean.replace(/\s*\([^)]*\)/g, '');

  return clean.trim();
}

/**
 * Determine which generation a card belongs to based on Pokemon name
 * @param {object|string} cardOrName
 * @returns {number|null} Generation number (1, 2, 3, 4, etc.) or null if trainer/unknown
 */
export function getCardGeneration(cardOrName) {
  const rawName = typeof cardOrName === 'string' ? cardOrName : cardOrName?.name || '';
  if (!rawName) return null;

  const root = getRootPokemonName(rawName);

  // Check Gen 1 (151)
  if (GEN_1_NAMES.has(root)) return 1;
  // Check substrings if compound name like "Charizard & Braixen"
  for (const name of GEN_1_NAMES) {
    if (root.startsWith(name) || root.endsWith(name) || root === name) return 1;
  }

  // Check Gen 2
  if (GEN_2_NAMES.has(root)) return 2;
  for (const name of GEN_2_NAMES) {
    if (root.startsWith(name) || root.endsWith(name) || root === name) return 2;
  }

  // Check Gen 3
  if (GEN_3_NAMES.has(root)) return 3;
  for (const name of GEN_3_NAMES) {
    if (root.startsWith(name) || root.endsWith(name) || root === name) return 3;
  }

  // Check Gen 4
  if (GEN_4_NAMES.has(root)) return 4;
  for (const name of GEN_4_NAMES) {
    if (root.startsWith(name) || root.endsWith(name) || root === name) return 4;
  }

  return 5; // Gen 5+ or others
}

/**
 * Classify card finish / visual category:
 * - 'holo': Holográficas / Holofoil / Reverse Holo / Radiant
 * - 'normal': Normales / Non-holo / Cartas comunes sin brillo
 * - 'trainer': Entrenadores (Supporters, Items, Stadiums, Tools)
 * - 'fullart': Full Art / Especiales / Illustration Rare / Secret Rare / Ultra Rare / Alt Art / VMAX / VSTAR / EX
 */
export function getCardFinishCategory(card) {
  if (!card) return 'normal';

  const supertype = (card.supertype || '').toLowerCase();
  const rarity = (card.rarity || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  const subtypes = Array.isArray(card.subtypes) ? card.subtypes.map(s => s.toLowerCase()) : [];

  // Known sets where 100% of cards are Holofoil/Foil by manufacture design
  const setName = (card.set?.name || '').toLowerCase();
  const setId = (card.set?.id || '').toLowerCase();
  const isAllHoloSet = 
    setName.includes('celebrations') || 
    setId === 'cel25' || 
    setId === 'cel25c' ||
    setName.includes('detective pikachu') ||
    setName.includes('dragon vault') ||
    setName.includes('double crisis');

  if (supertype === 'trainer' || subtypes.includes('supporter') || subtypes.includes('item') || subtypes.includes('stadium')) {
    return 'trainer';
  }

  // Full Art / Special Illustration / Secret Rare / Alt Art / Hyper Rare
  const isFullArt = 
    rarity.includes('special illustration') ||
    rarity.includes('illustration rare') ||
    rarity.includes('secret rare') ||
    rarity.includes('ultra rare') ||
    rarity.includes('hyper rare') ||
    rarity.includes('shiny rare') ||
    rarity.includes('shiny ultra') ||
    rarity.includes('classic collection') ||
    subtypes.includes('vmax') ||
    subtypes.includes('vstar') ||
    subtypes.includes('radiant') ||
    rarity.includes('full art') ||
    name.includes(' ex') ||
    name.includes(' gx') ||
    name.includes(' vmax') ||
    name.includes(' vstar');

  if (isFullArt) return 'fullart';

  // Holo (Including Celebrations, Double Rare, Amazing Rare, ACE SPEC, etc.)
  const isHolo = 
    isAllHoloSet ||
    rarity.includes('holo') ||
    rarity.includes('rare holo') ||
    rarity.includes('reverse') ||
    rarity.includes('radiant') ||
    rarity.includes('amazing') ||
    rarity.includes('double rare') ||
    rarity.includes('ace spec') ||
    rarity.includes('shining') ||
    rarity.includes('promo') ||
    (card.notes && card.notes.toLowerCase().includes('holo'));

  if (isHolo) return 'holo';

  return 'normal';
}
