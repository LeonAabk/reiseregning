import React, { useState } from 'react';
import { Paperclip, Upload, X, ZoomIn, Image as ImageIcon } from 'lucide-react';

interface ReceiptsSectionProps {
  receipts: string[];
  onChange: (receipts: string[]) => void;
}

export const ReceiptsSection: React.FC<ReceiptsSectionProps> = ({ receipts, onChange }) => {
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          onChange([...receipts, ev.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeReceipt = (index: number) => {
    onChange(receipts.filter((_, i) => i !== index));
    if (activePreviewIndex === index) {
      setActivePreviewIndex(null);
    }
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6 no-print">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-blue-600" />
            5. Kvitteringer / Vedlegg
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ta bilde av kvitteringene eller last dem opp. De legges automatisk til som egne baksider i PDF-en.
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
          {receipts.length} {receipts.length === 1 ? 'kvittering' : 'kvitteringer'}
        </span>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
          Dra og slipp kvitteringsbilder her, eller klikk for å velge
        </p>
        <p className="text-[11px] text-slate-400 mb-3">
          Støtter JPG, PNG, HEIC, WebP (maks 10 MB per bilde)
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition cursor-pointer">
          <Upload className="w-4 h-4 text-blue-600" />
          Velg bilder fra enhet
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Thumbnails grid */}
      {receipts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4 pt-3 border-t border-slate-100">
          {receipts.map((src, idx) => (
            <div
              key={idx}
              className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm aspect-square bg-slate-100 cursor-pointer"
              onClick={() => setActivePreviewIndex(idx)}
            >
              <img
                src={src}
                alt={`Kvittering ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <ZoomIn className="w-5 h-5" />
              </div>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                #{idx + 1}
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  removeReceipt(idx);
                }}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow transition cursor-pointer"
                title="Fjern kvittering"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {activePreviewIndex !== null && receipts[activePreviewIndex] && (
        <div
          className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setActivePreviewIndex(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl p-2 shadow-2xl cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-2">
              <span className="text-sm font-bold text-slate-800">
                Kvittering #{activePreviewIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setActivePreviewIndex(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={receipts[activePreviewIndex]}
              alt={`Kvittering ${activePreviewIndex + 1}`}
              className="max-h-[75vh] w-auto max-w-full object-contain mx-auto rounded"
            />
          </div>
        </div>
      )}
    </section>
  );
};
