/**
 * REISEREGNING KALKULATOR - REFAKTORERT OG SIKRET
 * Håndterer utregninger, lagring, signatur og PDF-generering.
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

// --- HJELPEFUNKSJONER (SIKKERHET) ---
/**
 * Forhindrer Cross-Site Scripting (XSS) ved å escape farlige tegn.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[match] || match));
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
    
    // Delegert event listener for bedre ytelse
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
        <td><input type="number" class="km-input" value="0" min="0" step="0.1" style="width: 70px;"></td>
        <td><input type="text" class="pass-name" placeholder="Navn på pass."></td>
        <td><input type="number" class="toll-input" value="0" min="0" style="width: 80px;"></td>
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
        <td><input type="number" class="exp-amount" value="0" min="0" step="0.01" style="width: 90px;"></td>
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
        const km = parseFloat(row.querySelector('.km-input').value) || 0;
        const hasPassenger = row.querySelector('.pass-name').value.trim().length > 0;
        const toll = parseFloat(row.querySelector('.toll-input').value) || 0;
        totalMileage += (km * (hasPassenger ? RATES.km + RATES.passenger : RATES.km)) + toll;
    });

    document.querySelectorAll('.exp-amount').forEach(input => {
        totalOther += parseFloat(input.value) || 0;
    });

    const diet = calculateDiet();
    
    // Oppdaterer DOM effektivt
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

    // Bestem overnattingssats
    let nightRate = 0;
    if (accType !== 'none') {
        if (isTaxfree) {
            nightRate = accType === 'hotel' ? RATES.diet.taxfreeHotel : 
                       (accType === 'boarding' ? RATES.diet.taxfreeBoarding : RATES.diet.taxfreePrivate);
        } else {
            nightRate = RATES.diet.stateDognite;
        }
    }

    // Bestem dagsats for overskytende timer
    const dayRate6to12 = isTaxfree ? RATES.diet.taxfreeDay6to12 : RATES.diet.stateDay6to12;
    const dayRateOver12 = isTaxfree ? RATES.diet.taxfreeOver12 : RATES.diet.stateOver12;

    // Beregn fulle døgn
    if (fullDays > 0) {
        let rateToUse = accType !== 'none' ? nightRate : dayRateOver12;
        totalBase += fullDays * rateToUse;
        descParts.push(`${fullDays} fulle døgn`);
    }

    // Beregn rest-timer
    if (remainderHours >= 6) {
        let remainderRate = remainderHours <= 12 ? dayRate6to12 : dayRateOver12;
        totalBase += remainderRate;
        descParts.push(`overskytende ${Math.floor(remainderHours)}t`);
    }

    if (totalBase === 0) return { amount: 0, text: `Ingen diett. Reisetid under 6t (${modeLabel}).` };

    // Måltidstrekk beregnes KUN av gjeldende døgnsats per dag, her forenklet trekkes det av totalen 
    // For 100% nøyaktighet må bruker angi antall frokoster osv, ikke bare en checkbox.
    // Beholder din checkbox-logikk for nå, men trekker av korrekt dagsats:
    let mealDeductionPercentage = 0;
    document.querySelectorAll('.meal-check:checked').forEach(cb => {
        mealDeductionPercentage += parseFloat(cb.dataset.percent);
    });
    
    // Et trekk kan aldri overstige det man har krav på for den gitte perioden
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

    // Fikser touch-koordinater på mobil
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        // Skalerer koordinatene i tilfelle canvaset strekkes av CSS
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

function handleReceiptUploads(event) {
    const files = event.target.files;
    const container = document.getElementById('receipt-preview-container');
    
    Array.from(files).forEach((file, index) => {
        // Enkel validering for å sikre at det faktisk er et bilde
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            uploadedReceipts.push(dataUrl);
            
            // Opprett en wrapper for å kunne slette bildet
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
            km: parseFloat(r.querySelector('.km-input').value) || 0, 
            passenger: r.querySelector('.pass-name').value, 
            toll: parseFloat(r.querySelector('.toll-input').value) || 0 
        })),
        expenses: Array.from(document.querySelectorAll('#expenses-body tr')).map(r => ({ 
            date: r.querySelector('.flatpickr-date').value, 
            description: r.querySelector('.desc-input').value, 
            amount: parseFloat(r.querySelector('.exp-amount').value) || 0, 
            receipt: r.querySelector('.receipt-check').checked 
        }))
    }; 
}

function previewExpenseReport() {
    const data = collectFormData();
    if (!data.personalInfo.name || !data.travelInfo.purpose) {
        alert("Vennligst fyll ut navn og formål før forhåndsvisning.");
        return;
    }

    const diet = calculateDiet();
    let totalM = data.mileage.reduce((sum, i) => sum + (i.km * (i.passenger ? RATES.km+RATES.passenger : RATES.km)) + i.toll, 0);
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
    
    // ALL brukerinput er nå encodet med escapeHTML()
    modal.innerHTML = `
        <div class="modal-content preview-modal-content">
            <div class="modal-header no-print">
                <h2>Forhåndsvisning</h2>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="window.print()">Skriv ut / Lagre PDF</button>
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
                            ${data.mileage.map(i => `<tr><td>${escapeHTML(i.date)}</td><td><strong>Rute:</strong> ${escapeHTML(i.from)} - ${escapeHTML(i.to)} ${i.passenger ? '<br><small>Passasjer: '+escapeHTML(i.passenger)+'</small>' : ''}</td><td>${i.km}</td><td>${currencyFormatter.format((i.km * (i.passenger ? RATES.km+RATES.passenger : RATES.km))+i.toll)}</td></tr>`).join('')}
                            ${data.expenses.map(i => `<tr><td>${escapeHTML(i.date)}</td><td><strong>Utlegg:</strong> ${escapeHTML(i.description)} <br><small>${i.receipt ? '(Bilag lagt ved)' : '(Ingen kvittering)'}</small></td><td>-</td><td>${currencyFormatter.format(i.amount)}</td></tr>`).join('')}
                        </tbody>
                    </table>

                    <div class="diet-section">
                        <h3>Diett og totalt</h3>
                        <p>${escapeHTML(diet.text)}</p>
                        <div class="summary-row"><strong>TOTALT Å UTBETALE:</strong> <strong>${currencyFormatter.format(totalM + totalE + diet.amount)}</strong></div>
                    </div>
                    <div class="signature-section" style="margin-top:40px">
                        <p>Sted/Dato: ${escapeHTML(document.getElementById('final-date-place').value)}</p>
                        <div class="sig-box">${sigImg}</div>
                        <p>__________________________<br>${escapeHTML(data.personalInfo.name)}</p>
                    </div>
                    
                    ${data.receipts.length > 0 ? `
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
    // Fjerner alle åpne modaler sikkert
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
    const data = collectFormData();
    const tripName = prompt("Gi reisen et navn (for organisering):", `Reise ${new Date().toLocaleDateString('no-NO')}`);
    if (!tripName) return;

    try {
        const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
        if (!reports[tripName]) reports[tripName] = [];
        reports[tripName].push({ ...data, timestamp: new Date().toISOString() });
        
        localStorage.setItem('expenseReports', JSON.stringify(reports));
        alert(`Reiseregning er lagret under "${tripName}"!`);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert("Feil: Lagringskapasiteten er full. Slett noen gamle reiser eller fjern store kvitteringer før du prøver igjen.");
        } else {
            console.error("Feil ved lagring", e);
        }
    }
}

function resetFormState() {
    // Tømmer tabeller
    document.getElementById('mileage-body').innerHTML = '';
    document.getElementById('expenses-body').innerHTML = '';
    
    // Tømmer globale states
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
        
        // Gjenopprett kvitteringer hvis de finnes
        if (trip.receipts && Array.isArray(trip.receipts)) {
            uploadedReceipts = [...trip.receipts];
            const container = document.getElementById('receipt-preview-container');
            uploadedReceipts.forEach((dataUrl, idx) => {
                 const wrapper = document.createElement('div');
                 wrapper.style.position = 'relative';
                 wrapper.style.display = 'inline-block';
                 wrapper.innerHTML = `
                     <img src="${escapeHTML(dataUrl)}" style="height:80px; width:80px; object-fit:cover; border:1px solid #ccc; border-radius:4px;">
                     <button type="button" class="btn-text" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:20px; height:20px; font-size:12px; padding:0; line-height:1;" onclick="removeReceipt(this, ${idx})">&times;</button>
                 `;
                 container.appendChild(wrapper);
            });
        }

        calculateAll();
        closeModal();
        alert("Reisen er lastet inn!");
    } catch (e) {
        console.error("Klarte ikke laste inn reisen", e);
        alert("Det oppstod en feil under innlasting av reisen.");
    }
}

// ... Behold showSavedReports, deleteTrip, switchTab, og handleSignatureUpload som før.
// (For å spare plass har jeg utelatt dem da de ikke krevde vesentlige sikkerhetsfikser, 
// utover å sikre at closeModal() brukes riktig).
