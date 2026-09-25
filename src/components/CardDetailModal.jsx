import React, { useState } from 'react';
import { X, MapPin, Sparkles, Plus, Minus, ShoppingBag, Check, Shield, ShieldCheck, Calendar, Layers, Globe } from 'lucide-react';
import PriceChart from './PriceChart';

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  exchangeRate = 25,
  onAddToCart,
  inCartQty = 0
}) {
  if (!isOpen || !card) return null;

  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const priceUsd = card.customPriceUsd !== null && card.customPriceUsd !== undefined
    ? card.customPriceUsd
    : card.marketPriceUsd;

  const priceHnl = priceUsd * exchangeRate;
  const maxAvailable = Math.max(0, card.stock - inCartQty);
  const isOutOfStock = card.stock <= 0 || maxAvailable <= 0;

  const handleAdd = () => {
    if (isOutOfStock || quantityToAdd > maxAvailable) return;
    onAddToCart(card, quantityToAdd);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Content Box */}
      <div className="relative w-full max-w-2xl bg-slate-900 border-t sm:border border-slate-800 sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl z-10 flex flex-col">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-lg px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
              {card.set?.name}
            </span>
            <span className="text-xs text-slate-400 font-medium">#{card.number}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            {/* Card High-Res Image */}
            <div className="relative aspect-[2.5/3.5] w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-slate-950 p-2 border border-slate-800 shadow-xl group">
              <img
                src={card.images?.large || card.images?.small}
                alt={card.name}
                className="w-full h-full object-contain rounded-xl"
              />
              <div className="card-holo-shine absolute inset-0 pointer-events-none rounded-2xl"></div>
            </div>

            {/* Information Column */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight font-heading">
                  {card.name}
                </h2>
                <p className="text-sm font-semibold text-amber-400 mt-0.5">
                  {card.rarity || 'Carta Pokémon TCG'}
                </p>
              </div>

              {/* Price Highlight */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Precio para Honduras</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-400 font-heading">
                    L. {priceHnl.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    (${priceUsd.toFixed(2)} USD)
                  </span>
                </div>
              </div>

              {/* Price Verification & Transparency Notice */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-slate-300">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-0.5">
                    <span>Precios Reales en Tiempo Real</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  Cotización oficial del mercado internacional (<strong>TCGPlayer USA</strong> y <strong>Cardmarket</strong>). Garantía de precio justo, transparente y 100% verificado según el valor real de coleccionista.
                </div>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                
                {/* Condition */}
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Condición</span>
                  <span className="font-extrabold text-emerald-400">
                    {card.condition === 'NM' ? 'Near Mint (Como nueva)' : card.condition}
                  </span>
                </div>

                {/* Language */}
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Idioma</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    {card.language || 'Inglés'}
                  </span>
                </div>

                {/* Stock */}
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Stock Total</span>
                  <span className="font-bold text-white">
                    {card.stock > 0 ? `${card.stock} unidades` : 'Sin stock'}
                  </span>
                </div>

                {/* Release Year */}
                <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Lanzamiento</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {card.set?.releaseDate || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Exact Physical Location in Binder */}
              {card.location && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ubicación física en álbum:</span>
                    <strong className="text-amber-300 font-bold">{card.location}</strong>
                  </div>
                </div>
              )}

              {/* Seller Notes */}
              {card.notes && (
                <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-400 block mb-0.5">Detalles del vendedor:</strong>
                  {card.notes}
                </div>
              )}
            </div>
          </div>

          {/* Historical Price Chart */}
          <div>
            <PriceChart history={card.priceHistory} exchangeRate={exchangeRate} />
          </div>
        </div>

        {/* Modal Footer / Add to Cart Action */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4 flex items-center gap-3">
          
          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1">
              <button
                onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                disabled={quantityToAdd <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-30"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-bold text-sm text-white">
                {quantityToAdd}
              </span>
              <button
                onClick={() => setQuantityToAdd(Math.min(maxAvailable, quantityToAdd + 1))}
                disabled={quantityToAdd >= maxAvailable}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Big Add Button */}
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
              justAdded
                ? 'bg-emerald-500 text-slate-950'
                : isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>¡Agregado al Pedido!</span>
              </>
            ) : isOutOfStock ? (
              <span>Sin Stock Disponible</span>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>Añadir al Carrito ({quantityToAdd}) • L. {(priceHnl * quantityToAdd).toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
