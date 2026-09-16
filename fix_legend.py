with open('dashboard.js', 'r') as f:
    content = f.read()

legend_original = "<strong>Statusforklaring:</strong> Innsendt (Venter på godkjenning) &rarr; Godkjent (Venter på utbetaling) &rarr; Utbetalt (Ferdig behandlet)"
legend_replacement = "<strong>Statusforklaring:</strong> Innsendt (Venter på godkjenning) &rarr; Godkjent (Venter på utbetaling) &rarr; Utbetalt (Ferdig behandlet)<br><span style=\"font-size: 0.85rem; color: #64748b;\">Trukket tilbake (Kansellert av ansatt)</span>"

new_content = content.replace(legend_original, legend_replacement)

with open('dashboard.js', 'w') as f:
    f.write(new_content)
