/**
 * REISEREGNING KALKULATOR
 * Basert på Statens Satser (2024)
 */

console.log('Script loaded successfully');

// --- 1. KONSTANTER & SATSER ---
const RATES = {
    km: 4.90,               // Standard kilometergodtgjørelse
    passenger: 1.00,        // Tillegg per passasjer per km
    diet: {
        under6h: 0,
        between6and12h: 400, // Dagdiett 6-12 timer
        over12h: 658,        // Dagdiett over 12 timer uten overnatting
        hotel: 940,          // Døgndiett med hotellovernatting
        boarding: 400,       // Døgndiett pensjonat/hybel
        private: 434         // Døgndiett privat overnatting
    }
};

// Formaterer tall til pen norsk valuta (eks: 1 250,00 kr)
const currencyFormatter = new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK'
});

// Hjelpefunksjon for å få dagens dato på formatet YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Konfigurasjon for validering
const VALIDATION_RULES = {
    required: ['emp-name', 'travel-purpose', 'departure-date', 'return-date'],
    numeric: ['km-input', 'toll-input', 'exp-amount'],
    minValues: {
        'km-input': 0,
        'toll-input': 0,
        'exp-amount': 0
    }
};

// Hjelpefunksjon for å vise feilmeldinger
function showError(message, elementId = null) {
    const errorDiv = document.getElementById('error-messages');
    if (!errorDiv) {
        const newErrorDiv = document.createElement('div');
        newErrorDiv.id = 'error-messages';
        newErrorDiv.className = 'error-container';
        document.querySelector('.app-container').insertBefore(newErrorDiv, document.querySelector('form'));
    }
    
    const errorContainer = document.getElementById('error-messages');
    errorContainer.innerHTML = `<div class="error-message"><span class="icon">⚠️</span> ${message}</div>`;
    errorContainer.style.display = 'block';
    
    // Scroll til feilmeldingen
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Fjern feilmeldingen etter 5 sekunder
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

// Hjelpefunksjon for å skjule feilmeldinger
function hideErrors() {
    const errorDiv = document.getElementById('error-messages');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Valideringsfunksjon
function validateForm() {
    hideErrors();
    
    // Sjekk obligatoriske felt
    for (const fieldId of VALIDATION_RULES.required) {
        const element = document.getElementById(fieldId);
        if (!element.value.trim()) {
            showError(`Feltet "${element.previousElementSibling.textContent}" er obligatorisk.`);
            element.focus();
            return false;
        }
    }
    
    // Sjekk numeriske felt
    for (const fieldId of VALIDATION_RULES.numeric) {
        const elements = document.querySelectorAll(`.${fieldId}`);
        for(let element of elements) {
            const value = parseFloat(element.value);
            if (isNaN(value) || value < VALIDATION_RULES.minValues[fieldId]) {
                showError(`Ugyldig verdi i feltet. Verdi må være minst ${VALIDATION_RULES.minValues[fieldId]}.`);
                element.focus();
                return false;
            }
        }
    }
    
    // Sjekk datoer
    const startDate = new Date(document.getElementById('departure-date').value);
    const endDate = new Date(document.getElementById('return-date').value);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        showError('Ugyldig dato format.');
        return false;
    }
    
    if (endDate <= startDate) {
        showError('Hjemkomstdato må være etter avreisedato.');
        document.getElementById('return-date').focus();
        return false;
    }
    
    return true;
}

// --- 2. LAGRING OG LASTING AV REISEREGNINGER ---

// Hjelpefunksjon for å samle all form data
function collectFormData() {
    const data = {
        timestamp: new Date().toISOString(),
        personalInfo: {
            name: document.getElementById('emp-name').value,
            id: document.getElementById('emp-id').value,
            department: document.getElementById('emp-dept').value,
            position: document.getElementById('emp-pos').value,
            address: document.getElementById('emp-addr').value
        },
        travelInfo: {
            purpose: document.getElementById('travel-purpose').value,
            departure: document.getElementById('departure-date').value,
            return: document.getElementById('return-date').value,
            accommodation: document.getElementById('accommodation-type').value
        },
        mealDeductions: {
            breakfast: document.querySelector('input[data-percent="0.20"]').checked,
            lunch: document.querySelector('input[data-percent="0.30"]').checked,
            dinner: document.querySelector('input[data-percent="0.50"]').checked
        },
        mileage: [],
        expenses: []
    };
    
    // Samle kjøregodtgjørelse data
    const mileageRows = document.querySelectorAll('#mileage-body tr');
    mileageRows.forEach(row => {
        const cells = row.querySelectorAll('td input');
        if (cells.length >= 5) {
            data.mileage.push({
                date: cells[0].value,
                from: cells[1].value,
                to: cells[2].value,
                km: parseFloat(cells[3].value) || 0,
                passenger: cells[4].checked,
                toll: parseFloat(cells[5]?.value) || 0
            });
        }
    });
    
    // Samle utlegg data
    const expenseRows = document.querySelectorAll('#expenses-body tr');
    expenseRows.forEach(row => {
        const cells = row.querySelectorAll('td input');
        if (cells.length >= 2) {
            data.expenses.push({
                date: cells[0].value,
                description: cells[1].value,
                amount: parseFloat(cells[2].value) || 0
            });
        }
    });
    
    return data;
}

// Lagre reiseregning til localStorage
function saveExpenseReport() {
    if (!validateForm()) {
        return false;
    }
    
    try {
        const data = collectFormData();
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '[]');
        reports.push(data);
        localStorage.setItem('expenseReports', JSON.stringify(reports));
        
        showError('Reiseregning lagret!', null);
        setTimeout(() => hideErrors(), 2000);
        return true;
    } catch (error) {
        showError('Feil ved lagring av reiseregning.');
        console.error('Save error:', error);
        return false;
    }
}

// Last en tidligere reiseregning
function loadExpenseReport(index) {
    try {
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '[]');
        if (index >= 0 && index < reports.length) {
            const data = reports[index];
            loadFormData(data);
            showError('Reiseregning lastet!', null);
            setTimeout(() => hideErrors(), 2000);
            closeModal();
        }
    } catch (error) {
        showError('Feil ved lasting av reiseregning.');
        console.error('Load error:', error);
    }
}

// Last data inn i skjemaet
function loadFormData(data) {
    // Personopplysninger
    document.getElementById('emp-name').value = data.personalInfo?.name || '';
    document.getElementById('emp-id').value = data.personalInfo?.id || '';
    document.getElementById('emp-dept').value = data.personalInfo?.department || '';
    document.getElementById('emp-pos').value = data.personalInfo?.position || '';
    document.getElementById('emp-addr').value = data.personalInfo?.address || '';
    
    // Reiseinfo
    document.getElementById('travel-purpose').value = data.travelInfo?.purpose || '';
    document.getElementById('departure-date').value = data.travelInfo?.departure || '';
    document.getElementById('return-date').value = data.travelInfo?.return || '';
    document.getElementById('accommodation-type').value = data.travelInfo?.accommodation || 'none';
    
    // Måltidstrekk
    const mealCheckboxes = document.querySelectorAll('.meal-check');
    mealCheckboxes[0].checked = data.mealDeductions?.breakfast || false;
    mealCheckboxes[1].checked = data.mealDeductions?.lunch || false;
    mealCheckboxes[2].checked = data.mealDeductions?.dinner || false;
    
    // Fjern eksisterende rader
    document.querySelectorAll('#mileage-body tr').forEach(row => row.remove());
    document.querySelectorAll('#expenses-body tr').forEach(row => row.remove());
    
    // Legg til kjøregodtgjørelse rader
    data.mileage?.forEach(item => {
        addMileageRow();
        const rows = document.querySelectorAll('#mileage-body tr');
        const lastRow = rows[rows.length - 1];
        const cells = lastRow.querySelectorAll('td input');
        if (cells.length >= 5) {
            cells[0].value = item.date;
            cells[1].value = item.from;
            cells[2].value = item.to;
            cells[3].value = item.km;
            cells[4].checked = item.passenger;
            if (cells[5]) cells[5].value = item.toll;
        }
    });
    
    // Legg til utlegg rader
    data.expenses?.forEach(item => {
        addExpenseRow();
        const rows = document.querySelectorAll('#expenses-body tr');
        const lastRow = rows[rows.length - 1];
        const cells = lastRow.querySelectorAll('td input');
        if (cells.length >= 2) {
            cells[0].value = item.date;
            cells[1].value = item.description;
            cells[2].value = item.amount;
        }
    });
    
    // Beregn på nytt
    calculateAll();
}

// Nullstill skjemaet
function resetForm() {
    if (confirm('Er du sikker på at du vil nullstille hele skjemaet?')) {
        document.getElementById('expense-form').reset();
        document.querySelectorAll('#mileage-body tr').forEach(row => row.remove());
        document.querySelectorAll('#expenses-body tr').forEach(row => row.remove());
        addMileageRow();
        addExpenseRow();
        clearCanvas();
        resetUpload();
        calculateAll();
        hideErrors();
    }
}

// Vis lagrede reiseregninger
function showSavedReports() {
    try {
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '[]');
        
        if (reports.length === 0) {
            showError('Ingen lagrede reiseregninger funnet.');
            return;
        }
        
        // Opprett modal
        const modal = document.createElement('div');
        modal.id = 'saved-reports-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Tidligere reiseregninger</h3>
                    <button type="button" class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="reports-list">
                        ${reports.map((report, index) => `
                            <div class="report-item" onclick="loadExpenseReport(${index})">
                                <div class="report-info">
                                    <strong>${report.personalInfo?.name || 'Ukjent'}</strong>
                                    <div class="report-meta">
                                        ${report.travelInfo?.purpose || 'Ingen formål'} • 
                                        ${new Date(report.timestamp).toLocaleDateString('no-NO')}
                                    </div>
                                </div>
                                <button type="button" class="btn btn-text btn-small" onclick="deleteReport(${index}); event.stopPropagation();">Slett</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.classList.add('modal-open');
        document.body.appendChild(modal);
        
    } catch (error) {
        showError('Feil ved lasting av lagrede reiseregninger.');
        console.error('Show saved reports error:', error);
    }
}

// Lukk modal
function closeModal() {
    const previewModal = document.getElementById('preview-modal');
    const savedModal = document.getElementById('saved-reports-modal');
    
    if (previewModal) previewModal.remove();
    if (savedModal) savedModal.remove();
    
    document.body.classList.remove('modal-open');
}

// Slett en lagret rapport
function deleteReport(index) {
    if (confirm('Er du sikker på at du vil slette denne reiseregningen?')) {
        try {
            const reports = JSON.parse(localStorage.getItem('expenseReports') || '[]');
            reports.splice(index, 1);
            localStorage.setItem('expenseReports', JSON.stringify(reports));
            closeModal();
            showSavedReports(); // Oppdater listen
        } catch (error) {
            showError('Feil ved sletting av reiseregning.');
            console.error('Delete report error:', error);
        }
    }
}

// Eksporter reiseregning som JSON
function exportAsJSON() {
    if (!validateForm()) {
        return;
    }
    
    try {
        const data = collectFormData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `reiseregning_${data.personalInfo.name || 'ukjent'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showError('Reiseregning eksportert som JSON!', null);
        setTimeout(() => hideErrors(), 2000);
    } catch (error) {
        showError('Feil ved eksport av reiseregning.');
        console.error('Export error:', error);
    }
}

// Importer reiseregning fra JSON
function importFromJSON(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                loadFormData(data);
                showError('Reiseregning importert!', null);
                setTimeout(() => hideErrors(), 2000);
            } catch (error) {
                showError('Ugyldig JSON-fil.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }
}

// Forhåndsvis ferdig reiseregning
function previewExpenseReport() {
    if (!validateForm()) {
        return;
    }

    // Vis loading state
    const previewBtn = document.querySelector('button[onclick="previewExpenseReport()"]');
    const originalText = previewBtn.innerHTML;
    previewBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Genererer...';
    previewBtn.disabled = true;

    setTimeout(() => {
        generatePreviewModal();
        previewBtn.innerHTML = originalText;
        previewBtn.disabled = false;
    }, 400); // Redusert ventetid
}

function generatePreviewModal() {
    const data = collectFormData();
    const currentYear = new Date().getFullYear();

    // Beregn totaler
    let totalMileage = 0;
    let totalOther = 0;

    // Kjøregodtgjørelse
    data.mileage.forEach(item => {
        const currentRate = item.passenger ? (RATES.km + RATES.passenger) : RATES.km;
        totalMileage += (item.km * currentRate) + item.toll;
    });

    // Utlegg
    data.expenses.forEach(item => {
        totalOther += item.amount;
    });

    // Diett
    const dietResult = calculateDiet();
    const totalDiet = dietResult.amount;
    const grandTotal = totalMileage + totalDiet + totalOther;

    // Formater datoer
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('no-NO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('no-NO');
    };

    // Smart henting av signatur (Forhindrer blank boks)
    let signatureSrc = null;
    const uploadedSignature = document.querySelector('#sig-preview-container img');
    if (uploadedSignature) {
        signatureSrc = uploadedSignature.src;
    } else if (canvasHasContent) {
        const signatureCanvas = document.getElementById('sig-canvas');
        signatureSrc = signatureCanvas.toDataURL();
    }

    // Opprett modal med profesjonell layout
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content preview-modal-content">
            <div class="modal-header">
                <h2>Forhåndsvisning - Reiseregning</h2>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline btn-small" onclick="exportPreviewAsPDF()" aria-label="Eksporter forhåndsvisning som PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>
                        Eksporter PDF / Skriv ut
                    </button>
                    <button type="button" class="modal-close" onclick="closeModal()">&times;</button>
                </div>
            </div>
            <div class="modal-body" id="preview-content">
                <div class="expense-report-document">
                    <div class="document-header">
                        <div class="company-info">
                            <h1>Eksempelbedrift AS</h1>
                            <p>År: ${currentYear}</p>
                        </div>
                        <div class="document-title">
                            <h2>REISEREGNING</h2>
                            <p class="document-number">Ref: ${data.personalInfo.id || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="employee-section">
                        <h3>Ansattinformasjon</h3>
                        <div class="info-grid">
                            <div class="info-row">
                                <span class="label">Navn:</span>
                                <span class="value">${data.personalInfo.name || ''}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Ansattnummer:</span>
                                <span class="value">${data.personalInfo.id || ''}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Avdeling:</span>
                                <span class="value">${data.personalInfo.department || ''}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Stilling:</span>
                                <span class="value">${data.personalInfo.position || ''}</span>
                            </div>
                            <div class="info-row full-width">
                                <span class="label">Privatadresse:</span>
                                <span class="value">${data.personalInfo.address || ''}</span>
                            </div>
                        </div>
                    </div>

                    <div class="travel-section">
                        <h3>Reiseinformasjon</h3>
                        <div class="info-grid">
                            <div class="info-row full-width">
                                <span class="label">Formål med reisen:</span>
                                <span class="value">${data.travelInfo.purpose || ''}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Avreise:</span>
                                <span class="value">${formatDateTime(data.travelInfo.departure)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Hjemkomst:</span>
                                <span class="value">${formatDateTime(data.travelInfo.return)}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Overnatting:</span>
                                <span class="value">${data.travelInfo.accommodation === 'none' ? 'Ingen overnatting' :
                                    data.travelInfo.accommodation === 'hotel' ? 'Hotell' :
                                    data.travelInfo.accommodation === 'boarding' ? 'Pensjonat/Hybel m/kjøkken' :
                                    data.travelInfo.accommodation === 'private' ? 'Privat' : ''}</span>
                            </div>
                        </div>
                    </div>

                    ${data.mileage.length > 0 ? `
                    <div class="mileage-section">
                        <h3>Kjøregodtgjørelse (Egen bil)</h3>
                        <table class="expense-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Fra</th>
                                    <th>Til</th>
                                    <th>Km</th>
                                    <th>Passasjer</th>
                                    <th>Bompenger</th>
                                    <th>Beløp</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.mileage.map(item => {
                                    const rate = item.passenger ? (RATES.km + RATES.passenger) : RATES.km;
                                    const amount = (item.km * rate) + item.toll;
                                    return `
                                        <tr>
                                            <td>${formatDate(item.date)}</td>
                                            <td>${item.from}</td>
                                            <td>${item.to}</td>
                                            <td>${item.km}</td>
                                            <td>${item.passenger ? 'Ja' : 'Nei'}</td>
                                            <td>${currencyFormatter.format(item.toll)}</td>
                                            <td>${currencyFormatter.format(amount)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="6" class="total-label">Sum kjøregodtgjørelse:</td>
                                    <td class="total-value">${currencyFormatter.format(totalMileage)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    ` : ''}

                    ${data.expenses.length > 0 ? `
                    <div class="expenses-section">
                        <h3>Andre utlegg</h3>
                        <table class="expense-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Beskrivelse</th>
                                    <th>Beløp</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.expenses.map(item => `
                                    <tr>
                                        <td>${formatDate(item.date)}</td>
                                        <td>${item.description}</td>
                                        <td>${currencyFormatter.format(item.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2" class="total-label">Sum utlegg:</td>
                                    <td class="total-value">${currencyFormatter.format(totalOther)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    ` : ''}

                    <div class="diet-section">
                        <h3>Diettgodtgjørelse</h3>
                        <div class="diet-summary">
                            ${dietResult.text}
                        </div>
                        <div class="diet-total">
                            <span class="total-label">Sum diett:</span>
                            <span class="total-value">${currencyFormatter.format(totalDiet)}</span>
                        </div>
                    </div>

                    <div class="summary-section">
                        <h3>Sammendrag</h3>
                        <div class="summary-grid">
                            <div class="summary-row">
                                <span class="label">Kjøregodtgjørelse:</span>
                                <span class="value">${currencyFormatter.format(totalMileage)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Diett:</span>
                                <span class="value">${currencyFormatter.format(totalDiet)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="label">Utlegg:</span>
                                <span class="value">${currencyFormatter.format(totalOther)}</span>
                            </div>
                            <div class="summary-row grand-total">
                                <span class="label">Sum å utbetale:</span>
                                <span class="value">${currencyFormatter.format(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="signature-section">
                        <h3>Signatur og bekreftelse</h3>
                        <div class="signature-area">
                            <div class="signature-content">
                                <p>Sted og dato: ${document.getElementById('final-date-place').value || ''}</p>
                                <div class="signature-preview">
                                    ${signatureSrc ? `<img src="${signatureSrc}" alt="Signatur" style="max-height: 80px; border-bottom: 1px solid #000; margin-top: 10px;">` : '<div style="height:40px;"></div>'}
                                </div>
                                <div class="signature-line">
                                    <span>_______________________________</span>
                                    <p>${data.personalInfo.name || ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.classList.add('modal-open');
    document.body.appendChild(modal);
}

// Forenklet fordi CSS nå skjuler knapper automatisk!
function exportPreviewAsPDF() {
    window.print();
}

// --- 3. DYNAMISKE RADER (KJØREBOK OG UTLEGG) ---

function addMileageRow() {
    const tbody = document.getElementById('mileage-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="date" class="recalc-trigger" value="${getTodayDateString()}"></td>
        <td><input type="text" placeholder="Fra..."></td>
        <td><input type="text" placeholder="Til..."></td>
        <td><input type="number" class="km-input recalc-trigger" value="0" min="0" step="0.1"></td>
        <td style="text-align: center;"><input type="checkbox" class="pass-check recalc-trigger" style="width:20px; height:20px; cursor:pointer;"></td>
        <td><input type="number" class="toll-input recalc-trigger" value="0" min="0" step="1"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
}

function addExpenseRow() {
    const tbody = document.getElementById('expenses-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="date" class="recalc-trigger" value="${getTodayDateString()}"></td>
        <td><input type="text" placeholder="Hva gjelder utlegget?"></td>
        <td><input type="number" class="exp-amount recalc-trigger" value="0" min="0" step="0.01"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
}

function removeRow(btn) {
    const row = btn.closest('tr');
    row.remove();
    calculateAll(); // Oppdaterer summene umiddelbart etter sletting
}


// --- 4. HOVEDKALKULATOR ---

function calculateAll() {
    let totalMileage = 0;
    let totalOther = 0;
    
    // A. Kjøregodtgjørelse
    const mileageRows = document.querySelectorAll('#mileage-body tr');
    mileageRows.forEach(row => {
        const km = parseFloat(row.querySelector('.km-input').value) || 0;
        const hasPass = row.querySelector('.pass-check').checked;
        const toll = parseFloat(row.querySelector('.toll-input').value) || 0;
        
        const currentRate = hasPass ? (RATES.km + RATES.passenger) : RATES.km;
        totalMileage += (km * currentRate) + toll;
    });

    // B. Utlegg
    const expenseInputs = document.querySelectorAll('.exp-amount');
    expenseInputs.forEach(input => {
        totalOther += parseFloat(input.value) || 0;
    });

    // C. Diett
    const dietResult = calculateDiet();
    const totalDiet = dietResult.amount;
    
    // Oppdater info-boksen for diett
    document.getElementById('diet-summary').innerHTML = `<span class="icon">ℹ️</span> ${dietResult.text}`;

    // D. Oppdater UI
    const grandTotal = totalMileage + totalDiet + totalOther;
    
    document.getElementById('total-mileage').innerText = currencyFormatter.format(totalMileage);
    document.getElementById('total-diet').innerText = currencyFormatter.format(totalDiet);
    document.getElementById('total-other').innerText = currencyFormatter.format(totalOther);
    document.getElementById('grand-total').innerText = currencyFormatter.format(grandTotal);
}

function calculateDiet() {
    const startInput = document.getElementById('departure-date').value;
    const endInput = document.getElementById('return-date').value;
    const accType = document.getElementById('accommodation-type').value;
    
    if (!startInput || !endInput) {
        return { amount: 0, text: "Sett inn både avreise- og hjemkomstdato for å beregne diett automatisk." };
    }

    const start = new Date(startInput);
    const end = new Date(endInput);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return { amount: 0, text: "Hjemkomst må være etter avreise for gyldig beregning." };
    }

    // Finn tid i timer
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    let baseAmount = 0;
    let daysDescription = "";

    // Logikk: Uten overnatting (Dagdiett) vs Med overnatting (Døgndiett)
    if (accType === 'none') {
        if (diffHours < 6) {
            baseAmount = 0;
            daysDescription = "Under 6 timer (ingen diett).";
        } else if (diffHours >= 6 && diffHours <= 12) {
            baseAmount = RATES.diet.between6and12h;
            daysDescription = "Dagdiett 6-12 timer.";
        } else {
            baseAmount = RATES.diet.over12h;
            daysDescription = "Dagdiett over 12 timer.";
        }
    } else {
        // Med overnatting: Beregnes per hele døgn (24t). Overskytende timer > 6t gir en ekstra dag.
        const fullDays = Math.floor(diffHours / 24);
        const remainderHours = diffHours % 24;
        
        let dailyRate = 0;
        if (accType === 'hotel') dailyRate = RATES.diet.hotel;
        else if (accType === 'boarding') dailyRate = RATES.diet.boarding;
        else if (accType === 'private') dailyRate = RATES.diet.private;

        // Ett fullt døgn kreves normalt for å utløse døgndiett, men vi sjekker for sikkerhets skyld
        let chargeableDays = fullDays;
        
        // Statens satser: Mer enn 6 timer inn i et nytt døgn gir full sats for det nye døgnet
        if (remainderHours > 6) {
            chargeableDays += 1;
        } else if (fullDays === 0 && diffHours > 0) {
            // Unntakstilfelle: Valgt overnatting, men reisen varte under 24 timer totalt
            chargeableDays = 1; 
        }

        baseAmount = chargeableDays * dailyRate;
        daysDescription = `${chargeableDays} døgn/dager med overnattingsdiett.`;
    }

    // Beregn måltidstrekk
    let deductionPercent = 0;
    document.querySelectorAll('.meal-check:checked').forEach(cb => {
        deductionPercent += parseFloat(cb.dataset.percent);
    });

    // Måltidstrekk gjelder for total diett (forenklet for denne kalkulatoren)
    const deductionAmount = baseAmount * deductionPercent;
    const finalAmount = Math.max(0, baseAmount - deductionAmount);

    let textOut = `<strong>Reisetid:</strong> ${diffHours.toFixed(1)} timer. ${daysDescription} <br><strong>Grunnlag:</strong> ${currencyFormatter.format(baseAmount)}.`;
    if (deductionAmount > 0) {
        textOut += ` <strong>Trekk for måltider:</strong> -${currencyFormatter.format(deductionAmount)}.`;
    }

    return { amount: finalAmount, text: textOut };
}


// --- 5. SIGNATURMODUL (CANVAS & BILDEOPPLASTING) ---

let canvas, ctx;
let drawing = false;
let canvasHasContent = false; // For å sjekke om signatur er tegnet

function initCanvas() {
    canvas = document.getElementById('sig-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Mus-events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch-events for mobil/nettbrett
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Hindrer scrolling mens man tegner
        startDrawing(e.touches[0]);
    });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e.touches[0]);
    });
}

function startDrawing(e) {
    drawing = true;
    canvasHasContent = true; // Registrerer at det tegnes
    draw(e); // Lager en prikk selv om man bare trykker og slipper
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath(); // Starter ny linje for neste strøk
}

function draw(e) {
    if (!drawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Mørk blå/svart blekk-farge

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function clearCanvas() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasHasContent = false; // Nullstiller status
    }
}

function switchTab(tab) {
    const drawTab = document.getElementById('draw-tab');
    const uploadTab = document.getElementById('upload-tab');
    const btns = document.querySelectorAll('.tab-btn');

    if (tab === 'draw') {
        drawTab.style.display = 'block';
        uploadTab.style.display = 'none';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        drawTab.style.display = 'none';
        uploadTab.style.display = 'block';
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

function handleSignatureUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById('sig-preview-container');
            container.innerHTML = `<img src="${e.target.result}" style="max-height:100px; margin-top:15px; border-bottom: 1px solid #000; padding-bottom: 5px;">`;
            // Skjuler opplastingsboksen etter at bilde er valgt for ryddigere UI
            document.querySelector('.upload-box').style.display = 'none';
            container.innerHTML += `<br><button type="button" class="btn btn-text btn-small no-print" style="margin-top:10px" onclick="resetUpload()">Fjern bilde</button>`;
        };
        reader.readAsDataURL(file);
    }
}

function resetUpload() {
    document.getElementById('sig-preview-container').innerHTML = '';
    document.getElementById('sig-upload').value = '';
    const uploadBox = document.querySelector('.upload-box');
    if (uploadBox) uploadBox.style.display = 'block';
}

// --- INITIALISERING ---
document.addEventListener('DOMContentLoaded', () => {
    addMileageRow();
    addExpenseRow();
    initCanvas();
    
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('input', calculateAll);
        form.addEventListener('change', calculateAll);
    }
});