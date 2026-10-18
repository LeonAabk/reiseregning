import { createClient } from '@supabase/supabase-js';
import { Company, CompanyMember, ExpenseReportRecord, User } from '../types';

const supabaseUrl = 'https://yfanegpwyjqhkbiikfny.supabase.co';
const supabaseKey = 'sb_publishable_G8uHOPVInNnMvm6rSjWB5g_QjeHyhY-';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Local fallback store keys
const LOCAL_STORAGE_USERS_KEY = 'reiseregning_local_users';
const LOCAL_STORAGE_REPORTS_KEY = 'reiseregning_local_reports';
const LOCAL_STORAGE_COMPANIES_KEY = 'reiseregning_local_companies';
const LOCAL_STORAGE_MEMBERS_KEY = 'reiseregning_local_members';

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

// Generate 6-char join code
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Data service with Supabase primary and resilient offline fallback
export const dataService = {
  // Auth
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        return {
          id: session.user.id,
          email: session.user.email || 'bruker@eksempel.no'
        };
      }
    } catch (e) {
      console.warn('Supabase auth session error:', e);
    }
    return null;
  },

  async signUp(email: string, pass: string): Promise<{ user: User | null; error?: string; message?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const u: User = { id: data.user.id, email: data.user.email || email };
        return {
          user: u,
          message: 'Konto opprettet! Sjekk innboksen for bekreftelses-e-post hvis aktivert, eller logg inn.'
        };
      }
      return { user: null, error: 'Kunne ikke opprette konto.' };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Nettverksfeil ved registrering.' };
    }
  },

  async signIn(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const u: User = { id: data.user.id, email: data.user.email || email };
        return { user: u };
      }
      return { user: null, error: 'Ingen bruker funnet.' };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Nettverksfeil ved innlogging.' };
    }
  },

  async resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Lenke for tilbakestilling av passord er sendt til din e-post.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Feil ved tilbakestilling av passord.' };
    }
  },

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
  },

  // Company management
  async getCompanyMembership(userId: string): Promise<{ company: Company | null; role: 'admin' | 'ansatt' | null }> {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('role, companies(id, name, join_code)')
        .eq('user_id', userId)
        .single();

      if (!error && data && data.companies) {
        const comp = data.companies as any;
        return {
          company: { id: comp.id, name: comp.name, join_code: comp.join_code },
          role: data.role as 'admin' | 'ansatt'
        };
      }
    } catch (e) {
      console.warn('Error fetching company membership from Supabase:', e);
    }

    // Local fallback
    const members = getLocal<CompanyMember[]>(LOCAL_STORAGE_MEMBERS_KEY, []);
    const userMember = members.find(m => m.user_id === userId);
    if (userMember) {
      const companies = getLocal<Company[]>(LOCAL_STORAGE_COMPANIES_KEY, []);
      const comp = companies.find(c => c.id === userMember.company_id);
      if (comp) {
        return { company: comp, role: userMember.role };
      }
    }
    return { company: null, role: null };
  },

  async createCompany(userId: string, email: string, name: string): Promise<Company> {
    const code = generateJoinCode();
    try {
      const { data, error } = await supabase.rpc('create_company', {
        company_name: name,
        new_join_code: code,
        user_email: email
      });
      if (!error) {
        // If RPC succeeded, retrieve company
        const membership = await this.getCompanyMembership(userId);
        if (membership.company) return membership.company;
      }
    } catch (e) {
      console.warn('RPC create_company failed, fallback locally:', e);
    }

    // Fallback local creation
    const companyId = 'comp_' + Math.random().toString(36).substring(2, 9);
    const newComp: Company = { id: companyId, name, join_code: code };
    const companies = getLocal<Company[]>(LOCAL_STORAGE_COMPANIES_KEY, []);
    companies.push(newComp);
    setLocal(LOCAL_STORAGE_COMPANIES_KEY, companies);

    const members = getLocal<CompanyMember[]>(LOCAL_STORAGE_MEMBERS_KEY, []);
    members.push({
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      user_id: userId,
      role: 'admin',
      user_email: email
    });
    setLocal(LOCAL_STORAGE_MEMBERS_KEY, members);

    return newComp;
  },

  async joinCompany(userId: string, email: string, code: string): Promise<{ success: boolean; message?: string }> {
    const cleanCode = code.trim().toUpperCase();
    try {
      const { error } = await supabase.rpc('join_company', {
        code: cleanCode,
        user_email: email
      });
      if (!error) return { success: true };
      if (error && error.code === '23505') {
        return { success: false, message: 'Du er allerede medlem av et firma.' };
      }
    } catch (e) {
      console.warn('RPC join_company failed, using local store:', e);
    }

    // Fallback local joining
    const companies = getLocal<Company[]>(LOCAL_STORAGE_COMPANIES_KEY, []);
    const targetComp = companies.find(c => c.join_code === cleanCode);
    if (!targetComp) {
      return { success: false, message: 'Fant ingen bedrift med den oppgitte koden.' };
    }

    const members = getLocal<CompanyMember[]>(LOCAL_STORAGE_MEMBERS_KEY, []);
    const existing = members.find(m => m.user_id === userId);
    if (existing) {
      return { success: false, message: 'Du er allerede medlem av et firma.' };
    }

    members.push({
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      company_id: targetComp.id,
      user_id: userId,
      role: 'ansatt',
      user_email: email
    });
    setLocal(LOCAL_STORAGE_MEMBERS_KEY, members);
    return { success: true };
  },

  async leaveCompany(userId: string): Promise<void> {
    try {
      await supabase.from('company_members').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase leaveCompany error:', e);
    }

    const members = getLocal<CompanyMember[]>(LOCAL_STORAGE_MEMBERS_KEY, []);
    const updated = members.filter(m => m.user_id !== userId);
    setLocal(LOCAL_STORAGE_MEMBERS_KEY, updated);
  },

  async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('*')
        .eq('company_id', companyId);

      if (!error && data && data.length > 0) {
        return data as CompanyMember[];
      }
    } catch (e) {
      console.warn('Supabase getCompanyMembers error:', e);
    }

    const members = getLocal<CompanyMember[]>(LOCAL_STORAGE_MEMBERS_KEY, []);
    return members.filter(m => m.company_id === companyId);
  },

  // Expense reports
  async getUserReports(userId: string, companyId?: string): Promise<ExpenseReportRecord[]> {
    try {
      let query = supabase
        .from('expense_reports')
        .select('*')
        .eq('user_id', userId);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return data as ExpenseReportRecord[];
      }
    } catch (e) {
      console.warn('Supabase getUserReports error, checking local:', e);
    }

    const localReports = getLocal<ExpenseReportRecord[]>(LOCAL_STORAGE_REPORTS_KEY, []);
    return localReports
      .filter(r => r.user_id === userId && (!companyId || r.company_id === companyId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getCompanyReports(companyId: string): Promise<ExpenseReportRecord[]> {
    try {
      const { data, error } = await supabase
        .from('expense_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ExpenseReportRecord[];
      }
    } catch (e) {
      console.warn('Supabase getCompanyReports error:', e);
    }

    const localReports = getLocal<ExpenseReportRecord[]>(LOCAL_STORAGE_REPORTS_KEY, []);
    return localReports.filter(r => r.company_id === companyId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async saveReport(
    userId: string,
    tripName: string,
    reportData: any,
    status: 'utkast' | 'innsendt',
    companyId?: string
  ): Promise<ExpenseReportRecord> {
    const payload = {
      user_id: userId,
      trip_name: tripName,
      report_data: reportData,
      status: status,
      ...(companyId ? { company_id: companyId } : {})
    };

    let reportId = reportData.dbId;

    try {
      if (reportId) {
        const { data, error } = await supabase
          .from('expense_reports')
          .update(payload)
          .eq('id', reportId)
          .select()
          .single();
        if (!error && data) return data as ExpenseReportRecord;
      } else {
        const { data, error } = await supabase
          .from('expense_reports')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data as ExpenseReportRecord;
      }
    } catch (e) {
      console.warn('Supabase saveReport error, saving locally:', e);
    }

    // Local fallback
    const all = getLocal<ExpenseReportRecord[]>(LOCAL_STORAGE_REPORTS_KEY, []);
    if (reportId) {
      const idx = all.findIndex(r => r.id === reportId);
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          ...payload,
          id: reportId
        };
        setLocal(LOCAL_STORAGE_REPORTS_KEY, all);
        return all[idx];
      }
    }

    const newId = 'rep_' + Math.random().toString(36).substring(2, 9);
    const newRecord: ExpenseReportRecord = {
      id: newId,
      created_at: new Date().toISOString(),
      trip_name: tripName,
      report_data: { ...reportData, dbId: newId },
      status: status,
      user_id: userId,
      company_id: companyId
    };
    all.unshift(newRecord);
    setLocal(LOCAL_STORAGE_REPORTS_KEY, all);
    return newRecord;
  },

  async deleteReport(reportId: string): Promise<void> {
    try {
      await supabase.from('expense_reports').delete().eq('id', reportId);
    } catch (e) {
      console.warn('Supabase deleteReport error:', e);
    }

    const all = getLocal<ExpenseReportRecord[]>(LOCAL_STORAGE_REPORTS_KEY, []);
    setLocal(LOCAL_STORAGE_REPORTS_KEY, all.filter(r => r.id !== reportId));
  },

  async updateReportStatus(reportId: string, status: string, comment?: string): Promise<void> {
    const updateObj: any = { status };
    if (comment !== undefined) {
      updateObj.admin_comment = comment;
    }

    try {
      await supabase.from('expense_reports').update(updateObj).eq('id', reportId);
    } catch (e) {
      console.warn('Supabase updateReportStatus error:', e);
    }

    const all = getLocal<ExpenseReportRecord[]>(LOCAL_STORAGE_REPORTS_KEY, []);
    const idx = all.findIndex(r => r.id === reportId);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        ...updateObj
      };
      setLocal(LOCAL_STORAGE_REPORTS_KEY, all);
    }
  }
};
