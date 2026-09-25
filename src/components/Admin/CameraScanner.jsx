import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Image as ImageIcon, Sparkles, RefreshCw, X,
  AlertCircle, Loader2, Search, Hash
} from 'lucide-react';
import { scanAndIdentifyCard } from '../../services/cardScanner';
import { searchPokemonCards } from '../../services/pokemonApi';

export default function CameraScanner({ onSelectCard, onCancel, exchangeRate = 25 }) {
  const [stream,         setStream]         = useState(null);
  const [capturedImage,  setCapturedImage]  = useState(null);
  const [isScanning,     setIsScanning]     = useState(false);
  const [scanProgress,   setScanProgress]   = useState(null);
  const [scanResults,    setScanResults]    = useState(null);
  const [cameraError,    setCameraError]    = useState(null);
  const [detectedData,   setDetectedData]   = useState(null);   // { name, number, setTotal, raw }

  // ── Editable search field shown immediately after scan ──────────────────────
  const [searchQuery,    setSearchQuery]    = useState('');
  const [isSearching,    setIsSearching]    = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Camera lifecycle ────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('No se pudo abrir la cámara. Puedes subir una foto desde tu galería.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  };

  // ── Capture from live video ─────────────────────────────────────────────────
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
    runOCR(dataUrl);
  };

  // ── Upload from gallery ─────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      setCapturedImage(dataUrl);
      stopCamera();
      runOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── Run OCR pipeline ────────────────────────────────────────────────────────
  const runOCR = async (imageDataUrl) => {
    setIsScanning(true);
    setScanProgress({ percent: 10, message: 'Iniciando escáner...' });
    setScanResults(null);
    setDetectedData(null);
    setSearchQuery('');

    const result = await scanAndIdentifyCard(imageDataUrl, setScanProgress);

    setIsScanning(false);

    if (!result.success) {
      // Even on error: show editable field so user can type manually
      setDetectedData({ name: '', number: '', setTotal: '', raw: '' });
      setSearchQuery('');
      setScanResults([]);
      setCameraError(result.error || 'No se pudo identificar la carta.');
      return;
    }

    const { parsed, cards } = result;
    setDetectedData(parsed);

    // Build a smart default query for the editable field
    const defaultQuery = [
      parsed.name,
      parsed.number ? `${parsed.number}${parsed.setTotal ? `/${parsed.setTotal}` : ''}` : '',
    ].filter(Boolean).join(' ');

    setSearchQuery(defaultQuery);
    setScanResults(cards);

    // Focus the search input so user can immediately edit if needed
    setTimeout(() => searchInputRef.current?.focus(), 150);
  };

  // ── Manual search from editable field ──────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      // If the query looks like "072/197" or "72/197" → search by number
      const numMatch = q.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
      if (numMatch) {
        const cards = await searchPokemonCards(
          { number: numMatch[1].padStart(3, '0'), setTotal: numMatch[2], name: '', setCode: '' },
          20
        );
        setScanResults(cards);
      } else {
        const cards = await searchPokemonCards(q, 20);
        setScanResults(cards);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Retake ──────────────────────────────────────────────────────────────────
  const handleRetake = () => {
    setCapturedImage(null);
    setScanResults(null);
    setDetectedData(null);
    setSearchQuery('');
    setCameraError(null);
    startCamera();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Viewfinder ──────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-sm mx-auto h-[360px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">

        {!capturedImage ? (
          <>
            {/* Live video feed */}
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Card-shaped guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center pb-16">
              <div className="w-[200px] aspect-[2.5/3.5] border-2 border-amber-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)] relative">
                {/* Corner markers */}
                {['-top-1 -left-1 border-t-4 border-l-4 rounded-tl',
                  '-top-1 -right-1 border-t-4 border-r-4 rounded-tr',
                  '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl',
                  '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br',
                ].map((cls, i) => (
                  <div key={i} className={`absolute ${cls} w-4 h-4 border-amber-400 shadow-[0_0_8px_#f59e0b]`} />
                ))}

                {/* Number zone indicator */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 border border-dashed border-amber-400/50 rounded px-1 py-0.5 text-center">
                  <span className="text-[8px] font-bold text-amber-300 flex items-center justify-center gap-0.5">
                    <Hash className="w-2 h-2" /> Zona número (ej: 072/197)
                  </span>
                </div>

                <div className="absolute -bottom-7 left-0 right-0 text-center">
                  <span className="text-[10px] font-black bg-slate-950/90 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/40">
                    Centra la carta · presiona capturar
                  </span>
                </div>
              </div>
            </div>

            {/* Shutter bar */}
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-around z-30">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-200 flex items-center justify-center shadow-lg active:scale-90 transition-all"
                title="Subir foto"
              >
                <ImageIcon className="w-5 h-5 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={handleCapturePhoto}
                className="w-16 h-16 rounded-full bg-slate-950 border-4 border-amber-400 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                title="Capturar carta"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                </div>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          /* Captured image + scanning overlay */
          <div className="relative w-full h-full">
            <img src={capturedImage} alt="Captura" className="w-full h-full object-contain bg-slate-950" />

            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-5 z-20">
                {/* Laser scanner line */}
                <div className="w-4/5 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_#f59e0b] animate-bounce mb-6" />
                <Loader2 className="w-9 h-9 text-amber-400 animate-spin mb-3" />
                <span className="text-sm font-black text-white text-center">
                  {scanProgress?.message || 'Analizando carta...'}
                </span>
                <div className="w-44 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${scanProgress?.percent || 20}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Retake button */}
      {capturedImage && !isScanning && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRetake}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-black flex items-center gap-2 border border-slate-700 transition-all shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Tomar otra foto
          </button>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2 max-w-sm mx-auto">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* ── Results panel (shown after scan, even if 0 results) ──────────── */}
      {detectedData !== null && !isScanning && (
        <div className="space-y-3 pt-1">

          {/* ── Editable search field — ALWAYS visible after scan ────────── */}
          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-300">
                {detectedData.number
                  ? `Número detectado: ${detectedData.number}${detectedData.setTotal ? `/${detectedData.setTotal}` : ''}`
                  : detectedData.name
                    ? `Nombre detectado: ${detectedData.name}`
                    : 'No se detectó texto — escribe el número o nombre manualmente:'
                }
              </span>
            </div>

            {/* Detected chips (quick info) */}
            {(detectedData.number || detectedData.name) && (
              <div className="flex flex-wrap gap-1.5">
                {detectedData.number && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-black">
                    #{detectedData.number}{detectedData.setTotal ? `/${detectedData.setTotal}` : ''}
                  </span>
                )}
                {detectedData.name && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    {detectedData.name}
                  </span>
                )}
              </div>
            )}

            {/* Main editable search bar */}
            <form onSubmit={handleSearch} className="flex gap-1.5">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ej: 072/197  ó  Toxtricity  ó  Pikachu 025"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow transition-all"
              >
                {isSearching
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Search className="w-3.5 h-3.5" />
                }
                <span>Buscar</span>
              </button>
            </form>

            <p className="text-[10px] text-slate-500">
              Puedes escribir el número (ej: <span className="text-slate-400 font-bold">072/197</span>), nombre, o nombre + número para mayor precisión.
            </p>
          </div>

          {/* ── Card results grid ─────────────────────────────────────────── */}
          {scanResults !== null && (
            <div>
              <span className="text-xs font-bold text-white block mb-2">
                {scanResults.length === 0
                  ? 'Sin resultados — edita la búsqueda arriba'
                  : `Selecciona tu carta (${scanResults.length} ${scanResults.length === 1 ? 'resultado' : 'resultados'}):`
                }
              </span>

              {scanResults.length === 0 ? (
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                  No encontramos coincidencias. Intenta escribir solo el número (ej: <strong className="text-slate-300">072/197</strong>) o solo el nombre.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[290px] overflow-y-auto p-1">
                  {scanResults.map((card, idx) => (
                    <div
                      key={card.id}
                      onClick={() => onSelectCard(card)}
                      className={`p-2.5 bg-slate-950 border rounded-2xl cursor-pointer transition-all flex flex-col group active:scale-95 ${
                        idx === 0
                          ? 'border-amber-400 shadow-xl shadow-amber-500/15 bg-gradient-to-b from-amber-500/10 to-slate-950 ring-2 ring-amber-400/50'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {idx === 0 && (
                        <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider mb-1">
                          ⭐ Mejor resultado
                        </span>
                      )}
                      <img
                        src={card.images?.small}
                        alt={card.name}
                        className="aspect-[2.5/3.5] w-full object-contain rounded-xl mb-1.5 group-hover:scale-105 transition-transform"
                      />
                      <div className="text-xs font-bold text-white truncate">{card.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {card.set?.name} · #{card.number}
                      </div>
                      <div className="text-xs font-black text-amber-400 mt-1">
                        ${card.marketPriceUsd?.toFixed(2)} · L.{(card.marketPriceUsd * exchangeRate).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
