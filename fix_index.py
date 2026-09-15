import re

with open('index.html', 'r') as f:
    content = f.read()

header_replace = """        <header class="main-header card">
            <h1>Reiseregning 2026</h1>
            <div class="header-actions">
                <div class="action-group">
                    <button type="button" id="btn-submit-expense" class="btn btn-primary btn-hideable" onclick="submitExpenseReport()">Send inn til godkjenning</button>
                    <button type="button" id="btn-save-expense" class="btn btn-outline" onclick="saveExpenseReport()">Lagre Reise</button>
                </div>
                <div class="action-group">
                    <button type="button" class="btn btn-outline-success" onclick="previewExpenseReport()">Forhåndsvis PDF</button>
                    <button type="button" class="btn btn-outline-success" onclick="exportToCSV()">Last ned CSV</button>
                </div>
                <div class="action-group">
                    <button type="button" id="btn-show-saved" class="btn btn-ghost" onclick="showSavedReports()">Lagrede Reiser</button>
                    <button type="button" class="btn btn-ghost" onclick="showHelpModal()">Hvordan bruke appen?</button>
                </div>
            </div>
        </header>

        <section class="card" id="auth-section">
            <div id="auth-logged-out">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h2>Konto og Innlogging</h2>
                    </div>
                </div>
                <p style="margin-top: 15px; margin-bottom: 15px;">Logg inn for å kunne lagre reiseregningene dine sikkert i skyen.</p>
                <div class="grid-row">
                    <div class="form-group"><label for="auth-email">E-post</label><input type="email" id="auth-email" placeholder="Din e-postadresse"></div>
                    <div class="form-group"><label for="auth-password">Passord</label><input type="password" id="auth-password" placeholder="Ditt passord"></div>
                </div>
                <div style="margin-top: 15px;">
                    <button type="button" id="btn-login" class="btn btn-primary" onclick="logIn()">Logg inn</button>
                    <button type="button" id="btn-signup" class="btn btn-outline" onclick="signUp()">Registrer</button>
                </div>
                <div id="auth-message" style="margin-top: 10px; color: var(--danger-color);"></div>
            </div>

            <div id="auth-logged-in" class="profile-card" style="display: none;">
                <div class="profile-header">
                    <div class="profile-info">
                        <div id="profile-avatar" class="profile-avatar"></div>
                        <div>
                            <h2 style="margin-bottom: 0;">Min Profil</h2>
                            <p style="margin: 0; color: #64748b;">Logget inn som: <strong id="auth-user-email"></strong></p>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button type="button" class="btn btn-ghost" onclick="savePersonalInfo()">Lagre Personinfo</button>
                        <button type="button" class="btn btn-outline" onclick="logOut()">Logg ut</button>
                    </div>
                </div>

                <div class="workspace-toggle-container" style="margin-top: 20px;">
                    <label style="margin-bottom: 10px; display: block;">Velg arbeidsmodus:</label>
                    <div class="workspace-tabs">
                        <button type="button" id="tab-private" class="workspace-tab" onclick="setWorkspaceMode('privatperson')">
                            Bruk som: Privatperson
                        </button>
                        <button type="button" id="tab-company" class="workspace-tab" onclick="setWorkspaceMode('bedrift')">
                            Bruk som: Ansatt i bedrift
                        </button>
                    </div>
                    <p id="workspace-description" style="font-size: 0.85rem; color: #64748b; margin-top: 10px; min-height: 20px;">
                    </p>
                </div>

                <div id="bedriftsportal-action" class="btn-hideable" style="margin-top: 15px; display: none;">
                    <a href="dashboard.html" class="btn btn-primary" style="text-decoration: none;">Åpne Bedriftsportal (Admin)</a>
                </div>
            </div>
        </section>

        <form id="expense-form" onsubmit="event.preventDefault();">
            <section class="card">
                <h2>1. Personopplysninger</h2>
                <div class="grid-row">
                    <div class="form-group"><label for="emp-name">Navn</label><input type="text" id="emp-name" required></div>
                </div>

                <div id="workspace-fields" class="workspace-group-container">
                    <div class="workspace-group-inner">
                        <div class="grid-row" style="margin-bottom: 0;">
                            <div class="form-group"><label for="emp-company">Firma / Selskap</label><input type="text" id="emp-company" placeholder="F.eks. Mitt Firma AS"></div>
                            <div class="form-group"><label for="emp-id">Ansattnr</label><input type="text" id="emp-id"></div>
                            <div class="form-group"><label for="emp-dept">Avdeling</label><input type="text" id="emp-dept"></div>
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 15px;"><label for="emp-addr">Adresse</label><input type="text" id="emp-addr"></div>
            </section>"""

search_block = """        <header class="main-header card">
            <h1>Reiseregning 2026</h1>
            <div class="header-actions">
                <div class="action-group">
                    <button type="button" id="btn-submit-expense" class="btn btn-primary" onclick="submitExpenseReport()">Send inn til godkjenning</button>
                    <button type="button" id="btn-save-expense" class="btn btn-outline" onclick="saveExpenseReport()">Lagre Reise</button>
                </div>
                <div class="action-group">
                    <button type="button" class="btn btn-outline-success" onclick="previewExpenseReport()">Forhåndsvis PDF</button>
                    <button type="button" class="btn btn-outline-success" onclick="exportToCSV()">Last ned CSV</button>
                </div>
                <div class="action-group">
                    <button type="button" id="btn-show-saved" class="btn btn-ghost" onclick="showSavedReports()">Lagrede Reiser</button>
                    <button type="button" class="btn btn-ghost" onclick="savePersonalInfo()">Lagre Personinfo</button>
                    <button type="button" class="btn btn-ghost" onclick="showHelpModal()">Hvordan bruke appen?</button>
                </div>
            </div>
        </header>

        <section class="card" id="auth-section">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h2>Konto og Innlogging</h2>
                </div>
                <div>
                    <a href="dashboard.html" class="btn btn-primary" style="text-decoration: none;">Åpne Bedriftsportal (Admin)</a>
                </div>
            </div>

            <div id="auth-logged-out" style="margin-top: 15px;">
                <p style="margin-bottom: 15px;">Logg inn for å kunne lagre reiseregningene dine sikkert i skyen.</p>
                <div class="grid-row">
                    <div class="form-group"><label for="auth-email">E-post</label><input type="email" id="auth-email" placeholder="Din e-postadresse"></div>
                    <div class="form-group"><label for="auth-password">Passord</label><input type="password" id="auth-password" placeholder="Ditt passord"></div>
                </div>
                <div style="margin-top: 15px;">
                    <button type="button" id="btn-login" class="btn btn-primary" onclick="logIn()">Logg inn</button>
                    <button type="button" id="btn-signup" class="btn btn-outline" onclick="signUp()">Registrer</button>
                </div>
                <div id="auth-message" style="margin-top: 10px; color: var(--danger-color);"></div>
            </div>
            <div id="auth-logged-in" style="display: none; margin-top: 15px;">
                <p>Logget inn som: <strong id="auth-user-email"></strong></p>
                <button type="button" class="btn btn-outline" style="margin-top: 10px;" onclick="logOut()">Logg ut</button>
            </div>
        </section>

        <form id="expense-form" onsubmit="event.preventDefault();">
            <section class="card">
                <h2>1. Personopplysninger</h2>
                <div class="grid-row">
                    <div class="form-group"><label for="emp-company">Firma / Selskap</label><input type="text" id="emp-company" placeholder="F.eks. Mitt Firma AS"></div>
                    <div class="form-group"><label for="emp-name">Navn</label><input type="text" id="emp-name" required></div>
                    <div class="form-group"><label for="emp-id">Ansattnr</label><input type="text" id="emp-id"></div>
                    <div class="form-group"><label for="emp-dept">Avdeling</label><input type="text" id="emp-dept"></div>
                </div>
                <div class="form-group"><label for="emp-addr">Adresse</label><input type="text" id="emp-addr"></div>
            </section>"""

content = content.replace(search_block, header_replace)

with open('index.html', 'w') as f:
    f.write(content)
