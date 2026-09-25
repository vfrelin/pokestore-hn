import React, { useState } from 'react';
import { Plus, Check, MapPin, Sparkles, TrendingUp, Info } from 'lucide-react';

export default function CardItem({ 
  card, 
  exchangeRate = 25, 
  onSelectCard, 
  onAddToCart, 
  inCartQty = 0 
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const priceUsd = card.customPriceUsd !== null && card.customPriceUsd !== undefined
    ? card.customPriceUsd
    : card.marketPriceUsd;

  const priceHnl = priceUsd * exchangeRate;
  const isOutOfStock = card.stock <= 0;
  const isLowStock = card.stock === 1;

  // Condition styling
  const conditionColors = {
    NM: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    LP: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    MP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    HP: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    D: 'bg-zinc-700 text-zinc-300 border-zinc-600'
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (isOutOfStock || inCartQty >= card.stock) return;
    onAddToCart(card);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div
      onClick={() => onSelectCard(card)}
      className="group relative flex flex-col bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-500/50 rounded-3xl p-3 sm:p-3.5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer overflow-hidden"
    >
      {/* Holographic shimmer effect on hover */}
      <div className="card-holo-shine absolute inset-0 pointer-events-none z-10"></div>

      {/* Top Badges (Stock & Condition) */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 z-20">
        {/* Stock Badge */}
        {isOutOfStock ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
            Agotado
          </span>
        ) : isLowStock ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            ⚠️ Última copia
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            🔥 {card.stock} en stock
          </span>
        )}

        {/* Condition Badge */}
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${conditionColors[card.condition] || 'bg-slate-800 text-slate-300'}`}>
          {card.condition || 'NM'}
        </span>
      </div>

      {/* Card Image Wrapper */}
      <div className="relative aspect-[2.5/3.5] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center mb-3">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-slate-800/60 animate-pulse flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        )}
        <img
          src={card.images?.small || card.images?.large}
          alt={card.name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Album Location Floating Tag */}
        {card.location && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60 text-[10px] text-slate-300 font-medium flex items-center gap-1 truncate z-20">
            <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="truncate">{card.location}</span>
          </div>
        )}
      </div>

      {/* Card Metadata */}
      <div className="flex-1 flex flex-col justify-between z-20">
        <div>
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[11px] font-semibold text-slate-400 truncate">
              {card.set?.name || 'Set'} • {card.number}
            </span>
            {card.set?.releaseDate && (
              <span className="text-[10px] font-medium text-slate-500 flex-shrink-0">
                {card.set.releaseDate.substring(0, 4)}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
            {card.name}
          </h3>

          <p className="text-[11px] text-slate-400 font-medium truncate mb-2">
            {card.rarity || 'Carta TCG'}
          </p>
        </div>

        {/* Pricing & Add to Cart Section */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="text-base sm:text-lg font-black text-amber-400 leading-none">
              L. {priceHnl.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
              ${priceUsd.toFixed(2)} USD
            </div>
          </div>

          <button
            onClick={handleAddClick}
            disabled={isOutOfStock || inCartQty >= card.stock}
            className={`p-2.5 sm:px-3 sm:py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-90 ${
              justAdded
                ? 'bg-emerald-500 text-slate-950 scale-105'
                : inCartQty > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                : isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-emerald-500 text-white hover:text-slate-950 border border-slate-700 hover:border-emerald-400'
            }`}
            title="Agregar al pedido de WhatsApp"
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span className="hidden sm:inline">¡Listo!</span>
              </>
            ) : inCartQty > 0 ? (
              <>
                <Plus className="w-4 h-4" />
                <span>{inCartQty} en carrito</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
