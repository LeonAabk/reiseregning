// Supabase Initialization
const supabaseUrl = 'https://yfanegpwyjqhkbiikfny.supabase.co';
const supabaseKey = 'sb_publishable_G8uHOPVInNnMvm6rSjWB5g_QjeHyhY-';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentCompany = null;

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[match] || match));
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth(supabaseClient, (user) => {
        currentUser = user;
        renderDashboard();
    });

    const closeBtn = document.getElementById('btn-close-report-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const overlay = document.getElementById('report-modal-overlay');
            if (overlay) overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    }
});

function showReportModal(report) {
    const overlay = document.getElementById('report-modal-overlay');
    const body = document.getElementById('report-modal-body');
    if (!overlay || !body || !report || !report.report_data) return;

    const data = report.report_data;

    // Formatting numbers for Norwegian locale
    const formatCurrency = (val) => {
        if (!val) return '0,00';
        return Number(val).toFixed(2).replace('.', ',');
    };

    let html = `<div class="expense-report-document">`;

    // Rejected state for employee
    if (report.status === 'avvist' && report.admin_comment) {
        html += `<div class="alert-danger" style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0;">AVVIST</h4>
                    <p style="margin: 0; margin-bottom: 10px;"><strong>Begrunnelse fra leder:</strong> ${escapeHTML(report.admin_comment)}</p>`;

        if (report.user_id === currentUser.id) {
            html += `<button class="btn btn-primary btn-small" id="btn-modal-edit" data-id="${report.id}">Gjør endringer</button>`;
        }

        html += `</div>`;
    }

    // Header
    html += `
        <div class="document-header">
            <div>
                <h1 style="margin-bottom: 5px;">Reiseregning</h1>
                <p><strong>Dato sendt:</strong> ${new Date(report.created_at).toLocaleDateString('no-NO')}</p>
                <p><strong>Reisens navn:</strong> ${escapeHTML(report.trip_name || 'Uten navn')}</p>
            </div>
            <div style="text-align: right;">
                <p><strong>Ansatt:</strong> ${escapeHTML(data.personalInfo?.name || '')}</p>
                <p><strong>E-post:</strong> ${escapeHTML(report.employeeEmail || data.personalInfo?.email || '')}</p>
                <p><strong>Avdeling:</strong> ${escapeHTML(data.personalInfo?.department || '')}</p>
            </div>
        </div>
    `;

    // Kjøring (Mileage)
    if (data.mileage && data.mileage.length > 0) {
        html += `
            <h3>Kjøring</h3>
            <div class="table-responsive">
                <table class="expense-table">
                    <thead>
                        <tr>
                            <th>Dato</th>
                            <th>Fra-Til</th>
                            <th>Km</th>
                            <th>Passasjer</th>
                            <th>Bompenger</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.mileage.forEach(route => {
            html += `
                <tr>
                    <td>${escapeHTML(route.date || '')}</td>
                    <td>${escapeHTML(route.from || '')} - ${escapeHTML(route.to || '')}</td>
                    <td>${escapeHTML(route.km || '0')}</td>
                    <td>${escapeHTML(route.passenger || '-')}</td>
                    <td>Kr ${formatCurrency(route.toll || 0)}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    // Diet / Per Diem (Diettgodtgjørelse)
    if (data.diet && data.diet.length > 0) {
        html += `
            <h3>Diettgodtgjørelse</h3>
            <div class="table-responsive">
                <table class="expense-table">
                    <thead>
                        <tr>
                            <th>Dato</th>
                            <th>Type</th>
                            <th>Sats</th>
                            <th>Fratrekk Måltider</th>
                            <th>Sum</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.diet.forEach(diet => {
            const deductionText = (diet.deductions && diet.deductions.length > 0) ? diet.deductions.map(d => escapeHTML(d)).join(', ') : 'Ingen';
            html += `
                <tr>
                    <td>${escapeHTML(diet.date || '')}</td>
                    <td>${escapeHTML(diet.type || '')}</td>
                    <td>Kr ${formatCurrency(diet.rate || 0)}</td>
                    <td>${deductionText}</td>
                    <td>Kr ${formatCurrency(diet.total || 0)}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    // Utlegg (Expenses)
    if (data.expenses && data.expenses.length > 0) {
        html += `
            <h3>Utlegg</h3>
            <div class="table-responsive">
                <table class="expense-table">
                    <thead>
                        <tr>
                            <th>Dato</th>
                            <th>Beskrivelse</th>
                            <th>Beløp</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.expenses.forEach(exp => {
            html += `
                <tr>
                    <td>${escapeHTML(exp.date || '')}</td>
                    <td>${escapeHTML(exp.description || '')}</td>
                    <td>Kr ${formatCurrency(exp.amount || 0)}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    }

    // Grand Total
    html += `
        <div class="summary-row">
            <strong>Total sum til utbetaling:</strong>
            <strong>Kr ${formatCurrency(data.totals?.grandTotal || 0)}</strong>
        </div>
    `;

    // Signatures
    const sigSrc = data.signatureContent || data.signature;

    html += `
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>
                <p>Ansatt signatur</p>
                <div class="sig-box">
                    ${sigSrc ? `<img src="${sigSrc}" style="max-height:100%; max-width:100%;" alt="Signatur">` : ''}
                </div>
            </div>
            <div>
                <p>Godkjent av leder</p>
                <div class="sig-box"></div>
            </div>
        </div>
    </div>`;

    // Add Admin Action Footer if Admin
    if (currentCompany && currentCompany.role === 'admin') {
        html += `<div class="modal-footer" style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #ddd; padding-top: 15px;">`;
        if (report.status === 'innsendt') {
            html += `
                <button type="button" class="btn btn-danger" id="modal-btn-reject">Avvis</button>
                <button type="button" class="btn btn-success" id="modal-btn-approve">Godkjenn</button>
            `;
        } else if (report.status === 'godkjent') {
            html += `
                <button type="button" class="btn btn-info" id="modal-btn-pay">Marker som utbetalt</button>
            `;
        }
        html += `</div>`;
    }

    body.innerHTML = html;

    // Wire up Admin Actions
    if (currentCompany && currentCompany.role === 'admin') {
        const btnApprove = document.getElementById('modal-btn-approve');
        if (btnApprove) btnApprove.onclick = () => handleModalStatusUpdate(report.id, 'godkjent');

        const btnReject = document.getElementById('modal-btn-reject');
        if (btnReject) btnReject.onclick = () => rejectReport(report.id);

        const btnPay = document.getElementById('modal-btn-pay');
        if (btnPay) btnPay.onclick = () => handleModalStatusUpdate(report.id, 'utbetalt');
    }

    const btnEdit = document.getElementById('btn-modal-edit');
    if (btnEdit) {
        btnEdit.onclick = () => {
            window.location.href = 'index.html?load=true&id=' + report.id;
        };
    }

    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

async function handleModalStatusUpdate(reportId, newStatus) {
    await updateReportStatus(reportId, newStatus);
    const overlay = document.getElementById('report-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
}

async function renderDashboard() {
    const container = document.getElementById('dashboard-app');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>Krever innlogging</h2>
                <p>Du må være logget inn for å se bedriftsportalen.</p>
                <a href="index.html" class="btn btn-primary" style="text-decoration: none;">Gå til innlogging</a>
            </div>
        `;
        return;
    }

    try {
        const { data: memberData, error: memberError } = await supabaseClient
            .from('company_members')
            .select('role, companies(id, name, join_code)')
            .eq('user_id', currentUser.id)
            .single();

        if (memberError && memberError.code !== 'PGRST116') {
            console.error("Feil ved henting av firma:", memberError);
            container.innerHTML = `<div class="empty-state"><h3>En feil oppstod.</h3><p>${escapeHTML(memberError.message)}</p></div>`;
            return;
        }

        if (memberData && memberData.companies) {
            currentCompany = {
                company_id: memberData.companies.id,
                role: memberData.role,
                company_name: memberData.companies.name,
                join_code: memberData.companies.join_code
            };
        } else {
            currentCompany = null;
        }

        if (!currentCompany) {
            container.innerHTML = `
                <div class="dashboard-header">
                    <h1>Opprett eller bli med i et firma</h1>
                    <a href="index.html" class="btn btn-outline" style="text-decoration: none;">Tilbake til Reiseregning</a>
                </div>
                <div class="data-section">
                    <div class="grid-row" style="margin-top: 15px;">
                        <div class="form-group">
                            <label for="new-company-name">Opprett nytt firma</label>
                            <input type="text" id="new-company-name" placeholder="F.eks. Mitt Firma AS">
                            <button type="button" class="btn btn-primary" style="margin-top: 10px;" onclick="createCompany()">Opprett firma</button>
                        </div>
                        <div class="form-group">
                            <label for="join-company-code">Bli med i et firma</label>
                            <input type="text" id="join-company-code" placeholder="Oppgi 6-tegns kode">
                            <button type="button" class="btn btn-primary" style="margin-top: 10px;" onclick="joinCompany()">Bli med</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentCompany.role !== 'admin') {
            container.innerHTML = `

                <div class="dashboard-header">
                    <div>
                        <h1>${escapeHTML(currentCompany.company_name)}</h1>
                        <p style="color: #64748b; margin-top: 5px;">Rolle: Ansatt</p>
                    </div>
                    <a href="index.html" class="btn btn-outline" style="text-decoration: none;">Tilbake til Reiseregning</a>
                </div>

                <div class="stats-grid" id="emp-stats-container">
                    <div class="stat-card">
                        <h4>Venter på utbetaling</h4>
                        <p class="stat-value" id="stat-emp-pending">Laster...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Totalt utbetalt</h4>
                        <p class="stat-value" id="stat-emp-paid">Laster...</p>
                    </div>
                </div>

                <div class="data-section" id="emp-firma-info-section" style="display: none;">
                    <h3>Firma-info</h3>
                    <div id="emp-firma-info"></div>
                </div>

                <div class="data-section">
                    <h3>Dine innsendte reiseregninger</h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Navn på reise</th>
                                    <th>Sum</th>
                                    <th>Status</th>
                                    <th>Handling</th>
                                </tr>
                            </thead>
                            <tbody id="employee-reports-body">
                                <tr><td colspan="5">Laster...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            fetchEmployeeReports();
        } else {
            container.innerHTML = `
                <div class="dashboard-header">
                    <div>
                        <h1>${escapeHTML(currentCompany.company_name)}</h1>
                        <div style="margin-top: 10px;">
                            <span style="color: #64748b; font-size: 0.9rem; text-transform: uppercase; font-weight: bold;">Invitasjonskode:</span>
                            <div class="join-code-badge">
                                <strong>${escapeHTML(currentCompany.join_code)}</strong>
                                <button type="button" class="btn btn-outline btn-small" onclick="copyJoinCode()" style="padding: 2px 8px; font-size: 0.8rem; margin-left: 10px;">Kopier</button>
                            </div>
                        </div>
                    </div>
                    <a href="index.html" class="btn btn-outline" style="text-decoration: none;">Tilbake til Reiseregning</a>
                </div>

                <div class="stats-grid" id="admin-stats-container">
                    <div class="stat-card">
                        <h4>Totalt antall ansatte</h4>
                        <p class="stat-value" id="stat-members">...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Registrerte reiseregninger</h4>
                        <p class="stat-value" id="stat-reports">...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Total sum utbetalt</h4>
                        <p class="stat-value" id="stat-total-sum">...</p>
                    </div>
                </div>

                <div class="data-section">
                    <h3>Medlemmer</h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>E-post / Navn</th>
                                    <th>Rolle</th>
                                    <th>Til godkjenning</th>
                                    <th>Utestående beløp</th>
                                </tr>
                            </thead>
                            <tbody id="admin-members-body">
                                <tr><td colspan="2">Laster medlemmer...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="data-section">
                    <h3>Alle reiseregninger i firmaet</h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Dato</th>
                                    <th>Navn på reise</th>
                                    <th>Ansatt</th>
                                    <th>Sum</th>
                                    <th>Status</th>
                                    <th>Handling</th>
                                </tr>
                            </thead>
                            <tbody id="admin-reports-body">
                                <tr><td colspan="6">Laster rapporter...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            fetchAdminDashboardData();
        }
    } catch (e) {
        console.error("Feil ved rendring av bedriftsportal:", e);
        container.innerHTML = `<div class="empty-state"><h3>En feil oppstod.</h3><p>${escapeHTML(e.message)}</p></div>`;
    }
}

function copyJoinCode() {
    if (!currentCompany || !currentCompany.join_code) return;
    navigator.clipboard.writeText(currentCompany.join_code).then(() => {
        showToast("Kode kopiert til utklippstavlen: " + currentCompany.join_code, "success");
    }).catch(err => {
        console.error("Kunne ikke kopiere kode: ", err);
        showToast("Feil ved kopiering av kode.", "error");
    });
}

function generateJoinCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function createCompany() {
    if (!currentUser) return;
    const nameInput = document.getElementById('new-company-name').value.trim();
    if (!nameInput) {
        showToast("Vennligst skriv inn et firmanavn.", "error");
        return;
    }

    const btn = document.getElementById('btn-create-company');
    setLoadingState(btn, true);

    const joinCode = generateJoinCode();

    try {
        const { data, error } = await supabaseClient.rpc('create_company', {
            company_name: nameInput,
            new_join_code: joinCode,
            user_email: currentUser.email
        });

        if (error) throw error;

        showToast(`Firmaet "${nameInput}" er opprettet! Del koden ${joinCode} med dine ansatte.`, "success");
        renderDashboard();
    } catch (e) {
        console.error("Feil ved opprettelse av firma:", e);
        showToast("Feil: " + e.message, "error");
    } finally {
        setLoadingState(btn, false);
    }
}

async function joinCompany() {
    if (!currentUser) return;
    const codeInput = document.getElementById('join-company-code').value.trim().toUpperCase();
    if (!codeInput || codeInput.length !== 6) {
        showToast("Vennligst oppgi en gyldig 6-tegns kode.", "error");
        return;
    }

    const btn = document.getElementById('btn-join-company');
    setLoadingState(btn, true);

    try {
        const { data, error } = await supabaseClient.rpc('join_company', {
            code: codeInput,
            user_email: currentUser.email
        });

        if (error) {
            if (error.code === '23505') {
                showToast("Du er allerede medlem av et firma.", "error");
            } else {
                throw error;
            }
        } else {
            showToast(`Du er nå lagt til i selskapet!`, "success");
            renderDashboard();
        }
    } catch (e) {
        console.error("Feil ved innmelding:", e);
        showToast("Feil: " + e.message, "error");
    } finally {
        setLoadingState(btn, false);
    }
}

async function fetchEmployeeReports() {
    if (!currentUser || !currentCompany) return;

    const tbody = document.getElementById('employee-reports-body');
    if (!tbody) return;

    try {
        const { data: reports, error } = await supabaseClient
            .from('expense_reports')
            .select('created_at, trip_name, report_data, status, admin_comment')
            .eq('user_id', currentUser.id)
            .eq('company_id', currentCompany.company_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';
        if (!reports || reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Du har ikke sendt inn noen reiseregninger enda.</td></tr>';
            return;
        }


        let sumPending = 0;
        let sumPaid = 0;

        reports.forEach(r => {
            if (r.report_data && r.report_data.totals) {
                const total = r.report_data.totals.grandTotal;
                if (r.status === 'innsendt' || r.status === 'godkjent') {
                    sumPending += total;
                } else if (r.status === 'utbetalt') {
                    sumPaid += total;
                }
            }
        });

        const pendingEl = document.getElementById('stat-emp-pending');
        const paidEl = document.getElementById('stat-emp-paid');
        if (pendingEl) pendingEl.textContent = 'Kr ' + sumPending.toFixed(2).replace('.', ',');
        if (paidEl) paidEl.textContent = 'Kr ' + sumPaid.toFixed(2).replace('.', ',');

        // Fetch admins
        try {
            const { data: admins, error: adminsError } = await supabaseClient
                .from('company_members')
                .select('user_email')
                .eq('company_id', currentCompany.company_id)
                .eq('role', 'admin');

            if (!adminsError && admins && admins.length > 0) {
                const infoSection = document.getElementById('emp-firma-info-section');
                const infoDiv = document.getElementById('emp-firma-info');
                if (infoSection && infoDiv) {
                    infoSection.style.display = 'block';
                    let adminList = admins.map(a => escapeHTML(a.user_email || 'Ukjent')).join(', ');
                    infoDiv.innerHTML = `<p><strong>Firma:</strong> ${escapeHTML(currentCompany.company_name)}</p>
                                         <p><strong>Administratorer:</strong> ${adminList}</p>`;
                }
            }
        } catch (adminE) {
            console.error("Kunne ikke hente administratorer:", adminE);
        }

        reports.forEach(r => {
            r.employeeEmail = currentUser.email;

            const date = new Date(r.created_at).toLocaleDateString('no-NO');

            let grandTotal = '0,00';
            if (r.report_data && r.report_data.totals) {
                grandTotal = r.report_data.totals.grandTotal.toFixed(2).replace('.', ',');
            }

            const statusVal = r.status || 'utkast';
            let statusBadge = '';
            if (statusVal === 'utkast') statusBadge = '<span class="status-badge badge-draft">Utkast</span>';
            else if (statusVal === 'innsendt') statusBadge = '<span class="status-badge badge-submitted">Innsendt</span>';
            else if (statusVal === 'godkjent') statusBadge = '<span class="status-badge badge-approved">Godkjent</span>';
            else if (statusVal === 'utbetalt') statusBadge = '<span class="status-badge badge-paid">Utbetalt</span>';
                    else if (statusVal === 'avvist') statusBadge = '<span class="status-badge badge-rejected">Avvist</span>';

            const tr = document.createElement('tr');
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
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Feil ved henting av ansatt-rapporter:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--danger-color);">Feil ved lasting av rapporter.</td></tr>';
    }
}

async function fetchAdminDashboardData() {
    if (!currentCompany || currentCompany.role !== 'admin') return;

    const membersBody = document.getElementById('admin-members-body');
    const reportsBody = document.getElementById('admin-reports-body');
    const statMembers = document.getElementById('stat-members');
    const statReports = document.getElementById('stat-reports');
    const statSum = document.getElementById('stat-total-sum');

    try {
        // Fetch Members
        const { data: members, error: membersError } = await supabaseClient
            .from('company_members')
            .select('role, user_id, user_email')
            .eq('company_id', currentCompany.company_id);

        if (membersError) throw membersError;

        if (statMembers) statMembers.textContent = members ? members.length : 0;

        // Fetch Reports
        const { data: reports, error: reportsError } = await supabaseClient
            .from('expense_reports')
            .select('*')
            .eq('company_id', currentCompany.company_id)
            .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        if (statReports) statReports.textContent = reports ? reports.length : 0;

        let totalCompanySum = 0;

        const memberEmails = {};
        if (members) {
            members.forEach(m => {
                memberEmails[m.user_id] = m.user_email;
            });
        }

        if (reportsBody) {
            reportsBody.innerHTML = '';
            if (!reports || reports.length === 0) {
                reportsBody.innerHTML = '<tr><td colspan="6" class="empty-state">Ingen reiseregninger funnet.</td></tr>';
            } else {
                reports.forEach(r => {
                    r.employeeEmail = memberEmails[r.user_id] || '';

                    const date = new Date(r.created_at).toLocaleDateString('no-NO');
                    const empName = r.report_data?.personalInfo?.name || r.user_id.substring(0,8);

                    let grandTotal = 0;
                    let grandTotalStr = '0,00';
                    if (r.report_data && r.report_data.totals) {
                        grandTotal = r.report_data.totals.grandTotal;
                        grandTotalStr = grandTotal.toFixed(2).replace('.', ',');
                    }
                    totalCompanySum += grandTotal;

                    const statusVal = r.status || 'utkast';
                    let statusBadge = '';
                    if (statusVal === 'utkast') statusBadge = '<span class="status-badge badge-draft">Utkast</span>';
                    else if (statusVal === 'innsendt') statusBadge = '<span class="status-badge badge-submitted">Innsendt</span>';
                    else if (statusVal === 'godkjent') statusBadge = '<span class="status-badge badge-approved">Godkjent</span>';
                    else if (statusVal === 'utbetalt') statusBadge = '<span class="status-badge badge-paid">Utbetalt</span>';
                    else if (statusVal === 'avvist') statusBadge = '<span class="status-badge badge-rejected">Avvist</span>';

                    let actionButtons = `<button type="button" class="btn btn-outline btn-small btn-view">Se detaljer</button>`;
                    if (statusVal === 'innsendt') {
                        actionButtons += ` <button type="button" class="btn btn-primary btn-small btn-approve" data-id="${r.id}">Godkjenn</button>`;
                        actionButtons += ` <button type="button" class="btn btn-danger btn-small btn-reject-row" data-id="${r.id}">Avvis</button>`;
                    } else if (statusVal === 'godkjent') {
                        actionButtons += ` <button type="button" class="btn btn-success btn-small btn-pay" data-id="${r.id}">Utbetalt</button>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${date}</td>
                        <td>${escapeHTML(r.trip_name || 'Uten navn')}</td>
                        <td>${escapeHTML(empName)}</td>
                        <td>Kr ${grandTotalStr}</td>
                        <td>${statusBadge}</td>
                        <td>${actionButtons}</td>
                    `;

                    const btnView = tr.querySelector('.btn-view');
                    if (btnView) {
                        btnView.onclick = () => showReportModal(r);
                    }

                    const btnApprove = tr.querySelector('.btn-approve');
                    if (btnApprove) {
                        btnApprove.onclick = () => updateReportStatus(r.id, 'godkjent');
                    }
                    const btnReject = tr.querySelector('.btn-reject-row');
                    if (btnReject) {
                        btnReject.onclick = () => rejectReport(r.id);
                    }
                    const btnPay = tr.querySelector('.btn-pay');
                    if (btnPay) {
                        btnPay.onclick = () => updateReportStatus(r.id, 'utbetalt');
                    }

                    reportsBody.appendChild(tr);
                });
            }
        }

        if (statSum) statSum.textContent = 'Kr ' + totalCompanySum.toFixed(2).replace('.', ',');

        // Render Members
        if (membersBody) {
            membersBody.innerHTML = '';
            if (!members || members.length === 0) {
                membersBody.innerHTML = '<tr><td colspan="2" class="empty-state">Ingen medlemmer funnet.</td></tr>';
            } else {
                members.forEach(m => {
                    let display = m.user_email;
                    if (!display && m.user_id === currentUser.id) {
                        display = currentUser.email;
                    }
                    if (!display) {
                        display = m.user_id.substring(0, 8) + '...';
                    }

                    let tilGodkjenning = 0;
                    let utestaende = 0;
                    if (reports) {
                        reports.forEach(r => {
                            if (r.user_id === m.user_id) {
                                if (r.status === 'innsendt') {
                                    tilGodkjenning++;
                                }
                                if ((r.status === 'innsendt' || r.status === 'godkjent') && r.report_data && r.report_data.totals) {
                                    utestaende += r.report_data.totals.grandTotal;
                                }
                            }
                        });
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHTML(display)}</td>
                        <td>${m.role === 'admin' ? 'Administrator' : 'Ansatt'}</td>
                        <td>${tilGodkjenning}</td>
                        <td>Kr ${utestaende.toFixed(2).replace('.', ',')}</td>
                    `;
                    membersBody.appendChild(tr);
                });
            }
        }
    } catch (e) {
        console.error("Feil ved lasting av admin data:", e);
        if (membersBody) membersBody.innerHTML = '<tr><td colspan="2" style="color:var(--danger-color);">Feil ved lasting.</td></tr>';
        if (reportsBody) reportsBody.innerHTML = '<tr><td colspan="6" style="color:var(--danger-color);">Feil ved lasting.</td></tr>';
    }
}

async function updateReportStatus(reportId, newStatus) {
    try {
        const { error } = await supabaseClient
            .from('expense_reports')
            .update({ status: newStatus })
            .eq('id', reportId);

        if (error) throw error;

        showToast(`Status oppdatert til ${newStatus}.`, "success");
        fetchAdminDashboardData();
    } catch (e) {
        console.error("Feil ved oppdatering av status:", e);
        showToast(`Feil ved oppdatering av status: ${e.message}`, "error");
    }
}


async function rejectReport(reportId) {
    const comment = await showPrompt("Skriv en begrunnelse for avvisning (påkrevd):");
    if (!comment || comment.trim() === '') {
        showToast("Begrunnelse er påkrevd for å avvise.", "error");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('expense_reports')
            .update({ status: 'avvist', admin_comment: comment })
            .eq('id', reportId);

        if (error) throw error;

        showToast("Reiseregning avvist.", "success");
        if (currentCompany && currentCompany.role === 'admin') {
            fetchAdminDashboardData();
        }

        // Hide modal if open
        const overlay = document.getElementById('report-modal-overlay');
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
        }

    } catch (e) {
        console.error("Feil ved avvisning:", e);
        showToast(`Feil ved avvisning: ${e.message}`, "error");
    }
}
