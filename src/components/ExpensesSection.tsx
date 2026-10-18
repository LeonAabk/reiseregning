import React from 'react';
import { ExpenseRow } from '../types';
import { formatNOK } from '../constants/rates';
import { Receipt, Plus, Trash2, Tag } from 'lucide-react';

interface ExpensesSectionProps {
  expenses: ExpenseRow[];
  onChange: (rows: ExpenseRow[]) => void;
}

const COMMON_EXPENSE_SUGGESTIONS = [
  'Parkering',
  'Taxi',
  'Tog / Buss',
  'Flybuss / Flytog',
  'Hotell / Overnatting',
  'Møtemat / Representasjon',
  'Ferge'
];

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({ expenses, onChange }) => {
  const addRow = (defaultDesc: string = '') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newRow: ExpenseRow = {
      id: Math.random().toString(36).substring(2, 9),
      date: todayStr,
      description: defaultDesc,
      amount: 0,
      receipt: true
    };
    onChange([...expenses, newRow]);
  };

  const removeRow = (id: string) => {
    onChange(expenses.filter(r => r.id !== id));
  };

  const updateRow = <K extends keyof ExpenseRow>(id: string, field: K, value: ExpenseRow[K]) => {
    onChange(
      expenses.map(r => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const totalSum = expenses.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            4. Andre utlegg
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumenterte utgifter du har lagt ut for under reisen
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Delsum utlegg: <strong className="text-slate-800 tabular-nums font-mono text-sm">{formatNOK(totalSum)}</strong>
          </span>
          <button
            type="button"
            onClick={() => addRow()}
            className="px-3 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Ny rad
          </button>
        </div>
      </div>

      {/* Quick category helpers */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
        <span className="flex items-center gap-1 font-medium text-slate-400">
          <Tag className="w-3 h-3" />
          Hurtigvalg:
        </span>
        {COMMON_EXPENSE_SUGGESTIONS.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => addRow(cat)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded text-[11px] font-medium transition cursor-pointer border border-slate-200"
          >
            + {cat}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[550px]">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
              <th className="py-2 px-3 w-36">Dato</th>
              <th className="py-2 px-3">Beskrivelse</th>
              <th className="py-2 px-3 w-32">Beløp (kr)</th>
              <th className="py-2 px-3 w-20 text-center">Bilag?</th>
              <th className="py-2 px-2 w-10 text-center no-print"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                  Ingen utlegg lagt til. Klikk på "+ Ny rad" eller et av hurtigvalgene over.
                </td>
              </tr>
            ) : (
              expenses.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2 px-2">
                    <input
                      type="date"
                      value={r.date}
                      onChange={e => updateRow(r.id, 'date', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={r.description}
                      placeholder="F.eks. Parkeringsbillett, taxi, hotell"
                      onChange={e => updateRow(r.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={r.amount === 0 ? '' : r.amount}
                      placeholder="0,00"
                      onChange={e => updateRow(r.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 font-mono font-semibold tabular-nums text-right"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={r.receipt}
                      onChange={e => updateRow(r.id, 'receipt', e.target.checked)}
                      title="Kvittering vedlagt"
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-2 text-center no-print">
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition cursor-pointer"
                      title="Slett rad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
