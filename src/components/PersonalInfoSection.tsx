import React from 'react';
import { PersonalInfo } from '../types';
import { UserCheck } from 'lucide-react';

interface PersonalInfoSectionProps {
  personalInfo: PersonalInfo;
  onChange: (info: PersonalInfo) => void;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  personalInfo,
  onChange
}) => {
  const updateField = (field: keyof PersonalInfo, value: string) => {
    onChange({
      ...personalInfo,
      [field]: value
    });
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-blue-600" />
        1. Personopplysninger
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Navn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={personalInfo.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="F.eks. Ola Nordmann"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Firma / Selskap
          </label>
          <input
            type="text"
            value={personalInfo.company}
            onChange={e => updateField('company', e.target.value)}
            placeholder="F.eks. Mitt Firma AS"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Ansattnr
          </label>
          <input
            type="text"
            value={personalInfo.id}
            onChange={e => updateField('id', e.target.value)}
            placeholder="F.eks. 1042"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Avdeling
          </label>
          <input
            type="text"
            value={personalInfo.department}
            onChange={e => updateField('department', e.target.value)}
            placeholder="F.eks. Salg / Utvikling"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          Adresse
        </label>
        <input
          type="text"
          value={personalInfo.address}
          onChange={e => updateField('address', e.target.value)}
          placeholder="F.eks. Storgata 1, 0182 Oslo"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </section>
  );
};
