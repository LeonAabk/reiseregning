import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Save, Send, Eye, Download, Archive, HelpCircle, Building } from 'lucide-react';

interface HeaderProps {
  onSaveExpense: () => void;
  onSubmitExpense: () => void;
  onPreviewPDF: () => void;
  onExportCSV: () => void;
  onShowSaved: () => void;
  onShowHelp: () => void;
  onTogglePortal: () => void;
  inPortalView: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSaveExpense,
  onSubmitExpense,
  onPreviewPDF,
  onExportCSV,
  onShowSaved,
  onShowHelp,
  onTogglePortal,
  inPortalView,
  isSaving,
  isSubmitting
}) => {
  const { currentUser, currentCompany, workspaceMode } = useAuth();

  return (
    <header className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Reiseregning 2026
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Statens satser for diett, overnatting og kjøregodtgjørelse
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons */}
          {!inPortalView && (
            <>
              {workspaceMode === 'bedrift' && (
                <button
                  type="button"
                  onClick={onSubmitExpense}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Sender inn...' : 'Send inn til godkjenning'}
                </button>
              )}

              <button
                type="button"
                onClick={onSaveExpense}
                disabled={isSaving}
                className="px-3.5 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Lagrer...' : 'Lagre Reise'}
              </button>

              <button
                type="button"
                onClick={onPreviewPDF}
                className="px-3.5 py-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Forhåndsvis PDF
              </button>

              <button
                type="button"
                onClick={onExportCSV}
                className="px-3.5 py-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Last ned CSV
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onShowSaved}
            className="px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            Lagrede Reiser
          </button>

          <button
            type="button"
            onClick={onShowHelp}
            className="px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            Hvordan bruke appen?
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={onTogglePortal}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer ${
                inPortalView
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Building className="w-4 h-4" />
              {inPortalView ? 'Tilbake til Skjema' : 'Bedriftsportal'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
