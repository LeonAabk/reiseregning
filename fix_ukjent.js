const fs = require('fs');
let dashboard = fs.readFileSync('dashboard.js', 'utf8');
let match = dashboard.match(/let adminList = admins\.map\(a => escapeHTML\(a\.user_email \|\| 'Ukjent'\)\)\.join\(\', \'\);/);
console.log(match ? "Found match at index " + match.index : "Not found");
