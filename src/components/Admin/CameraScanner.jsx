import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, RefreshCw, Check, X, AlertCircle, Loader2 } from 'lucide-react';
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
          facingMode: { ideal: 'environment' }, // Uses rear camera on phones
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
      setCameraError('No se pudo acceder a la cámara directamente. Puedes usar el botón de subir foto de tu galería.');
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
    setScanProgress({ percent: 10, message: 'Iniciando reconocimiento...' });
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
      
      {/* Viewfinder / Captured Photo Area */}
      <div className="relative aspect-[3/4] max-w-sm mx-auto bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        
        {/* Live Camera View */}
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Card Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col items-center justify-center">
              <div className="w-full aspect-[2.5/3.5] border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.65)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br"></div>

                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[10px] font-black bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Centra la carta aquí
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Captured Photo Preview */
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Carta capturada"
              className="w-full h-full object-contain bg-slate-950"
            />

            {/* Scanning Laser Animation */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce mb-4"></div>
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                <span className="text-xs font-bold text-white text-center">
                  {scanProgress?.message || 'Procesando imagen...'}
                </span>
                <div className="w-48 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${scanProgress?.percent || 20}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Camera & File Upload Controls */}
      {!capturedImage && (
        <div className="flex items-center justify-center gap-3">
          {/* Snap Photo Button */}
          <button
            onClick={handleCapturePhoto}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>TOMAR FOTO AHORA</span>
          </button>

          {/* Upload from Gallery Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition-all"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span>Galería / Archivo</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>
      )}

      {/* Retake Button when photo already captured */}
      {capturedImage && !isScanning && (
        <div className="flex justify-center">
          <button
            onClick={handleRetake}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Tomar otra foto</span>
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
              <span className="text-[11px] text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                Texto detectado: "{detectedText.name}"
              </span>
            )}
          </div>

          {scanResults.length === 0 ? (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
              No se encontraron coincidencias exactas. Intenta tomar la foto con mejor luz o usa la pestaña de búsqueda por texto.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1">
              {scanResults.map((card, idx) => (
                <div
                  key={card.id}
                  onClick={() => onSelectCard(card)}
                  className={`p-2 bg-slate-950 border rounded-2xl cursor-pointer transition-all flex flex-col group ${
                    idx === 0
                      ? 'border-amber-400 shadow-lg shadow-amber-500/10 bg-gradient-to-b from-amber-500/5 to-slate-950'
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
