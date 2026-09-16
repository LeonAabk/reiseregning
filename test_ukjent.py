with open('dashboard.js', 'r') as f:
    js_content = f.read()

# Replace the bug logic
new_js_content = js_content.replace(
    "let adminList = admins.map(a => escapeHTML(a.user_email || 'Ukjent')).join(', ');",
    """let adminList = admins.map(a => {
                        let email = a.user_email;
                        if (!email) {
                            console.warn("Mangler user_email for admin", a);
                        }
                        return escapeHTML(email || 'Ukjent');
                    }).filter(a => a !== 'Ukjent').join(', ');
                    if (adminList === '') adminList = 'Ukjent';"""
)

with open('dashboard.js', 'w') as f:
    f.write(new_js_content)
