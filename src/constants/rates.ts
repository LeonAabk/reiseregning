import { ExpenseReportData, MealDeductions } from '../types';

export const RATES = {
  km: 5.30,
  passenger: 1.00,
  diet: {
    stateDay6to12: 397,
    stateOver12: 736,
    stateDognite: 1012,
    taxfreeDay6to12: 200,
    taxfreeOver12: 400,
    taxfreeHotel: 693,
    taxfreeBoarding: 400,
    taxfreePrivate: 107
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

export function calculateDiet(
  startVal: string,
  endVal: string,
  accType: string,
  dietMode: string,
  mealDeductions: MealDeductions
): { amount: number; text: string } {
  if (!startVal || !endVal) {
    return { amount: 0, text: 'Fyll ut reisetid for diett-beregning.' };
  }

  const start = new Date(startVal);
  const end = new Date(endVal);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { amount: 0, text: 'Ugyldig dato/klokkeslett.' };
  }

  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 0) {
    return { amount: 0, text: 'Hjemkomst må være etter avreise.' };
  }

  const fullDays = Math.floor(diffHours / 24);
  const remainderHours = diffHours % 24;

  let totalBase = 0;
  const descParts: string[] = [];
  const isTaxfree = dietMode === 'taxfree';
  const modeLabel = isTaxfree ? 'Trekkfri sats' : 'Statens sats';

  let nightRate = 0;
  if (accType !== 'none') {
    if (isTaxfree) {
      nightRate = accType === 'hotel' 
        ? RATES.diet.taxfreeHotel 
        : (accType === 'boarding' ? RATES.diet.taxfreeBoarding : RATES.diet.taxfreePrivate);
    } else {
      nightRate = RATES.diet.stateDognite;
    }
  }

  const dayRate6to12 = isTaxfree ? RATES.diet.taxfreeDay6to12 : RATES.diet.stateDay6to12;
  const dayRateOver12 = isTaxfree ? RATES.diet.taxfreeOver12 : RATES.diet.stateOver12;

  if (fullDays > 0) {
    const rateToUse = accType !== 'none' ? nightRate : dayRateOver12;
    totalBase += fullDays * rateToUse;
    descParts.push(`${fullDays} fulle døgn`);
  }

  if (remainderHours >= 6) {
    const remainderRate = remainderHours <= 12 ? dayRate6to12 : dayRateOver12;
    totalBase += remainderRate;
    descParts.push(`overskytende ${Math.floor(remainderHours)}t`);
  }

  if (totalBase === 0) {
    return { amount: 0, text: `Ingen diett. Reisetid under 6t (${modeLabel}).` };
  }

  let mealDeductionPercentage = 0;
  if (mealDeductions.breakfast) mealDeductionPercentage += 0.2;
  if (mealDeductions.lunch) mealDeductionPercentage += 0.3;
  if (mealDeductions.dinner) mealDeductionPercentage += 0.5;

  const mealDeductionAmount = totalBase * mealDeductionPercentage;
  const finalAmount = Math.max(0, totalBase - mealDeductionAmount);

  const descText = `${descParts.join(' og ')} - ${modeLabel}`;
  return {
    amount: finalAmount,
    text: `${descText}: ${formatNOK(totalBase)}. Trekk: -${formatNOK(mealDeductionAmount)}.`
  };
}

export function exportToCSV(data: ExpenseReportData): void {
  const diet = calculateDiet(
    data.travelInfo.departure,
    data.travelInfo.return,
    data.travelInfo.accommodation,
    data.travelInfo.dietMode,
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
  csvContent += `\n`;

  // Header
  csvContent += `Dato;Beskrivelse/Rute;Type;Beløp\n`;

  let totalSum = 0;

  // Mileage
  data.mileage.forEach(i => {
    const hasPassenger = (i.passenger || '').trim().length > 0;
    const km = Number(i.km) || 0;
    const toll = Number(i.toll) || 0;
    if (km > 0 || toll > 0) {
      const amount = (km * (hasPassenger ? RATES.km + RATES.passenger : RATES.km)) + toll;
      let desc = `${i.from} - ${i.to}`;
      if (hasPassenger) desc += ` (Passasjer: ${i.passenger})`;
      csvContent += `${formatDate(i.date)};${cleanStr(desc)};Kjøring/Bom;${formatCSVNum(amount)}\n`;
      totalSum += amount;
    }
  });

  // Expenses
  data.expenses.forEach(i => {
    const amt = Number(i.amount) || 0;
    if (amt > 0 || i.description) {
      csvContent += `${formatDate(i.date)};${cleanStr(i.description)};Utlegg;${formatCSVNum(amt)}\n`;
      totalSum += amt;
    }
  });

  // Diet
  if (diet.amount > 0 || data.travelInfo.departure) {
    const dateStr = `${formatDate(data.travelInfo.departure)} - ${formatDate(data.travelInfo.return)}`;
    csvContent += `${dateStr};${cleanStr(diet.text)};Diett;${formatCSVNum(diet.amount)}\n`;
    totalSum += diet.amount;
  }

  // Total
  csvContent += `\n`;
  csvContent += `TOTALT Å UTBETALE;;;${formatCSVNum(totalSum)}\n`;

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
