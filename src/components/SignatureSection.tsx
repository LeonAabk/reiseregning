import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Upload, Trash2, CheckCircle2 } from 'lucide-react';

interface SignatureSectionProps {
  signatureContent: string | null;
  datePlace: string;
  onSignatureChange: (content: string | null) => void;
  onDatePlaceChange: (datePlace: string) => void;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  signatureContent,
  datePlace,
  onSignatureChange,
  onDatePlaceChange
}) => {
  const [tab, setTab] = useState<'draw' | 'upload'>('draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    // If signature exists from previous draw, load it into canvas
    if (signatureContent && tab === 'draw') {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = signatureContent;
    }
  }, [tab]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleStop = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onSignatureChange(null);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          onSignatureChange(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <PenTool className="w-5 h-5 text-blue-600" />
        6. Signatur
      </h2>

      <div className="max-w-md mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Sted og dato
          </label>
          <button
            type="button"
            onClick={() => {
              const todayFormatted = new Date().toLocaleDateString('no-NO');
              onDatePlaceChange(datePlace ? `${datePlace.split(',')[0]}, ${todayFormatted}` : `Oslo, ${todayFormatted}`);
            }}
            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
          >
            Sett til i dag ({new Date().toLocaleDateString('no-NO')})
          </button>
        </div>
        <input
          type="text"
          value={datePlace}
          onChange={e => onDatePlaceChange(e.target.value)}
          placeholder="F.eks. Oslo, 18.10.2026"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="no-print">
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              tab === 'draw'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tegn signatur
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              tab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Last opp bilde
          </button>
        </div>

        {tab === 'draw' ? (
          <div>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white max-w-lg shadow-inner">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleStop}
                onMouseLeave={handleStop}
                onTouchStart={e => {
                  e.preventDefault();
                  handleStart(e);
                }}
                onTouchMove={e => {
                  e.preventDefault();
                  handleMove(e);
                }}
                onTouchEnd={handleStop}
                className="w-full h-36 cursor-crosshair touch-none"
              />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tøm signatur
              </button>
              {signatureContent && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Signatur registrert
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 inline-flex items-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-slate-500" />
              Velg signaturbilde (PNG/JPG)
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
              />
            </label>

            {signatureContent && (
              <div className="mt-3 p-3 border border-slate-200 rounded-lg max-w-xs bg-slate-50 flex items-center justify-between">
                <img
                  src={signatureContent}
                  alt="Signatur forhåndsvisning"
                  className="max-h-16 max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => onSignatureChange(null)}
                  className="text-xs text-red-500 hover:text-red-700 ml-3"
                >
                  Fjern
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
