# Supabase Integration Guide for Reiseregning App

Here is the step-by-step guide to integrate Supabase into your Vanilla JS app.

## Step 1 - Setup

**1. Include the Supabase JS client in `index.html`**
Add the following CDN script tag inside the `<head>` of your `index.html` file:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**2. Initialize Supabase in `script.js`**
Add this at the very top of your `script.js` file:

```javascript
// Erstatt disse med dine egne nøkler fra Supabase Dashboard
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
```

---

## Step 2 - Auth

**1. Add the HTML for Auth in `index.html`**
You can add this section right above your `expense-form` or anywhere suitable in `index.html`:

```html
<section class="card" id="auth-section">
    <h2>Logg inn / Registrer deg</h2>
    <div class="grid-row">
        <div class="form-group">
            <label for="auth-email">E-post</label>
            <input type="email" id="auth-email" placeholder="din@epost.no">
        </div>
        <div class="form-group">
            <label for="auth-password">Passord</label>
            <input type="password" id="auth-password" placeholder="Passord">
        </div>
    </div>
    <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button type="button" class="btn btn-primary" onclick="signUp()">Registrer deg</button>
        <button type="button" class="btn btn-outline" onclick="logIn()">Logg inn</button>
        <button type="button" class="btn btn-outline" onclick="logOut()">Logg ut</button>
    </div>
    <p id="auth-status" style="margin-top: 15px; font-weight: bold;"></p>
</section>
```

**2. Add the Auth logic in `script.js`**
Add these functions to handle authentication:

```javascript
async function signUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert("Fyll inn e-post og passord.");

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert("Feil ved registrering: " + error.message);
    else {
        alert("Sjekk e-posten din for bekreftelseslenke!");
        checkAuthStatus();
    }
}

async function logIn() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) return alert("Fyll inn e-post og passord.");

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Feil ved innlogging: " + error.message);
    else {
        alert("Logget inn med suksess!");
        checkAuthStatus();
    }
}

async function logOut() {
    await supabaseClient.auth.signOut();
    alert("Du er logget ut.");
    checkAuthStatus();
}

async function checkAuthStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const statusEl = document.getElementById('auth-status');
    if (user) {
        statusEl.textContent = "Logget inn som: " + user.email;
        statusEl.style.color = "green";
    } else {
        statusEl.textContent = "Ikke logget inn.";
        statusEl.style.color = "red";
    }
}

// Ensure you call checkAuthStatus on page load
// Find your existing DOMContentLoaded listener and add `checkAuthStatus();` inside it.
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus(); // <--- Add this line
    // ... rest of your existing initialization code
});
```

---

## Step 3 - Database Plan

To securely store the expense reports, you need to create a table in the Supabase Dashboard.

1. Go to your **Supabase Dashboard** -> **Table Editor** -> **Create a new table**.
2. **Name**: `expense_reports`
3. **Enable Row Level Security (RLS)**: Check this option (important for security).
4. Create the following **Columns**:
   - `id`: `uuid` (Primary Key, Default Value: `gen_random_uuid()`)
   - `user_id`: `uuid` (Foreign Key -> links to `users` table in `auth` schema, Default: `auth.uid()`)
   - `trip_name`: `text` (To store the name of the trip)
   - `report_data`: `jsonb` (To store the entire nested expense data easily)
   - `created_at`: `timestampz` (Default: `now()`)

**Set up Security Policies (Row Level Security - RLS):**
After creating the table, go to the **Authentication** -> **Policies** page in Supabase, and create a policy for the `expense_reports` table so users can only see and edit their own reports:
- **Policy Name**: `Enable full access for users based on user_id`
- **Target Roles**: `authenticated`
- **USING expression**: `auth.uid() = user_id`
- **WITH CHECK expression**: `auth.uid() = user_id`

---

## Step 4 - Saving data

Update your existing `saveExpenseReport` function in `script.js` to save data to Supabase instead of `localStorage`.

*Note: You can replace the entire existing `saveExpenseReport` function with this new cloud-based version.*

```javascript
async function saveExpenseReport() {
    // 1. Sjekk om brukeren er logget inn
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Du må være logget inn for å lagre i skyen.");
        return;
    }

    const fullData = collectFormData();
    const tripName = prompt("Gi reisen et navn (for organisering):", `Reise ${new Date().toLocaleDateString('no-NO')}`);
    if (!tripName) return;

    // Fjerner bilde-data for å unngå for store databasetransaksjoner
    const safeDataToSave = {
        ...fullData,
        receipts: [],
        signatureContent: null
    };

    try {
        // 2. Lagre til Supabase i stedet for localStorage
        const { data, error } = await supabaseClient
            .from('expense_reports')
            .insert([
                {
                    user_id: user.id, // Knytter rapporten til innlogget bruker
                    trip_name: tripName,
                    report_data: safeDataToSave
                }
            ]);

        if (error) throw error;

        alert(`Reiseregning er lagret under "${tripName}" i skyen!`);
    } catch (error) {
        console.error("Feil ved lagring til Supabase", error);
        alert("Kunne ikke lagre reiseregningen: " + error.message);
    }
}
```
