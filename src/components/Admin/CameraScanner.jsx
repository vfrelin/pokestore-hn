import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, RefreshCw, Check, X, AlertCircle, Loader2, Zap } from 'lucide-react';
import { scanAndIdentifyCard } from '../../services/cardScanner';

export default function CameraScanner({ onSelectCard, onCancel, exchangeRate = 25 }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [detectedText, setDetectedText] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start live camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Uses rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('No se pudo abrir la cámara en vivo. Puedes subir una foto desde tu galería o usar la pestaña de texto.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture current frame from video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    processScannedImage(dataUrl);
  };

  // Handle uploaded photo from file input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      setCapturedImage(dataUrl);
      stopCamera();
      processScannedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR and card identification
  const processScannedImage = async (imageDataUrl) => {
    setIsScanning(true);
    setScanProgress({ percent: 10, message: 'Iniciando escaneo...' });
    setScanResults(null);
    setDetectedText(null);

    const result = await scanAndIdentifyCard(imageDataUrl, (progress) => {
      setScanProgress(progress);
    });

    setIsScanning(false);

    if (result.success) {
      setScanResults(result.cards);
      setDetectedText(result.parsed);
    } else {
      setCameraError(result.error || 'No se pudo identificar la carta. Intenta con mejor iluminación.');
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setScanResults(null);
    setDetectedText(null);
    setCameraError(null);
    startCamera();
  };

  return (
    <div className="space-y-4">
      
      {/* Mobile-First Camera Viewfinder with Native Controls Overlay */}
      <div className="relative w-full max-w-sm mx-auto h-[380px] xs:h-[420px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col justify-between">
        
        {/* Live Camera Feed */}
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Target Card Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none p-5 pb-20 flex flex-col items-center justify-center">
              <div className="w-full max-w-[240px] aspect-[2.5/3.5] border-2 border-amber-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]">
                {/* Glowing corner markers */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl shadow-[0_0_8px_#f59e0b]"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr shadow-[0_0_8px_#f59e0b]"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl shadow-[0_0_8px_#f59e0b]"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br shadow-[0_0_8px_#f59e0b]"></div>

                <div className="absolute -bottom-7 left-0 right-0 text-center">
                  <span className="text-[10px] font-black bg-slate-950/90 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/40 shadow-lg">
                    Centra la carta y presiona el botón abajo
                  </span>
                </div>
              </div>
            </div>

            {/* Native Mobile Shutter Bar (ALWAYS VISIBLE OVER CAMERA) */}
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-around z-30">
              
              {/* Gallery upload shortcut */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all"
                title="Subir foto desde galería"
              >
                <ImageIcon className="w-5 h-5 text-emerald-400" />
              </button>

              {/* Big Shutter Button */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="group relative w-16 h-16 rounded-full bg-slate-950 border-4 border-amber-400 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                title="Capturar y escanear carta"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 group-hover:from-amber-400 group-hover:to-orange-400 flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                </div>
              </button>

              {/* Placeholder balance / Cancel */}
              <button
                type="button"
                onClick={onCancel}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center shadow-lg active:scale-90 transition-all"
                title="Cerrar cámara"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          /* Captured Photo Preview & Processing */
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <img
              src={capturedImage}
              alt="Carta capturada"
              className="w-full h-full object-contain bg-slate-950"
            />

            {/* Scanning Laser Animation */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-5 z-20">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#f59e0b] animate-bounce mb-5"></div>
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                <span className="text-sm font-black text-white text-center">
                  {scanProgress?.message || 'Identificando carta Pokémon...'}
                </span>
                <div className="w-48 bg-slate-800 rounded-full h-2 mt-3 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${scanProgress?.percent || 25}%` }}
                  ></div>
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

      {/* Retake Button when photo already captured */}
      {capturedImage && !isScanning && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRetake}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-black flex items-center gap-2 border border-slate-700 transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Tomar otra foto de la carta</span>
          </button>
        </div>
      )}

      {/* Camera error notification */}
      {cameraError && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2 max-w-sm mx-auto">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Scanned Results */}
      {scanResults && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Coincidencias encontradas ({scanResults.length}):
              </span>
            </div>
            {detectedText?.name && (
              <span className="text-[11px] text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 truncate max-w-[150px]">
                Detectado: "{detectedText.name}"
              </span>
            )}
          </div>

          {scanResults.length === 0 ? (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              No se encontraron coincidencias exactas. Intenta tomar la foto más cerca o usa la pestaña de búsqueda por texto.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1">
              {scanResults.map((card, idx) => (
                <div
                  key={card.id}
                  onClick={() => onSelectCard(card)}
                  className={`p-2.5 bg-slate-950 border rounded-2xl cursor-pointer transition-all flex flex-col group active:scale-95 ${
                    idx === 0
                      ? 'border-amber-400 shadow-xl shadow-amber-500/15 bg-gradient-to-b from-amber-500/10 to-slate-950 ring-1 ring-amber-400/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {idx === 0 && (
                    <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      ⭐ Mejor Coincidencia
                    </span>
                  )}
                  <img
                    src={card.images.small}
                    alt={card.name}
                    className="aspect-[2.5/3.5] w-full object-contain rounded-xl mb-1.5 group-hover:scale-105 transition-transform"
                  />
                  <div className="text-xs font-bold text-white truncate">{card.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{card.set?.name} • #{card.number}</div>
                  <div className="text-xs font-black text-amber-400 mt-1">
                    ${card.marketPriceUsd.toFixed(2)} USD (~L. {(card.marketPriceUsd * exchangeRate).toFixed(0)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
