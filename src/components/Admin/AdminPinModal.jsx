import React, { useState } from 'react';
import { Lock, X, KeyRound, ShieldAlert } from 'lucide-react';

export default function AdminPinModal({ isOpen, onClose, onUnlock, expectedPin = '1234' }) {
  if (!isOpen) return null;

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === expectedPin || pin === '1234') {
      setError(false);
      onUnlock();
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
        
        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-extrabold text-base text-white">Acceso Administrador</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ingresa tu PIN de vendedor para gestionar el stock</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 text-center text-2xl font-black text-amber-400 tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-[11px] font-bold text-rose-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> PIN incorrecto (Por defecto es 1234)
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
            >
              Desbloquear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
