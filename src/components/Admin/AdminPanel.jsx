import React, { useState } from 'react';
import { Plus, Settings, Eye, Package, DollarSign, Layers, BookOpen } from 'lucide-react';
import InventoryList from './InventoryList';
import AddCardModal from './AddCardModal';
import SettingsModal from './SettingsModal';

export default function AdminPanel({
  cards,
  onAddCard,
  onUpdateStock,
  onUpdateCard,
  onDeleteCard,
  settings,
  onSaveSettings,
  onImportBackup,
  onResetSampleData,
  onExitAdmin
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const rate = Number(settings.exchangeRate) || 25.0;

  // Calculate inventory metrics
  const uniqueCardsCount = cards.length;
  const totalStockUnits = cards.reduce((sum, c) => sum + (c.stock || 0), 0);
  
  const totalValueUsd = cards.reduce((sum, c) => {
    const p = c.customPriceUsd !== null && c.customPriceUsd !== undefined ? c.customPriceUsd : c.marketPriceUsd;
    return sum + (p * (c.stock || 0));
  }, 0);

  const totalValueHnl = totalValueUsd * rate;

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Dashboard Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Modo Administrador</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              Gestor de Inventario y Álbumes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Administra tus 800+ cartas, actualiza el stock de repetidas y edita su ubicación física.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar Carta</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Ajustes y Respaldos"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onExitAdmin}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Ver Vitrina</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Modelos Únicos</span>
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white font-heading">{uniqueCardsCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Cartas diferentes registradas</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Unidades Físicas</span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-heading">{totalStockUnits}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sumando todas las repetidas</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Valor Total (USD)</span>
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black text-blue-400 font-heading">${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">A precio de mercado actual</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Valor Total (HNL)</span>
              <span className="text-xs font-bold text-amber-400">HN</span>
            </div>
            <div className="text-xl font-black text-amber-400 font-heading">
              L. {totalValueHnl.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tasa: L. {rate.toFixed(2)} por $1</div>
          </div>

        </div>
      </div>

      {/* Inventory List Component */}
      <InventoryList
        cards={cards}
        onUpdateStock={onUpdateStock}
        onUpdateCard={onUpdateCard}
        onDeleteCard={onDeleteCard}
        exchangeRate={rate}
      />

      {/* Modals */}
      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCard={onAddCard}
        exchangeRate={rate}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={onSaveSettings}
        cards={cards}
        onImportBackup={onImportBackup}
        onResetSampleData={onResetSampleData}
      />
    </div>
  );
}
