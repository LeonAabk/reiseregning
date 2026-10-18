import React from 'react';
import { AccommodationType, DietMode, MealDeductions, TravelInfo } from '../types';
import { calculateDiet, formatNOK, RATES } from '../constants/rates';
import { Compass, Info, Clock, CalendarDays, Bed } from 'lucide-react';

interface TravelInfoSectionProps {
  travelInfo: TravelInfo;
  mealDeductions: MealDeductions;
  onTravelInfoChange: (info: TravelInfo) => void;
  onMealDeductionsChange: (deductions: MealDeductions) => void;
}

export const TravelInfoSection: React.FC<TravelInfoSectionProps> = ({
  travelInfo,
  mealDeductions,
  onTravelInfoChange,
  onMealDeductionsChange
}) => {
  const updateTravelField = <K extends keyof TravelInfo>(field: K, value: TravelInfo[K]) => {
    onTravelInfoChange({
      ...travelInfo,
      [field]: value
    });
  };

  const dietResult = calculateDiet(
    travelInfo.departure,
    travelInfo.return,
    travelInfo.accommodation,
    travelInfo.dietMode,
    mealDeductions
  );

  // Quick date presets
  const setTodayPreset = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const dep = `${yyyy}-${mm}-${dd}T08:00`;
    const ret = `${yyyy}-${mm}-${dd}T17:00`;

    onTravelInfoChange({
      ...travelInfo,
      departure: dep,
      return: ret,
      accommodation: 'none'
    });
  };

  const setOvernightPreset = (days: number = 1) => {
    const today = new Date();
    const returnDate = new Date(today);
    returnDate.setDate(today.getDate() + days);

    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date, hours: string) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hours}`;

    onTravelInfoChange({
      ...travelInfo,
      departure: fmt(today, '08:30'),
      return: fmt(returnDate, '16:00'),
      accommodation: 'hotel'
    });
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            2. Reiseinformasjon
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Angi tidspunkt og overnatting for automatisk diettberegning
          </p>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Hurtigvalg:
          </span>
          <button
            type="button"
            onClick={setTodayPreset}
            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded text-[11px] font-medium transition cursor-pointer border border-slate-200"
          >
            Dagsreise i dag (8–17)
          </button>
          <button
            type="button"
            onClick={() => setOvernightPreset(1)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded text-[11px] font-medium transition cursor-pointer border border-slate-200"
          >
            1 døgn (hotell)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Formål <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={travelInfo.purpose}
            onChange={e => updateTravelField('purpose', e.target.value)}
            placeholder="Hvorfor reiste du? (f.eks. Kundemøte, kurs, konferanse)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Arrangement (Valgfritt)
          </label>
          <input
            type="text"
            value={travelInfo.event}
            onChange={e => updateTravelField('event', e.target.value)}
            placeholder="Hvilket arrangement deltok du på?"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            Avreise (Dato og tid)
          </label>
          <input
            type="datetime-local"
            value={travelInfo.departure}
            onChange={e => updateTravelField('departure', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            Hjemkomst (Dato og tid)
          </label>
          <input
            type="datetime-local"
            value={travelInfo.return}
            onChange={e => updateTravelField('return', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-blue-600" />
            Overnatting
          </label>
          <select
            value={travelInfo.accommodation}
            onChange={e => updateTravelField('accommodation', e.target.value as AccommodationType)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">Ingen overnatting (dagsreise)</option>
            <option value="hotel">Hotell (døgndiett {RATES.diet.stateDognite} kr)</option>
            <option value="boarding">Annen overnatting med kokemuligheter</option>
            <option value="private">Annen overnatting uten kokemuligheter</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Diettmodus
          </label>
          <select
            value={travelInfo.dietMode}
            onChange={e => updateTravelField('dietMode', e.target.value as DietMode)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="state">Statens satser (2026)</option>
            <option value="taxfree">Trekkfri sats (Skatteetaten)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          Overnattingssted (Navn og adresse)
        </label>
        <input
          type="text"
          value={travelInfo.accommodationName}
          onChange={e => updateTravelField('accommodationName', e.target.value)}
          placeholder="F.eks. Thon Hotel Opera, Dronning Eufemias gate 4 (La stå tom ved privat overnatting)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Diet Summary Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start gap-2.5 text-sm text-slate-700 mb-4">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">
              Diettgodtgjørelse:
            </span>
            <span className="text-base font-bold text-blue-900 font-mono tabular-nums">
              {formatNOK(dietResult.amount)}
            </span>
          </div>
          <div className="text-slate-600 text-xs mt-1">
            {dietResult.text}
          </div>
        </div>
      </div>

      {/* Måltidstrekk */}
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
          Måltidstrekk (Kryss av hvis måltid var inkludert i hotellrom, dekket av arrangør eller spandert):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition select-none ${
            mealDeductions.breakfast ? 'bg-blue-50/50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}>
            <input
              type="checkbox"
              checked={mealDeductions.breakfast}
              onChange={e => onMealDeductionsChange({ ...mealDeductions, breakfast: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-slate-800">Frokost</span>
              <span className="text-slate-500">20% fratrekk</span>
            </div>
          </label>

          <label className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition select-none ${
            mealDeductions.lunch ? 'bg-blue-50/50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}>
            <input
              type="checkbox"
              checked={mealDeductions.lunch}
              onChange={e => onMealDeductionsChange({ ...mealDeductions, lunch: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-slate-800">Lunsj</span>
              <span className="text-slate-500">30% fratrekk</span>
            </div>
          </label>

          <label className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition select-none ${
            mealDeductions.dinner ? 'bg-blue-50/50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}>
            <input
              type="checkbox"
              checked={mealDeductions.dinner}
              onChange={e => onMealDeductionsChange({ ...mealDeductions, dinner: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-semibold block text-slate-800">Middag</span>
              <span className="text-slate-500">50% fratrekk</span>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
};
