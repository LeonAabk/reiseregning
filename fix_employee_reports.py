with open('dashboard.js', 'r') as f:
    content = f.read()

employee_row_original = """            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td>${escapeHTML(r.trip_name || 'Uten navn')}</td>
                <td>Kr ${grandTotal}</td>
                <td>${statusBadge}</td>
                <td>
                    <button type="button" class="btn btn-outline btn-small btn-view">Se detaljer</button>
                </td>
            `;
            const btnView = tr.querySelector('.btn-view');
            if (btnView) {
                btnView.onclick = () => showReportModal(r);
            }
            tbody.appendChild(tr);"""

employee_row_replacement = """            let actionButtons = `<button type="button" class="btn btn-outline btn-small btn-view">Se detaljer</button>`;
            if (statusVal === 'innsendt') {
                actionButtons += ` <button type="button" class="btn btn-warning btn-small btn-withdraw-report" data-id="${r.id}">Trekk tilbake</button>`;
            } else if (statusVal === 'kansellert' || statusVal === 'avvist') {
                actionButtons += ` <button type="button" class="btn btn-primary btn-small btn-edit-draft" data-id="${r.id}">Gjør endringer</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${date}</td>
                <td>${escapeHTML(r.trip_name || 'Uten navn')}</td>
                <td>Kr ${grandTotal}</td>
                <td>${statusBadge}</td>
                <td>${actionButtons}</td>
            `;
            const btnView = tr.querySelector('.btn-view');
            if (btnView) {
                btnView.onclick = () => showReportModal(r);
            }
            const btnWithdraw = tr.querySelector('.btn-withdraw-report');
            if (btnWithdraw) {
                btnWithdraw.onclick = () => handleWithdrawReport(r.id);
            }
            const btnEditDraft = tr.querySelector('.btn-edit-draft');
            if (btnEditDraft) {
                btnEditDraft.onclick = () => handleEditDraft(r.id);
            }
            tbody.appendChild(tr);"""

new_content = content.replace(employee_row_original, employee_row_replacement)
if new_content == content:
    print("Employee row failed to replace")

# Add missing handlers to the end of the file
handlers = """
async function handleWithdrawReport(reportId) {
    if (!confirm("Er du sikker på at du vil trekke tilbake denne reiseregningen?")) return;

    try {
        const { error } = await supabaseClient
            .from('expense_reports')
            .update({ status: 'kansellert' })
            .eq('id', reportId);

        if (error) throw error;
        showToast("Reiseregningen er trukket tilbake.", "success");
        await fetchEmployeeReports();
    } catch (e) {
        console.error("Feil ved tilbaketrekking:", e);
        showToast("Kunne ikke trekke tilbake reiseregningen.", "error");
    }
}

async function handleEditDraft(reportId) {
    try {
        const { error } = await supabaseClient
            .from('expense_reports')
            .update({ status: 'utkast' })
            .eq('id', reportId);

        if (error) throw error;

        window.location.href = `index.html?load=true&id=${reportId}`;
    } catch (e) {
        console.error("Feil ved endring av status til utkast:", e);
        showToast("Kunne ikke endre status for redigering.", "error");
    }
}
"""
new_content += handlers

# Update badges parsing
new_content = new_content.replace(
    """else if (statusVal === 'avvist') statusBadge = '<span class="status-badge badge-rejected">Avvist</span>';""",
    """else if (statusVal === 'avvist') statusBadge = '<span class="status-badge badge-rejected">Avvist</span>';
            else if (statusVal === 'kansellert') statusBadge = '<span class="status-badge badge-cancelled">Kansellert</span>';"""
)


with open('dashboard.js', 'w') as f:
    f.write(new_content)
