import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Send, ShoppingBag, MapPin, User, ArrowRight, Sparkles } from 'lucide-react';
import { generateWhatsAppOrderUrl } from '../services/storage';
import confetti from 'canvas-confetti';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  settings
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  if (!isOpen) return null;

  const rate = Number(settings.exchangeRate) || 25.0;

  // Calculate totals
  let totalUsd = 0;
  let totalCardsCount = 0;

  cartItems.forEach((item) => {
    const price = item.card.customPriceUsd !== null && item.card.customPriceUsd !== undefined
      ? item.card.customPriceUsd
      : item.card.marketPriceUsd;
    totalUsd += price * item.quantity;
    totalCardsCount += item.quantity;
  });

  const totalHnl = totalUsd * rate;

  const handleSendOrder = () => {
    if (cartItems.length === 0) return;

    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    const whatsappUrl = generateWhatsAppOrderUrl({
      cartItems,
      customerName,
      customerCity,
      settings
    });

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white font-heading">Tu Pedido Pokémon</h2>
                <p className="text-xs text-slate-400 font-medium">{totalCardsCount} {totalCardsCount === 1 ? 'carta' : 'cartas'} seleccionadas</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-slate-800/60 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl">
                  🎴
                </div>
                <h3 className="font-bold text-white text-base mb-1">Tu pedido está vacío</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Explora la vitrina y agrega las cartas que quieras comprar para armar tu pedido de WhatsApp.
                </p>
              </div>
            ) : (
              cartItems.map((item) => {
                const cardPrice = item.card.customPriceUsd !== null && item.card.customPriceUsd !== undefined
                  ? item.card.customPriceUsd
                  : item.card.marketPriceUsd;

                const itemSubtotalHnl = cardPrice * item.quantity * rate;
                const itemSubtotalUsd = cardPrice * item.quantity;

                return (
                  <div
                    key={item.card.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3 relative group"
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.card.images?.small}
                      alt={item.card.name}
                      className="w-14 h-18 object-contain rounded-lg bg-slate-900 flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-sm text-white truncate">
                          {item.card.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.card.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Eliminar del pedido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-amber-400">{item.card.set?.name}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{item.card.condition || 'NM'}</span>
                      </div>

                      {/* Location Badge */}
                      {item.card.location && (
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span className="truncate">{item.card.location}</span>
                        </div>
                      )}

                      {/* Price & Quantity Controls */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                        <div>
                          <span className="text-xs font-black text-amber-400">
                            L. {itemSubtotalHnl.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 block">
                            (${itemSubtotalUsd.toFixed(2)} USD)
                          </span>
                        </div>

                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.card.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.card.id, Math.min(item.card.stock, item.quantity + 1))}
                            disabled={item.quantity >= item.card.stock}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer & Checkout form */}
          {cartItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 space-y-3.5">
              
              {/* Optional Client Details for Faster WhatsApp Deal */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-slate-400" /> Tu Nombre (Opcional):
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: David"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> Ciudad / Entrega:
                  </label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="Ej: Tegucigalpa"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Total en Dólares (USA):</span>
                  <span className="font-bold text-white">${totalUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-black text-white font-heading">TOTAL EN LEMPIRAS:</span>
                  <span className="text-xl font-black text-emerald-400 font-heading">
                    L. {totalHnl.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 text-right mt-0.5">
                  Tasa: 1 USD = L. {rate.toFixed(2)} HNL
                </div>
              </div>

              {/* Big WhatsApp Checkout Button */}
              <button
                onClick={handleSendOrder}
                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>ENVIAR PEDIDO POR WHATSAPP</span>
              </button>

              <button
                onClick={onClearCart}
                className="w-full text-center text-xs text-slate-400 hover:text-rose-400 font-medium pt-1"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
