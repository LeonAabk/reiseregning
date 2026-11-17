import { AccommodationType, DietMode, ExpenseReportData, MealDeductions, MileageRow } from '../types';

export const RATES = {
  km: 5.30,          // Statens sats 2026 (3,50 kr trekkfritt + 1,80 kr trekkpliktig)
  kmState: 5.30,
  kmTaxfree: 3.50,   // Skatteetatens trekkfrie sats 2026
  passenger: 1.00,   // Passasjertillegg per passasjer per km (trekkfritt)
  diet: {
    stateDay6to12: 397,
    stateOver12: 736,
    stateDognite: 1012,
    taxfreeDay6to12: 200,
    taxfreeOver12: 400,
    taxfreeHotel: 693,
    // NB: I UI-et er 'boarding' = "Med kokemuligheter / privat" (107 kr)
    // og 'private' = "Pensjonat / hybel / brakke uten kokemuligheter" (400 kr)
    taxfreeWithCooking: 107,
    taxfreeNoCooking: 400,
    // Bakoverkompatible aliaser (rettet til riktig 2026-sats):
    taxfreeBoarding: 107,
    taxfreePrivate: 400
  }
};

export const currencyFormatter = new Intl.NumberFormat('no-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatNOK(val: number): string {
  return currencyFormatter.format(val);
}

export function formatNum(val: number): string {
  return Number(val).toFixed(2).replace('.', ',');
}

export function getAccommodationLabel(accType: AccommodationType | string, accommodationName?: string): string {
  const custom = (accommodationName || '').trim();
  const typeLabel =
    accType === 'hotel'
      ? 'Hotell'
      : accType === 'boarding'
      ? 'Overnatting med kokemuligheter / privat'
      : accType === 'private'
      ? 'Pensjonat / brakke uten kokemuligheter'
      : 'Ingen overnatting (dagsreise)';

  if (!custom) return typeLabel;
  if (accType === 'none') return custom;
  return `${custom} (${typeLabel})`;
}

/**
 * Teller antall passasjerer ut fra passasjerfeltet.
 * F.eks. "Ola Nordmann" -> 1, "Ola, Kari" -> 2, "2" -> 2, "" -> 0.
 */
export function countPassengers(passengerStr?: string): number {
  const raw = (passengerStr || '').trim();
  if (!raw) return 0;
  // Hvis brukeren har skrevet et rent tall (f.eks. "2")
  if (/^\d+$/.test(raw)) {
    return Math.max(0, Math.min(8, parseInt(raw, 10)));
  }
  const parts = raw
    .split(/[,;&/]+|\s+og\s+/i)
    .map(s => s.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

export function getKmBaseRate(dietMode?: DietMode | string): number {
  return dietMode === 'taxfree' ? RATES.kmTaxfree : RATES.kmState;
}

export interface MileageCalculationResult {
  totalKm: number;
  totalAmount: number;
  taxfreeAmount: number;
  taxableAmount: number;
  baseKmRate: number;
}

export function calculateMileageRow(row: MileageRow, dietMode: DietMode | string = 'state') {
  const km = Math.max(0, Number(row.km) || 0);
  const toll = Math.max(0, Number(row.toll) || 0);
  const passengerCount = countPassengers(row.passenger);
  const baseKmRate = getKmBaseRate(dietMode);
  const effectiveKmRate = baseKmRate + passengerCount * RATES.passenger;
  const totalAmount = Math.round((km * effectiveKmRate + toll) * 100) / 100;

  const taxfreeKmRate = RATES.kmTaxfree + passengerCount * RATES.passenger;
  const taxfreeAmount = Math.round((km * taxfreeKmRate + toll) * 100) / 100;
  const taxableAmount = Math.max(0, Math.round((totalAmount - taxfreeAmount) * 100) / 100);

  return {
    km,
    toll,
    passengerCount,
    baseKmRate,
    effectiveKmRate,
    totalAmount,
    taxfreeAmount,
    taxableAmount
  };
}

export function calculateMileageTotals(rows: MileageRow[], dietMode: DietMode | string = 'state'): MileageCalculationResult {
  let totalKm = 0;
  let totalAmount = 0;
  let taxfreeAmount = 0;
  let taxableAmount = 0;

  for (const r of rows || []) {
    const res = calculateMileageRow(r, dietMode);
    totalKm += res.km;
    totalAmount += res.totalAmount;
    taxfreeAmount += res.taxfreeAmount;
    taxableAmount += res.taxableAmount;
  }

  return {
    totalKm: Math.round(totalKm * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    taxfreeAmount: Math.round(taxfreeAmount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    baseKmRate: getKmBaseRate(dietMode)
  };
}

export interface DietCalculationResult {
  amount: number;
  taxfreeAmount: number;
  taxableAmount: number;
  days: number;
  singleDayRate: number;
  taxfreeSingleRate: number;
  totalBase: number;
  deductionAmount: number;
  text: string;
}

function getTaxfreeNightRate(accType: string): number {
  if (accType === 'hotel') return RATES.diet.taxfreeHotel; // 693 kr
  if (accType === 'private') return RATES.diet.taxfreeNoCooking; // 400 kr (uten kokemuligheter)
  if (accType === 'boarding') return RATES.diet.taxfreeWithCooking; // 107 kr (med kokemuligheter / privat)
  return 0;
}

function formatHoursAndMinutes(diffHours: number): string {
  const totalMinutes = Math.round(diffHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours}t`;
  return `${hours}t ${mins}m`;
}

export function calculateDiet(
  startVal: string,
  endVal: string,
  accType: string,
  dietMode: string,
  mealDeductions: MealDeductions
): DietCalculationResult {
  const emptyResult = (text: string): DietCalculationResult => ({
    amount: 0,
    taxfreeAmount: 0,
    taxableAmount: 0,
    days: 0,
    singleDayRate: 0,
    taxfreeSingleRate: 0,
    totalBase: 0,
    deductionAmount: 0,
    text
  });

  if (!startVal || !endVal) {
    return emptyResult('Fyll ut reisetid for diett-beregning.');
  }

  const start = new Date(startVal);
  const end = new Date(endVal);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return emptyResult('Ugyldig dato/klokkeslett.');
  }

  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 0) {
    return emptyResult('Hjemkomst må være etter avreise.');
  }

  const isTaxfree = dietMode === 'taxfree';
  const modeLabel = isTaxfree ? 'Trekkfri sats' : 'Statens sats';

  if (diffHours < 6) {
    return emptyResult(`Ingen diett. Reisetid under 6t (${formatHoursAndMinutes(diffHours)} – ${modeLabel}).`);
  }

  // ---------------------------------------------------------------------------
  // 1. DAGSREISE UTEN OVERNATTING (accType === 'none')
  // ---------------------------------------------------------------------------
  if (accType === 'none') {
    const is6to12 = diffHours <= 12;
    const stateRate = is6to12 ? RATES.diet.stateDay6to12 : RATES.diet.stateOver12;
    const taxfreeRate = is6to12 ? RATES.diet.taxfreeDay6to12 : RATES.diet.taxfreeOver12;
    const singleDayRate = isTaxfree ? taxfreeRate : stateRate;

    let deductionPct = 0;
    const mealLabels: string[] = [];
    if (mealDeductions?.breakfast) {
      deductionPct += 0.2;
      mealLabels.push('frokost 20%');
    }
    if (mealDeductions?.lunch) {
      deductionPct += 0.3;
      mealLabels.push('lunsj 30%');
    }
    if (mealDeductions?.dinner) {
      deductionPct += 0.5;
      mealLabels.push('middag 50%');
    }
    deductionPct = Math.min(1, deductionPct);

    const totalBase = singleDayRate;
    const deductionAmount = Math.round(totalBase * deductionPct * 100) / 100;
    const finalAmount = Math.max(0, Math.round((totalBase - deductionAmount) * 100) / 100);

    const taxfreeBase = taxfreeRate;
    const taxfreeDeduction = Math.round(taxfreeBase * deductionPct * 100) / 100;
    const taxfreeFinal = Math.max(0, Math.round((taxfreeBase - taxfreeDeduction) * 100) / 100);
    const taxableFinal = isTaxfree ? 0 : Math.max(0, Math.round((finalAmount - taxfreeFinal) * 100) / 100);

    const durationLabel = is6to12 ? 'Dagsreise 6–12t' : 'Dagsreise over 12t uten overnatting';
    const warningOver24 =
      diffHours >= 24
        ? ' (NB: Varighet er over 24t – velg overnattingstype dersom reisen hadde overnatting)'
        : '';
    const deductionText =
      deductionAmount > 0
        ? ` Måltidstrekk (${mealLabels.join(', ')}): -${formatNOK(deductionAmount)}.`
        : ' Ingen måltidstrekk.';
    const splitText =
      !isTaxfree && taxableFinal > 0
        ? ` (Trekkfritt: ${formatNOK(taxfreeFinal)} • Trekkpliktig: ${formatNOK(taxableFinal)})`
        : '';

    return {
      amount: finalAmount,
      taxfreeAmount: taxfreeFinal,
      taxableAmount: taxableFinal,
      days: 1,
      singleDayRate,
      taxfreeSingleRate: taxfreeRate,
      totalBase,
      deductionAmount,
      text: `${durationLabel} (${formatHoursAndMinutes(diffHours)}) – ${modeLabel}: ${formatNOK(totalBase)}.${deductionText}${splitText}${warningOver24}`
    };
  }

  // ---------------------------------------------------------------------------
  // 2. REISE MED OVERNATTING (accType !== 'none')
  // Et døgn = 24 timer fra reisens start.
  // Reise med overnatting >= 6t gir minst 1 døgn.
  // Påbegynt nytt døgn på 6 timer eller mer (remainderHours >= 6) utløser
  // ett nytt fullt døgns diett etter overnattingssatsen!
  // ---------------------------------------------------------------------------
  const fullDays = Math.floor(diffHours / 24);
  const remainderHours = diffHours - fullDays * 24;

  let dietDays = 1;
  let durationBreakdown = '';

  if (fullDays === 0) {
    dietDays = 1;
    durationBreakdown = `1 døgn (${formatHoursAndMinutes(diffHours)} med overnatting)`;
  } else if (remainderHours >= 6) {
    dietDays = fullDays + 1;
    durationBreakdown = `${dietDays} døgn (${fullDays} ${fullDays === 1 ? 'fullt døgn' : 'fulle døgn'} + påbegynt døgn ${formatHoursAndMinutes(remainderHours)} ≥ 6t)`;
  } else {
    dietDays = fullDays;
    durationBreakdown =
      remainderHours > 0
        ? `${dietDays} døgn (${fullDays} ${fullDays === 1 ? 'fullt døgn' : 'fulle døgn'} + ${formatHoursAndMinutes(remainderHours)} < 6t)`
        : `${dietDays} ${dietDays === 1 ? 'fullt døgn' : 'fulle døgn'}`;
  }

  const stateNightRate = RATES.diet.stateDognite; // 1 012 kr
  const taxfreeNightRate = getTaxfreeNightRate(accType); // 693 / 400 / 107 kr
  const singleDayRate = isTaxfree ? taxfreeNightRate : stateNightRate;

  const totalBase = Math.round(dietDays * singleDayRate * 100) / 100;
  const taxfreeTotalBase = Math.round(dietDays * taxfreeNightRate * 100) / 100;

  // Beregn antall måltider som skal trekkes (standard = dietDays når boksen er krysset av)
  const resolveMealCount = (enabled: boolean, customCount?: number): number => {
    if (!enabled) return 0;
    if (typeof customCount === 'number' && !isNaN(customCount) && customCount > 0) {
      return Math.min(dietDays, Math.max(1, Math.floor(customCount)));
    }
    return dietDays;
  };

  const bCount = resolveMealCount(Boolean(mealDeductions?.breakfast), mealDeductions?.breakfastCount);
  const lCount = resolveMealCount(Boolean(mealDeductions?.lunch), mealDeductions?.lunchCount);
  const dCount = resolveMealCount(Boolean(mealDeductions?.dinner), mealDeductions?.dinnerCount);

  // Hvert måltid trekker sin prosentandel (20% / 30% / 50%) av én døgnsats
  const deductionUnits = bCount * 0.2 + lCount * 0.3 + dCount * 0.5;
  const rawDeduction = singleDayRate * deductionUnits;
  const deductionAmount = Math.min(totalBase, Math.round(rawDeduction * 100) / 100);
  const finalAmount = Math.max(0, Math.round((totalBase - deductionAmount) * 100) / 100);

  const rawTaxfreeDeduction = taxfreeNightRate * deductionUnits;
  const taxfreeDeduction = Math.min(taxfreeTotalBase, Math.round(rawTaxfreeDeduction * 100) / 100);
  const taxfreeFinal = Math.max(0, Math.round((taxfreeTotalBase - taxfreeDeduction) * 100) / 100);
  const taxableFinal = isTaxfree ? 0 : Math.max(0, Math.round((finalAmount - taxfreeFinal) * 100) / 100);

  const mealParts: string[] = [];
  if (bCount > 0) mealParts.push(`${bCount} frokost`);
  if (lCount > 0) mealParts.push(`${lCount} lunsj`);
  if (dCount > 0) mealParts.push(`${dCount} middag`);

  const accShortLabel =
    accType === 'hotel'
      ? 'hotell'
      : accType === 'private'
      ? 'uten kokemuligheter'
      : 'med kokemuligheter / privat';

  const deductionText =
    deductionAmount > 0
      ? ` Måltidstrekk (${mealParts.join(', ')}): -${formatNOK(deductionAmount)}.`
      : ' Ingen måltidstrekk.';

  const splitText =
    !isTaxfree && taxableFinal > 0
      ? ` (Trekkfritt: ${formatNOK(taxfreeFinal)} • Trekkpliktig: ${formatNOK(taxableFinal)})`
      : '';

  return {
    amount: finalAmount,
    taxfreeAmount: taxfreeFinal,
    taxableAmount: taxableFinal,
    days: dietDays,
    singleDayRate,
    taxfreeSingleRate: taxfreeNightRate,
    totalBase,
    deductionAmount,
    text: `${durationBreakdown} (${accShortLabel}) – ${modeLabel} (${dietDays} × ${formatNOK(singleDayRate)} = ${formatNOK(totalBase)}).${deductionText}${splitText}`
  };
}

export function exportToCSV(data: ExpenseReportData): void {
  const dietMode = data.travelInfo.dietMode || 'state';
  const diet = calculateDiet(
    data.travelInfo.departure,
    data.travelInfo.return,
    data.travelInfo.accommodation,
    dietMode,
    data.mealDeductions
  );

  let csvContent = '';

  const formatCSVNum = (num: number) => Number(num).toFixed(2).replace('.', ',');
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T');
    const datePart = parts[0];
    const timePart = parts[1] ? parts[1].substring(0, 5) : '';
    const d = datePart.split('-');
    if (d.length === 3) {
      const formatted = `${d[2]}.${d[1]}.${d[0]}`;
      return timePart ? `${formatted} ${timePart}` : formatted;
    }
    return dateStr;
  };

  const cleanStr = (str?: string) => (str ? String(str).replace(/\s+/g, ' ').trim() : '');

  // Metadata
  csvContent += `Navn;${cleanStr(data.personalInfo.name)}\n`;
  csvContent += `Ansattnr;${cleanStr(data.personalInfo.id)}\n`;
  csvContent += `Avdeling;${cleanStr(data.personalInfo.department)}\n`;
  csvContent += `Firma;${cleanStr(data.personalInfo.company)}\n`;
  csvContent += `Satsvalg;${dietMode === 'taxfree' ? 'Trekkfri sats (Skatteetaten)' : 'Statens satser (2026)'}\n`;
  csvContent += `\n`;

  // Header
  csvContent += `Dato;Beskrivelse/Rute;Type;Trekkfritt;Trekkpliktig;Beløp\n`;

  let totalSum = 0;
  let totalTaxfree = 0;
  let totalTaxable = 0;

  // Mileage
  data.mileage.forEach(i => {
    const m = calculateMileageRow(i, dietMode);
    if (m.km > 0 || m.toll > 0) {
      let desc = `${i.from} - ${i.to} (${m.km} km à ${formatCSVNum(m.effectiveKmRate)} kr/km)`;
      if (m.passengerCount > 0) desc += ` (Passasjer: ${i.passenger})`;
      if (m.toll > 0) desc += ` + bom ${formatCSVNum(m.toll)} kr`;
      csvContent += `${formatDate(i.date)};${cleanStr(desc)};Kjøring/Bom;${formatCSVNum(m.taxfreeAmount)};${formatCSVNum(m.taxableAmount)};${formatCSVNum(m.totalAmount)}\n`;
      totalSum += m.totalAmount;
      totalTaxfree += m.taxfreeAmount;
      totalTaxable += m.taxableAmount;
    }
  });

  // Expenses
  data.expenses.forEach(i => {
    const amt = Number(i.amount) || 0;
    if (amt > 0 || i.description) {
      csvContent += `${formatDate(i.date)};${cleanStr(i.description)};Utlegg;${formatCSVNum(amt)};0,00;${formatCSVNum(amt)}\n`;
      totalSum += amt;
      totalTaxfree += amt;
    }
  });

  // Diet
  if (diet.amount > 0 || data.travelInfo.departure) {
    const dateStr = `${formatDate(data.travelInfo.departure)} - ${formatDate(data.travelInfo.return)}`;
    csvContent += `${dateStr};${cleanStr(diet.text)};Diett;${formatCSVNum(diet.taxfreeAmount)};${formatCSVNum(diet.taxableAmount)};${formatCSVNum(diet.amount)}\n`;
    totalSum += diet.amount;
    totalTaxfree += diet.taxfreeAmount;
    totalTaxable += diet.taxableAmount;
  }

  // Total
  csvContent += `\n`;
  csvContent += `TOTALT Å UTBETALE;;;${formatCSVNum(totalTaxfree)};${formatCSVNum(totalTaxable)};${formatCSVNum(totalSum)}\n`;

  // Add BOM for Excel and generate Blob
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const today = new Date().toISOString().split('T')[0];
  const filename = `Reiseregning_${(data.personalInfo.name || 'ukjent').replace(/\s+/g, '_')}_${today}.csv`;

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
