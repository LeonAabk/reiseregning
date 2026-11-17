import React from 'react';
import { DietMode, MileageRow } from '../types';
import {
  RATES,
  formatNOK,
  formatNum,
  calculateMileageRow,
  calculateMileageTotals
} from '../constants/rates';
import { Car, Plus, Trash2 } from 'lucide-react';

interface MileageSectionProps {
  mileage: MileageRow[];
  dietMode?: DietMode;
  onChange: (rows: MileageRow[]) => void;
}

export const MileageSection: React.FC<MileageSectionProps> = ({
  mileage,
  dietMode = 'taxfree',
  onChange
}) => {
  const addRow = () => {
    const todayStr = new Date().toISOString().substring(0, 16);
    const newRow: MileageRow = {
      id: Math.random().toString(36).substring(2, 9),
      date: todayStr,
      from: '',
      to: '',
      km: 0,
      passenger: '',
      toll: 0
    };
    onChange([...mileage, newRow]);
  };

  const removeRow = (id: string) => {
    onChange(mileage.filter(r => r.id !== id));
  };

  const updateRow = <K extends keyof MileageRow>(id: string, field: K, value: MileageRow[K]) => {
    onChange(
      mileage.map(r => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const totals = calculateMileageTotals(mileage, dietMode);
  const isTaxfree = dietMode === 'taxfree';

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            3. Kjøregodtgjørelse
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTaxfree
              ? `Trekkfri sats (Skatteetaten): ${formatNum(RATES.kmTaxfree)} kr/km + ${formatNum(RATES.passenger)} kr/km per passasjer`
              : `Statens sats: ${formatNum(RATES.kmState)} kr/km (${formatNum(RATES.kmTaxfree)} kr trekkfritt + 1,80 kr trekkpliktig) + ${formatNum(RATES.passenger)} kr/km per passasjer`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-slate-500 block">
              Totalt <strong className="tabular-nums font-mono text-slate-700">{totals.totalKm} km</strong>
            </span>
            <span className="text-slate-500">
              Delsum kjøring: <strong className="text-slate-900 tabular-nums font-mono text-sm">{formatNOK(totals.totalAmount)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="px-3 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Ny rad
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
              <th className="py-2 px-3 w-44">Dato og tid</th>
              <th className="py-2 px-3">Fra</th>
              <th className="py-2 px-3">Til / Omkjøring</th>
              <th className="py-2 px-3 w-20 text-right">Km</th>
              <th className="py-2 px-3 w-44">Passasjer(er)</th>
              <th className="py-2 px-3 w-24 text-right">Bom (kr)</th>
              <th className="py-2 px-3 w-28 text-right">Sum</th>
              <th className="py-2 px-2 w-10 text-center no-print"></th>
            </tr>
          </thead>
          <tbody>
            {mileage.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                  Ingen kjørestrekninger lagt til. Klikk på "+ Ny rad" over.
                </td>
              </tr>
            ) : (
              mileage.map(r => {
                const rowCalc = calculateMileageRow(r, dietMode);
                const hasPassenger = rowCalc.passengerCount > 0;

                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2 px-2">
                      <input
                        type="datetime-local"
                        value={r.date}
                        onChange={e => updateRow(r.id, 'date', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={r.from}
                        placeholder="Fra..."
                        onChange={e => updateRow(r.id, 'from', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={r.to}
                        placeholder="Til..."
                        onChange={e => updateRow(r.id, 'to', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.km === 0 ? '' : r.km}
                        placeholder="0"
                        onChange={e => updateRow(r.id, 'km', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 font-mono tabular-nums text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={r.passenger}
                          placeholder="Navn (kommaseparer flere)"
                          onChange={e => updateRow(r.id, 'passenger', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 ${
                            hasPassenger ? 'border-blue-300 bg-blue-50/40 text-blue-900' : 'border-slate-200'
                          }`}
                        />
                        {hasPassenger && (
                          <span className="absolute -top-1.5 -right-1 text-[9px] bg-blue-600 text-white rounded px-1 font-bold">
                            +{rowCalc.passengerCount} kr/km
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.toll === 0 ? '' : r.toll}
                        placeholder="0"
                        onChange={e => updateRow(r.id, 'toll', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 font-mono tabular-nums text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {formatNOK(rowCalc.totalAmount)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isTaxfree && totals.taxableAmount > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Fordeling kjøregodtgjørelse (Statens sats):{' '}
            <strong className="text-emerald-700">Trekkfritt: {formatNOK(totals.taxfreeAmount)}</strong> •{' '}
            <strong className="text-amber-700">Trekkpliktig: {formatNOK(totals.taxableAmount)}</strong>
          </span>
        </div>
      )}
    </section>
  );
};
