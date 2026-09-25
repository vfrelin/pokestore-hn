import React from 'react';
import { Search, X, Flame, Droplets, Leaf, Zap, Eye, Moon, Shield, Sparkles, Filter } from 'lucide-react';

const TYPES_LIST = [
  { id: 'All', label: 'Todos', color: 'bg-slate-800 text-white' },
  { id: 'Fire', label: 'Fuego', icon: Flame, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'Water', label: 'Agua', icon: Droplets, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'Grass', label: 'Planta', icon: Leaf, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'Lightning', label: 'Eléctrico', icon: Zap, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'Psychic', label: 'Psíquico', icon: Eye, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'Darkness', label: 'Oscuridad', icon: Moon, color: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/30' },
  { id: 'Dragon', label: 'Dragón', icon: Sparkles, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'Trainer', label: 'Entrenadores', icon: Shield, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' }
];

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedSet,
  setSelectedSet,
  sortBy,
  setSortBy,
  onlyInStock,
  setOnlyInStock,
  availableSets = [],
  totalResults = 0
}) {
  return (
    <div className="space-y-3 mb-6">
      {/* Main Search Input & Sorters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Pokémon, colección, # de carta o rareza..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Set Filter Dropdown */}
        <select
          value={selectedSet}
          onChange={(e) => setSelectedSet(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
        >
          <option value="All">Todas las Colecciones</option>
          {availableSets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Sorting Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
        >
          <option value="price-desc">Precio: Mayor a Menor ($)</option>
          <option value="price-asc">Precio: Menor a Mayor ($)</option>
          <option value="name-asc">Nombre: A - Z</option>
          <option value="stock-desc">Mayor Stock Disponible</option>
          <option value="recent">Novedades / Recientes</option>
        </select>
      </div>

      {/* Type Filter Chips (Horizontal scrollable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {TYPES_LIST.map((type) => {
          const isSelected = selectedType === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : `${type.color || 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{type.label}</span>
            </button>
          );
        })}

        {/* Stock Toggle Checkbox */}
        <label className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold cursor-pointer whitespace-nowrap hover:bg-slate-800/80 transition-all">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="rounded text-amber-500 focus:ring-amber-500/50 bg-slate-950 border-slate-700"
          />
          <span>Solo en Stock</span>
        </label>
      </div>

      {/* Results Counter & Active Filter Reset */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Mostrando <strong className="text-white font-bold">{totalResults}</strong> cartas disponibles</span>
        {(searchQuery || selectedType !== 'All' || selectedSet !== 'All' || onlyInStock) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('All');
              setSelectedSet('All');
              setOnlyInStock(false);
            }}
            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
