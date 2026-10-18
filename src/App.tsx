import React, { useState, useEffect } from 'react';
import {
  ExpenseReportData,
  ExpenseReportRecord,
  MealDeductions,
  MileageRow,
  ExpenseRow,
  PersonalInfo,
  TravelInfo
} from './types';
import { calculateDiet, exportToCSV, RATES } from './constants/rates';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { dataService } from './lib/supabase';

// Components
import { Header } from './components/Header';
import { AuthSection } from './components/AuthSection';
import { PersonalInfoSection } from './components/PersonalInfoSection';
import { TravelInfoSection } from './components/TravelInfoSection';
import { MileageSection } from './components/MileageSection';
import { ExpensesSection } from './components/ExpensesSection';
import { ReceiptsSection } from './components/ReceiptsSection';
import { SignatureSection } from './components/SignatureSection';
import { VippsSection } from './components/VippsSection';
import { StickySummary } from './components/StickySummary';
import { PreviewModal } from './components/PreviewModal';
import { SavedReportsModal } from './components/SavedReportsModal';
import { HelpModal } from './components/HelpModal';
import { CompanyDashboard } from './components/CompanyDashboard';

export const App: React.FC = () => {
  const { currentUser, currentCompany, workspaceMode } = useAuth();
  const { showToast, confirm, prompt } = useUI();

  // Mode: form or portal
  const [inPortalView, setInPortalView] = useState(false);

  // Form State
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(() => {
    try {
      const saved = localStorage.getItem('personalInfo');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return {
      company: '',
      name: '',
      id: '',
      department: '',
      address: ''
    };
  });

  const [travelInfo, setTravelInfo] = useState<TravelInfo>({
    purpose: '',
    event: '',
    departure: '',
    return: '',
    accommodation: 'none',
    accommodationName: '',
    dietMode: 'state'
  });

  const [mealDeductions, setMealDeductions] = useState<MealDeductions>({
    breakfast: false,
    lunch: false,
    dinner: false
  });

  const [mileage, setMileage] = useState<MileageRow[]>(() => {
    const todayStr = new Date().toISOString().substring(0, 16);
    return [
      {
        id: 'init_m1',
        date: todayStr,
        from: '',
        to: '',
        km: 0,
        passenger: '',
        toll: 0
      }
    ];
  });

  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'init_e1',
        date: todayDate,
        description: '',
        amount: 0,
        receipt: true
      }
    ];
  });

  const [receipts, setReceipts] = useState<string[]>([]);
  const [signatureContent, setSignatureContent] = useState<string | null>(null);
  const [datePlace, setDatePlace] = useState<string>('');
  const [activeReportDbId, setActiveReportDbId] = useState<string | undefined>(undefined);

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL parameters for trip loading on first load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('load') === 'true') {
      const tempTrip = localStorage.getItem('tempLoadTrip');
      if (tempTrip) {
        try {
          const trip = JSON.parse(tempTrip);
          loadTripData(trip);
          localStorage.removeItem('tempLoadTrip');
          window.history.replaceState({}, document.title, window.location.pathname);
          showToast('Reisen er lastet inn for redigering!', 'success');
        } catch (e) {
          console.error('Error loading temp trip:', e);
        }
      }
    }
  }, []);

  // Calculate live financial totals
  const mileageTotal = mileage.reduce((sum, row) => {
    const hasPassenger = (row.passenger || '').trim().length > 0;
    const rate = hasPassenger ? RATES.km + RATES.passenger : RATES.km;
    return sum + ((Number(row.km) || 0) * rate) + (Number(row.toll) || 0);
  }, 0);

  const expensesTotal = expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const dietResult = calculateDiet(
    travelInfo.departure,
    travelInfo.return,
    travelInfo.accommodation,
    travelInfo.dietMode,
    mealDeductions
  );
  const dietTotal = dietResult.amount;

  const grandTotal = mileageTotal + expensesTotal + dietTotal;

  // Build the complete report data payload
  const buildReportData = (): ExpenseReportData => {
    return {
      personalInfo,
      travelInfo,
      mealDeductions,
      mileage,
      expenses,
      receipts,
      signatureContent,
      totals: { grandTotal },
      dietSummary: { amount: dietTotal, text: dietResult.text },
      dbId: activeReportDbId
    };
  };

  const handleSavePersonalInfo = () => {
    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
    showToast('Personinformasjon er lagret!', 'success');
  };

  const loadTripData = (data: ExpenseReportData | any) => {
    if (data.personalInfo) setPersonalInfo(data.personalInfo);
    if (data.travelInfo) setTravelInfo(data.travelInfo);
    if (data.mealDeductions) setMealDeductions(data.mealDeductions);
    if (data.mileage && Array.isArray(data.mileage)) setMileage(data.mileage);
    if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
    if (data.receipts && Array.isArray(data.receipts)) setReceipts(data.receipts);
    if (data.signatureContent) setSignatureContent(data.signatureContent);
    if (data.dbId) setActiveReportDbId(data.dbId);
  };

  const handleLoadSavedRecord = (record: ExpenseReportRecord) => {
    if (record.report_data) {
      loadTripData({ ...record.report_data, dbId: record.id });
      setActiveReportDbId(record.id);
      showToast(`Reisen "${record.trip_name}" er lastet inn!`, 'success');
    }
  };

  const handleSaveExpenseReport = async (status: 'utkast' | 'innsendt' = 'utkast') => {
    if (!currentUser) {
      showToast('Du må være logget inn for å lagre en reise i skyen.', 'error');
      return;
    }

    let tripName = `Reiseregning ${new Date().toLocaleDateString('no-NO')}`;
    if (status === 'utkast') {
      const customName = await prompt('Gi reisen et navn (for organisering):', tripName);
      if (customName === null) return; // User cancelled
      tripName = customName || tripName;
      setIsSaving(true);
    } else {
      setIsSubmitting(true);
    }

    const reportData = buildReportData();
    // Do not save full receipt images to remote db payload to conserve space, just as original code did
    const safeData = {
      ...reportData,
      receipts: [],
      signatureContent: null
    };

    try {
      const savedRecord = await dataService.saveReport(
        currentUser.id,
        tripName,
        safeData,
        status,
        currentCompany?.id
      );

      setActiveReportDbId(savedRecord.id);
      showToast(
        status === 'innsendt'
          ? `Reiseregningen "${tripName}" er sendt inn til godkjenning!`
          : `Reiseregning er lagret under "${tripName}" i skyen!`,
        'success'
      );
    } catch (e: any) {
      showToast('Feil ved lagring: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmitExpenseReport = async () => {
    if (!personalInfo.name.trim() || !travelInfo.purpose.trim()) {
      showToast('Vennligst fyll ut navn og formål før du sender inn.', 'error');
      return;
    }

    const ok = await confirm(
      'Er du sikker på at du vil sende inn reiseregningen til godkjenning? Når den er sendt inn, kan den behandles av bedriftens leder.'
    );
    if (!ok) return;

    await handleSaveExpenseReport('innsendt');
  };

  const handlePreviewPDF = () => {
    if (!personalInfo.name.trim() || !travelInfo.purpose.trim()) {
      showToast('Vennligst fyll ut navn og formål før forhåndsvisning.', 'error');
      return;
    }
    setShowPreviewModal(true);
  };

  const handleExportCSV = () => {
    if (!personalInfo.name.trim() || !travelInfo.purpose.trim()) {
      showToast('Vennligst fyll ut navn og formål før eksport.', 'error');
      return;
    }
    exportToCSV(buildReportData());
    showToast('CSV-fil lastet ned!', 'success');
  };

  const handleEditReportInForm = (rep: ExpenseReportRecord) => {
    if (rep.report_data) {
      loadTripData({ ...rep.report_data, dbId: rep.id });
      setActiveReportDbId(rep.id);
      setInPortalView(false);
      showToast(`Reisen "${rep.trip_name}" er åpnet for endringer.`, 'success');
    }
  };

  return (
    <>
      <div className="no-print min-h-screen bg-[#f8fafc] text-[#334155] p-3 sm:p-5 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header navigation & actions */}
          <Header
            onSaveExpense={() => handleSaveExpenseReport('utkast')}
            onSubmitExpense={handleSubmitExpenseReport}
            onPreviewPDF={handlePreviewPDF}
            onExportCSV={handleExportCSV}
            onShowSaved={() => setShowSavedModal(true)}
            onShowHelp={() => setShowHelpModal(true)}
            onTogglePortal={() => setInPortalView(prev => !prev)}
            inPortalView={inPortalView}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
          />

          {inPortalView ? (
            <CompanyDashboard
              onBackToExpenseForm={() => setInPortalView(false)}
              onEditReportInForm={handleEditReportInForm}
            />
          ) : (
            <main>
              {/* Account & Profile */}
              <AuthSection
                onSavePersonalInfo={handleSavePersonalInfo}
                onOpenPortal={() => setInPortalView(true)}
              />

              {/* Travel Form */}
              <form onSubmit={e => e.preventDefault()}>
                <PersonalInfoSection
                  personalInfo={personalInfo}
                  onChange={setPersonalInfo}
                />

                <TravelInfoSection
                  travelInfo={travelInfo}
                  mealDeductions={mealDeductions}
                  onTravelInfoChange={setTravelInfo}
                  onMealDeductionsChange={setMealDeductions}
                />

                <MileageSection
                  mileage={mileage}
                  onChange={setMileage}
                />

                <ExpensesSection
                  expenses={expenses}
                  onChange={setExpenses}
                />

                <ReceiptsSection
                  receipts={receipts}
                  onChange={setReceipts}
                />

                <SignatureSection
                  signatureContent={signatureContent}
                  datePlace={datePlace}
                  onSignatureChange={setSignatureContent}
                  onDatePlaceChange={setDatePlace}
                />
              </form>

              {/* Vipps Support Card */}
              <VippsSection />

              {/* Sticky summary bar at bottom */}
              <StickySummary
                mileageTotal={mileageTotal}
                dietTotal={dietTotal}
                expensesTotal={expensesTotal}
                grandTotal={grandTotal}
                onPreviewPDF={handlePreviewPDF}
                onSaveExpense={() => handleSaveExpenseReport('utkast')}
                isSaving={isSaving}
              />
            </main>
          )}

          {showSavedModal && (
            <SavedReportsModal
              onLoadReport={handleLoadSavedRecord}
              onClose={() => setShowSavedModal(false)}
            />
          )}

          {showHelpModal && (
            <HelpModal onClose={() => setShowHelpModal(false)} />
          )}
        </div>
      </div>

      {/* Preview Modal for PDF / Print - Isolated from normal page DOM */}
      {showPreviewModal && (
        <PreviewModal
          data={buildReportData()}
          datePlace={datePlace}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  );
};
