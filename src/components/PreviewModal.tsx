import React from 'react';
import { ExpenseReportData } from '../types';
import { calculateDiet, exportToCSV, formatNOK, RATES } from '../constants/rates';
import { Printer, Download, X } from 'lucide-react';

interface PreviewModalProps {
  data: ExpenseReportData;
  datePlace: string;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ data, datePlace, onClose }) => {
  const diet = calculateDiet(
    data.travelInfo.departure,
    data.travelInfo.return,
    data.travelInfo.accommodation,
    data.travelInfo.dietMode,
    data.mealDeductions
  );

  const mileageTotal = data.mileage.reduce((sum, i) => {
    const hasPassenger = (i.passenger || '').trim().length > 0;
    const rate = hasPassenger ? RATES.km + RATES.passenger : RATES.km;
    return sum + ((Number(i.km) || 0) * rate) + (Number(i.toll) || 0);
  }, 0);

  const expensesTotal = data.expenses.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const grandTotal = mileageTotal + diet.amount + expensesTotal;

  const handlePrint = () => {
    const oldTitle = document.title;
    const safeName = (data.personalInfo.name || 'reiseregning')
      .replace(/[^a-zA-Z0-9æøåÆØÅ\-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const safeDate = (data.travelInfo.departure || new Date().toISOString()).split('T')[0];
    document.title = `Reiseregning_${safeName || 'uten_navn'}_${safeDate}`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  return (
    <div className="preview-modal-overlay fixed inset-0 bg-black/70 z-[1000] flex justify-center items-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden print-only-modal">
        {/* Header toolbar (hidden on print) */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Forhåndsvisning av Reiseregning</h2>
            <p className="text-xs text-slate-500">Klar til utskrift eller lagring som PDF</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Skriv ut / Lagre PDF
            </button>
            <button
              type="button"
              onClick={() => exportToCSV(data)}
              className="px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal content body (printable) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white expense-report-document">
          {/* First A4 Page: Complete Expense Report */}
          <div className="expense-report-page flex flex-col justify-between">
            <div>
              {/* Document Header */}
              <div className="document-header flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">REISEREGNING</h1>
                  <p className="text-xs text-slate-600 font-medium">År: 2026</p>
                </div>
                <div className="text-right text-xs sm:text-sm">
                  <strong className="text-sm sm:text-base text-slate-900">{data.personalInfo.company || 'Eksempelfirma'}</strong>
                  <p className="text-slate-600">Ref: {data.personalInfo.id || '-'}</p>
                </div>
              </div>

              {/* Employee & Travel details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="employee-section bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200 text-xs">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5 border-b border-blue-200 pb-0.5">
                    Ansattinformasjon
                  </h3>
                  <p className="leading-relaxed">
                    <strong>Navn:</strong> {data.personalInfo.name}
                    {data.personalInfo.department && (
                      <span> | <strong>Avdeling:</strong> {data.personalInfo.department}</span>
                    )}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    <strong>Adresse:</strong> {data.personalInfo.address || 'Ikke oppgitt'}
                  </p>
                </div>

                <div className="travel-section bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200 text-xs">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5 border-b border-blue-200 pb-0.5">
                    Om reisen
                  </h3>
                  <p className="leading-relaxed">
                    <strong>Formål:</strong> {data.travelInfo.purpose}
                  </p>
                  {data.travelInfo.event && (
                    <p className="mt-0.5 leading-relaxed">
                      <strong>Arrangement:</strong> {data.travelInfo.event}
                    </p>
                  )}
                  <p className="mt-0.5 leading-relaxed">
                    <strong>Periode:</strong> {data.travelInfo.departure || '-'} til {data.travelInfo.return || '-'}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    <strong>Overnattingssted:</strong> {data.travelInfo.accommodationName || (data.travelInfo.accommodation === 'none' ? 'Ingen' : 'Privat')}
                  </p>
                </div>
              </div>

              {/* Mileage table */}
              {data.mileage.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-blue-900 border-b border-blue-200 pb-0.5 mb-1.5">
                    Kjøring
                  </h3>
                  <table className="expense-table w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-1.5">Dato</th>
                        <th className="border border-slate-300 p-1.5">Fra - Til</th>
                        <th className="border border-slate-300 p-1.5">Km</th>
                        <th className="border border-slate-300 p-1.5">Passasjer</th>
                        <th className="border border-slate-300 p-1.5">Bompenger</th>
                        <th className="border border-slate-300 p-1.5 text-right">Sum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mileage.map(i => {
                        const hasPassenger = (i.passenger || '').trim().length > 0;
                        const routeSum = ((Number(i.km) || 0) * (hasPassenger ? RATES.km + RATES.passenger : RATES.km)) + (Number(i.toll) || 0);
                        return (
                          <tr key={i.id}>
                            <td className="border border-slate-300 p-1.5">{i.date}</td>
                            <td className="border border-slate-300 p-1.5">{i.from} - {i.to}</td>
                            <td className="border border-slate-300 p-1.5">{i.km}</td>
                            <td className="border border-slate-300 p-1.5">{i.passenger || '-'}</td>
                            <td className="border border-slate-300 p-1.5">{formatNOK(Number(i.toll) || 0)}</td>
                            <td className="border border-slate-300 p-1.5 text-right font-medium">{formatNOK(routeSum)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Expenses table */}
              {data.expenses.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-blue-900 border-b border-blue-200 pb-0.5 mb-1.5">
                    Utlegg
                  </h3>
                  <table className="expense-table w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-1.5">Dato</th>
                        <th className="border border-slate-300 p-1.5">Beskrivelse</th>
                        <th className="border border-slate-300 p-1.5 text-center">Bilag</th>
                        <th className="border border-slate-300 p-1.5 text-right">Sum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.map(i => (
                        <tr key={i.id}>
                          <td className="border border-slate-300 p-1.5">{i.date}</td>
                          <td className="border border-slate-300 p-1.5">{i.description}</td>
                          <td className="border border-slate-300 p-1.5 text-center">{i.receipt ? 'Ja' : 'Nei'}</td>
                          <td className="border border-slate-300 p-1.5 text-right font-medium">{formatNOK(Number(i.amount) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Diet Section */}
              <div className="diet-section mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-blue-900 border-b border-blue-200 pb-0.5 mb-1.5">
                  Diettgodtgjørelse
                </h3>
                <div className="p-2 sm:p-2.5 bg-slate-50 border-l-4 border-blue-600 rounded border border-slate-200 text-xs">
                  <p><strong>Sammendrag:</strong> {diet.text}</p>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    Sum diett: {formatNOK(diet.amount)}
                  </p>
                </div>
              </div>

              {/* Grand Total */}
              <div className="summary-row mt-3 p-2.5 sm:p-3 bg-slate-100 border-2 border-slate-800 rounded-lg flex justify-between items-center text-sm sm:text-base font-bold">
                <span>TOTALT Å UTBETALE:</span>
                <span className="text-base sm:text-lg text-blue-900">{formatNOK(grandTotal)}</span>
              </div>
            </div>

            {/* Signature & Approval Line (Matching single-page layout) */}
            <div className="signature-section mt-4 pt-3 border-t border-slate-300 flex justify-between items-end text-xs text-slate-700">
              <div>
                <p className="mb-1">Sted og dato: {datePlace || '____________________'}</p>
                {data.signatureContent ? (
                  <div className="sig-box h-8 w-44 my-0.5 flex items-center">
                    <img
                      src={data.signatureContent}
                      alt="Signatur"
                      className="max-h-8 max-w-full object-contain"
                    />
                  </div>
                ) : null}
                <p className="font-semibold text-slate-800">{data.personalInfo.name}</p>
              </div>

              <div className="text-right">
                <p>Godkjent av leder: ____________________</p>
              </div>
            </div>
          </div>

          {/* Attached Receipts on Subsequent Pages */}
          {data.receipts.length > 0 && (
            <div className="receipts-section mt-8 pt-4">
              <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">Vedlegg / Kvitteringer</h2>
              <div className="space-y-6">
                {data.receipts.map((src, i) => (
                  <div key={i} className="receipt-item text-center p-2 border border-slate-200 rounded">
                    <p className="text-xs text-slate-500 mb-1.5 font-medium">Bilag #{i + 1}</p>
                    <img
                      src={src}
                      alt={`Kvittering ${i + 1}`}
                      className="receipt-image max-h-[700px] max-w-full mx-auto object-contain shadow-sm border border-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
