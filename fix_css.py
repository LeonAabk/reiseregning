with open('style.css', 'r') as f:
    content = f.read()

badge_str = ".badge-rejected { background: #fee2e2; color: #b91c1c; }\n.badge-cancelled { background: #f3f4f6; color: #4b5563; }"

content = content.replace(".badge-rejected { background: #fee2e2; color: #b91c1c; }", badge_str)

with open('style.css', 'w') as f:
    f.write(content)
