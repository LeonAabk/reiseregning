// Statens sats for kjøregodtgjørelse (kan endres)
const kmRate = 4.90;

// Referanser til HTML-elementer
const mileageTableBody = document.querySelector('#mileageTable tbody');
const expenseTableBody = document.querySelector('#expenseTable tbody');
const btnAddMileage = document.getElementById('btnAddMileage');
const btnAddExpense = document.getElementById('btnAddExpense');

// --- Hjelpefunksjoner for tabellrader ---

function createMileageRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date"></td>
        <td><input type="text" placeholder="F.eks. Oslo - Hamar t/r"></td>
        <td><input type="number" class="km-input" value="0" min="0" oninput="calculateRow(this)"></td>
        <td><input type="number" class="mileage-amount" value="0.00" readonly></td>
        <td class="no-print" style="text-align: center;">
            <button type="button" class="btn btn-remove" onclick="removeRow(this)">X</button>
        </td>
    `;
    return tr;
}

function createExpenseRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date"></td>
        <td><input type="text" placeholder="Beskrivelse av utlegg"></td>
        <td><input type="text" placeholder="Vedlegg nr"></td>
        <td><input type="number" class="expense-amount" value="0" min="0" oninput="updateTotals()"></td>
        <td class="no-print" style="text-align: center;">
            <button type="button" class="btn btn-remove" onclick="removeRow(this)">X</button>
        </td>
    `;
    return tr;
}

// Legg til rader ved oppstart
document.addEventListener('DOMContentLoaded', () => {
    mileageTableBody.appendChild(createMileageRow());
    expenseTableBody.appendChild(createExpenseRow());
    
    // Sett dagens dato på signaturfeltet automatisk
    document.getElementById('datoSignatur').valueAsDate = new Date();
    
    // Start signaturbrettet
    initSignaturePad();
});

// Knappetrykk for å legge til flere rader
btnAddMileage.addEventListener('click', () => {
    mileageTableBody.appendChild(createMileageRow());
});

btnAddExpense.addEventListener('click', () => {
    expenseTableBody.appendChild(createExpenseRow());
});

// Fjern en rad
function removeRow(btn) {
    btn.closest('tr').remove();
    updateTotals();
}

// --- Beregninger ---

function calculateRow(inputElement) {
    // Finn ut hvor mange km som er skrevet inn
    let km = parseFloat(inputElement.value);
    if (isNaN(km) || km < 0) km = 0;
    
    // Finn riktig beløp-felt på samme rad og oppdater det
    const row = inputElement.closest('tr');
    const amountField = row.querySelector('.mileage-amount');
    
    const calculatedAmount = km * kmRate;
    amountField.value = calculatedAmount.toFixed(2);
    
    // Oppdater totalen i bunnen
    updateTotals();
}

function updateTotals() {
    let totalMileage = 0;
    let totalExpense = 0;

    // Summer alle kilometer-beløp
    document.querySelectorAll('.mileage-amount').forEach(field => {
        let val = parseFloat(field.value);
        if (!isNaN(val)) totalMileage += val;
    });

    // Summer alle utlegg-beløp
    document.querySelectorAll('.expense-amount').forEach(field => {
        let val = parseFloat(field.value);
        if (!isNaN(val)) totalExpense += val;
    });

    let grandTotal = totalMileage + totalExpense;

    // Oppdater HTML
    document.getElementById('sumMileage').innerText = totalMileage.toFixed(2) + ' kr';
    document.getElementById('sumExpense').innerText = totalExpense.toFixed(2) + ' kr';
    document.getElementById('sumTotal').innerText = grandTotal.toFixed(2) + ' kr';
}

// --- Signaturbrett ---

function initSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    const ctx = canvas.getContext('2d');
    const btnClear = document.getElementById('btnClearSig');
    
    let isDrawing = false;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        // Støtter både mus og touch
        const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDraw(e) {
        isDrawing = true;
        const pos = getMousePos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault(); // Forhindrer scrolling på mobil når man tegner
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(canvas, e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    }

    function endDraw() {
        isDrawing = false;
        ctx.closePath();
    }

    // Mus-events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);

    // Touch-events for mobil/nettbrett
    canvas.addEventListener('touchstart', startDraw, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', endDraw);

    // Tøm-knapp
    btnClear.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}
