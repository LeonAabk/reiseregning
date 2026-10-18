export interface PersonalInfo {
  company: string;
  name: string;
  id: string;
  department: string;
  address: string;
  email?: string;
}

export type AccommodationType = 'none' | 'hotel' | 'boarding' | 'private';
export type DietMode = 'state' | 'taxfree';

export interface TravelInfo {
  purpose: string;
  event: string;
  departure: string;
  return: string;
  accommodation: AccommodationType;
  accommodationName: string;
  dietMode: DietMode;
}

export interface MealDeductions {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface MileageRow {
  id: string;
  date: string;
  from: string;
  to: string;
  km: number;
  passenger: string;
  toll: number;
}

export interface ExpenseRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  receipt: boolean;
}

export interface DietSummary {
  amount: number;
  text: string;
}

export interface ExpenseReportData {
  personalInfo: PersonalInfo;
  travelInfo: TravelInfo;
  mealDeductions: MealDeductions;
  mileage: MileageRow[];
  expenses: ExpenseRow[];
  receipts: string[];
  signatureContent: string | null;
  totals?: {
    grandTotal: number;
  };
  dietSummary?: DietSummary;
  dbId?: string;
}

export type ReportStatus = 'utkast' | 'innsendt' | 'godkjent' | 'utbetalt' | 'avvist' | 'kansellert';

export interface ExpenseReportRecord {
  id: string;
  created_at: string;
  trip_name: string;
  report_data: ExpenseReportData;
  status: ReportStatus;
  admin_comment?: string;
  user_id: string;
  company_id?: string;
  employeeEmail?: string;
}

export interface Company {
  id: string;
  name: string;
  join_code: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'ansatt';
  user_email?: string;
  companies?: Company;
}

export interface User {
  id: string;
  email: string;
}
