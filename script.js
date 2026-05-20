/**
 * REISEREGNING KALKULATOR - FULLSTENDIG VERSJON
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

let canvasHasContent = false; // Tracker om signatur er tegnet

// --- 2. INITIALISERING OG DYNAMISKE RADER ---
document.addEventListener('DOMContentLoaded', () => {
    // Start med én rad i hver tabell
    addMileageRow();
    addExpenseRow();
    
    // Sett opp signaturfelt
    initCanvas();

    // Aktiver norsk kalender for Avreise og Hjemkomst (Dato + Tid)
    flatpickr(".flatpickr-datetime", {
        enableTime: true,
        time_24hr: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "d.m.Y kl. H:i", // Dette er det brukeren ser (norsk format)
        locale: "no" // Tvinger kalenderen til norsk (mandag først, norske navn)
    });
    
    // Last inn lagret personinfo
    loadPersonalInfo();
    
    // Lytt etter endringer i hele skjemaet for sanntidsutregning
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('input', calculateAll);
        form.addEventListener('change', calculateAll);
    }
    
    console.log('Reiseregning-appen er klar.');
});

function addMileageRow() {
    const tbody = document.getElementById('mileage-body');
    const row = document.createElement('tr');
    
    // Setter inn HTML for den nye raden (bruker class "flatpickr-mileage")
    row.innerHTML = `
        <td><input type="text" class="flatpickr-mileage" placeholder="Dato og tid"></td>
        <td><input type="text" placeholder="Fra..."></td>
        <td><input type="text" placeholder="Til... (inkl. årsak til evt. omkjøring)"></td>
        <td><input type="number" class="km-input" value="0" min="0" step="0.1" style="width: 70px;"></td>
        <td><input type="text" class="pass-name" placeholder="Navn på pass."></td>
        <td><input type="number" class="toll-input" value="0" min="0" style="width: 80px;"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
    
    // Aktiverer kalender MED klokkeslett for akkurat denne nye raden
    flatpickr(row.querySelector('.flatpickr-mileage'), {
        enableTime: true,
        time_24hr: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "d.m.Y kl. H:i",
        locale: "no",
        defaultDate: new Date() // Setter dagens dato og nåværende klokkeslett som standard
    });
    
    calculateAll();
}


function addExpenseRow() {
    const tbody = document.getElementById('expenses-body');
    const row = document.createElement('tr');
    const today = new Date().toISOString().split('T')[0];
    
    // Lagt til en checkbox for "Kvittering/Bilag vedlagt"
    row.innerHTML = `
        <td><input type="text" class="flatpickr-date" value="${today}"></td>
        <td><input type="text" placeholder="Beskrivelse (F.eks. Taxi, Fly)..."></td>
        <td><input type="number" class="exp-amount" value="0" min="0" step="0.01" style="width: 90px;"></td>
        <td style="text-align:center;"><input type="checkbox" class="receipt-check" checked title="Kvittering vedlagt"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
    flatpickr(row.querySelector('.flatpickr-date'), {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d.m.Y",
        locale: "no"
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


    // Kjøring
    document.querySelectorAll('#mileage-body tr').forEach(row => {
        const km = parseFloat(row.querySelector('.km-input').value) || 0;
        const passName = row.querySelector('.pass-name').value.trim();
        const hasPassenger = passName.length > 0;
        const toll = parseFloat(row.querySelector('.toll-input').value) || 0;
        const rate = hasPassenger ? (RATES.km + RATES.passenger) : RATES.km;
        totalMileage += (km * rate) + toll;
    });

    // Utlegg
    document.querySelectorAll('.exp-amount').forEach(input => {
        totalOther += parseFloat(input.value) || 0;
    });

    // Diett
    const diet = calculateDiet();
    
    // Oppdater UI
    document.getElementById('total-mileage').innerText = currencyFormatter.format(totalMileage);
    document.getElementById('total-diet').innerText = currencyFormatter.format(diet.amount);
    document.getElementById('total-other').innerText = currencyFormatter.format(totalOther);
    document.getElementById('grand-total').innerText = currencyFormatter.format(totalMileage + diet.amount + totalOther);
    document.getElementById('diet-summary').innerHTML = `<span class="icon">ℹ️</span> ${diet.text}`;
}

function calculateDiet() {
    const startVal = document.getElementById('departure-date').value;
    const endVal = document.getElementById('return-date').value;
    const accType = document.getElementById('accommodation-type').value;
    const dietMode = document.getElementById('diet-mode').value;
    
    if (!startVal || !endVal) return { amount: 0, text: "Fyll ut reisetid for diett-beregning." };

    const start = new Date(startVal);
    const end = new Date(endVal);
    const diffHours = (end - start) / (1000 * 60 * 60);
    
    if (diffHours <= 0) return { amount: 0, text: "Hjemkomst må være etter avreise." };

    let base = 0;
    let desc = "";
    let modeLabel = dietMode === 'taxfree' ? 'Trekkfri sats' : 'Statens sats';

    if (accType === 'none') {
        if (diffHours < 6) {
            base = 0;
            desc = `Ingen diett. Reisens varighet er under 6 timer (${modeLabel}).`;
        } else if (diffHours <= 12) {
            base = dietMode === 'taxfree' ? RATES.diet.taxfreeDay6to12 : RATES.diet.stateDay6to12;
            desc = `Dagdiett 6-12t (${modeLabel})`;
        } else {
            base = dietMode === 'taxfree' ? RATES.diet.taxfreeOver12 : RATES.diet.stateOver12;
            desc = `Dagdiett over 12t (${modeLabel})`;
        }
    } else {
        const days = Math.max(1, Math.ceil(diffHours / 24));
        let rate = 0;

        if (dietMode === 'taxfree') {
            rate = accType === 'hotel'
                ? RATES.diet.taxfreeHotel
                : (accType === 'boarding' ? RATES.diet.taxfreeBoarding : RATES.diet.taxfreePrivate);
        } else {
            rate = RATES.diet.stateDognite;
        }

        base = days * rate;
        desc = `${days} døgn (${accType === 'hotel' ? 'hotell' : accType === 'boarding' ? 'annen med kokemuligheter' : 'annen uten kokemuligheter'}) - ${modeLabel}`;
    }

    // Måltidstrekk
    let trekPercent = 0;
    document.querySelectorAll('.meal-check:checked').forEach(cb => trekPercent += parseFloat(cb.dataset.percent));
    const trekAmt = base * trekPercent;
    
    return {
        amount: Math.max(0, base - trekAmt),
        text: `<strong>${desc}</strong>: ${currencyFormatter.format(base)}. Trekk: -${currencyFormatter.format(trekAmt)}.`
    };
}

// --- 4. SIGNATUR (CANVAS) ---
function initCanvas() {
    const canvas = document.getElementById('sig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
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
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); });
}

function clearCanvas() {
    const canvas = document.getElementById('sig-canvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvasHasContent = false;
    const preview = document.getElementById('sig-preview-container');
    if (preview) preview.innerHTML = '';
    const uploadInput = document.getElementById('sig-upload');
    if (uploadInput) uploadInput.value = '';
}

// --- 5. FORHÅNDSVISNING OG PDF ---
function previewExpenseReport() {
    const data = collectFormData();
    if (!data.personalInfo.name || !data.travelInfo.purpose) {
        alert("Vennligst fyll ut navn og formål før forhåndsvisning.");
        return;
    }

    const diet = calculateDiet();
    let totalM = 0; 
    data.mileage.forEach(i => totalM += (i.km * (i.passenger ? RATES.km+RATES.passenger : RATES.km)) + i.toll);
    let totalE = 0; 
    data.expenses.forEach(i => totalE += i.amount);

    let sigImg = "";
    const uploaded = document.querySelector('#sig-preview-container img');
    if (uploaded) sigImg = `<img src="${uploaded.src}" style="max-height:80px;">`;
    else if (canvasHasContent) sigImg = `<img src="${document.getElementById('sig-canvas').toDataURL()}" style="max-height:80px;">`;

    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'modal-overlay';
    
    // Her settes firmanavnet inn, faller tilbake på "Ikke oppgitt firma" hvis tomt
    const companyName = data.personalInfo.company || 'Ikke oppgitt firma';

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
                        <div style="text-align:right"><strong>${companyName}</strong><p>Ref: ${data.personalInfo.id || '-'}</p></div>
                    </div>
                    <div class="employee-section">
                        <h3>Ansattinformasjon</h3>
                        <p><strong>Navn:</strong> ${data.personalInfo.name} | <strong>Avdeling:</strong> ${data.personalInfo.department}</p>
                        <p><strong>Adresse:</strong> ${data.personalInfo.address}</p>
                    </div>
                    <div class="travel-section">
                        <h3>Om reisen</h3>
                        <p><strong>Formål:</strong> ${data.travelInfo.purpose}</p>
                        <p><strong>Arrangement:</strong> ${data.travelInfo.event || 'Ikke oppgitt'}</p>
                        <p><strong>Periode:</strong> ${new Date(data.travelInfo.departure).toLocaleString('no-NO')} - ${new Date(data.travelInfo.return).toLocaleString('no-NO')}</p>
                        <p><strong>Overnattingssted:</strong> ${data.travelInfo.accommodationName || 'Ikke oppgitt / Privat'}</p>
                    </div>
                    <table class="expense-table">
                        <thead><tr><th>Dato</th><th>Beskrivelse/Rute</th><th>Km</th><th>Beløp</th></tr></thead>
                        <tbody>
                            ${data.mileage.map(i => `<tr><td>${i.date}</td><td><strong>Rute:</strong> ${i.from} - ${i.to} ${i.passenger ? '<br><small>Passasjer: '+i.passenger+'</small>' : ''}</td><td>${i.km}</td><td>${currencyFormatter.format((i.km * (i.passenger ? RATES.km+RATES.passenger : RATES.km))+i.toll)}</td></tr>`).join('')}
                            ${data.expenses.map(i => `<tr><td>${i.date}</td><td><strong>Utlegg:</strong> ${i.description} <br><small>${i.receipt ? '(Bilag lagt ved)' : '(Ingen kvittering)'}</small></td><td>-</td><td>${currencyFormatter.format(i.amount)}</td></tr>`).join('')}
                        </tbody>
                    </table>

                    <div class="diet-section">
                        <h3>Diett og totalt</h3>
                        <p>${diet.text}</p>
                        <div class="summary-row"><strong>TOTALT Å UTBETALE:</strong> <strong>${currencyFormatter.format(totalM + totalE + diet.amount)}</strong></div>
                    </div>
                    <div class="signature-section" style="margin-top:40px">
                        <p>Sted/Dato: ${document.getElementById('final-date-place').value}</p>
                        <div class="sig-box">${sigImg}</div>
                        <p>__________________________<br>${data.personalInfo.name}</p>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.classList.add('modal-open');
    document.body.appendChild(modal);
}

function closeModal() {
    const m = document.getElementById('preview-modal') || document.getElementById('saved-reports-modal');
    if (m) m.remove();
    document.body.classList.remove('modal-open');
}

// --- 6. DATAHÅNDTERING (SAMLE/LAGRE/EKSPORTER) ---
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
            event: document.getElementById('travel-event').value, // NY
            departure: document.getElementById('departure-date').value,
            return: document.getElementById('return-date').value,
            accommodation: document.getElementById('accommodation-type').value,
            accommodationName: document.getElementById('accommodation-name').value, // NY
            dietMode: document.getElementById('diet-mode').value
        },
        mileage: Array.from(document.querySelectorAll('#mileage-body tr')).map(r => {
            const i = r.querySelectorAll('input');
            return { date: i[0].value, from: i[1].value, to: i[2].value, km: parseFloat(i[3].value), passenger: i[4].value, toll: parseFloat(i[5].value) }; // "passenger" er nå en streng
        }),
        expenses: Array.from(document.querySelectorAll('#expenses-body tr')).map(r => {
            const i = r.querySelectorAll('input');
            return { date: i[0].value, description: i[1].value, amount: parseFloat(i[2].value), receipt: i[3].checked }; // "receipt" lagrer om kvittering er huket av
        })
    };
}

function savePersonalInfo() {
    const personalInfo = {
        company: document.getElementById('emp-company').value, // Lagrer firmanavn
        name: document.getElementById('emp-name').value,
        id: document.getElementById('emp-id').value,
        department: document.getElementById('emp-dept').value,
        address: document.getElementById('emp-addr').value
    };
    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
    alert("Personinformasjon er lagret!");
}

function loadPersonalInfo() {
    const saved = localStorage.getItem('personalInfo');
    if (saved) {
        const info = JSON.parse(saved);
        document.getElementById('emp-company').value = info.company || ''; // Henter opp firmanavn
        document.getElementById('emp-name').value = info.name || '';
        document.getElementById('emp-id').value = info.id || '';
        document.getElementById('emp-dept').value = info.department || '';
        document.getElementById('emp-addr').value = info.address || '';
    }
}

function saveExpenseReport() {
    const data = collectFormData();
    const tripName = prompt("Gi reisen et navn (for organisering):", `Reise ${new Date().toLocaleDateString('no-NO')}`);
    if (!tripName) return;

    const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    if (!reports[tripName]) reports[tripName] = [];
    reports[tripName].push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem('expenseReports', JSON.stringify(reports));
    alert(`Reiseregning er lagret under "${tripName}"!`);
}

function showSavedReports() {
    let reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    
    // Håndter bakoverkompatibilitet: hvis det er en array, konverter til objekt
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
                loadBtn.textContent = 'Last inn';
                loadBtn.dataset.folder = folder;
                loadBtn.dataset.index = index;
                loadBtn.onclick = () => loadTrip(folder, index);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Slett';
                deleteBtn.dataset.folder = folder;
                deleteBtn.dataset.index = index;
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

function loadTrip(folder, index) {
    const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    const trip = reports[folder][index];
    if (!trip) return;

    // Last inn personinfo inkludert firmanavn
    document.getElementById('emp-company').value = trip.personalInfo.company || '';
    document.getElementById('emp-name').value = trip.personalInfo.name || '';
    document.getElementById('emp-id').value = trip.personalInfo.id || '';
    document.getElementById('emp-dept').value = trip.personalInfo.department || '';
    document.getElementById('emp-addr').value = trip.personalInfo.address || '';

    // Last inn reiseinfo
    document.getElementById('travel-purpose').value = trip.travelInfo.purpose || '';
    document.getElementById('departure-date').value = trip.travelInfo.departure || '';
    document.getElementById('return-date').value = trip.travelInfo.return || '';
    document.getElementById('accommodation-type').value = trip.travelInfo.accommodation || 'none';

    // Last inn kjøring
    const mileageBody = document.getElementById('mileage-body');
    mileageBody.innerHTML = '';
    trip.mileage.forEach(item => {
        addMileageRow();
        const rows = mileageBody.querySelectorAll('tr');
        const lastRow = rows[rows.length - 1];
        const inputs = lastRow.querySelectorAll('input');
        inputs[0].value = item.date;
        inputs[1].value = item.from;
        inputs[2].value = item.to;
        inputs[3].value = item.km;
        inputs[4].checked = item.passenger;
        inputs[5].value = item.toll;
    });

    // Last inn utlegg
    const expensesBody = document.getElementById('expenses-body');
    expensesBody.innerHTML = '';
    trip.expenses.forEach(item => {
        addExpenseRow();
        const rows = expensesBody.querySelectorAll('tr');
        const lastRow = rows[rows.length - 1];
        const inputs = lastRow.querySelectorAll('input');
        inputs[0].value = item.date;
        inputs[1].value = item.description;
        inputs[2].value = item.amount;
    });

    calculateAll();
    closeModal();
    alert("Reisen er lastet inn!");
}

function deleteTrip(folder, index) {
    const reports = JSON.parse(localStorage.getItem('expenseReports') || '{}');
    if (reports[folder]) {
        reports[folder].splice(index, 1);
        if (reports[folder].length === 0) delete reports[folder];
        localStorage.setItem('expenseReports', JSON.stringify(reports));
        showSavedReports(); // Oppdater modal
    }
}


// Funksjoner for tabs og bildeopplasting
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
            document.getElementById('sig-preview-container').innerHTML = `<img src="${e.target.result}" style="max-height:100px;">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}
