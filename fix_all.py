import re

with open('dashboard.js', 'r') as f:
    js_content = f.read()

# 1. Employee Withdraw & Edit
# Add badge for kansellert in dashboard.js
js_content = js_content.replace(
    "else if (statusVal === 'avvist') statusBadge = '<span class=\"status-badge badge-rejected\">Avvist</span>';",
    "else if (statusVal === 'avvist') statusBadge = '<span class=\"status-badge badge-rejected\">Avvist</span>';\n            else if (statusVal === 'kansellert') statusBadge = '<span class=\"status-badge badge-cancelled\">Kansellert</span>';"
)
js_content = js_content.replace(
    "else if (statusVal === 'avvist') statusBadge = '<span class=\"status-badge badge-rejected\">Avvist</span>';",
    "else if (statusVal === 'avvist') statusBadge = '<span class=\"status-badge badge-rejected\">Avvist</span>';\n                        else if (statusVal === 'kansellert') statusBadge = '<span class=\"status-badge badge-cancelled\">Kansellert</span>';"
)

# 2. Add buttons for employee
# Wait, in employee reports list (lines ~670-685)
employee_tr_replace = """
            let actionButtons = `<button type="button" class="btn btn-outline btn-small btn-view">Se detaljer</button>`;
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
            tbody.appendChild(tr);
"""
# Need to find the exact employee row creation logic
