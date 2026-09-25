import { INITIAL_SAMPLE_CARDS, DEFAULT_SETTINGS } from '../data/initialData';

const STORAGE_KEYS = {
  INVENTORY: 'pokestore_inventory_v1',
  SETTINGS: 'pokestore_settings_v1',
  CART: 'pokestore_cart_v1'
};

/**
 * Loads inventory from LocalStorage or returns default initial cards
 */
export function getStoredInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      saveInventory(INITIAL_SAMPLE_CARDS);
      return INITIAL_SAMPLE_CARDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading inventory from storage', e);
    return INITIAL_SAMPLE_CARDS;
  }
}

/**
 * Saves entire inventory array to LocalStorage
 */
export function saveInventory(cards) {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving inventory to storage', e);
  }
}

/**
 * Loads store settings (exchange rate, phone, etc.)
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading settings', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves store settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

/**
 * Export full database to downloadable JSON file
 */
export function exportDatabaseBackup(cards, settings) {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    settings,
    totalCards: cards.length,
    cards
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pokestore_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds the WhatsApp order link
 */
export function generateWhatsAppOrderUrl({ cartItems, customerName, customerCity, settings }) {
  const phone = settings.sellerPhone.replace(/[^0-9]/g, '');
  const rate = Number(settings.exchangeRate) || 25.0;

  let totalUsd = 0;
  let totalCardsCount = 0;

  let messageLines = [
    `👋 *¡Hola! Vengo de tu vitrina de Pokémon TCG.*`,
    `Quiero hacer el siguiente pedido:\n`
  ];

  cartItems.forEach((item, index) => {
    const priceUsd = item.card.customPriceUsd !== null && item.card.customPriceUsd !== undefined
      ? item.card.customPriceUsd
      : item.card.marketPriceUsd;

    const itemTotalUsd = priceUsd * item.quantity;
    const itemTotalHnl = itemTotalUsd * rate;
    totalUsd += itemTotalUsd;
    totalCardsCount += item.quantity;

    const locTag = settings.autoIncludeLocationInWhatsApp && item.card.location
      ? ` 📍 _[${item.card.location}]_`
      : '';

    messageLines.push(
      `*${index + 1}. ${item.quantity}x ${item.card.name}* (#${item.card.number || ''} - ${item.card.set?.name || ''})`
    );
    messageLines.push(
      `   • Condición: *${item.card.condition || 'NM'}* | Idioma: *${item.card.language || 'Inglés'}*`
    );
    messageLines.push(
      `   • Precio: $${priceUsd.toFixed(2)} USD (~L. ${(priceUsd * rate).toFixed(2)} c/u)`
    );
    if (locTag) {
      messageLines.push(`   • Ubicación Álbum:${locTag}`);
    }
    messageLines.push('');
  });

  const totalHnl = totalUsd * rate;

  messageLines.push(`-----------------------------`);
  messageLines.push(`📦 *Total de cartas:* ${totalCardsCount}`);
  messageLines.push(`💵 *TOTAL USD:* $${totalUsd.toFixed(2)} USD`);
  messageLines.push(`🇭🇳 *TOTAL LPS:* L. ${totalHnl.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HNL`);
  
  if (customerName) {
    messageLines.push(`👤 *Cliente:* ${customerName.trim()}`);
  }
  if (customerCity) {
    messageLines.push(`📍 *Ciudad/Envío:* ${customerCity.trim()}`);
  }
  messageLines.push(`\n¿Me confirmas disponibilidad para coordinar el pago y entrega? ¡Gracias!`);

  const fullText = messageLines.join('\n');
  const encodedText = encodeURIComponent(fullText);

  return `https://wa.me/${phone}?text=${encodedText}`;
}
