import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Sparkles, RefreshCw, X,
  AlertCircle, Loader2, Search, Crop,
  CheckCircle, ZoomIn,
} from 'lucide-react';
import { scanAndIdentifyCard } from '../../services/cardScanner';
import { searchPokemonCards } from '../../services/pokemonApi';

// ─────────────────────────────────────────────────────────────────────────────
// CROP OVERLAY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple interactive crop overlay rendered over the captured image.
 * Default selection = top 22% (name zone). User can drag handles to resize.
 * Fires onConfirm(croppedDataUrl) when user taps "Analizar".
 */
function CropOverlay({ imageSrc, imageWidth, imageHeight, onConfirm, onSkip }) {
  const canvasRef  = useRef(null);
  const overlayRef = useRef(null);

  // Selection in normalized coords [0..1]
  const [sel, setSel] = useState({ x: 0, y: 0, w: 1, h: 0.22 });
  const dragState = useRef(null); // { handle, startX, startY, startSel }

  // Draw on every sel change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);

      // Dim unselected area
      const sx = sel.x * W;
      const sy = sel.y * H;
      const sw = sel.w * W;
      const sh = sel.h * H;

      ctx.fillStyle = 'rgba(2,6,23,0.68)';
      ctx.fillRect(0, 0, W, sy);               // top
      ctx.fillRect(0, sy + sh, W, H - sy - sh); // bottom
      ctx.fillRect(0, sy, sx, sh);              // left
      ctx.fillRect(sx + sw, sy, W - sx - sw, sh); // right

      // Selection border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth   = 2;
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);

      // Corner handles
      const hs = 10;
      ctx.fillStyle = '#f59e0b';
      [[sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });

      // Label
      ctx.fillStyle = 'rgba(245,158,11,0.95)';
      ctx.fillRect(sx, sy - 20, 120, 20);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('  Zona del nombre', sx + 2, sy - 5);
    };
    img.src = imageSrc;
  }, [sel, imageSrc]);

  // Pointer events for dragging bottom edge (simplest resize UX on mobile)
  const getRelXY = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top)  / rect.height,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getRelXY(e, canvas);
    // Determine if near bottom edge (drag to resize height)
    const bottomY = sel.y + sel.h;
    const near = Math.abs(y - bottomY) < 0.05;
    dragState.current = {
      handle: near ? 'bottom' : 'move',
      startX: x, startY: y,
      startSel: { ...sel },
    };
  };

  const onPointerMove = (e) => {
    if (!dragState.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getRelXY(e, canvas);
    const { handle, startX, startY, startSel } = dragState.current;
    const dx = x - startX;
    const dy = y - startY;

    setSel(prev => {
      if (handle === 'bottom') {
        const newH = Math.max(0.08, Math.min(0.95 - startSel.y, startSel.h + dy));
        return { ...prev, h: newH };
      } else {
        // move the whole selection
        const newY = Math.max(0, Math.min(1 - startSel.h, startSel.y + dy));
        return { ...prev, y: newY };
      }
    });
  };

  const onPointerUp = () => { dragState.current = null; };

  // Crop the image to the selection and return DataURL
  const handleConfirm = () => {
    const canvas = document.createElement('canvas');
    const img    = new Image();
    img.onload = () => {
      const W = img.width;
      const H = img.height;
      canvas.width  = Math.round(sel.w * W);
      canvas.height = Math.round(sel.h * H);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sel.x * W, sel.y * H, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      onConfirm(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageSrc;
  };

  return (
    <div className="space-y-3">
      <div className="text-center">
        <span className="text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1">
          <Crop className="w-3.5 h-3.5" />
          Arrastra el borde inferior para ajustar la zona del nombre
        </span>
      </div>

      <div ref={overlayRef} className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={imageWidth || 400}
          height={imageHeight || 560}
          className="w-full h-auto rounded-2xl"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>

      <div className="flex gap-2 max-w-sm mx-auto">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
          Carta completa
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Analizar zona
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CAMERA SCANNER
// ─────────────────────────────────────────────────────────────────────────────

export default function CameraScanner({ onSelectCard, onCancel, exchangeRate = 25 }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('camera'); // 'camera' | 'crop' | 'scanning' | 'results'

  const [stream,        setStream]        = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedSize,  setCapturedSize]  = useState({ w: 400, h: 560 });
  const [isScanning,    setIsScanning]    = useState(false);
  const [scanProgress,  setScanProgress]  = useState(null);
  const [scanResults,   setScanResults]   = useState(null);
  const [cameraError,   setCameraError]   = useState(null);
  const [detectedData,  setDetectedData]  = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const viewfinderRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Camera lifecycle ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('No se pudo abrir la cámara. Verifica los permisos de la app.');
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    startCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  };

  // ── Capture: draw exactly what the viewfinder shows ─────────────────────────
  const handleCapturePhoto = () => {
    const video     = videoRef.current;
    const container = viewfinderRef.current;
    if (!video || !container) return;

    const vW = video.videoWidth  || 640;
    const vH = video.videoHeight || 480;
    const cW = container.clientWidth;
    const cH = container.clientHeight;

    const scale   = Math.max(cW / vW, cH / vH);
    const scaledW = vW * scale;
    const scaledH = vH * scale;
    const srcX    = (scaledW - cW) / 2 / scale;
    const srcY    = (scaledH - cH) / 2 / scale;
    const srcW    = cW / scale;
    const srcH    = cH / scale;

    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(srcW);
    canvas.height = Math.round(srcH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    setCapturedSize({ w: canvas.width, h: canvas.height });
    stopCamera();
    // → go to crop phase
    setPhase('crop');
  };

  // ── OCR pipeline ─────────────────────────────────────────────────────────────
  const runOCR = async (imageDataUrl) => {
    setPhase('scanning');
    setIsScanning(true);
    setScanProgress({ percent: 10, message: 'Iniciando escáner...' });
    setScanResults(null);
    setDetectedData(null);
    setSearchQuery('');

    const result = await scanAndIdentifyCard(imageDataUrl, setScanProgress);

    setIsScanning(false);

    if (!result.success) {
      setDetectedData({ name: '', number: '', setTotal: '', raw: '' });
      setSearchQuery('');
      setScanResults([]);
      setCameraError(result.error || 'No se pudo identificar la carta.');
      setPhase('results');
      return;
    }

    const { parsed, cards } = result;
    setDetectedData(parsed);

    const defaultQuery = [
      parsed.name,
      parsed.number ? `${parsed.number}${parsed.setTotal ? `/${parsed.setTotal}` : ''}` : '',
    ].filter(Boolean).join(' ');

    setSearchQuery(defaultQuery);
    setScanResults(cards);
    setPhase('results');

    setTimeout(() => searchInputRef.current?.focus(), 150);
  };

  // Called by CropOverlay when user confirms a zone
  const handleCropConfirm = (croppedDataUrl) => {
    setCapturedImage(prev => prev); // keep original for display
    runOCR(croppedDataUrl);
  };

  // "Carta completa" — skip crop, use full image
  const handleCropSkip = () => {
    runOCR(capturedImage);
  };

  // ── Manual search ────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      // Pure number pattern: "094/192" or "94/192" or "094" alone
      const numSlash = q.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
      const numOnly  = q.match(/^(\d{1,3})$/);

      if (numSlash) {
        const cards = await searchPokemonCards(
          { number: numSlash[1], setTotal: numSlash[2], name: '', setCode: '' },
          20
        );
        setScanResults(cards);
      } else if (numOnly) {
        const cards = await searchPokemonCards(
          { number: numOnly[1], setTotal: '', name: '', setCode: '' },
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

  // ── Retake ───────────────────────────────────────────────────────────────────
  const handleRetake = () => {
    setCapturedImage(null);
    setScanResults(null);
    setDetectedData(null);
    setSearchQuery('');
    setCameraError(null);
    setPhase('camera');
    startCamera();
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── PHASE: camera viewfinder ─────────────────────────────────────── */}
      {phase === 'camera' && (
        <div
          ref={viewfinderRef}
          className="relative w-full max-w-sm mx-auto h-[360px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl"
        >
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Guide overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-start pt-6">
            {/* Name zone indicator */}
            <div className="w-[200px] h-[42px] border-2 border-amber-400/90 rounded-xl shadow-[0_0_0_9999px_rgba(2,6,23,0.42)] relative">
              {['-top-1 -left-1 border-t-4 border-l-4 rounded-tl',
                '-top-1 -right-1 border-t-4 border-r-4 rounded-tr',
                '-bottom-1 -left-1 border-b-4 border-l-4 rounded-bl',
                '-bottom-1 -right-1 border-b-4 border-r-4 rounded-br',
              ].map((cls, i) => (
                <div key={i} className={`absolute ${cls} w-4 h-4 border-amber-400 shadow-[0_0_8px_#f59e0b]`} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-black text-amber-300 bg-slate-950/70 px-1.5 py-0.5 rounded-md">
                  NOMBRE
                </span>
              </div>
            </div>

            {/* Card body zone */}
            <div className="w-[200px] flex-1 border-x-2 border-amber-400/30 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-amber-200/60 font-bold">Arte de la carta</span>
              </div>
            </div>

            {/* Number zone */}
            <div className="w-[200px] h-[30px] border-2 border-emerald-400/60 rounded-b-xl relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-black text-emerald-300/80">072/197</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[10px] font-black bg-slate-950/90 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/40">
                Centra la carta · presiona capturar
              </span>
            </div>
          </div>

          {/* Shutter bar */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-around z-30">
            {/* Placeholder left */}
            <div className="w-11 h-11" />

            {/* Shutter */}
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

            {/* Close */}
            <button
              type="button"
              onClick={onCancel}
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ── PHASE: crop ─────────────────────────────────────────────────── */}
      {phase === 'crop' && capturedImage && (
        <CropOverlay
          imageSrc={capturedImage}
          imageWidth={capturedSize.w}
          imageHeight={capturedSize.h}
          onConfirm={handleCropConfirm}
          onSkip={handleCropSkip}
        />
      )}

      {/* ── PHASE: scanning ─────────────────────────────────────────────── */}
      {phase === 'scanning' && capturedImage && (
        <div className="relative w-full max-w-sm mx-auto h-[280px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800">
          <img
            src={capturedImage}
            alt="Captura"
            className="w-full h-full object-contain bg-slate-950 opacity-40"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 z-20">
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
        </div>
      )}

      {/* ── PHASE: results ──────────────────────────────────────────────── */}
      {phase === 'results' && (
        <>
          {/* Thumbnail of captured image */}
          {capturedImage && (
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captura"
                  className="h-24 rounded-2xl border border-slate-700 object-contain bg-slate-900"
                />
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg"
                  title="Nueva foto"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {cameraError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2 max-w-sm mx-auto">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Detected data + search */}
          {detectedData !== null && (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-slate-300">
                    {detectedData.number
                      ? `Número detectado: ${detectedData.number}${detectedData.setTotal ? `/${detectedData.setTotal}` : ''}`
                      : detectedData.name
                        ? `Nombre detectado: ${detectedData.name}`
                        : 'Escribe el número o nombre de la carta:'
                    }
                  </span>
                </div>

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

                <form onSubmit={handleSearch} className="flex gap-1.5">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Ej: 094/192  ó  Charizard  ó  Pikachu 025"
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
                  Escribe el número (ej: <span className="text-slate-400 font-bold">094/192</span>), solo el número (<span className="text-slate-400 font-bold">094</span>), o el nombre.
                </p>
              </div>

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
                      No encontramos coincidencias. Escribe el número (ej: <strong className="text-slate-300">094/192</strong>) o solo el nombre.
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

              {/* Retake button at bottom */}
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-black flex items-center gap-2 border border-slate-700 transition-all shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  Tomar nueva foto
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
