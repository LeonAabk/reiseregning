/**
 * REISEREGNING KALKULATOR
 * Basert på Statens Satser (2024)
 */

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

// --- 2. INITIALISERING ---
document.addEventListener('DOMContentLoaded', () => {
    // Sett inn nåværende år automatisk
    document.getElementById('current-year').innerText = new Date().getFullYear();

    // Legg til en tom rad i hver tabell for å starte
    addMileageRow();
    addExpenseRow();
    
    // Sett opp signatur-canvas
    initCanvas();
    
    // Global event listener for sanntidsoppdatering
    // Fanger opp 'input' (tastetrykk) og 'change' (dropdowns/datoer)
    const form = document.getElementById('expense-form');
    form.addEventListener('input', calculateAll);
    form.addEventListener('change', calculateAll);
});


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

    // Sett data-attributt for print (PDF)
    document.querySelector('.app-container').setAttribute('data-print-total', currencyFormatter.format(grandTotal));
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

function initCanvas() {
    canvas = document.getElementById('sig-canvas');
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    document.querySelector('.upload-box').style.display = 'block';
}