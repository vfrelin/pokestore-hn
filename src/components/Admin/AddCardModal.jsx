import React, { useState, useRef } from 'react';
import { Search, X, Hash, Check, Loader2, Camera, Type, MapPin, AlertCircle } from 'lucide-react';
import { searchPokemonCards } from '../../services/pokemonApi';
import CameraScanner from './CameraScanner';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects if a query is a pure card-number pattern and returns a structured
 * object ready for the API, or null if it's a plain name query.
 *
 * Handles:
 *   "12/178"    → { number: "12",  setTotal: "178" }
 *   "012/173"   → { number: "012", setTotal: "173" }
 *   "12 / 178"  → same
 *   "094"       → { number: "094", setTotal: "" }
 */
function parseNumberQuery(q) {
  const s = q.trim();
  const slashMatch = s.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (slashMatch) return { number: slashMatch[1], setTotal: slashMatch[2], name: '', setCode: '' };
  const numOnly = s.match(/^(\d{1,3})$/);
  if (numOnly) return { number: numOnly[1], setTotal: '', name: '', setCode: '' };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AddCardModal({ isOpen, onClose, onAddCard, exchangeRate = 25 }) {
  if (!isOpen) return null;

  // Text search is the default; camera is secondary
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'camera'

  const [query,         setQuery]         = useState('');
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCard,  setSelectedCard]  = useState(null);
  const [noResults,     setNoResults]     = useState(false);

  const inputRef = useRef(null);

  // Form Fields
  const [stock,          setStock]          = useState(1);
  const [albumName,      setAlbumName]      = useState('Álbum 1');
  const [pageNumber,     setPageNumber]     = useState('1');
  const [slotNumber,     setSlotNumber]     = useState('1');
  const [condition,      setCondition]      = useState('NM');
  const [language,       setLanguage]       = useState('Inglés');
  const [customPriceUsd, setCustomPriceUsd] = useState('');
  const [notes,          setNotes]          = useState('');

  // Live detection of number pattern for UI hints
  const numQuery    = parseNumberQuery(query);
  const isNumQuery  = Boolean(numQuery);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setNoResults(false);
    setSearchResults([]);
    try {
      // Pass structured object for number queries so the API runs parallel searches
      const apiQuery = parseNumberQuery(q) || q;
      const results  = await searchPokemonCards(apiQuery, 24);
      setSearchResults(results);
      setNoResults(results.length === 0);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    setCustomPriceUsd('');
  };

  const handleSave = () => {
    if (!selectedCard) return;
    const locationString = `${albumName} - Pág ${pageNumber} - Casilla ${slotNumber}`;
    const newCard = {
      ...selectedCard,
      id:            `${selectedCard.id}-${Date.now()}`,
      stock:         parseInt(stock, 10) || 1,
      location:      locationString,
      condition,
      language,
      customPriceUsd: customPriceUsd ? parseFloat(customPriceUsd) : null,
      notes,
    };
    onAddCard(newCard);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="text-lg font-black text-white font-heading flex items-center gap-2">
              <span>➕ Agregar Carta al Inventario</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Busca por nombre, número de carta (ej: <span className="text-amber-400 font-bold">012/173</span>) o usa la cámara
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Mode Tabs ── */}
        {!selectedCard && (
          <div className="px-4 sm:px-6 pt-4 pb-0 bg-slate-900 border-b border-slate-800/80 flex gap-2">
            <button
              onClick={() => setInputMode('text')}
              className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                inputMode === 'text'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>🔍 Buscar por Nombre o Número</span>
            </button>

            <button
              onClick={() => setInputMode('camera')}
              className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                inputMode === 'camera'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>📸 Cámara (OCR)</span>
            </button>
          </div>
        )}

        {/* ── Content Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {!selectedCard ? (
            inputMode === 'text' ? (
              /* ── TEXT SEARCH (primary) ── */
              <div className="space-y-4">

                {/* Search Form */}
                <form onSubmit={handleSearch} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      {isNumQuery
                        ? <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                        : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      }
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setNoResults(false); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Nombre (Charizard) o número (012/173) o (12/178)..."
                        className={`w-full bg-slate-950 border rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          isNumQuery
                            ? 'border-amber-500/60 focus:ring-amber-500/50'
                            : 'border-slate-800 focus:ring-amber-500/50'
                        }`}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searching || !query.trim()}
                      className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Buscar</span>
                    </button>
                  </div>

                  {/* Smart hint below input */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {isNumQuery ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        <Hash className="w-3 h-3" />
                        Buscando carta #{numQuery.number}{numQuery.setTotal ? `/${numQuery.setTotal}` : ''} en todas las colecciones
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Prueba: <button type="button" onClick={() => setQuery('012/173')} className="text-amber-400 hover:underline font-mono">012/173</button>
                        {' · '}
                        <button type="button" onClick={() => setQuery('Charizard')} className="text-amber-400 hover:underline">Charizard</button>
                        {' · '}
                        <button type="button" onClick={() => setQuery('Pikachu 025/165')} className="text-amber-400 hover:underline">Pikachu 025/165</button>
                      </span>
                    )}
                  </div>
                </form>

                {/* Results */}
                <div className="min-h-[200px]">
                  {searching ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                      <span className="text-xs">
                        {isNumQuery
                          ? `Buscando carta número ${query.trim()}...`
                          : 'Consultando base de datos oficial Pokémon TCG...'
                        }
                      </span>
                    </div>
                  ) : noResults ? (
                    <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-bold text-slate-300">Sin resultados para "{query}"</p>
                      <p className="text-xs text-slate-500">
                        {isNumQuery
                          ? 'Verifica el número. Intenta también agregar el nombre, ej: '
                          : 'Prueba con el número de carta, ej: '
                        }
                        <button
                          type="button"
                          onClick={() => { setQuery(isNumQuery ? `Charizard ${query.trim()}` : '012/173'); setTimeout(() => inputRef.current?.focus(), 50); }}
                          className="text-amber-400 underline font-bold"
                        >
                          {isNumQuery ? `Charizard ${query.trim()}` : '012/173'}
                        </button>
                      </p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-400 font-medium">
                        {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} — selecciona la carta:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                        {searchResults.map((c, idx) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCard(c)}
                            className={`p-2.5 border rounded-2xl cursor-pointer transition-all flex flex-col group ${
                              idx === 0
                                ? 'bg-amber-500/8 border-amber-500/40 hover:border-amber-400'
                                : 'bg-slate-950/80 border-slate-800 hover:border-amber-400/50 hover:bg-slate-800/80'
                            }`}
                          >
                            {idx === 0 && (
                              <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider mb-1">⭐ Mejor resultado</span>
                            )}
                            <img
                              src={c.images.small}
                              alt={c.name}
                              className="aspect-[2.5/3.5] w-full object-contain rounded-xl mb-2 group-hover:scale-105 transition-transform"
                            />
                            <div className="text-xs font-bold text-white truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{c.set?.name} · #{c.number}</div>
                            <div className="text-xs font-black text-amber-400 mt-1">
                              ${c.marketPriceUsd.toFixed(2)} · L. {(c.marketPriceUsd * exchangeRate).toFixed(0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-3">
                      <div className="text-3xl">🔍</div>
                      <p>Escribe el <strong className="text-slate-300">nombre</strong> o <strong className="text-slate-300">número</strong> de la carta arriba.</p>
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        {[['012/173','número'], ['Charizard ex','nombre'], ['Pikachu 025/165','nombre+número']].map(([ex, label]) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => { setQuery(ex); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 font-mono text-[11px] transition-colors"
                          >
                            {ex}
                            <span className="ml-1 text-slate-500 font-sans not-italic">({label})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── CAMERA MODE (secondary) ── */
              <CameraScanner
                onSelectCard={handleSelectCard}
                exchangeRate={exchangeRate}
                onCancel={onClose}
              />
            )
          ) : (
            /* ── STEP 2: Card details form ── */
            <div className="space-y-5">

              {/* Card Summary Banner */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCard.images.small}
                    alt={selectedCard.name}
                    className="w-14 h-20 object-contain rounded-lg"
                  />
                  <div>
                    <h3 className="font-black text-base text-white">{selectedCard.name}</h3>
                    <p className="text-xs text-amber-400 font-semibold">{selectedCard.set?.name} · #{selectedCard.number}</p>
                    <p className="text-xs text-slate-400">Precio de Mercado: <strong className="text-emerald-400">${selectedCard.marketPriceUsd.toFixed(2)} USD</strong></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-xs text-slate-400 hover:text-amber-400 underline font-semibold"
                >
                  Cambiar
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                {/* Stock */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">🔥 Cantidad en Stock (Repetidas):</label>
                  <input
                    type="number" min="1" value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                {/* Condition */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">✨ Estado / Condición:</label>
                  <select
                    value={condition} onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="NM">Near Mint (Como nueva / Impecable)</option>
                    <option value="LP">Lightly Played (Poco uso / Ligero desgaste)</option>
                    <option value="MP">Moderately Played (Uso moderado)</option>
                    <option value="HP">Heavily Played (Desgaste notorio)</option>
                    <option value="D">Damaged (Dañada)</option>
                  </select>
                </div>

                {/* Physical location */}
                <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl space-y-2">
                  <label className="block text-amber-300 font-bold text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    Ubicación Física en tu Colección / Álbum:
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Esto aparecerá en el pedido de WhatsApp para que vayas directo a buscarla.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Álbum / Caja:</span>
                      <input type="text" value={albumName} onChange={(e) => setAlbumName(e.target.value)}
                        placeholder="Ej: Álbum 1"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5"># de Página:</span>
                      <input type="text" value={pageNumber} onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Ej: 4"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Casilla / Posición:</span>
                      <input type="text" value={slotNumber} onChange={(e) => setSlotNumber(e.target.value)}
                        placeholder="Ej: 2"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium" />
                    </div>
                  </div>
                </div>

                {/* Custom price */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">💵 Precio personalizado en USD (Opcional):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input
                      type="number" step="0.01" value={customPriceUsd}
                      onChange={(e) => setCustomPriceUsd(e.target.value)}
                      placeholder={`Mercado: $${selectedCard.marketPriceUsd.toFixed(2)}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Déjalo vacío para usar el precio de mercado automático.</span>
                </div>

                {/* Language */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">🌐 Idioma de la Carta:</label>
                  <select
                    value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Inglés">Inglés (EN)</option>
                    <option value="Español">Español (ES)</option>
                    <option value="Japonés">Japonés (JP)</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">📝 Notas o comentarios adicionales:</label>
                  <input
                    type="text" value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Viene en toploader, centrado perfecto, etc."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
          >
            Cancelar
          </button>
          {selectedCard && (
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Guardar en Inventario
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
