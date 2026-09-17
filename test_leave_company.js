const fs = require('fs');

let confirmCalled = false;
let confirmResult = true;
global.confirm = (msg) => {
    confirmCalled = true;
    if (msg !== "Er du sikker på at du vil forlate firmaet? Du vil miste tilgangen til bedriftsportalen.") {
        throw new Error("Wrong confirm message: " + msg);
    }
    return confirmResult;
};

let deleteCalled = false;
global.supabaseClient = {
    from: (table) => {
        if (table !== 'company_members') throw new Error("Wrong table: " + table);
        return {
            delete: () => {
                return {
                    eq: (col, val) => {
                        if (col !== 'user_id' || val !== 'user123') throw new Error("Wrong condition: " + col + "=" + val);
                        deleteCalled = true;
                        return Promise.resolve({ error: null });
                    }
                }
            }
        }
    }
};

global.currentUser = { id: 'user123' };
global.currentCompany = { role: 'ansatt', company_name: 'Test AS' };
global.currentCompanyMembers = [{ user_id: 'user123' }];
global.showToast = (msg, type) => { console.log("Toast:", msg, type); };
global.window = { location: { href: '' } };

const code = fs.readFileSync('dashboard.js', 'utf8');

const funcMatch = code.match(/window\.leaveCompany = async \(\) => {[\s\S]*?};/);
if (funcMatch) {
    eval(funcMatch[0]);
} else {
    throw new Error("Could not find window.leaveCompany in dashboard.js");
}

(async () => {
    console.log("Testing leaveCompany with confirm = true");
    await global.window.leaveCompany();

    if (!confirmCalled) throw new Error("Confirm was not called");
    if (!deleteCalled) throw new Error("Supabase delete was not called");
    if (global.currentCompany !== null) throw new Error("currentCompany not cleared");
    if (global.currentCompanyMembers.length !== 0) throw new Error("currentCompanyMembers not cleared");
    if (global.window.location.href !== 'index.html') throw new Error("Window location not set to index.html, was: " + global.window.location.href);

    console.log("Success: leaveCompany worked as expected!");
})();