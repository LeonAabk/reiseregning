import re

with open('style.css', 'r') as f:
    content = f.read()

# Add margin top to workspace-group-container for better spacing
css_append = """
/* Profile og Workspace */
.profile-card { background: #f8fafc; border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border-color); }
.profile-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
.profile-info { display: flex; align-items: center; gap: 15px; }
.profile-avatar { width: 50px; height: 50px; border-radius: 50%; background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; text-transform: uppercase; }
.profile-actions { display: flex; gap: 10px; }

.workspace-toggle-container { background: white; padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); }
.workspace-tabs { display: flex; gap: 5px; background: #f1f5f9; padding: 5px; border-radius: var(--radius-md); }
.workspace-tab { flex: 1; padding: 10px; border: none; background: transparent; border-radius: var(--radius-sm); font-weight: bold; color: #64748b; cursor: pointer; transition: all var(--transition-speed); }
.workspace-tab.active { background: white; color: var(--accent-color); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.workspace-tab:hover:not(.active) { background: #e2e8f0; }

.workspace-group-container { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s ease-in-out; overflow: hidden; margin-top: 15px;}
.workspace-group-container.hidden { grid-template-rows: 0fr; margin-top: 0; }
.workspace-group-inner { min-height: 0; }

.btn-hideable { transition: all 0.3s ease-in-out; overflow: hidden; }
.btn-hideable.hidden { max-width: 0; padding-left: 0; padding-right: 0; opacity: 0; margin-left: 0; margin-right: 0; border: none; }
"""

content = content + css_append

with open('style.css', 'w') as f:
    f.write(content)
