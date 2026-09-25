import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, Edit3, MapPin, DollarSign, Filter, Layers, Check } from 'lucide-react';

export default function InventoryList({
  cards,
  onUpdateStock,
  onUpdateCard,
  onDeleteCard,
  exchangeRate = 25
}) {
  const [search, setSearch] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('All');
  const [editingCard, setEditingCard] = useState(null);

  // Extract unique albums from location strings
  const albums = Array.from(new Set(
    cards.map(c => {
      if (!c.location) return 'Sin Álbum';
      const parts = c.location.split('-');
      return parts[0].trim();
    })
  )).filter(Boolean);

  // Filter cards
  const filteredCards = cards.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.set?.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(search.toLowerCase()));

    const matchesAlbum = selectedAlbum === 'All' || 
      (c.location && c.location.startsWith(selectedAlbum));

    return matchesSearch && matchesAlbum;
  });

  const handleQuickSaveEdit = (e) => {
    e.preventDefault();
    if (!editingCard) return;
    onUpdateCard(editingCard);
    setEditingCard(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en tu inventario por nombre, set o ubicación (ej: Pág 3)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Album Filter */}
        <select
          value={selectedAlbum}
          onChange={(e) => setSelectedAlbum(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-2xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="All">Todos los Álbumes ({cards.length})</option>
          {albums.map((album) => (
            <option key={album} value={album}>
              📁 {album}
            </option>
          ))}
        </select>
      </div>

      {/* Cards Table / List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-400 flex items-center justify-between">
          <span>{filteredCards.length} cartas en esta vista</span>
          <span className="text-[11px] text-amber-400">💡 Usa + y - para ajustar stock de repetidas</span>
        </div>

        <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
          {filteredCards.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron cartas con esos filtros.
            </div>
          ) : (
            filteredCards.map((card) => {
              const priceUsd = card.customPriceUsd !== null && card.customPriceUsd !== undefined
                ? card.customPriceUsd
                : card.marketPriceUsd;

              return (
                <div
                  key={card.id}
                  className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-850/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <img
                    src={card.images?.small}
                    alt={card.name}
                    className="w-12 h-16 object-contain rounded-lg bg-slate-950 flex-shrink-0"
                  />

                  {/* Card Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-white truncate">
                        {card.name}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {card.condition}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="truncate">{card.set?.name} • #{card.number}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">${priceUsd.toFixed(2)} USD</span>
                      <span className="text-slate-500">(~L. {(priceUsd * exchangeRate).toFixed(0)})</span>
                    </div>

                    {/* Album Location */}
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium mt-1">
                      <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{card.location || 'Sin ubicación'}</span>
                    </div>
                  </div>

                  {/* Stock Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() => onUpdateStock(card.id, Math.max(0, card.stock - 1))}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Restar 1 al stock"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`w-8 text-center text-xs font-black ${card.stock === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {card.stock}
                      </span>
                      <button
                        onClick={() => onUpdateStock(card.id, card.stock + 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Sumar 1 al stock (repetida)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingCard(card)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Editar ubicación o precio"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar ${card.name} del inventario?`)) {
                          onDeleteCard(card.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Eliminar de la vitrina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">Editar Carta: {editingCard.name}</h3>
              <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSaveEdit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">📍 Ubicación en Álbum / Casilla:</label>
                <input
                  type="text"
                  value={editingCard.location || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, location: e.target.value })}
                  placeholder="Ej: Álbum 1 - Pág 4 - Casilla 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">💵 Precio personalizado en USD (Opcional):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingCard.customPriceUsd ?? ''}
                  onChange={(e) => setEditingCard({
                    ...editingCard,
                    customPriceUsd: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder={`Mercado USA: $${editingCard.marketPriceUsd.toFixed(2)}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">✨ Condición:</label>
                <select
                  value={editingCard.condition}
                  onChange={(e) => setEditingCard({ ...editingCard, condition: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="NM">Near Mint (NM)</option>
                  <option value="LP">Lightly Played (LP)</option>
                  <option value="MP">Moderately Played (MP)</option>
                  <option value="HP">Heavily Played (HP)</option>
                  <option value="D">Damaged (D)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
