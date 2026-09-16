import re

with open('script.js', 'r') as f:
    js_content = f.read()

original_insert = """        const { data, error } = await supabaseClient
            .from('expense_reports')
            .insert([payload]);"""

replacement_insert = """        // Check if we are updating an existing report
        let reportId = fullData.dbId;
        let response;
        if (reportId) {
            response = await supabaseClient
                .from('expense_reports')
                .update(payload)
                .eq('id', reportId);
        } else {
            response = await supabaseClient
                .from('expense_reports')
                .insert([payload]);
        }
        const { data, error } = response;"""

new_content = js_content.replace(original_insert, replacement_insert)

with open('script.js', 'w') as f:
    f.write(new_content)
