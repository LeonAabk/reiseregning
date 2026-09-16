with open('dashboard.js', 'r') as f:
    content = f.read()

# I need to update handleEditDraft to save the report data into localStorage first
old_handle_edit = """async function handleEditDraft(reportId) {
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
}"""

new_handle_edit = """async function handleEditDraft(reportId) {
    try {
        // Fetch the report data to put it into localStorage
        const { data: reportData, error: fetchError } = await supabaseClient
            .from('expense_reports')
            .select('report_data')
            .eq('id', reportId)
            .single();

        if (fetchError) throw fetchError;
        if (!reportData || !reportData.report_data) {
            throw new Error("Kunne ikke hente reiseregningens data.");
        }

        const { error: updateError } = await supabaseClient
            .from('expense_reports')
            .update({ status: 'utkast' })
            .eq('id', reportId);

        if (updateError) throw updateError;

        // Ensure id is stored in report_data so it knows which db record to update when resubmitting
        const dataToSave = reportData.report_data;
        dataToSave.dbId = reportId; // Assuming script.js checks for dbId or something?

        localStorage.setItem('tempLoadTrip', JSON.stringify(dataToSave));

        window.location.href = `index.html?load=true`;
    } catch (e) {
        console.error("Feil ved endring av status til utkast:", e);
        showToast("Kunne ikke endre status for redigering.", "error");
    }
}"""

new_content = content.replace(old_handle_edit, new_handle_edit)

with open('dashboard.js', 'w') as f:
    f.write(new_content)
