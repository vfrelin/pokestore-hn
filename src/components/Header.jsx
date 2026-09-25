import React from 'react';
import { ShoppingBag, ShieldCheck, Sparkles, SlidersHorizontal, Cloud, Lock } from 'lucide-react';
import { isCloudConfigured } from '../services/supabase';

export default function Header({ 
  settings, 
  cartCount, 
  onOpenCart, 
  isAdmin, 
  onToggleAdmin, 
  totalCardsInStock 
}) {
  const isCloudActive = isCloudConfigured(settings.supabaseUrl, settings.supabaseAnonKey);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2px] shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-950">
                ✓
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-heading">
                  {settings.storeName}
                </h1>
                
                {/* Cloud Live Sync Badge */}
                {isCloudActive ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>En Vivo</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    TCG HN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {settings.storeTagline} • <span className="text-emerald-400">{totalCardsInStock} cartas en vitrina</span>
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Currency conversion pill */}
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 font-medium">$1 USD =</span>
              <span className="font-bold text-amber-400">L. {Number(settings.exchangeRate).toFixed(2)}</span>
            </div>

            {/* Admin / Seller Toggle - Generous touch target and comfortable position */}
            <button
              onClick={onToggleAdmin}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md ${
                isAdmin
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/50'
                  : 'bg-slate-900/95 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400/60 shadow-black/40'
              }`}
              title="Panel de inventario y gestión"
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span className="hidden sm:inline">Modo Vendedor</span>
                  <span className="sm:hidden">Admin</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Gestionar</span>
                  <span className="sm:hidden font-bold">Admin</span>
                </>
              )}
            </button>

            {/* Cart Button */}
            {!isAdmin && (
              <button
                onClick={onOpenCart}
                className="relative flex items-center justify-center p-2.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                aria-label="Ver carrito de compras"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="hidden sm:inline ml-2 text-xs font-black tracking-wide">
                  PEDIDO
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
