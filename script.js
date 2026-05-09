const kmRate = 4.90;

// Referanser til tabeller
const mileageTableBody = document.querySelector('#mileageTable tbody');
const expenseTableBody = document.querySelector('#expenseTable tbody');

// Initialisering
document.addEventListener('DOMContentLoaded', () => {
    addMileageRow();
    addExpenseRow();
    
    // Sett dagens dato
    document.getElementById('signDate').valueAsDate = new Date();
    
    initSignature();
});

// --- Radehåndtering ---

function addMileageRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date"></td>
        <td><input type="text" placeholder="F.eks Oslo - Bergen"></td>
        <td><input type="number" class="km-input" value="0" oninput="updateMileageAmount(this)"></td>
        <td><input type="number" class="mileage-amount" value="0.00" readonly></td>
        <td class="no-print"><button class="btn-remove" onclick="removeRow(this)">×</button></td>
    `;
    mileageTableBody.appendChild(tr);
    updateTotals();
}

function addExpenseRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date"></td>
        <td><input type="text" placeholder="Hotell, Diett, etc."></td>
        <td><input type="text" placeholder="-"></td>
        <td><input type="number" class="expense-amount" value="0" oninput="updateTotals()"></td>
        <td class="no-print"><button class="btn-remove" onclick="removeRow(this)">×</button></td>
    `;
    expenseTableBody.appendChild(tr);
    updateTotals();
}

function removeRow(btn) {
    btn.closest('tr').remove();
    updateTotals();
}

// --- Beregninger ---

function updateMileageAmount(input) {
    const km = parseFloat(input.value) || 0;
    const tr = input.closest('tr');
    const amountInput = tr.querySelector('.mileage-amount');
    amountInput.value = (km * kmRate).toFixed(2);
    updateTotals();
}

function updateTotals() {
    let totalMileage = 0;
    document.querySelectorAll('.mileage-amount').forEach(el => {
        totalMileage += parseFloat(el.value) || 0;
    });

    let totalExpense = 0;
    document.querySelectorAll('.expense-amount').forEach(el => {
        totalExpense += parseFloat(el.value) || 0;
    });

    const grandTotal = totalMileage + totalExpense;

    document.getElementById('sumMileage').innerText = totalMileage.toLocaleString('no-NO', { minimumFractionDigits: 2 }) + ' kr';
    document.getElementById('sumExpense').innerText = totalExpense.toLocaleString('no-NO', { minimumFractionDigits: 2 }) + ' kr';
    document.getElementById('sumTotal').innerText = grandTotal.toLocaleString('no-NO', { minimumFractionDigits: 2 }) + ' kr';
}

// --- Signaturbrett ---

function initSignature() {
    const canvas = document.getElementById('signaturePad');
    const ctx = canvas.getContext('2d');
    let drawing = false;

    // Fix for high DPI
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDrawing() {
        drawing = false;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
}

function clearSignature() {
    const canvas = document.getElementById('signaturePad');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Opplasting av bilde som signatur
document.getElementById('sigUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.getElementById('signaturePad');
                const ctx = canvas.getContext('2d');
                clearSignature();
                // Tegn bildet sentrert
                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;
                const ratio  = Math.min(hRatio, vRatio) * 0.5; // skala ned litt
                ctx.drawImage(img, 0, 0, img.width, img.height, 10, 10, img.width*ratio, img.height*ratio);
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});