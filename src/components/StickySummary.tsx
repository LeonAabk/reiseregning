import React from 'react';
import { formatNOK } from '../constants/rates';
import { Eye, Save } from 'lucide-react';

interface StickySummaryProps {
  mileageTotal: number;
  dietTotal: number;
  expensesTotal: number;
  grandTotal: number;
  onPreviewPDF?: () => void;
  onSaveExpense?: () => void;
  isSaving?: boolean;
}

export const StickySummary: React.FC<StickySummaryProps> = ({
  mileageTotal,
  dietTotal,
  expensesTotal,
  grandTotal,
  onPreviewPDF,
  onSaveExpense,
  isSaving
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a] text-white pt-3 pb-2.5 px-4 shadow-[0_-6px_20px_rgba(0,0,0,0.35)] z-50 no-print border-t border-slate-700/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Metric columns */}
        <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-8 flex-1">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kjøring</span>
            <span className="text-sm sm:text-base font-bold text-slate-100 font-mono tabular-nums">{formatNOK(mileageTotal)}</span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Diett</span>
            <span className="text-sm sm:text-base font-bold text-slate-100 font-mono tabular-nums">{formatNOK(dietTotal)}</span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Utlegg</span>
            <span className="text-sm sm:text-base font-bold text-slate-100 font-mono tabular-nums">{formatNOK(expensesTotal)}</span>
          </div>

          <div className="border-l border-slate-700 pl-4 sm:pl-6">
            <span className="block text-[10px] text-amber-400 uppercase tracking-wider font-bold">Sum til utbetaling</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#fbbf24] font-mono tabular-nums">{formatNOK(grandTotal)}</span>
          </div>
        </div>

        {/* Quick actions for convenience */}
        <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
          <span className="text-[11px] text-slate-400 md:hidden">Laget av Leon Aabak</span>
          <div className="flex items-center gap-2">
            {onPreviewPDF && (
              <button
                type="button"
                onClick={onPreviewPDF}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Forhåndsvis
              </button>
            )}
            {onSaveExpense && (
              <button
                type="button"
                onClick={onSaveExpense}
                disabled={isSaving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Lagrer...' : 'Lagre'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block max-w-5xl mx-auto mt-1 text-[10px] text-slate-500 text-left">
        Laget av Leon Aabak
      </div>
    </div>
  );
};
