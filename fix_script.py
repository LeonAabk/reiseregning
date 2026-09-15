import re

with open('script.js', 'r') as f:
    content = f.read()

workspace_logic = """
let currentWorkspaceMode = localStorage.getItem('workspaceMode') || 'bedrift';

function setWorkspaceMode(mode) {
    currentWorkspaceMode = mode;
    localStorage.setItem('workspaceMode', mode);
    updateWorkspaceUI();
}

function updateWorkspaceUI() {
    // Tab active states
    document.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));

    const desc = document.getElementById('workspace-description');
    const container = document.getElementById('workspace-fields');
    const submitBtn = document.getElementById('btn-submit-expense');
    const portalBtn = document.getElementById('bedriftsportal-action');

    if (currentWorkspaceMode === 'privatperson') {
        const tab = document.getElementById('tab-private');
        if (tab) tab.classList.add('active');
        if (desc) desc.textContent = "Du bruker appen som privatperson. Selskap-spesifikke felt og knapper er skjult. Du kan eksportere og skrive ut reiseregningen som vanlig.";
        if (container) container.classList.add('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        if (portalBtn) portalBtn.style.display = 'none';
    } else {
        const tab = document.getElementById('tab-company');
        if (tab) tab.classList.add('active');
        if (desc) desc.textContent = "Du bruker appen som ansatt. Bedriftsportal for admin og innsending av reiseregninger er aktivert.";
        if (container) container.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        if (portalBtn && currentUser) portalBtn.style.display = 'block'; // Only show if logged in
    }
}
"""

content = re.sub(r'(const RATES =.*?;\n\n)', r'\1' + workspace_logic + '\n', content, flags=re.DOTALL)

def replace_first_function(content, func_name, new_code):
    pattern = r'function\s+' + func_name + r'\s*\([^)]*\)\s*\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}'

    # Simple nested curly brace matcher
    start = content.find(f"function {func_name}")
    if start == -1: return content

    brace_count = 0
    end = -1
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i + 1
                break

    if end != -1:
        return content[:start] + new_code + content[end:]
    return content


auth_update_logic = """function updateAuthUI() {
    const loggedOutDiv = document.getElementById('auth-logged-out');
    const loggedInDiv = document.getElementById('auth-logged-in');
    const userEmailSpan = document.getElementById('auth-user-email');
    const avatarDiv = document.getElementById('profile-avatar');

    if (currentUser) {
        if (loggedOutDiv) loggedOutDiv.style.display = 'none';
        if (loggedInDiv) loggedInDiv.style.display = 'block';
        if (userEmailSpan) userEmailSpan.textContent = currentUser.email;

        // Update initials
        if (avatarDiv) {
            avatarDiv.textContent = currentUser.email.substring(0, 2).toUpperCase();
        }
    } else {
        if (loggedOutDiv) loggedOutDiv.style.display = 'block';
        if (loggedInDiv) loggedInDiv.style.display = 'none';
        if (userEmailSpan) userEmailSpan.textContent = '';
    }

    updateWorkspaceUI();
}"""

content = replace_first_function(content, 'updateAuthUI', auth_update_logic)

init_logic = """    initAuth(supabaseClient, (user) => {
        currentUser = user;
        updateAuthUI();
    });

    updateWorkspaceUI();"""

# Re-adding this simple regex
content = re.sub(r'initAuth\(supabaseClient, \(user\) => \{.*?\}\);', init_logic, content, flags=re.DOTALL)


# 4. Modify previewExpenseReport to handle the workspace
preview_replace = """    const isPrivate = typeof currentWorkspaceMode !== 'undefined' && currentWorkspaceMode === 'privatperson';
    const companyHeader = isPrivate ? '' : `<div style="text-align:right"><strong>${escapeHTML(data.personalInfo.company) || 'Ikke oppgitt firma'}</strong><p>Ref: ${escapeHTML(data.personalInfo.id) || '-'}</p></div>`;
    const employeeDept = isPrivate ? '' : ` | <strong>Avdeling:</strong> ${escapeHTML(data.personalInfo.department)}`;

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
                        ${companyHeader}
                    </div>
                    <div class="employee-section">
                        <h3>Ansattinformasjon</h3>
                        <p><strong>Navn:</strong> ${escapeHTML(data.personalInfo.name)}${employeeDept}</p>
                        <p><strong>Adresse:</strong> ${escapeHTML(data.personalInfo.address)}</p>
                    </div>"""

search_block = """    const modal = document.createElement('div');
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
                    </div>"""

content = content.replace(search_block, preview_replace)


with open('script.js', 'w') as f:
    f.write(content)
