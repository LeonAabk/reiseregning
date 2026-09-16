with open('dashboard.js', 'r') as f:
    content = f.read()

dropdown_original = """                                    <option value="utbetalt">Utbetalt</option>
                                    <option value="avvist">Avvist</option>
                                    <option value="utkast">Utkast</option>
                                </select>"""

dropdown_replacement = """                                    <option value="utbetalt">Utbetalt</option>
                                    <option value="avvist">Avvist</option>
                                    <option value="utkast">Utkast</option>
                                    <option value="kansellert">Kansellert</option>
                                </select>"""

new_content = content.replace(dropdown_original, dropdown_replacement)

# Make sure admin action buttons are NOT shown for kansellert. The current logic checks `statusVal === 'innsendt'` or `godkjent`, `utbetalt`, `avvist`, so `kansellert` defaults to showing nothing. Wait, `['godkjent', 'utbetalt', 'avvist'].includes(statusVal)` adds the "Angre" button. So kansellert will just not get the Angre button. This is correct as they shouldn't have action buttons.

# Let's verify the employee dashboard status legend logic in dashboard.js
# Searching for the word "legende" or something similar in dashboard.js to update the legend
with open('dashboard.js', 'w') as f:
    f.write(new_content)
