import React, { useState, useRef } from 'react';
import { X, Save, Download, Upload, Phone, DollarSign, RefreshCw, Check, Cloud, Key, Copy, Sparkles, Database } from 'lucide-react';
import { exportDatabaseBackup } from '../../services/storage';
import { SUPABASE_SQL_SETUP, isCloudConfigured, bulkUploadCardsToCloud, getSupabaseClient } from '../../services/supabase';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  cards,
  onImportBackup,
  onResetSampleData
}) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'cloud' | 'backup'
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handlePushAllToCloud = async () => {
    const client = getSupabaseClient(formData.supabaseUrl, formData.supabaseAnonKey);
    if (!client) {
      alert('⚠️ Primero debes ingresar y guardar tu URL y Key de Supabase abajo.');
      return;
    }
    setSyncingCloud(true);
    try {
      await bulkUploadCardsToCloud(client, cards);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      alert(`✅ ¡Éxito! Se han sincronizado tus ${cards.length} cartas a la base de datos en la nube.`);
    } catch (err) {
      alert(`❌ Error al subir cartas: ${err.message}`);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (json.cards && Array.isArray(json.cards)) {
          onImportBackup(json.cards, json.settings || settings);
          alert(`✅ ¡Copia de seguridad importada con éxito! Se cargaron ${json.cards.length} cartas.`);
          onClose();
        } else {
          alert('❌ El archivo no tiene el formato válido de copia de seguridad.');
        }
      } catch (err) {
        alert('❌ Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const cloudActive = isCloudConfigured(formData.supabaseUrl, formData.supabaseAnonKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="text-lg font-black text-white font-heading">⚙️ Configuración & Base en la Nube</h2>
            <p className="text-xs text-slate-400 font-medium">Sincronización en tiempo real, precios y seguridad</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'general' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🏪 Tienda & Precios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'cloud' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Base en la Nube (Tiempo Real)</span>
            {cloudActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'backup' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            💾 Respaldos JSON
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Identidad de la Vitrina</h3>
                
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre de la Tienda:</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subtítulo / Lema:</label>
                  <input
                    type="text"
                    value={formData.storeTagline}
                    onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Precios y Contacto</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Tasa de Cambio (Lps / USD):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.exchangeRate}
                      onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 25 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Ej: 25.00 Lps por $1 USD</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp para Pedidos:
                    </label>
                    <input
                      type="text"
                      value={formData.sellerPhone}
                      onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
                      placeholder="504XXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> PIN de Acceso Administrador:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.adminPin || '1234'}
                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                    className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold tracking-widest text-center"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Protege tu botón de Administrador frente a clientes.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <strong className="text-white text-xs">Sincronización en la Nube (100% Gratis con Supabase)</strong>
                </div>
                <p className="text-[11px] text-slate-300">
                  Al conectar tu base de datos gratuita de Supabase, cada carta que agregues o edites desde tu celular <strong>se actualizará al instante para todos tus clientes</strong> en tiempo real.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Project URL de Supabase:</label>
                  <input
                    type="text"
                    value={formData.supabaseUrl || ''}
                    onChange={(e) => setFormData({ ...formData, supabaseUrl: e.target.value.trim() })}
                    placeholder="https://xyzabcdef.supabase.co"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Anon Public Key de Supabase:</label>
                  <input
                    type="password"
                    value={formData.supabaseAnonKey || ''}
                    onChange={(e) => setFormData({ ...formData, supabaseAnonKey: e.target.value.trim() })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Push all cards to cloud button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePushAllToCloud}
                  disabled={syncingCloud || !formData.supabaseUrl}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Database className="w-4 h-4" />
                  <span>
                    {syncingCloud ? 'Sincronizando cartas...' : `Subir mis ${cards.length} cartas a la Nube`}
                  </span>
                </button>
              </div>

              {/* SQL script helper */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">📜 Script SQL de configuración:</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Pega este código en el <strong>SQL Editor</strong> de tu panel de Supabase para crear las tablas automáticamente.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-[11px]">
                Descarga un archivo con tus {cards.length} cartas registradas para no perder tus datos o transferirlos a otro celular o computadora.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => exportDatabaseBackup(cards, formData)}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Descargar Copia (.JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Cargar Copia (.JSON)</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Deseas restaurar el catálogo de ejemplo original?')) {
                      onResetSampleData();
                      onClose();
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Restaurar datos de prueba
                </button>
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Configuración Guardada!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
