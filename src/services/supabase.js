import { createClient } from '@supabase/supabase-js';

// Environment variables or fallback from local settings
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient = null;

export function getSupabaseClient(customUrl, customKey) {
  let url = (customUrl || SUPABASE_URL || '').trim();
  const key = (customKey || SUPABASE_ANON_KEY || '').trim();

  // Strip trailing /rest/v1 or trailing slashes if user copied the full endpoint
  if (url) {
    url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }

  if (!url || !key) return null;

  if (!supabaseClient || supabaseClient.supabaseUrl !== url) {
    supabaseClient = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }

  return supabaseClient;
}

export function isCloudConfigured(customUrl, customKey) {
  const url = (customUrl || SUPABASE_URL || '').trim();
  const key = (customKey || SUPABASE_ANON_KEY || '').trim();
  return Boolean(url && key && url.includes('supabase.co'));
}

/**
 * Normalizes DB card to App format
 */
function normalizeFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    supertype: row.supertype || 'Pokémon',
    subtypes: row.subtypes || [],
    types: row.types || ['Colorless'],
    set: row.set || {},
    number: row.number || '',
    rarity: row.rarity || 'Común',
    images: row.images || {},
    stock: row.stock ?? 1,
    location: row.location || '',
    condition: row.condition || 'NM',
    language: row.language || 'Inglés',
    marketPriceUsd: row.market_price_usd ? Number(row.market_price_usd) : 0,
    customPriceUsd: row.custom_price_usd ? Number(row.custom_price_usd) : null,
    priceHistory: row.price_history || [],
    notes: row.notes || ''
  };
}

/**
 * Normalizes App card to DB format
 */
function normalizeToDb(card) {
  return {
    id: card.id,
    name: card.name,
    supertype: card.supertype,
    subtypes: card.subtypes,
    types: card.types,
    set: card.set,
    number: card.number,
    rarity: card.rarity,
    images: card.images,
    stock: card.stock,
    location: card.location,
    condition: card.condition,
    language: card.language,
    market_price_usd: card.marketPriceUsd,
    custom_price_usd: card.customPriceUsd,
    price_history: card.priceHistory,
    notes: card.notes
  };
}

/**
 * Fetch all cards from Supabase
 */
export async function fetchCardsFromCloud(client) {
  if (!client) return null;
  const { data, error } = await client
    .from('pokemon_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cards from Supabase:', error);
    throw error;
  }

  return (data || []).map(normalizeFromDb);
}

/**
 * Insert a new card into Supabase
 */
export async function insertCardToCloud(client, card) {
  if (!client) return;
  const row = normalizeToDb(card);
  const { error } = await client.from('pokemon_cards').insert(row);
  if (error) throw error;
}

/**
 * Update a card in Supabase
 */
export async function updateCardInCloud(client, card) {
  if (!client) return;
  const row = normalizeToDb(card);
  const { error } = await client.from('pokemon_cards').update(row).eq('id', card.id);
  if (error) throw error;
}

/**
 * Quick stock update
 */
export async function updateStockInCloud(client, cardId, newStock) {
  if (!client) return;
  const { error } = await client
    .from('pokemon_cards')
    .update({ stock: newStock })
    .eq('id', cardId);
  if (error) throw error;
}

/**
 * Delete a card from Supabase
 */
export async function deleteCardFromCloud(client, cardId) {
  if (!client) return;
  const { error } = await client.from('pokemon_cards').delete().eq('id', cardId);
  if (error) throw error;
}

/**
 * Bulk upload array of cards to Supabase
 */
export async function bulkUploadCardsToCloud(client, cards) {
  if (!client || !cards.length) return;
  const rows = cards.map(normalizeToDb);
  const { error } = await client.from('pokemon_cards').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Fetch store settings
 */
export async function fetchSettingsFromCloud(client) {
  if (!client) return null;
  const { data, error } = await client
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn('Error fetching settings from cloud:', error);
  }

  return data?.settings || null;
}

/**
 * Save store settings
 */
export async function saveSettingsToCloud(client, settings) {
  if (!client) return;
  const { error } = await client
    .from('store_settings')
    .upsert({ id: 'default', settings }, { onConflict: 'id' });
  if (error) console.warn('Error saving settings to cloud:', error);
}

/**
 * Setup real-time listener for postgres changes
 */
export function subscribeToRealtimeCards(client, { onInsert, onUpdate, onDelete }) {
  if (!client) return () => {};

  const channel = client
    .channel('public:pokemon_cards')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pokemon_cards' },
      (payload) => {
        if (onInsert) onInsert(normalizeFromDb(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pokemon_cards' },
      (payload) => {
        if (onUpdate) onUpdate(normalizeFromDb(payload.new));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'pokemon_cards' },
      (payload) => {
        if (onDelete) onDelete(payload.old.id);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export const SUPABASE_SQL_SETUP = `-- 1. Crea la tabla de cartas Pokémon
create table if not exists pokemon_cards (
  id text primary key,
  name text not null,
  supertype text,
  subtypes jsonb,
  types jsonb,
  set jsonb,
  number text,
  rarity text,
  images jsonb,
  stock integer default 1,
  location text,
  condition text default 'NM',
  language text default 'Inglés',
  market_price_usd numeric,
  custom_price_usd numeric,
  price_history jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Crea la tabla de configuración de tienda
create table if not exists store_settings (
  id text primary key default 'default',
  settings jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Habilita permisos públicos para lectura y escritura en tiempo real
alter table pokemon_cards enable row level security;
drop policy if exists "Acceso total a cartas" on pokemon_cards;
create policy "Acceso total a cartas" on pokemon_cards for all using (true) with check (true);

alter table store_settings enable row level security;
drop policy if exists "Acceso total a configuracion" on store_settings;
create policy "Acceso total a configuracion" on store_settings for all using (true) with check (true);

-- 4. Habilita publicación en Tiempo Real
alter publication supabase_realtime add table pokemon_cards;
alter publication supabase_realtime add table store_settings;
`;
