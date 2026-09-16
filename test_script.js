let file = require('fs').readFileSync('dashboard.js', 'utf8');

// Looking at how the report list is built in `fetchEmployeeReports`
let match = file.match(/statusVal === 'avvist'\) statusBadge = '<span class="status-badge badge-rejected">Avvist<\/span>';/g);
console.log("Employee report match:", match);

// And Admin:
match = file.match(/statusVal === 'avvist'\) statusBadge = '<span class="status-badge badge-rejected">Avvist<\/span>';/g);
console.log("Admin report match:", match);
