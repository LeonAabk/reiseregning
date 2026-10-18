import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, User } from '../types';
import { dataService, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  currentCompany: Company | null;
  companyRole: 'admin' | 'ansatt' | null;
  workspaceMode: 'privatperson' | 'bedrift';
  loading: boolean;
  setWorkspaceMode: (mode: 'privatperson' | 'bedrift') => void;
  logIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logOut: () => Promise<void>;
  createCompany: (name: string) => Promise<Company | null>;
  joinCompany: (code: string) => Promise<{ success: boolean; message?: string }>;
  leaveCompany: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<'admin' | 'ansatt' | null>(null);
  const [workspaceMode, setWorkspaceModeState] = useState<'privatperson' | 'bedrift'>('privatperson');
  const [loading, setLoading] = useState(true);

  const refreshCompany = async () => {
    if (!currentUser) {
      setCurrentCompany(null);
      setCompanyRole(null);
      return;
    }
    const mem = await dataService.getCompanyMembership(currentUser.id);
    setCurrentCompany(mem.company);
    setCompanyRole(mem.role);
  };

  useEffect(() => {
    // Initial user load
    dataService.getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user) {
        dataService.getCompanyMembership(user.id).then(mem => {
          setCurrentCompany(mem.company);
          setCompanyRole(mem.role);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Supabase auth state change listener
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u: User = { id: session.user.id, email: session.user.email || 'bruker@eksempel.no' };
        setCurrentUser(u);
        dataService.getCompanyMembership(u.id).then(mem => {
          setCurrentCompany(mem.company);
          setCompanyRole(mem.role);
        });
      } else {
        // Only clear if no local user
        dataService.getCurrentUser().then(localU => {
          if (!localU) {
            setCurrentUser(null);
            setCurrentCompany(null);
            setCompanyRole(null);
          }
        });
      }
    });

    const savedMode = localStorage.getItem('workspaceMode') as 'privatperson' | 'bedrift' | null;
    if (savedMode) {
      setWorkspaceModeState(savedMode);
    }

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const setWorkspaceMode = (mode: 'privatperson' | 'bedrift') => {
    setWorkspaceModeState(mode);
    localStorage.setItem('workspaceMode', mode);
  };

  const logIn = async (email: string, pass: string) => {
    try {
      const res = await dataService.signIn(email, pass);
      if (res.user) {
        setCurrentUser(res.user);
        const mem = await dataService.getCompanyMembership(res.user.id);
        setCurrentCompany(mem.company);
        setCompanyRole(mem.role);
        return { success: true };
      }
      return { success: false, error: res.error || 'Feil ved innlogging.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Feil ved innlogging.' };
    }
  };

  const signUp = async (email: string, pass: string) => {
    try {
      const res = await dataService.signUp(email, pass);
      if (res.user) {
        setCurrentUser(res.user);
        return { success: true, message: res.message };
      }
      return { success: false, error: res.error || 'Feil ved registrering.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Feil ved registrering.' };
    }
  };

  const resetPassword = async (email: string) => {
    return await dataService.resetPassword(email);
  };

  const logOut = async () => {
    await dataService.signOut();
    setCurrentUser(null);
    setCurrentCompany(null);
    setCompanyRole(null);
  };

  const createCompany = async (name: string): Promise<Company | null> => {
    if (!currentUser) return null;
    try {
      const comp = await dataService.createCompany(currentUser.id, currentUser.email, name);
      setCurrentCompany(comp);
      setCompanyRole('admin');
      return comp;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const joinCompany = async (code: string) => {
    if (!currentUser) return { success: false, message: 'Ikke logget inn.' };
    const res = await dataService.joinCompany(currentUser.id, currentUser.email, code);
    if (res.success) {
      await refreshCompany();
    }
    return res;
  };

  const leaveCompany = async () => {
    if (!currentUser) return;
    await dataService.leaveCompany(currentUser.id);
    setCurrentCompany(null);
    setCompanyRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCompany,
        companyRole,
        workspaceMode,
        loading,
        setWorkspaceMode,
        logIn,
        signUp,
        resetPassword,
        logOut,
        createCompany,
        joinCompany,
        leaveCompany,
        refreshCompany
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
