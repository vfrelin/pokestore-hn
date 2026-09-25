import React, { useState } from 'react';
import { Search, X, Plus, Sparkles, MapPin, DollarSign, Check, Loader2, Camera, Type } from 'lucide-react';
import { searchPokemonCards } from '../../services/pokemonApi';
import CameraScanner from './CameraScanner';

export default function AddCardModal({ isOpen, onClose, onAddCard, exchangeRate = 25 }) {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'text'
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  // Form Fields
  const [stock, setStock] = useState(1);
  const [albumName, setAlbumName] = useState('Álbum 1');
  const [pageNumber, setPageNumber] = useState('1');
  const [slotNumber, setSlotNumber] = useState('1');
  const [condition, setCondition] = useState('NM');
  const [language, setLanguage] = useState('Inglés');
  const [customPriceUsd, setCustomPriceUsd] = useState('');
  const [notes, setNotes] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchPokemonCards(query);
      setSearchResults(results);
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
      id: `${selectedCard.id}-${Date.now()}`,
      stock: parseInt(stock, 10) || 1,
      location: locationString,
      condition,
      language,
      customPriceUsd: customPriceUsd ? parseFloat(customPriceUsd) : null,
      notes
    };

    onAddCard(newCard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="text-lg font-black text-white font-heading flex items-center gap-2">
              <span>➕ Agregar Carta al Inventario</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Toma una foto de la carta o búscala por nombre
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (Camera vs Text) when not yet selected */}
        {!selectedCard && (
          <div className="px-4 sm:px-6 pt-4 pb-0 bg-slate-900 border-b border-slate-800/80 flex gap-2">
            <button
              onClick={() => setInputMode('camera')}
              className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                inputMode === 'camera'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>📸 Identificar con Cámara / Foto</span>
            </button>

            <button
              onClick={() => setInputMode('text')}
              className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                inputMode === 'text'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>🔍 Escribir Nombre / Set</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Step 1: Identification by Camera or Text */}
          {!selectedCard ? (
            inputMode === 'camera' ? (
              /* Camera & Photo OCR Scanner */
              <CameraScanner
                onSelectCard={handleSelectCard}
                exchangeRate={exchangeRate}
                onCancel={onClose}
              />
            ) : (
              /* Text search input */
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Escribe el nombre del Pokémon (Ej: Charizard 151, Pikachu, Mewtwo)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Buscar</span>
                  </button>
                </form>

                {/* Search Results Grid */}
                <div className="min-h-[250px]">
                  {searching ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                      <span className="text-xs">Consultando base de datos oficial Pokémon TCG...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                      {searchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCard(c)}
                          className="p-2.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/50 rounded-2xl cursor-pointer transition-all flex flex-col group"
                        >
                          <img
                            src={c.images.small}
                            alt={c.name}
                            className="aspect-[2.5/3.5] w-full object-contain rounded-xl mb-2 group-hover:scale-105 transition-transform"
                          />
                          <div className="text-xs font-bold text-white truncate">{c.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{c.set?.name} • #{c.number}</div>
                          <div className="text-xs font-black text-amber-400 mt-1">
                            ${c.marketPriceUsd.toFixed(2)} USD (~L. {(c.marketPriceUsd * exchangeRate).toFixed(0)})
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Escribe un nombre arriba y haz clic en "Buscar" para encontrar la carta con su imagen y precio oficial.
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Step 2: Configure Details (Album, Stock, Price) */
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
                    <p className="text-xs text-amber-400 font-semibold">{selectedCard.set?.name} • #{selectedCard.number}</p>
                    <p className="text-xs text-slate-400">Precio de Mercado USA: <strong className="text-emerald-400">${selectedCard.marketPriceUsd.toFixed(2)} USD</strong></p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-xs text-slate-400 hover:text-amber-400 underline font-semibold"
                >
                  Cambiar carta
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Stock (Duplicadas) */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">
                    🔥 Cantidad en Stock (Repetidas):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                {/* Condition */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">
                    ✨ Estado / Condición:
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="NM">Near Mint (Como nueva / Impecable)</option>
                    <option value="LP">Lightly Played (Poco uso / Ligero desgaste)</option>
                    <option value="MP">Moderately Played (Uso moderado)</option>
                    <option value="HP">Heavily Played (Desgaste notorio)</option>
                    <option value="D">Damaged (Dañada)</option>
                  </select>
                </div>

                {/* Album / Physical Location Form */}
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
                      <input
                        type="text"
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        placeholder="Ej: Álbum 1"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5"># de Página:</span>
                      <input
                        type="text"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Ej: Pág 4"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Casilla / Posición:</span>
                      <input
                        type="text"
                        value={slotNumber}
                        onChange={(e) => setSlotNumber(e.target.value)}
                        placeholder="Ej: 2"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Price Override */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">
                    💵 Precio personalizado en USD (Opcional):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customPriceUsd}
                      onChange={(e) => setCustomPriceUsd(e.target.value)}
                      placeholder={`Mercado: $${selectedCard.marketPriceUsd.toFixed(2)}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Déjalo vacío para usar el precio de mercado automático.
                  </span>
                </div>

                {/* Language */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">
                    🌐 Idioma de la Carta:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Inglés">Inglés (EN)</option>
                    <option value="Español">Español (ES)</option>
                    <option value="Japonés">Japonés (JP)</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <label className="block text-slate-300 font-bold mb-1">
                    📝 Notas o comentarios adicionales:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Viene en toploader, centrado perfecto, etc."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
