import React from 'react';
import { HelpCircle, X, CheckCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-[1500] flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Hvordan bruke appen?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Om kalkulatoren
            </h3>
            <p>
              Denne kalkulatoren hjelper deg med å fylle ut en komplett reiseregning basert på statens satser for 2026. Alt regnes ut automatisk mens du skriver.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Reise og Diett:</strong> Fyll inn dato og klokkeslett for avreise og hjemkomst. Appen beregner automatisk døgndiett og overskytende timer etter gjeldende satser. Kryss av for måltidene du har fått dekket for å få riktig måltidstrekk (20% frokost, 30% lunsj, 50% middag).
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Kjøring og Utlegg:</strong> Legg til ruter og utlegg. Du kan legge til så mange rader du trenger. Systemet legger automatisk til passasjertillegg (+1,00 kr/km) hvis du fyller inn navnet på en passasjer.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Kvitteringer / Vedlegg:</strong> Ta bilde av kvitteringene dine eller last dem opp. De legges automatisk ved som egne sider bakerst i PDF-dokumentet.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Signering:</strong> Du kan tegne signaturen din direkte på skjermen (med mus eller finger), eller laste opp et bilde av signaturen.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Eksport:</strong> Du kan forhåndsvise og skrive ut en A4-formatert PDF, eller eksportere som semikolon-separert CSV-fil klar for norske regnskapssystemer.
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Lagring og Sikkerhet
            </h3>
            <p className="text-xs text-slate-600">
              Når du er logget inn, kan du lagre reiseregningene dine i skyen, hente dem frem på nytt, eller sende dem inn til godkjenning i bedriftsportalen.
            </p>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition cursor-pointer"
            >
              Jeg forstår, lukk vinduet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
