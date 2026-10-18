import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  LogIn,
  UserPlus,
  LogOut,
  BookmarkCheck,
  Building,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail
} from 'lucide-react';

interface AuthSectionProps {
  onSavePersonalInfo: () => void;
  onOpenPortal: () => void;
}

export const AuthSection: React.FC<AuthSectionProps> = ({ onSavePersonalInfo, onOpenPortal }) => {
  const {
    currentUser,
    currentCompany,
    companyRole,
    workspaceMode,
    setWorkspaceMode,
    logIn,
    signUp,
    resetPassword,
    logOut
  } = useAuth();
  const { showToast } = useUI();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vennligst fyll inn både e-post og passord.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    const res = await logIn(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Feil ved innlogging. Sjekk e-post og passord.');
    } else {
      showToast('Velkommen! Du er nå logget inn.', 'success');
      setEmail('');
      setPassword('');
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vennligst fyll inn både e-post og passord.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Passordet må være på minst 6 tegn.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    const res = await signUp(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Feil ved registrering.');
    } else {
      setInfoMessage(res.message || 'Konto opprettet! Du kan nå logge inn.');
      showToast('Konto opprettet i Supabase!', 'success');
      setAuthMode('login');
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Skriv inn e-postadressen din først for å få tilbakestillingslenke.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    const res = await resetPassword(email);
    setLoading(false);
    if (res.success) {
      setInfoMessage(res.message || 'Tilbakestillingslenke sendt til din e-post.');
      showToast('Lenke for passord sendt!', 'info');
      setShowResetForm(false);
    } else {
      setErrorMessage(res.error || 'Kunne ikke tilbakestille passord.');
    }
  };

  const handleLogout = async () => {
    await logOut();
    showToast('Du er nå logget ut.', 'info');
  };

  return (
    <section className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6 no-print">
      {!currentUser ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Konto og Innlogging
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sikker innlogging med Supabase</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            Logg inn med din brukerkonto for å lagre reiseregningene dine trygt i skyen, eller få tilgang til bedriftens godkjenningsportal.
          </p>

          {/* Login vs Signup Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg max-w-xs mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage('');
                setInfoMessage('');
                setShowResetForm(false);
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logg inn
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage('');
                setInfoMessage('');
                setShowResetForm(false);
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registrer ny bruker
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  E-postadresse
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="din.epost@firma.no"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    Passord
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowResetForm(prev => !prev)}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                      Glemt passord?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={authMode === 'login' ? 'Ditt passord' : 'Minst 6 tegn'}
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showPassword ? 'Skjul passord' : 'Vis passord'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {showResetForm && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-blue-800">
                  Vil du motta en lenke for å tilbakestille passordet til <strong>{email || 'din e-post'}</strong>?
                </span>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition cursor-pointer shrink-0 ml-3"
                >
                  Send lenke
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              {authMode === 'login' ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Logger inn i Supabase...' : 'Logg inn'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? 'Oppretter konto...' : 'Opprett konto'}
                </button>
              )}
            </div>
          </form>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {infoMessage && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>{infoMessage}</div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {(currentUser.email || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Min Profil</h2>
                <p className="text-sm text-slate-500">
                  Logget inn som: <strong className="text-slate-800">{currentUser.email}</strong>
                </p>
                {currentCompany && (
                  <p className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" />
                    Tilknyttet: {currentCompany.name} ({companyRole === 'admin' ? 'Administrator' : 'Ansatt'})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSavePersonalInfo}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Lagrer navn, firma og adresse til neste gang"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                Lagre Personinfo
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logg ut
              </button>
            </div>
          </div>

          {/* Workspace mode selector */}
          <div className="mt-4 pt-2">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
              Velg arbeidsmodus:
            </label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-md">
              <button
                type="button"
                onClick={() => setWorkspaceMode('privatperson')}
                className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition cursor-pointer ${
                  workspaceMode === 'privatperson'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bruk som: Privatperson
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode('bedrift')}
                className={`flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition cursor-pointer ${
                  workspaceMode === 'bedrift'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bruk som: Ansatt i bedrift
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {workspaceMode === 'privatperson'
                ? 'Du bruker appen som privatperson. Du kan fylle ut selskap-spesifikke felt som vanlig for PDF/eksport, men portal-funksjonalitet er skjult.'
                : 'Du bruker appen som ansatt. Bedriftsportal for admin og direkte innsending av reiseregninger til selskapet er aktivert.'}
            </p>

            {workspaceMode === 'bedrift' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onOpenPortal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Building className="w-3.5 h-3.5" />
                  Åpne Bedriftsportal {companyRole === 'admin' ? '(Admin)' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
