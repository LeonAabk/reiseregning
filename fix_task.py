import re

with open('dashboard.js', 'r') as f:
    js_content = f.read()

# 1. FIX The "Ukjent" Bug
# Current logic:
# let adminList = admins.map(a => escapeHTML(a.user_email || 'Ukjent')).join(', ');
js_content = js_content.replace(
    "let adminList = admins.map(a => escapeHTML(a.user_email || 'Ukjent')).join(', ');",
    "let adminList = admins.map(a => escapeHTML(a.user_email || 'Ukjent')).filter(a => a !== 'Ukjent').join(', ');\n                    if (adminList === '') {\n                        adminList = 'Ukjent';\n                    }"
)
# Wait, the bug might be that `a.user_email` is undefined. Looking at `supabase_setup.sql`, `user_email` is added to `company_members`. But wait, the task says:
# "Ensure you are querying the company_members table for the current company_id where role equals 'admin', extracting the user_email, and updating the DOM element correctly AFTER the data is loaded. Do not skip this."
