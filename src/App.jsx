import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import CardItem from './components/CardItem';
import CardDetailModal from './components/CardDetailModal';
import CartDrawer from './components/CartDrawer';
import AdminPanel from './components/Admin/AdminPanel';
import AdminPinModal from './components/Admin/AdminPinModal';
import { getStoredInventory, saveInventory, getStoredSettings, saveSettings } from './services/storage';
import { INITIAL_SAMPLE_CARDS, DEFAULT_SETTINGS } from './data/initialData';
import { 
  getSupabaseClient, 
  isCloudConfigured, 
  fetchCardsFromCloud, 
  insertCardToCloud, 
  updateCardInCloud, 
  updateStockInCloud, 
  deleteCardFromCloud, 
  subscribeToRealtimeCards,
  fetchSettingsFromCloud,
  saveSettingsToCloud
} from './services/supabase';
import { ShoppingBag, Sparkles, SlidersHorizontal, ArrowUp } from 'lucide-react';

export default function App() {
  const [cards, setCards] = useState(() => getStoredInventory());
  const [settings, setSettings] = useState(() => getStoredSettings());
  const [cart, setCart] = useState([]);
  
  // UI & Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSet, setSelectedSet] = useState('All');
  const [sortBy, setSortBy] = useState('price-desc');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Cloud client instance
  const supabase = useMemo(() => {
    return getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
  }, [settings.supabaseUrl, settings.supabaseAnonKey]);

  // Load from Cloud if configured & setup Realtime listener
  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    // 1. Initial cloud fetch
    async function loadCloudData() {
      try {
        const cloudCards = await fetchCardsFromCloud(supabase);
        if (isMounted && Array.isArray(cloudCards)) {
          setCards(cloudCards);
          saveInventory(cloudCards);
        }

        const cloudSettings = await fetchSettingsFromCloud(supabase);
        if (isMounted && cloudSettings) {
          setSettings(prev => ({ ...prev, ...cloudSettings }));
          saveSettings(cloudSettings);
        }
      } catch (err) {
        console.warn('Could not load from cloud, using local storage cache:', err);
      }
    }

    loadCloudData();

    // 2. Realtime WebSocket subscription
    const unsubscribe = subscribeToRealtimeCards(supabase, {
      onInsert: (newCard) => {
        setCards(prev => {
          if (prev.some(c => c.id === newCard.id)) return prev;
          const updated = [newCard, ...prev];
          saveInventory(updated);
          return updated;
        });
      },
      onUpdate: (updatedCard) => {
        setCards(prev => {
          const updated = prev.map(c => c.id === updatedCard.id ? updatedCard : c);
          saveInventory(updated);
          return updated;
        });
      },
      onDelete: (deletedCardId) => {
        setCards(prev => {
          const updated = prev.filter(c => c.id !== deletedCardId);
          saveInventory(updated);
          return updated;
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [supabase]);

  // Sync inventory changes locally
  useEffect(() => {
    saveInventory(cards);
  }, [cards]);

  // Sync settings changes locally & cloud
  useEffect(() => {
    saveSettings(settings);
    if (supabase) {
      saveSettingsToCloud(supabase, settings);
    }
  }, [settings, supabase]);

  // Available unique set names for dropdown
  const availableSets = useMemo(() => {
    const sets = Array.from(new Set(cards.map(c => c.set?.name).filter(Boolean)));
    return sets.sort();
  }, [cards]);

  // Handle Admin Button Click (Check PIN)
  const handleToggleAdminClick = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      // If already unlocked in this browser session, open directly
      const sessionUnlocked = sessionStorage.getItem('pokestore_admin_unlocked');
      if (sessionUnlocked === 'true') {
        setIsAdmin(true);
      } else {
        setIsPinModalOpen(true);
      }
    }
  };

  const handleUnlockAdmin = () => {
    sessionStorage.setItem('pokestore_admin_unlocked', 'true');
    setIsAdmin(true);
  };

  // Cart operations
  const handleAddToCart = (card, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.card.id === card.id);
      if (existing) {
        const newQty = Math.min(card.stock, existing.quantity + quantity);
        return prev.map(item => item.card.id === card.id ? { ...item, quantity: newQty } : item);
      } else {
        return [...prev, { card, quantity: Math.min(card.stock, quantity) }];
      }
    });
  };

  const handleUpdateCartQuantity = (cardId, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cardId);
      return;
    }
    setCart(prev => prev.map(item => item.card.id === cardId ? { ...item, quantity: newQty } : item));
  };

  const handleRemoveCartItem = (cardId) => {
    setCart(prev => prev.filter(item => item.card.id !== cardId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Admin inventory operations (Local + Cloud Realtime)
  const handleAddCard = async (newCard) => {
    setCards(prev => [newCard, ...prev]);
    if (supabase) {
      try {
        await insertCardToCloud(supabase, newCard);
      } catch (e) {
        console.error('Error inserting card to cloud:', e);
      }
    }
  };

  const handleUpdateStock = async (cardId, newStock) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stock: newStock } : c));
    if (supabase) {
      try {
        await updateStockInCloud(supabase, cardId, newStock);
      } catch (e) {
        console.error('Error updating stock to cloud:', e);
      }
    }
  };

  const handleUpdateCard = async (updatedCard) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    if (supabase) {
      try {
        await updateCardInCloud(supabase, updatedCard);
      } catch (e) {
        console.error('Error updating card in cloud:', e);
      }
    }
  };

  const handleDeleteCard = async (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    setCart(prev => prev.filter(item => item.card.id !== cardId));
    if (supabase) {
      try {
        await deleteCardFromCloud(supabase, cardId);
      } catch (e) {
        console.error('Error deleting card from cloud:', e);
      }
    }
  };

  const handleImportBackup = (importedCards, importedSettings) => {
    setCards(importedCards);
    if (importedSettings) setSettings(importedSettings);
  };

  const handleResetSampleData = () => {
    setCards(INITIAL_SAMPLE_CARDS);
    setSettings(DEFAULT_SETTINGS);
  };

  // Filter and sort cards for customer showcase
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Search matching (name, set, card number, rarity)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        card.name.toLowerCase().includes(q) ||
        card.set?.name.toLowerCase().includes(q) ||
        card.number.toLowerCase().includes(q) ||
        (card.rarity && card.rarity.toLowerCase().includes(q))
      );

      // Type matching
      const matchesType = selectedType === 'All' || 
        (card.types && card.types.includes(selectedType)) ||
        (selectedType === 'Trainer' && card.supertype === 'Trainer');

      // Set matching
      const matchesSet = selectedSet === 'All' || card.set?.name === selectedSet;

      // Stock matching
      const matchesStock = !onlyInStock || card.stock > 0;

      return matchesSearch && matchesType && matchesSet && matchesStock;
    }).sort((a, b) => {
      const priceA = a.customPriceUsd !== null && a.customPriceUsd !== undefined ? a.customPriceUsd : a.marketPriceUsd;
      const priceB = b.customPriceUsd !== null && b.customPriceUsd !== undefined ? b.customPriceUsd : b.marketPriceUsd;

      switch (sortBy) {
        case 'price-desc':
          return priceB - priceA;
        case 'price-asc':
          return priceA - priceB;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'stock-desc':
          return b.stock - a.stock;
        case 'recent':
        default:
          return 0;
      }
    });
  }, [cards, searchQuery, selectedType, selectedSet, onlyInStock, sortBy]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalStockInApp = cards.reduce((sum, c) => sum + (c.stock || 0), 0);

  const cartTotalUsd = cart.reduce((sum, item) => {
    const p = item.card.customPriceUsd ?? item.card.marketPriceUsd;
    return sum + (p * item.quantity);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Navigation Header */}
      <Header
        settings={settings}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdminClick}
        totalCardsInStock={totalStockInApp}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        
        {isAdmin ? (
          /* Admin / Inventory Management Suite */
          <AdminPanel
            cards={cards}
            onAddCard={handleAddCard}
            onUpdateStock={handleUpdateStock}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            settings={settings}
            onSaveSettings={setSettings}
            onImportBackup={handleImportBackup}
            onResetSampleData={handleResetSampleData}
            onExitAdmin={() => setIsAdmin(false)}
          />
        ) : (
          /* Customer Showcase / Vitrina */
          <div>
            
            {/* Hero Welcome Banner on Mobile */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-slate-800/80 p-4 sm:p-6 mb-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vitrina Oficial & Precios de Mercado</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
                  Catálogo de Cartas Pokémon
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Selecciona tus cartas favoritas, revisa precios en Dólares y Lempiras, y pide directamente por WhatsApp.
                </p>
              </div>
            </div>

            {/* Filters Bar */}
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              selectedSet={selectedSet}
              setSelectedSet={setSelectedSet}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onlyInStock={onlyInStock}
              setOnlyInStock={setOnlyInStock}
              availableSets={availableSets}
              totalResults={filteredCards.length}
            />

            {/* Cards Grid */}
            {filteredCards.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-base font-bold text-white mb-1">No se encontraron cartas</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Prueba cambiando el término de búsqueda o quitando los filtros de colección y tipo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pb-20">
                {filteredCards.map((card) => {
                  const inCartItem = cart.find(i => i.card.id === card.id);
                  return (
                    <CardItem
                      key={card.id}
                      card={card}
                      exchangeRate={Number(settings.exchangeRate) || 25}
                      onSelectCard={setSelectedCard}
                      onAddToCart={handleAddToCart}
                      inCartQty={inCartItem ? inCartItem.quantity : 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar on Mobile when Cart has items */}
      {!isAdmin && totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-bounce-short">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black p-3.5 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center justify-between border border-emerald-400/50 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center font-black text-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider font-extrabold text-slate-950">Ver Pedido</div>
                <div className="text-[11px] font-bold text-emerald-950">Listo para WhatsApp</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black font-heading">
                L. {(cartTotalUsd * (Number(settings.exchangeRate) || 25)).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] font-bold text-emerald-950">
                ${cartTotalUsd.toFixed(2)} USD
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Card Details Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        exchangeRate={Number(settings.exchangeRate) || 25}
        onAddToCart={handleAddToCart}
        inCartQty={selectedCard ? (cart.find(i => i.card.id === selectedCard.id)?.quantity || 0) : 0}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        settings={settings}
      />

      {/* Admin PIN Protection Modal */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onUnlock={handleUnlockAdmin}
        expectedPin={settings.adminPin || '1234'}
      />
    </div>
  );
}
