import React from 'react';
import { ExpenseReportRecord } from '../types';
import { formatNOK, RATES } from '../constants/rates';
import { X, CheckCircle, AlertTriangle, CreditCard, Edit3 } from 'lucide-react';

interface ReportDetailModalProps {
  report: ExpenseReportRecord;
  isAdmin: boolean;
  isOwner: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  onEditDraft?: (report: ExpenseReportRecord) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isAdmin,
  isOwner,
  onClose,
  onApprove,
  onReject,
  onMarkPaid,
  onEditDraft
}) => {
  const data = report.report_data;
  const dateStr = new Date(report.created_at).toLocaleDateString('no-NO');

  return (
    <div className="fixed inset-0 bg-black/70 z-[1200] flex justify-center items-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Reiseregning Detaljer</h2>
            <p className="text-xs text-slate-500">{report.trip_name} • {dateStr}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-sm">
          {/* Rejection notice if status is avvist */}
          {report.status === 'avvist' && report.admin_comment && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                AVVIST AV LEDER
              </div>
              <p className="text-sm mb-3">
                <strong>Begrunnelse:</strong> {report.admin_comment}
              </p>
              {isOwner && onEditDraft && (
                <button
                  type="button"
                  onClick={() => onEditDraft(report)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Gjør endringer
                </button>
              )}
            </div>
          )}

          {/* Document Header details */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reiseregning</h1>
              <p className="text-xs text-slate-500 mt-1">Dato sendt: {dateStr}</p>
              <p className="text-xs text-slate-500">Reisens navn: {report.trip_name || 'Uten navn'}</p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <p><strong>Ansatt:</strong> {data?.personalInfo?.name || '-'}</p>
              <p><strong>E-post:</strong> {report.employeeEmail || data?.personalInfo?.email || '-'}</p>
              <p><strong>Avdeling:</strong> {data?.personalInfo?.department || '-'}</p>
              <p><strong>Firma:</strong> {data?.personalInfo?.company || '-'}</p>
            </div>
          </div>

          {/* Travel Info */}
          {data?.travelInfo && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Om reisen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <p><strong>Formål:</strong> {data.travelInfo.purpose}</p>
                <p><strong>Arrangement:</strong> {data.travelInfo.event || 'Ikke oppgitt'}</p>
                <p><strong>Periode:</strong> {data.travelInfo.departure || '-'} til {data.travelInfo.return || '-'}</p>
                <p><strong>Overnatting:</strong> {data.travelInfo.accommodationName || (data.travelInfo.accommodation === 'none' ? 'Ingen' : 'Privat')}</p>
              </div>
            </div>
          )}

          {/* Diet summary */}
          {data?.dietSummary && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Diettgodtgjørelse</h3>
              <div className="p-3 bg-slate-50 border-l-4 border-blue-600 rounded text-xs">
                <p><strong>Sammendrag:</strong> {data.dietSummary.text}</p>
                <p className="mt-1 font-semibold text-slate-800">
                  Sum diett: {formatNOK(data.dietSummary.amount)}
                </p>
              </div>
            </div>
          )}

          {/* Mileage */}
          {data?.mileage && data.mileage.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Kjøring</h3>
              <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border border-slate-200">Dato</th>
                    <th className="p-2 border border-slate-200">Fra - Til</th>
                    <th className="p-2 border border-slate-200">Km</th>
                    <th className="p-2 border border-slate-200">Passasjer</th>
                    <th className="p-2 border border-slate-200">Bompenger</th>
                    <th className="p-2 border border-slate-200 text-right">Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mileage.map(m => {
                    const hasPass = (m.passenger || '').trim().length > 0;
                    const rate = hasPass ? RATES.km + RATES.passenger : RATES.km;
                    const sum = ((Number(m.km) || 0) * rate) + (Number(m.toll) || 0);
                    return (
                      <tr key={m.id} className="border-b border-slate-100">
                        <td className="p-2 border border-slate-200">{m.date}</td>
                        <td className="p-2 border border-slate-200">{m.from} - {m.to}</td>
                        <td className="p-2 border border-slate-200">{m.km}</td>
                        <td className="p-2 border border-slate-200">{m.passenger || '-'}</td>
                        <td className="p-2 border border-slate-200">{formatNOK(Number(m.toll) || 0)}</td>
                        <td className="p-2 border border-slate-200 text-right font-medium">{formatNOK(sum)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expenses */}
          {data?.expenses && data.expenses.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Utlegg</h3>
              <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border border-slate-200">Dato</th>
                    <th className="p-2 border border-slate-200">Beskrivelse</th>
                    <th className="p-2 border border-slate-200 text-center">Bilag</th>
                    <th className="p-2 border border-slate-200 text-right">Beløp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map(exp => (
                    <tr key={exp.id} className="border-b border-slate-100">
                      <td className="p-2 border border-slate-200">{exp.date}</td>
                      <td className="p-2 border border-slate-200">{exp.description}</td>
                      <td className="p-2 border border-slate-200 text-center">{exp.receipt ? 'Ja' : 'Nei'}</td>
                      <td className="p-2 border border-slate-200 text-right font-medium">{formatNOK(Number(exp.amount) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grand Total */}
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg flex justify-between items-center font-bold">
            <span className="text-sm text-slate-700">Total sum til utbetaling:</span>
            <span className="text-lg text-blue-900">{formatNOK(data?.totals?.grandTotal || 0)}</span>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Ansatt signatur</p>
              <div className="h-16 w-48 border-b border-slate-400 flex items-center justify-center bg-white p-1">
                {data?.signatureContent ? (
                  <img src={data.signatureContent} alt="Ansatt signatur" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-slate-400 italic">Ikke signert</span>
                )}
              </div>
              <p className="mt-1 text-slate-500">{data?.personalInfo?.name}</p>
            </div>

            <div>
              <p className="font-semibold text-slate-700 mb-1">Godkjent av leder</p>
              <div className="h-16 w-48 border-b border-slate-400 flex items-center justify-center bg-white p-1">
                {report.status === 'godkjent' || report.status === 'utbetalt' ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Godkjent
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-slate-500">Status: {report.status}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions for Admin */}
        {isAdmin && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
            {report.status === 'innsendt' && (
              <>
                <button
                  type="button"
                  onClick={() => onReject && onReject(report.id)}
                  className="px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Avvis
                </button>
                <button
                  type="button"
                  onClick={() => onApprove && onApprove(report.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Godkjenn
                </button>
              </>
            )}

            {report.status === 'godkjent' && (
              <button
                type="button"
                onClick={() => onMarkPaid && onMarkPaid(report.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Marker som utbetalt
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
