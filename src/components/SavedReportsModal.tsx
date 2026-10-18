import React, { useEffect, useState } from 'react';
import { ExpenseReportRecord } from '../types';
import { dataService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { formatNOK } from '../constants/rates';
import { X, Calendar, Trash2, FolderOpen, Loader2 } from 'lucide-react';

interface SavedReportsModalProps {
  onLoadReport: (record: ExpenseReportRecord) => void;
  onClose: () => void;
}

export const SavedReportsModal: React.FC<SavedReportsModalProps> = ({
  onLoadReport,
  onClose
}) => {
  const { currentUser } = useAuth();
  const { showToast, confirm } = useUI();
  const [reports, setReports] = useState<ExpenseReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dataService.getUserReports(currentUser.id);
      setReports(data);
    } catch (e: any) {
      showToast('Feil ved lasting av lagrede reiser: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentUser]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm(`Er du sikker på at du vil slette reisen "${name}"?`);
    if (!ok) return;

    try {
      await dataService.deleteReport(id);
      showToast('Reisen er slettet.', 'success');
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      showToast('Feil ved sletting: ' + e.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[1500] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Lagrede reiser fra skyen</h2>
            <p className="text-xs text-slate-500">Tidligere lagrede reiseregninger</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {!currentUser ? (
            <div className="text-center py-8 text-slate-500">
              Du må være logget inn for å se lagrede reiser i skyen.
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span>Laster reiser...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              Ingen lagrede reiser funnet for din konto.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reports.map(rep => {
                const dateStr = new Date(rep.created_at).toLocaleDateString('no-NO');
                const total = rep.report_data?.totals?.grandTotal || 0;

                return (
                  <li key={rep.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {rep.trip_name || 'Uten navn'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateStr}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">
                          {formatNOK(total)}
                        </span>
                        <span>•</span>
                        <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {rep.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadReport(rep);
                          onClose();
                        }}
                        className="px-3 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Last inn
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rep.id, rep.trip_name)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                        title="Slett"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
