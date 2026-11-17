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

  const isTaxfree = travelInfo.dietMode === 'taxfree';
  const hotelRateLabel = isTaxfree ? RATES.diet.taxfreeHotel : RATES.diet.stateDognite;
  const noCookingRateLabel = isTaxfree ? RATES.diet.taxfreeNoCooking : RATES.diet.stateDognite;
  const withCookingRateLabel = isTaxfree ? RATES.diet.taxfreeWithCooking : RATES.diet.stateDognite;

  const activeDays = Math.max(1, dietResult.days || 1);

  const toggleMeal = (
    mealKey: 'breakfast' | 'lunch' | 'dinner',
    countKey: 'breakfastCount' | 'lunchCount' | 'dinnerCount',
    checked: boolean
  ) => {
    onMealDeductionsChange({
      ...mealDeductions,
      [mealKey]: checked,
      [countKey]: checked ? activeDays : undefined
    });
  };

  const updateMealCount = (
    countKey: 'breakfastCount' | 'lunchCount' | 'dinnerCount',
    countVal: number
  ) => {
    onMealDeductionsChange({
      ...mealDeductions,
      [countKey]: Math.min(activeDays, Math.max(1, countVal))
    });
  };

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

  const resolvedBreakfastCount = mealDeductions.breakfastCount
    ? Math.min(activeDays, Math.max(1, mealDeductions.breakfastCount))
    : activeDays;
  const resolvedLunchCount = mealDeductions.lunchCount
    ? Math.min(activeDays, Math.max(1, mealDeductions.lunchCount))
    : activeDays;
  const resolvedDinnerCount = mealDeductions.dinnerCount
    ? Math.min(activeDays, Math.max(1, mealDeductions.dinnerCount))
    : activeDays;

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
          <button
            type="button"
            onClick={() => setOvernightPreset(2)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded text-[11px] font-medium transition cursor-pointer border border-slate-200"
          >
            2 døgn (hotell)
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
            <option value="hotel">Hotell ({hotelRateLabel} kr/døgn)</option>
            <option value="private">Pensjonat / brakke uten kokemuligheter ({noCookingRateLabel} kr/døgn)</option>
            <option value="boarding">Med kokemuligheter / privat ({withCookingRateLabel} kr/døgn)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Satsvalg (Diett & Km)
          </label>
          <select
            value={travelInfo.dietMode}
            onChange={e => updateTravelField('dietMode', e.target.value as DietMode)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="taxfree">Trekkfri sats (Skatteetaten – anbefalt for AS)</option>
            <option value="state">Statens satser (2026)</option>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-slate-800">
              Diettgodtgjørelse:
            </span>
            <span className="text-base font-bold text-blue-900 font-mono tabular-nums">
              {formatNOK(dietResult.amount)}
            </span>
          </div>
          <div className="text-slate-600 text-xs mt-1 leading-relaxed">
            {dietResult.text}
          </div>
          {!isTaxfree && dietResult.taxableAmount > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                Trekkfri del: <strong>{formatNOK(dietResult.taxfreeAmount)}</strong> • Trekkpliktig del (lønn): <strong>{formatNOK(dietResult.taxableAmount)}</strong>
              </span>
              <button
                type="button"
                onClick={() => updateTravelField('dietMode', 'taxfree')}
                className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
              >
                Bytt til 100 % trekkfri sats ({formatNOK(dietResult.taxfreeAmount)})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Måltidstrekk */}
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
          Måltidstrekk (Kryss av hvis måltid var inkludert i hotellrom, dekket av arrangør eller spandert):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Frokost */}
          <div
            className={`flex items-center justify-between gap-2 p-2.5 border rounded-lg transition select-none ${
              mealDeductions.breakfast
                ? 'bg-blue-50/50 border-blue-400'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={mealDeductions.breakfast}
                onChange={e => toggleMeal('breakfast', 'breakfastCount', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold block text-slate-800">Frokost</span>
                <span className="text-slate-500">20% fratrekk per døgn</span>
              </div>
            </label>
            {mealDeductions.breakfast && activeDays > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px]">Antall:</span>
                <select
                  value={resolvedBreakfastCount}
                  onChange={e => updateMealCount('breakfastCount', parseInt(e.target.value, 10))}
                  className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-semibold text-blue-900 focus:outline-none"
                  title="Antall frokoster dekket i løpet av reisen"
                >
                  {Array.from({ length: activeDays }, (_, idx) => idx + 1).map(n => (
                    <option key={n} value={n}>
                      {n} av {activeDays}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lunsj */}
          <div
            className={`flex items-center justify-between gap-2 p-2.5 border rounded-lg transition select-none ${
              mealDeductions.lunch
                ? 'bg-blue-50/50 border-blue-400'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={mealDeductions.lunch}
                onChange={e => toggleMeal('lunch', 'lunchCount', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold block text-slate-800">Lunsj</span>
                <span className="text-slate-500">30% fratrekk per døgn</span>
              </div>
            </label>
            {mealDeductions.lunch && activeDays > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px]">Antall:</span>
                <select
                  value={resolvedLunchCount}
                  onChange={e => updateMealCount('lunchCount', parseInt(e.target.value, 10))}
                  className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-semibold text-blue-900 focus:outline-none"
                  title="Antall lunsjer dekket i løpet av reisen"
                >
                  {Array.from({ length: activeDays }, (_, idx) => idx + 1).map(n => (
                    <option key={n} value={n}>
                      {n} av {activeDays}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Middag */}
          <div
            className={`flex items-center justify-between gap-2 p-2.5 border rounded-lg transition select-none ${
              mealDeductions.dinner
                ? 'bg-blue-50/50 border-blue-400'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <label className="flex items-center gap-2.5 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={mealDeductions.dinner}
                onChange={e => toggleMeal('dinner', 'dinnerCount', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold block text-slate-800">Middag</span>
                <span className="text-slate-500">50% fratrekk per døgn</span>
              </div>
            </label>
            {mealDeductions.dinner && activeDays > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 text-[11px]">Antall:</span>
                <select
                  value={resolvedDinnerCount}
                  onChange={e => updateMealCount('dinnerCount', parseInt(e.target.value, 10))}
                  className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-semibold text-blue-900 focus:outline-none"
                  title="Antall middager dekket i løpet av reisen"
                >
                  {Array.from({ length: activeDays }, (_, idx) => idx + 1).map(n => (
                    <option key={n} value={n}>
                      {n} av {activeDays}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
