/**
 * REISEREGNING KALKULATOR - KOMPLETT OG SIKRET
 * Håndterer utregninger, lagring (uten å sprenge kvoter), signatur og PDF-generering.
 */

// --- 1. KONSTANTER & SATSER (2026) ---
const RATES = {
    km: 5.30,
    passenger: 1.00,
    diet: {
        stateDay6to12: 397,
        stateOver12: 736,
        stateDognite: 1012,
        taxfreeDay6to12: 200,
        taxfreeOver12: 400,
        taxfreeHotel: 693,
        taxfreeBoarding: 107,
        taxfreePrivate: 400
    }
};

const currencyFormatter = new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK'
});

// State management
let canvasHasContent = false;
let uploadedReceipts = [];

// --- HJELPEFUNKSJONER (SIKKERHET & PARSING) ---
/**
 * Forhindrer Cross-Site Scripting (XSS) ved å escape farlige tegn.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[match] || match));
}

/**
 * Trygg konvertering av tall, støtter både norsk komma og punktum.
 */
function parseNum(val) {
    if (!val) return 0;
    const parsed = parseFloat(String(val).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
}

// --- 2. INITIALISERING ---
document.addEventListener('DOMContentLoaded', () => {
    addMileageRow();
    addExpenseRow();
    initCanvas();

    flatpickr(".flatpickr-datetime", {
        enableTime: true,
        time_24hr: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "d.m.Y k\\l. H:i",
        locale: "no"
    });
    
    loadPersonalInfo();
    
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('input', calculateAll);
        form.addEventListener('change', calculateAll);
    }
});

// --- DYNAMISKE RADER ---
function addMileageRow() {
    const tbody = document.getElementById('mileage-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" class="flatpickr-mileage" placeholder="Dato og tid"></td>
        <td><input type="text" class="from-input" placeholder="Fra..."></td>
        <td><input type="text" class="to-input" placeholder="Til..."></td>
        <td><input type="text" inputmode="decimal" class="km-input" value="0" style="width: 70px;"></td>
        <td><input type="text" class="pass-name" placeholder="Navn på pass."></td>
        <td><input type="text" inputmode="decimal" class="toll-input" value="0" style="width: 80px;"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
    
    flatpickr(row.querySelector('.flatpickr-mileage'), {
        enableTime: true, time_24hr: true, dateFormat: "Y-m-d H:i", altInput: true, altFormat: "d.m.Y k\\l. H:i", locale: "no", defaultDate: new Date()
    });
    calculateAll();
}

function addExpenseRow() {
    const tbody = document.getElementById('expenses-body');
    const row = document.createElement('tr');
    const today = new Date().toISOString().split('T')[0];
    
    row.innerHTML = `
        <td><input type="text" class="flatpickr-date" value="${today}"></td>
        <td><input type="text" class="desc-input" placeholder="Beskrivelse..."></td>
        <td><input type="text" inputmode="decimal" class="exp-amount" value="0" style="width: 90px;"></td>
        <td style="text-align:center;"><input type="checkbox" class="receipt-check" checked title="Kvittering vedlagt"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);

    flatpickr(row.querySelector('.flatpickr-date'), {
        dateFormat: "Y-m-d", altInput: true, altFormat: "d.m.Y", locale: "no"
    });
    calculateAll();
}

function removeRow(btn) {
    btn.closest('tr').remove();
    calculateAll();
}

// --- 3. HOVEDKALKULATOR ---
function calculateAll() {
    let totalMileage = 0;
    let totalOther = 0;

    document.querySelectorAll('#mileage-body tr').forEach(row => {
        const km = parseNum(row.querySelector('.km-input').value);
        const hasPassenger = row.querySelector('.pass-name').value.trim().length > 0;
        const toll = parseNum(row.querySelector('.toll-input').value);
        totalMileage += (km * (hasPassenger ? RATES.km + RATES.passenger : RATES.km)) + toll;
    });

    document.querySelectorAll('.exp-amount').forEach(input => {
        totalOther += parseNum(input.value);
    });

    const diet = calculateDiet();
    
    document.getElementById('total-mileage').textContent = currencyFormatter.format(totalMileage);
    document.getElementById('total-diet').textContent = currencyFormatter.format(diet.amount);
    document.getElementById('total-other').textContent = currencyFormatter.format(totalOther);
    document.getElementById('grand-total').textContent = currencyFormatter.format(totalMileage + diet.amount + totalOther);
    
    const dietSummary = document.getElementById('diet-summary');
    if (dietSummary) dietSummary.innerHTML = `<span class="icon">ℹ️</span> ${escapeHTML(diet.text)}`;
}

function calculateDiet() {
    const startVal = document.getElementById('departure-date').value;
    const endVal = document.getElementById('return-date').value;
    const accType = document.getElementById('accommodation-type').value;
    const dietMode = document.getElementById('diet-mode').value;
    
    if (!startVal || !endVal) return { amount: 0, text: "Fyll ut reisetid for diett-beregning." };

    const diffHours = (new Date(endVal) - new Date(startVal)) / (1000 * 60 * 60);
    if (diffHours <= 0) return { amount: 0, text: "Hjemkomst må være etter avreise." };

    const fullDays = Math.floor(diffHours / 24);
    const remainderHours = diffHours % 24;
    
    let totalBase = 0;
    let descParts = [];
    const isTaxfree = dietMode === 'taxfree';
    const modeLabel = isTaxfree ? 'Trekkfri sats' : 'Statens sats';

    let nightRate = 0;
    if (accType !== 'none') {
        if (isTaxfree) {
            nightRate = accType === 'hotel' ? RATES.diet.taxfreeHotel : 
                       (accType === 'boarding' ? RATES.diet.taxfreeBoarding : RATES.diet.taxfreePrivate);
        } else {
            nightRate = RATES.diet.stateDognite;
        }
    }

    const dayRate6to12 = isTaxfree ? RATES.diet.taxfreeDay6to12 : RATES.diet.stateDay6to12;
    const dayRateOver12 = isTaxfree ? RATES.diet.taxfreeOver12 : RATES.diet.stateOver12;

    if (fullDays > 0) {
        let rateToUse = accType !== 'none' ? nightRate : dayRateOver12;
        totalBase += fullDays * rateToUse;
        descParts.push(`${fullDays} fulle døgn`);
    }

    if (remainderHours >= 6) {
        let remainderRate = remainderHours <= 12 ? dayRate6to12 : dayRateOver12;
        totalBase += remainderRate;
        descParts.push(`overskytende ${Math.floor(remainderHours)}t`);
    }

    if (totalBase === 0) return { amount: 0, text: `Ingen diett. Reisetid under 6t (${modeLabel}).` };

    let mealDeductionPercentage = 0;
    document.querySelectorAll('.meal-check:checked').forEach(cb => {
        mealDeductionPercentage += parseFloat(cb.dataset.percent);
    });
    
    const mealDeductionAmount = totalBase * mealDeductionPercentage;
    const finalAmount = Math.max(0, totalBase - mealDeductionAmount);
    
    const descText = `${descParts.join(' og ')} - ${modeLabel}`;
    return {
        amount: finalAmount,
        text: `${descText}: ${currencyFormatter.format(totalBase)}. Trekk: -${currencyFormatter.format(mealDeductionAmount)}.`
    };
}

// --- 4. SIGNATUR OG VEDLEGG ---
function initCanvas() {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { 
            x: (clientX - rect.left) * scaleX, 
            y: (clientY - rect.top) * scaleY 
        };
    };

    const start = (e) => { drawing = true; canvasHasContent = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const stop = () => { drawing = false; };
    const move = (e) => { 
        if (!drawing) return; 
        const p = getPos(e); 
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineTo(p.x, p.y); ctx.stroke(); 
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });
}

function clearCanvas() {
    const canvas = document.getElementById('sig-canvas');
    if(canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    canvasHasContent = false;
    
    const preview = document.getElementById('sig-preview-container');
    if (preview) preview.innerHTML = '';
    
    const uploadInput = document.getElementById('sig-upload');
    if (uploadInput) uploadInput.value = '';
}

function switchTab(tab) {
    document.getElementById('draw-tab').style.display = tab === 'draw' ? 'block' : 'none';
    document.getElementById('upload-tab').style.display = tab === 'upload' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i===0 && tab==='draw') || (i===1 && tab==='upload')));
}

function handleSignatureUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('sig-preview-container');
    if (!preview) return;

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('sig-preview-container').innerHTML = `<img src="${escapeHTML(e.target.result)}" style="max-height:100px;">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

function handleReceiptUploads(event) {
    const files = event.target.files;
    const container = document.getElementById('receipt-preview-container');
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            uploadedReceipts.push(dataUrl);
            
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            
            wrapper.innerHTML = `
                <img src="${escapeHTML(dataUrl)}" style="height:80px; width:80px; object-fit:cover; border:1px solid #ccc; border-radius:4px;">
                <button type="button" class="btn-text" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:20px; height:20px; font-size:12px; padding:0; line-height:1;" onclick="removeReceipt(this, ${uploadedReceipts.length - 1})">&times;</button>
            `;
            container.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

function removeReceipt(btn, index) {
    uploadedReceipts.splice(index, 1);
    btn.parentElement.remove();
}

// --- 5. DATA OG FORHÅNDSVISNING ---
function collectFormData() {
    return {
        personalInfo: {
            company: document.getElementById('emp-company').value,
            name: document.getElementById('emp-name').value,
            id: document.getElementById('emp-id').value,
            department: document.getElementById('emp-dept').value,
            address: document.getElementById('emp-addr').value
        },
        travelInfo: {
            purpose: document.getElementById('travel-purpose').value,
            event: document.getElementById('travel-event').value,
            departure: document.getElementById('departure-date').value,
            return: document.getElementById('return-date').value,
            accommodation: document.getElementById('accommodation-type').value,
            accommodationName: document.getElementById('accommodation-name').value,
            dietMode: document.getElementById('diet-mode').value
        },
        mileage: Array.from(document.querySelectorAll('#mileage-body tr')).map(r => ({ 
            date: r.querySelector('.flatpickr-mileage').value, 
            from: r.querySelector('.from-input').value, 
            to: r.querySelector('.to-input').value, 
            km: parseNum(r.querySelector('.km-input').value), 
            passenger: r.querySelector('.pass-name').value.trim(), 
            toll: parseNum(r.querySelector('.toll-input').value) 
        })),
        expenses: Array.from(document.querySelectorAll('#expenses-body tr')).map(r => ({ 
            date: r.querySelector('.flatpickr-date').value, 
            description: r.querySelector('.desc-input').value, 
            amount: parseNum(r.querySelector('.exp-amount').value), 
            receipt: r.querySelector('.receipt-check').checked 
        })),
        // Inkluderer bilder KUN for forhåndsvisningen. Disse fjernes før lagring.
        receipts: uploadedReceipts,
        signatureContent: canvasHasContent ? document.getElementById('sig-canvas').toDataURL() : null
    }; 
}

function previewExpenseReport() {
    const data = collectFormData();
    if (!data.personalInfo.name || !data.travelInfo.purpose) {
        alert("Vennligst fyll ut navn og formål før forhåndsvisning.");
        return;
    }

    const diet = calculateDiet();
    let totalM = data.mileage.reduce((sum, i) => sum + (i.km * (i.passenger.length > 0 ? RATES.km+RATES.passenger : RATES.km)) + i.toll, 0);
    let totalE = data.expenses.reduce((sum, i) => sum + i.amount, 0);

    let sigImg = "";
    const uploadedSig = document.querySelector('#sig-preview-container img');
    
    if (uploadedSig) {
        sigImg = `<img src="${escapeHTML(uploadedSig.src)}" style="max-height:80px;">`;
    } else if (data.signatureContent) {
        sigImg = `<img src="${escapeHTML(data.signatureContent)}" style="max-height:80px;">`;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay preview-modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content preview-modal-content">
            <div class="modal-header no-print">
                <h2>Forhåndsvisning</h2>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="window.print()">Skriv ut / Lagre PDF</button>
                    <button type="button" class="btn btn-primary" onclick="exportToCSV()">Last ned CSV</button>
                    <button type="button" class="modal-close" onclick="closeModal()">&times;</button>
                </div>
            </div>
            <div class="modal-body" id="preview-content">
                <div class="expense-report-document">
                    <div class="document-header">
                        <div><h1>REISEREGNING</h1><p>År: 2026</p></div>
                        <div style="text-align:right"><strong>${escapeHTML(data.personalInfo.company) || 'Ikke oppgitt firma'}</strong><p>Ref: ${escapeHTML(data.personalInfo.id) || '-'}</p></div>
                    </div>
                    <div class="employee-section">
                        <h3>Ansattinformasjon</h3>
                        <p><strong>Navn:</strong> ${escapeHTML(data.personalInfo.name)} | <strong>Avdeling:</strong> ${escapeHTML(data.personalInfo.department)}</p>
                        <p><strong>Adresse:</strong> ${escapeHTML(data.personalInfo.address)}</p>
                    </div>
                    <div class="travel-section">
                        <h3>Om reisen</h3>
                        <p><strong>Formål:</strong> ${escapeHTML(data.travelInfo.purpose)}</p>
                        <p><strong>Arrangement:</strong> ${escapeHTML(data.travelInfo.event) || 'Ikke oppgitt'}</p>
                        <p><strong>Periode:</strong> ${escapeHTML(data.travelInfo.departure)} - ${escapeHTML(data.travelInfo.return)}</p>
                        <p><strong>Overnattingssted:</strong> ${escapeHTML(data.travelInfo.accommodationName) || 'Ikke oppgitt / Privat'}</p>
                    </div>
                    <table class="expense-table">
                        <thead><tr><th>Dato</th><th>Beskrivelse/Rute</th><th>Km</th><th>Beløp</th></tr></thead>
                        <tbody>
                            ${data.mileage.map(i => `<tr><td>${escapeHTML(i.date)}</td><td><strong>Rute:</strong> ${escapeHTML(i.from)} - ${escapeHTML(i.to)} ${i.passenger.length > 0 ? '<br><small>Passasjer: '+escapeHTML(i.passenger)+'</small>' : ''}</td><td>${i.km}</td><td>${currencyFormatter.format((i.km * (i.passenger.length > 0 ? RATES.km+RATES.passenger : RATES.km))+i.toll)}</td></tr>`).join('')}
                            ${data.expenses.map(i => `<tr><td>${escapeHTML(i.date)}</td><td><strong>Utlegg:</strong> ${escapeHTML(i.description)} <br><small>${i.receipt ? '(Bilag lagt ved)' : '(Ingen kvittering)'}</small></td><td>-</td><td>${currencyFormatter.format(i.amount)}</td></tr>`).join('')}
                        </tbody>
                    </table>

                    <div class="diet-section">
                        <h3>Diett og totalt</h3>
                        <p>${escapeHTML(diet.text)}</p>
                        <div class="summary-row"><strong>TOTALT Å UTBETALE:</strong> <strong>${currencyFormatter.format(totalM + totalE + diet.amount)}</strong></div>
                    </div>
                    <div class="signature-section" style="margin-top:40px">
                        <p>Sted/Dato: ${escapeHTML(document.getElementById('final-date-place') ? document.getElementById('final-date-place').value : '')}</p>
                        <div class="sig-box">${sigImg}</div>
                        <p>__________________________<br>${escapeHTML(data.personalInfo.name)}</p>
                    </div>
                    
                    ${data.receipts && data.receipts.length > 0 ? `
                    <div class="receipts-section" style="page-break-before: always; padding-top: 20px;">
                        <h2>Vedlegg / Kvitteringer</h2>
                        ${data.receipts.map(src => `<div style="text-align:center; margin-bottom: 30px;"><img src="${escapeHTML(src)}" style="max-width:100%; max-height:900px; border:1px solid #ddd; padding: 5px;"></div>`).join('')}
                    </div>
                    ` : ''}

                </div>
            </div>
        </div>`;
    document.body.classList.add('modal-open');
    document.body.appendChild(modal);
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    document.body.classList.remove('modal-open');
}

// --- 6. LAGRING OG LASTING ---
function savePersonalInfo() {
    const personalInfo = {
        company: document.getElementById('emp-company').value,
        name: document.getElementById('emp-name').value,
        id: document.getElementById('emp-id').value,
        department: document.getElementById('emp-dept').value,
        address: document.getElementById('emp-addr').value
    };
    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
    alert("Personinformasjon er lagret!");
}

function loadPersonalInfo() {
    try {
        const saved = localStorage.getItem('personalInfo');
        if (saved) {
            const info = JSON.parse(saved);
            document.getElementById('emp-company').value = info.company || '';
            document.getElementById('emp-name').value = info.name || '';
            document.getElementById('emp-id').value = info.id || '';
            document.getElementById('emp-dept').value = info.department || '';
            document.getElementById('emp-addr').value = info.address || '';
        }
    } catch (e) {
        console.error("Feil ved innlasting av personinfo", e);
    }
}

function saveExpenseReport() {
    const fullData = collectFormData();
    const tripName = prompt("Gi reisen et navn (for organisering):", `Reise ${new Date().toLocaleDateString('no-NO')}`);
    if (!tripName) return;

    // Fjerner bilde-data for å unngå å sprenge 5MB-grensen i nettleseren
    const safeDataToSave = {
        ...fullData,
        receipts: [],
        signatureContent: null
    };

    try {
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
        if (!reports[tripName]) reports[tripName] = [];
        reports[tripName].push({ ...safeDataToSave, timestamp: new Date().toISOString() });
        
        localStorage.setItem('expenseReports', JSON.stringify(reports));
        alert(`Reiseregning er lagret under "${tripName}"!`);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert("Feil: Lagringskapasiteten er full. Slett noen gamle reiser før du prøver igjen.");
        } else {
            console.error("Feil ved lagring", e);
        }
    }
}

function showSavedReports() {
    let reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    
    // Bakoverkompatibilitet hvis gammel struktur brukes
    if (Array.isArray(reports)) {
        const oldReports = reports;
        reports = { 'Gamle reiser': oldReports };
        localStorage.setItem('expenseReports', JSON.stringify(reports));
    }
    
    const modal = document.createElement('div');
    modal.id = 'saved-reports-modal';
    modal.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.innerHTML = '<h2>Lagrede reiser</h2>';
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = closeModal;
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    if (Object.keys(reports).length === 0) {
        modalBody.innerHTML = '<p>Ingen lagrede reiser.</p>';
    } else {
        for (const [folder, trips] of Object.entries(reports)) {
            const h3 = document.createElement('h3');
            h3.textContent = `${folder} (${trips.length} reiser)`;
            modalBody.appendChild(h3);
            
            const ul = document.createElement('ul');
            trips.forEach((trip, index) => {
                const li = document.createElement('li');
                const date = new Date(trip.timestamp).toLocaleDateString('no-NO');
                li.textContent = `${date} - ${trip.travelInfo.purpose} `;
                
                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn btn-outline btn-small';
                loadBtn.style.marginRight = '5px';
                loadBtn.textContent = 'Last inn';
                loadBtn.onclick = () => loadTrip(folder, index);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-text btn-small';
                deleteBtn.style.color = 'var(--danger-color)';
                deleteBtn.textContent = 'Slett';
                deleteBtn.onclick = () => deleteTrip(folder, index);
                
                li.appendChild(loadBtn);
                li.appendChild(deleteBtn);
                ul.appendChild(li);
            });
            modalBody.appendChild(ul);
        }
    }
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    document.body.classList.add('modal-open');
    document.body.appendChild(modal);
}

function deleteTrip(folder, index) {
    const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    if (reports[folder]) {
        reports[folder].splice(index, 1);
        if (reports[folder].length === 0) delete reports[folder];
        localStorage.setItem('expenseReports', JSON.stringify(reports));
        
        // Lukk aktiv modal og åpne oppdatert visning
        closeModal();
        showSavedReports();
    }
}

function resetFormState() {
    document.getElementById('mileage-body').innerHTML = '';
    document.getElementById('expenses-body').innerHTML = '';
    clearCanvas();
    uploadedReceipts = [];
    document.getElementById('receipt-preview-container').innerHTML = '';
}

function loadTrip(folder, index) {
    try {
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
        const trip = reports[folder][index];
        if (!trip) return;

        resetFormState();

        document.getElementById('emp-company').value = trip.personalInfo.company || '';
        document.getElementById('emp-name').value = trip.personalInfo.name || '';
        document.getElementById('emp-id').value = trip.personalInfo.id || '';
        document.getElementById('emp-dept').value = trip.personalInfo.department || '';
        document.getElementById('emp-addr').value = trip.personalInfo.address || '';

        document.getElementById('travel-purpose').value = trip.travelInfo.purpose || '';
        document.getElementById('travel-event').value = trip.travelInfo.event || '';
        document.getElementById('accommodation-name').value = trip.travelInfo.accommodationName || '';
        document.getElementById('diet-mode').value = trip.travelInfo.dietMode || 'state';
        document.getElementById('accommodation-type').value = trip.travelInfo.accommodation || 'none';
        
        const depDate = document.getElementById('departure-date');
        if(depDate._flatpickr) depDate._flatpickr.setDate(trip.travelInfo.departure);
        
        const retDate = document.getElementById('return-date');
        if(retDate._flatpickr) retDate._flatpickr.setDate(trip.travelInfo.return);
        
        trip.mileage.forEach(item => {
            addMileageRow();
            const lastRow = document.querySelector('#mileage-body tr:last-child');
            if (lastRow.querySelector('.flatpickr-mileage')._flatpickr) lastRow.querySelector('.flatpickr-mileage')._flatpickr.setDate(item.date);
            lastRow.querySelector('.from-input').value = item.from;
            lastRow.querySelector('.to-input').value = item.to;
            lastRow.querySelector('.km-input').value = item.km;
            lastRow.querySelector('.pass-name').value = item.passenger;
            lastRow.querySelector('.toll-input').value = item.toll;
        });

        trip.expenses.forEach(item => {
            addExpenseRow();
            const lastRow = document.querySelector('#expenses-body tr:last-child');
            if (lastRow.querySelector('.flatpickr-date')._flatpickr) lastRow.querySelector('.flatpickr-date')._flatpickr.setDate(item.date);
            lastRow.querySelector('.desc-input').value = item.description;
            lastRow.querySelector('.exp-amount').value = item.amount;
            lastRow.querySelector('.receipt-check').checked = item.receipt;
        });
        
        calculateAll();
        closeModal();
        alert("Reisen er lastet inn!");
    } catch (e) {
        console.error("Klarte ikke laste inn reisen", e);
        alert("Det oppstod en feil under innlasting av reisen.");
    }
}

// --- 7. BRUKERVEILEDNING / HJELPEMODAL ---
function showHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.className = 'modal-overlay';
    
    // Vi setter en max-width direkte her for å gjøre boksen litt smalere og mer lesbar
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 650px;">
            <div class="modal-header no-print">
                <h2>Informasjon og Brukerveiledning</h2>
                <div class="modal-actions">
                    <button type="button" class="modal-close" onclick="closeModal()">&times;</button>
                </div>
            </div>
            <div class="modal-body" style="line-height: 1.6; font-size: 0.95rem;">
                <h3>Slik fungerer applikasjonen</h3>
                <p>Denne kalkulatoren hjelper deg med å fylle ut en komplett reiseregning basert på statens satser for 2026. Alt regnes ut automatisk mens du skriver.</p>

                <ul style="padding-left: 20px; margin-bottom: 25px;">
                    <li style="margin-bottom: 10px;"><strong>Reise og Diett:</strong> Fyll inn dato og klokkeslett for avreise og hjemkomst. Appen beregner automatisk døgndiett og overskytende timer etter gjeldende regelverk. Kryss av for de måltidene du har fått dekket for å få riktig måltidstrekk.</li>
                    <li style="margin-bottom: 10px;"><strong>Kjøring og Utlegg:</strong> Legg til ruter og utlegg. Du kan legge til så mange rader du trenger. Systemet legger automatisk til passasjertillegg hvis du fyller inn navnet på en passasjer.</li>
                    <li style="margin-bottom: 10px;"><strong>Kvitteringer / Vedlegg:</strong> Du kan laste opp bilder av kvitteringene dine direkte fra PC eller mobil. Disse vil automatisk bli lagt til som egne, ryddige sider bakerst i PDF-dokumentet.</li>
                    <li style="margin-bottom: 10px;"><strong>Signering:</strong> Du kan tegne signaturen din direkte på skjermen (med mus eller finger), eller laste opp et ferdig bilde av signaturen din.</li>
                </ul>

                <h3 style="border-top: 1px solid #e2e8f0; padding-top: 20px;">Lagring og Personvern</h3>
                <p><strong>Appen sender ingen data til internett.</strong> Alt du skriver inn lagres utelukkende <em>lokalt i din egen nettleser</em> (via noe som heter Local Storage).</p>
                <ul style="padding-left: 20px; margin-bottom: 25px;">
                    <li style="margin-bottom: 10px;">Personvernet ditt er 100% ivaretatt, ingen andre kan se reiseregningene dine.</li>
                    <li style="margin-bottom: 10px;">Fordi bildene fra moderne mobilkameraer tar enormt mye plass, <strong>lagres ikke opplastede kvitteringer i minnet</strong> når du trykker "Lagre Reise". Slik unngår vi at appen krasjer. Legg derfor til bildene rett før du forhåndsviser/skriver ut PDF-en.</li>
                </ul>

                <div style="margin-top: 30px; text-align: center;">
                    <button type="button" class="btn btn-primary" onclick="closeModal()">Jeg forstår, lukk vinduet</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.classList.add('modal-open');
    document.body.appendChild(modal);
}

// --- 8. CSV EXPORT ---
function exportToCSV() {
    const data = collectFormData();
    if (!data.personalInfo.name || !data.travelInfo.purpose) {
        alert("Vennligst fyll ut navn og formål før eksport.");
        return;
    }

    const diet = calculateDiet();
    let csvContent = "";

    // Helper function to format numbers for Norwegian locale in CSV
    const formatNum = (num) => String(num).replace('.', ',');

    // Metadata
    csvContent += `Navn;${data.personalInfo.name}\n`;
    csvContent += `Ansattnr;${data.personalInfo.id}\n`;
    csvContent += `Avdeling;${data.personalInfo.department}\n`;
    csvContent += `Firma;${data.personalInfo.company}\n`;
    csvContent += `\n`;

    // Header
    csvContent += `Dato;Beskrivelse/Rute;Type;Beløp\n`;

    let totalSum = 0;

    // Mileage
    data.mileage.forEach(i => {
        if (i.km > 0 || i.toll > 0) {
            let amount = (i.km * (i.passenger.length > 0 ? RATES.km + RATES.passenger : RATES.km)) + i.toll;
            let desc = `${i.from} - ${i.to}`;
            if (i.passenger.length > 0) desc += ` (Passasjer: ${i.passenger})`;
            csvContent += `${i.date};${desc};Kjøring/Bom;${formatNum(amount)}\n`;
            totalSum += amount;
        }
    });

    // Expenses
    data.expenses.forEach(i => {
        if (i.amount > 0 || i.description) {
            csvContent += `${i.date};${i.description};Utlegg;${formatNum(i.amount)}\n`;
            totalSum += i.amount;
        }
    });

    // Diet
    if (diet.amount > 0 || data.travelInfo.departure) {
        let dateStr = `${data.travelInfo.departure} - ${data.travelInfo.return}`;
        csvContent += `${dateStr};${diet.text};Diett;${formatNum(diet.amount)}\n`;
        totalSum += diet.amount;
    }

    // Total
    csvContent += `\n`;
    csvContent += `TOTALT Å UTBETALE;;;${formatNum(totalSum)}\n`;

    // Add BOM for Excel and generate Blob
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    const today = new Date().toISOString().split('T')[0];
    const filename = `Reiseregning_${data.personalInfo.name.replace(/\s+/g, '_')}_${today}.csv`;

    // Create download link
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
