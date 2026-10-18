import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';

export const VippsSection: React.FC = () => {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border-2 border-[#ff5b24] mb-28 text-center no-print">
      <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2 mb-2">
        <Heart className="w-5 h-5 text-[#ff5b24] fill-[#ff5b24]" />
        Støtt nye prosjekter
      </h2>
      <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
        Vil du bidra til videreutvikling og drift av denne gratis kalkulatoren? Du kan enkelt donere et valgfritt beløp via Vipps!
      </p>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
        <div className="flex flex-col items-center">
          <img
            src="/vipps-qr.png"
            alt="Vipps QR kode for 9834BU"
            className="w-36 h-36 object-contain rounded-xl shadow-md border border-slate-100 p-1 bg-white"
          />
          <p className="text-xs text-slate-500 mt-2">Skann koden med kameraet</p>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-sm text-slate-600 font-medium">Eller bruk Vipps-nummer:</p>
          <div className="text-4xl font-extrabold text-[#ff5b24] tracking-widest my-2 font-mono">
            9834BU
          </div>

          <a
            href="https://qr.vipps.no/box/fe53df96-3a3c-47e3-aa57-6ccfa96a2d96/pay-in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-[#ff5b24] hover:bg-[#e04a1a] text-white rounded-full font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
          >
            Åpne i Vipps
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
