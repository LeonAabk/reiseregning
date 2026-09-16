## Plan
1. **Fix the "Ukjent" Bug**:
   - In `dashboard.js`, when fetching admins, extract `user_email`. If `user_email` is missing, ensure it defaults nicely, but we will fix the filter/map logic so that we don't display "Ukjent" if there is an email. It seems the mapping right now uses `escapeHTML(a.user_email || 'Ukjent')`. Wait, the prompt says: "Ensure you are querying the `company_members` table for the current `company_id` where `role` equals 'admin', extracting the `user_email`, and updating the DOM element correctly AFTER the data is loaded. Do not skip this."
   - The bug is likely that the DOM element might be rendered with "Ukjent" *before* the data is fetched or that the logic uses the wrong variable.
   - Wait, `dashboard.js` line 618-648 fetches `company_members` and then extracts admins:
     ```javascript
     const admins = currentCompanyMembers.filter(m => m.role === 'admin');
     ```
     This looks fine. However, in `dashboard.js`, there's another place where we render "Ukjent" perhaps? Or the initial rendering of `emp-firma-info-section` happens *before* the `fetchEmployeeReports` function runs, and the `fetchEmployeeReports` function is where we fetch `company_members`. But wait, in `dashboard.js` the `currentCompanyMembers` is an empty array initially?
     Let me check if there's any other place we render "Ukjent" for administrators.
   - Ah, maybe `a.user_email` is just null because the user didn't have one when they joined, or the current code does `escapeHTML(a.user_email || 'Ukjent')` and `user_email` is actually null, resulting in 'Ukjent'.
   - BUT, the prompt explicitly states: "Ensure you are querying the `company_members` table for the current `company_id` where `role` equals 'admin', extracting the `user_email`, and updating the DOM element correctly AFTER the data is loaded." I will make sure the fetch is explicitly performed (it seems to be in `try { ... }` block), and then the DOM is updated.
   - I should check if the admin's email can be retrieved by an inner query or if I just need to explicitly wait for `currentCompanyMembers` to be fully loaded and matched.

2. **Employee "Trekk tilbake" (Withdraw) Button**:
   - In `fetchEmployeeReports()` inside `dashboard.js`, for reports with status `innsendt`, add a secondary button `<button class="btn btn-warning btn-small btn-withdraw" data-id="${r.id}">Trekk tilbake</button>` next to "Se detaljer".
   - Wire up `btn-withdraw` to update the report's status to `kansellert`.
   - Add a success toast upon successful withdrawal.
   - Add `badge-cancelled` class in `style.css` (gray/neutral).
   - In the employee legend (I need to find where the legend is in `dashboard.js`), add "Trukket tilbake (Kansellert av ansatt)".

3. **Employee "Rediger utkast" (Edit Draft) Flow**:
   - In `fetchEmployeeReports()` inside `dashboard.js`, if a report has status `kansellert` or `avvist`, add a button `<button class="btn btn-primary btn-small btn-edit-draft" data-id="${r.id}">Gjør endringer</button>`.
   - When clicked, update status back to `utkast` in Supabase, then do `window.location.href = 'index.html?load=true&id=' + r.id`.

4. **Admin Read-Only & Filter Handling**:
   - In `fetchAdminDashboardData()` (inside `dashboard.js`), admins should see reports with `kansellert` status.
   - Hide the action buttons ("Godkjenn", "Avvis", "Utbetalt") for `kansellert` reports.
   - Add "Kansellert" to the Admin's status filter `<select id="filter-status">` inside `dashboard.js` (line 454).

5. **Pre-commit step**:
   - Ensure proper testing, verification, review, and reflection are done.

6. **Submit**:
   - Submit the change.
