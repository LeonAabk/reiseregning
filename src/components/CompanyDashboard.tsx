import React, { useEffect, useState } from 'react';
import { CompanyMember, ExpenseReportRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { dataService } from '../lib/supabase';
import { formatNOK, formatNum } from '../constants/rates';
import { ReportDetailModal } from './ReportDetailModal';
import {
  Building2,
  Users,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  CreditCard,
  ArrowLeft,
  UserPlus,
  PlusCircle,
  Clock,
  RotateCcw,
  CheckCircle,
  Ban,
  Edit3
} from 'lucide-react';

interface CompanyDashboardProps {
  onBackToExpenseForm: () => void;
  onEditReportInForm: (report: ExpenseReportRecord) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  onBackToExpenseForm,
  onEditReportInForm
}) => {
  const {
    currentUser,
    currentCompany,
    companyRole,
    createCompany,
    joinCompany,
    leaveCompany,
    refreshCompany
  } = useAuth();
  const { showToast, confirm, prompt } = useUI();

  // State for unaffiliated users
  const [newCompanyName, setNewCompanyName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  // Dashboard data
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [reports, setReports] = useState<ExpenseReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for admin
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Selected report modal
  const [selectedReport, setSelectedReport] = useState<ExpenseReportRecord | null>(null);

  // Join code copy state
  const [copiedCode, setCopiedCode] = useState(false);

  const loadDashboardData = async () => {
    if (!currentCompany) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [membersData, reportsData] = await Promise.all([
        dataService.getCompanyMembers(currentCompany.id),
        companyRole === 'admin'
          ? dataService.getCompanyReports(currentCompany.id)
          : currentUser
          ? dataService.getUserReports(currentUser.id, currentCompany.id)
          : []
      ]);

      setMembers(membersData);
      setReports(reportsData);
    } catch (e: any) {
      console.error(e);
      showToast('Feil ved lasting av data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentCompany, companyRole, currentUser]);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      showToast('Vennligst skriv inn et firmanavn.', 'error');
      return;
    }
    setIsSubmittingCompany(true);
    const comp = await createCompany(newCompanyName.trim());
    setIsSubmittingCompany(false);
    if (comp) {
      showToast(`Firmaet "${comp.name}" er opprettet! Del koden ${comp.join_code} med ansatte.`, 'success');
    } else {
      showToast('Feil ved opprettelse av firma.', 'error');
    }
  };

  const handleJoinCompany = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || code.length !== 6) {
      showToast('Vennligst oppgi en gyldig 6-tegns kode.', 'error');
      return;
    }
    setIsSubmittingCompany(true);
    const res = await joinCompany(code);
    setIsSubmittingCompany(false);
    if (res.success) {
      showToast('Du er nå lagt til i selskapet!', 'success');
      setJoinCodeInput('');
    } else {
      showToast(res.message || 'Kunne ikke bli med i firma.', 'error');
    }
  };

  const handleCopyCode = () => {
    if (!currentCompany?.join_code) return;
    navigator.clipboard.writeText(currentCompany.join_code);
    setCopiedCode(true);
    showToast('Invitasjonskode kopiert til utklippstavlen: ' + currentCompany.join_code, 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleLeaveCompany = async () => {
    const ok = await confirm('Er du sikker på at du vil forlate firmaet? Du vil miste tilgangen til bedriftsportalen.');
    if (!ok) return;

    try {
      await leaveCompany();
      showToast('Du har forlatt firmaet.', 'info');
      onBackToExpenseForm();
    } catch (e: any) {
      showToast('Feil ved utmelding: ' + e.message, 'error');
    }
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    try {
      await dataService.updateReportStatus(reportId, newStatus);
      showToast(`Status oppdatert til ${newStatus}.`, 'success');
      await loadDashboardData();
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (e: any) {
      showToast('Feil ved statusoppdatering: ' + e.message, 'error');
    }
  };

  const handleReject = async (reportId: string) => {
    const reason = await prompt('Skriv en begrunnelse for avvisning (påkrevd):');
    if (!reason || !reason.trim()) {
      showToast('Begrunnelse er påkrevd for å avvise.', 'error');
      return;
    }

    try {
      await dataService.updateReportStatus(reportId, 'avvist', reason.trim());
      showToast('Reiseregning avvist.', 'success');
      await loadDashboardData();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (e: any) {
      showToast('Feil ved avvisning: ' + e.message, 'error');
    }
  };

  const handleWithdraw = async (reportId: string) => {
    const ok = await confirm('Er du sikker på at du vil trekke tilbake denne reiseregningen?');
    if (!ok) return;

    try {
      await dataService.updateReportStatus(reportId, 'kansellert');
      showToast('Reiseregningen er trukket tilbake.', 'success');
      await loadDashboardData();
    } catch (e: any) {
      showToast('Kunne ikke trekke tilbake reiseregningen: ' + e.message, 'error');
    }
  };

  const handleEditDraft = async (rep: ExpenseReportRecord) => {
    try {
      await dataService.updateReportStatus(rep.id, 'utkast');
      onEditReportInForm(rep);
    } catch (e: any) {
      showToast('Kunne ikke åpne rapport for redigering: ' + e.message, 'error');
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'utkast':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-200 text-slate-700">Utkast</span>;
      case 'innsendt':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-blue-100 text-blue-800">Innsendt</span>;
      case 'godkjent':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-amber-100 text-amber-800">Godkjent</span>;
      case 'utbetalt':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-800">Utbetalt</span>;
      case 'avvist':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-red-100 text-red-800">Avvist</span>;
      case 'kansellert':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-200 text-gray-700">Kansellert</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  // If not in a company yet:
  if (!currentCompany) {
    return (
      <div className="max-w-4xl mx-auto pb-24">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Opprett eller bli med i et firma
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Knytt din brukerkonto til en bedrift for felles godkjenning og utbetaling
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToExpenseForm}
            className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til Skjema
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Company card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Opprett nytt firma
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Du blir automatisk administrator for det nye firmaet og kan godkjenne reiseregninger.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Firmanavn
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  placeholder="F.eks. Mitt Firma AS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                disabled={isSubmittingCompany}
                onClick={handleCreateCompany}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer disabled:opacity-60"
              >
                {isSubmittingCompany ? 'Oppretter...' : 'Opprett firma'}
              </button>
            </div>
          </div>

          {/* Join Company card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Bli med i et firma
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Har bedriften din allerede opprettet en konto? Be lederen om den 6-sifrede invitasjonskoden.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Invitasjonskode (6 tegn)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="F.eks. AB12CD"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                disabled={isSubmittingCompany}
                onClick={handleJoinCompany}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition cursor-pointer disabled:opacity-60"
              >
                {isSubmittingCompany ? 'Kobler til...' : 'Bli med'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ANSATT (EMPLOYEE) VIEW ---
  if (companyRole !== 'admin') {
    const sumPending = reports.reduce((acc, r) => {
      if (r.status === 'innsendt' || r.status === 'godkjent') {
        return acc + (r.report_data?.totals?.grandTotal || 0);
      }
      return acc;
    }, 0);

    const sumPaid = reports.reduce((acc, r) => {
      if (r.status === 'utbetalt') {
        return acc + (r.report_data?.totals?.grandTotal || 0);
      }
      return acc;
    }, 0);

    const admins = members.filter(m => m.role === 'admin');
    const adminEmails = admins.map(a => a.user_email || 'Selskapets administrator').filter(Boolean).join(', ');

    return (
      <div className="max-w-5xl mx-auto pb-28">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              {currentCompany.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">Rolle: Ansatt</p>
          </div>
          <button
            type="button"
            onClick={onBackToExpenseForm}
            className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til Reiseregning
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500 border border-slate-200">
            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Venter på utbetaling</h4>
            <p className="text-2xl font-extrabold text-slate-800">{formatNOK(sumPending)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-500 border border-slate-200">
            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Totalt utbetalt</h4>
            <p className="text-2xl font-extrabold text-slate-800">{formatNOK(sumPaid)}</p>
          </div>
        </div>

        {/* Company info box */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 mb-3">
            Firma-info
          </h3>
          <p className="text-sm text-slate-700">
            <strong>Firma:</strong> {currentCompany.name}
          </p>
          <p className="text-sm text-slate-700 mt-1">
            <strong>Administratorer:</strong> {adminEmails || 'Selskapets administrator'}
          </p>
          <button
            type="button"
            onClick={handleLeaveCompany}
            className="mt-4 px-3 py-1.5 border border-red-500 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Forlat firma
          </button>
        </div>

        {/* Employee Reports Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 mb-4">
            Dine innsendte reiseregninger
          </h3>

          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 text-xs text-slate-600 mb-4">
            <strong>Statusforklaring:</strong> Innsendt (Venter på godkjenning) → Godkjent (Venter på utbetaling) → Utbetalt (Ferdig behandlet) • <em>Trukket tilbake (Kansellert av ansatt)</em>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Dato</th>
                  <th className="py-2.5 px-3">Navn på reise</th>
                  <th className="py-2.5 px-3">Sum</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Handling</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Du har ikke sendt inn noen reiseregninger enda.
                    </td>
                  </tr>
                ) : (
                  reports.map(r => {
                    const dateStr = new Date(r.created_at).toLocaleDateString('no-NO');
                    const grandTotal = r.report_data?.totals?.grandTotal || 0;

                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 text-xs text-slate-600">{dateStr}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{r.trip_name || 'Uten navn'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{formatNOK(grandTotal)}</td>
                        <td className="py-2.5 px-3">{renderStatusBadge(r.status)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedReport(r)}
                              className="px-2.5 py-1 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition cursor-pointer"
                            >
                              Se detaljer
                            </button>

                            {r.status === 'innsendt' && (
                              <button
                                type="button"
                                onClick={() => handleWithdraw(r.id)}
                                className="px-2.5 py-1 border border-amber-400 text-amber-700 hover:bg-amber-50 rounded text-xs font-semibold transition cursor-pointer"
                              >
                                Trekk tilbake
                              </button>
                            )}

                            {(r.status === 'kansellert' || r.status === 'avvist') && (
                              <button
                                type="button"
                                onClick={() => handleEditDraft(r)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                Gjør endringer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            isAdmin={false}
            isOwner={selectedReport.user_id === currentUser?.id}
            onClose={() => setSelectedReport(null)}
            onEditDraft={handleEditDraft}
          />
        )}
      </div>
    );
  }

  // --- ADMIN VIEW ---
  const countActionRequired = reports.filter(r => r.status === 'innsendt').length;
  const totalPaidSum = reports.reduce((sum, r) => {
    if (r.status === 'utbetalt') {
      return sum + (r.report_data?.totals?.grandTotal || 0);
    }
    return sum;
  }, 0);

  const memberEmails: Record<string, string> = {};
  members.forEach(m => {
    memberEmails[m.user_id] = m.user_email || (m.user_id === currentUser?.id ? currentUser.email : '');
  });

  // Unique employees from reports & members
  const uniqueEmployees = Array.from(
    new Set([...reports.map(r => r.user_id), ...members.map(m => m.user_id)])
  );

  // Filtered reports
  const filteredReports = reports.filter(r => {
    if (filterEmployee !== 'all' && r.user_id !== filterEmployee) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  // Group filtered reports by employee
  const groupedReports = new Map<string, ExpenseReportRecord[]>();
  filteredReports.forEach(r => {
    if (!groupedReports.has(r.user_id)) {
      groupedReports.set(r.user_id, []);
    }
    groupedReports.get(r.user_id)!.push(r);
  });

  return (
    <div className="max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            {currentCompany.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs uppercase font-semibold text-slate-500">Invitasjonskode:</span>
            <div className="inline-flex items-center gap-2 bg-slate-100 border border-dashed border-slate-300 px-2.5 py-1 rounded font-mono font-bold text-slate-800 text-sm">
              {currentCompany.join_code}
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-xs text-blue-600 hover:text-blue-800 p-0.5 transition cursor-pointer"
                title="Kopier kode"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToExpenseForm}
          className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til Reiseregning
        </button>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-blue-600">
          <h4 className="text-xs font-semibold uppercase text-blue-600 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Krever handling
          </h4>
          <p className="text-2xl font-extrabold text-blue-600">{countActionRequired}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Antall ansatte
          </h4>
          <p className="text-2xl font-extrabold text-slate-800">{members.length}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5" /> Registrerte reiser
          </h4>
          <p className="text-2xl font-extrabold text-slate-800">{reports.length}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Total sum utbetalt
          </h4>
          <p className="text-2xl font-extrabold text-emerald-600">{formatNOK(totalPaidSum)}</p>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100 mb-4">
          Medlemmer
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 px-3">E-post / Bruker</th>
                <th className="py-2.5 px-3">Rolle</th>
                <th className="py-2.5 px-3">Til godkjenning</th>
                <th className="py-2.5 px-3">Utestående beløp</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                    Ingen medlemmer funnet.
                  </td>
                </tr>
              ) : (
                members.map(m => {
                  const display = m.user_email || (m.user_id === currentUser?.id ? currentUser.email : m.user_id.substring(0, 8));
                  const userReports = reports.filter(r => r.user_id === m.user_id);
                  const pendingCount = userReports.filter(r => r.status === 'innsendt').length;
                  const pendingSum = userReports.reduce((sum, r) => {
                    if (r.status === 'innsendt' || r.status === 'godkjent') {
                      return sum + (r.report_data?.totals?.grandTotal || 0);
                    }
                    return sum;
                  }, 0);

                  return (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{display}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 capitalize">
                        {m.role === 'admin' ? 'Administrator' : 'Ansatt'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{pendingCount}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{formatNOK(pendingSum)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Reports Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-800">
            Alle reiseregninger i firmaet
          </h3>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={filterEmployee}
                onChange={e => setFilterEmployee(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Alle ansatte</option>
                {uniqueEmployees.map(uid => {
                  const email = memberEmails[uid] || uid.substring(0, 8);
                  return (
                    <option key={uid} value={uid}>
                      {email}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Alle statuser</option>
                <option value="innsendt">Innsendt</option>
                <option value="godkjent">Godkjent</option>
                <option value="utbetalt">Utbetalt</option>
                <option value="avvist">Avvist</option>
                <option value="utkast">Utkast</option>
                <option value="kansellert">Kansellert</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
                <th className="py-2.5 px-3">Dato</th>
                <th className="py-2.5 px-3">Navn på reise</th>
                <th className="py-2.5 px-3">Ansatt</th>
                <th className="py-2.5 px-3">Sum</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Handling</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Ingen reiseregninger funnet med valgte filtre.
                  </td>
                </tr>
              ) : (
                Array.from(groupedReports.entries()).map(([userId, userReports]) => {
                  const empName = userReports[0]?.report_data?.personalInfo?.name || memberEmails[userId] || userId.substring(0, 8);
                  const email = memberEmails[userId] || '';

                  return (
                    <React.Fragment key={userId}>
                      {/* Employee Group Header */}
                      <tr className="bg-slate-50 border-t border-b border-slate-200">
                        <td colSpan={6} className="py-2 px-3 text-xs font-bold text-slate-700">
                          {empName} {email ? `(${email})` : ''} • {userReports.length} {userReports.length === 1 ? 'reise' : 'reiser'}
                        </td>
                      </tr>

                      {userReports.map(r => {
                        const dateStr = new Date(r.created_at).toLocaleDateString('no-NO');
                        const grandTotal = r.report_data?.totals?.grandTotal || 0;

                        return (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 text-xs text-slate-600">{dateStr}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{r.trip_name || 'Uten navn'}</td>
                            <td className="py-2.5 px-3 text-xs text-slate-600">{r.report_data?.personalInfo?.name || empName}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{formatNOK(grandTotal)}</td>
                            <td className="py-2.5 px-3">{renderStatusBadge(r.status)}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReport(r)}
                                  className="px-2 py-1 border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition cursor-pointer"
                                >
                                  Se detaljer
                                </button>

                                {r.status === 'innsendt' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusUpdate(r.id, 'godkjent')}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition cursor-pointer"
                                    >
                                      Godkjenn
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReject(r.id)}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition cursor-pointer"
                                    >
                                      Avvis
                                    </button>
                                  </>
                                )}

                                {r.status === 'godkjent' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(r.id, 'utbetalt')}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition cursor-pointer"
                                  >
                                    Utbetalt
                                  </button>
                                )}

                                {['godkjent', 'utbetalt', 'avvist'].includes(r.status) && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(r.id, 'innsendt')}
                                    className="px-2 py-1 border border-amber-500 text-amber-700 hover:bg-amber-50 rounded text-xs font-semibold flex items-center gap-0.5 transition cursor-pointer"
                                    title="Sett tilbake til innsendt"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Angre
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isAdmin={true}
          isOwner={selectedReport.user_id === currentUser?.id}
          onClose={() => setSelectedReport(null)}
          onApprove={id => handleStatusUpdate(id, 'godkjent')}
          onReject={handleReject}
          onMarkPaid={id => handleStatusUpdate(id, 'utbetalt')}
          onEditDraft={handleEditDraft}
        />
      )}
    </div>
  );
};
