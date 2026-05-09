/**
 * REISEREGNING KALKULATOR - FULLSTENDIG VERSJON
 * Håndterer utregninger, lagring, signatur og PDF-generering.
 */

// --- 1. KONSTANTER & STATENS SATSER (2024) ---
const RATES = {
    km: 4.90,
    passenger: 1.00,
    diet: {
        under6h: 0,
        between6and12h: 400,
        over12h: 658,
        hotel: 940,
        boarding: 400,
        private: 434
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
    const today = new Date().toISOString().split('T')[0];
    
    row.innerHTML = `
        <td><input type="date" value="${today}"></td>
        <td><input type="text" placeholder="Fra..."></td>
        <td><input type="text" placeholder="Til..."></td>
        <td><input type="number" class="km-input" value="0" min="0" step="0.1"></td>
        <td style="text-align: center;"><input type="checkbox" class="pass-check" style="width:20px; height:20px;"></td>
        <td><input type="number" class="toll-input" value="0" min="0"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
    calculateAll();
}

function addExpenseRow() {
    const tbody = document.getElementById('expenses-body');
    const row = document.createElement('tr');
    const today = new Date().toISOString().split('T')[0];
    
    row.innerHTML = `
        <td><input type="date" value="${today}"></td>
        <td><input type="text" placeholder="Beskrivelse..."></td>
        <td><input type="number" class="exp-amount" value="0" min="0" step="0.01"></td>
        <td class="no-print"><button type="button" class="btn btn-text btn-small" style="color:var(--danger-color)" onclick="removeRow(this)">Slett</button></td>
    `;
    tbody.appendChild(row);
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
        const pass = row.querySelector('.pass-check').checked;
        const toll = parseFloat(row.querySelector('.toll-input').value) || 0;
        const rate = pass ? (RATES.km + RATES.passenger) : RATES.km;
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
    
    if (!startVal || !endVal) return { amount: 0, text: "Fyll ut reisetid for diett-beregning." };

    const start = new Date(startVal);
    const end = new Date(endVal);
    const diffHours = (end - start) / (1000 * 60 * 60);
    
    if (diffHours <= 0) return { amount: 0, text: "Hjemkomst må være etter avreise." };

    let base = 0;
    let desc = "";

    if (accType === 'none') {
        if (diffHours < 6) base = 0;
        else if (diffHours <= 12) base = RATES.diet.between6and12h;
        else base = RATES.diet.over12h;
        desc = diffHours <= 12 ? "Dagdiett 6-12t" : "Dagdiett over 12t";
    } else {
        const days = Math.max(1, Math.ceil(diffHours / 24));
        const rate = accType === 'hotel' ? RATES.diet.hotel : (accType === 'boarding' ? RATES.diet.boarding : RATES.diet.private);
        base = days * rate;
        desc = `${days} døgn (${accType})`;
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
                        <div><h1>REISEREGNING</h1><p>År: 2024</p></div>
                        <div style="text-align:right"><strong>Eksempelbedrift AS</strong><p>Ref: ${data.personalInfo.id || '-'}</p></div>
                    </div>
                    <div class="employee-section">
                        <h3>Ansattinformasjon</h3>
                        <p><strong>Navn:</strong> ${data.personalInfo.name} | <strong>Avdeling:</strong> ${data.personalInfo.department}</p>
                        <p><strong>Adresse:</strong> ${data.personalInfo.address}</p>
                    </div>
                    <div class="travel-section">
                        <h3>Om reisen</h3>
                        <p><strong>Formål:</strong> ${data.travelInfo.purpose}</p>
                        <p><strong>Periode:</strong> ${new Date(data.travelInfo.departure).toLocaleString('no-NO')} - ${new Date(data.travelInfo.return).toLocaleString('no-NO')}</p>
                    </div>
                    <table class="expense-table">
                        <thead><tr><th>Dato</th><th>Beskrivelse/Rute</th><th>Km</th><th>Beløp</th></tr></thead>
                        <tbody>
                            ${data.mileage.map(i => `<tr><td>${i.date}</td><td>${i.from}-${i.to}</td><td>${i.km}</td><td>${currencyFormatter.format((i.km * (i.passenger?RATES.km+RATES.passenger:RATES.km))+i.toll)}</td></tr>`).join('')}
                            ${data.expenses.map(i => `<tr><td>${i.date}</td><td>${i.description}</td><td>-</td><td>${currencyFormatter.format(i.amount)}</td></tr>`).join('')}
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
            name: document.getElementById('emp-name').value,
            id: document.getElementById('emp-id').value,
            department: document.getElementById('emp-dept').value,
            address: document.getElementById('emp-addr').value
        },
        travelInfo: {
            purpose: document.getElementById('travel-purpose').value,
            departure: document.getElementById('departure-date').value,
            return: document.getElementById('return-date').value,
            accommodation: document.getElementById('accommodation-type').value
        },
        mileage: Array.from(document.querySelectorAll('#mileage-body tr')).map(r => {
            const i = r.querySelectorAll('input');
            return { date: i[0].value, from: i[1].value, to: i[2].value, km: parseFloat(i[3].value), passenger: i[4].checked, toll: parseFloat(i[5].value) };
        }),
        expenses: Array.from(document.querySelectorAll('#expenses-body tr')).map(r => {
            const i = r.querySelectorAll('input');
            return { date: i[0].value, description: i[1].value, amount: parseFloat(i[2].value) };
        })
    };
}

function saveExpenseReport() {
    const reports = JSON.parse(localStorage.getItem('expenseReports') || '[]');
    reports.push({ ...collectFormData(), timestamp: new Date().toISOString() });
    localStorage.setItem('expenseReports', JSON.stringify(reports));
    alert("Reiseregning er lagret lokalt!");
}

function exportAsJSON() {
    const blob = new Blob([JSON.stringify(collectFormData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "reiseregning.json";
    a.click();
}

// Funksjoner for tabs og bildeopplasting
function switchTab(tab) {
    document.getElementById('draw-tab').style.display = tab === 'draw' ? 'block' : 'none';
    document.getElementById('upload-tab').style.display = tab === 'upload' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i===0 && tab==='draw') || (i===1 && tab==='upload')));
}

function handleSignatureUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('sig-preview-container').innerHTML = `<img src="${e.target.result}" style="max-height:100px;">`;
            document.querySelector('.upload-box').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}