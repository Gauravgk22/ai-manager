const APP_CONFIG = { appName: 'Multi-AI Manager', version: '2.3.0', defaultTimeLimit: 120 };
const state = { isFirstTime: false, currentView: 'dashboard', currentUser: null, data: { accounts: [], projects: [] } };

function getUserKey(e) { return 'aim-data-' + btoa(e).substring(0, 20); }
function getUsers() { return JSON.parse(localStorage.getItem('aim-users') || '[]'); }
function saveUsers(u) { localStorage.setItem('aim-users', JSON.stringify(u)); }

function loadData() {
    if (state.currentUser) { var s = localStorage.getItem(getUserKey(state.currentUser)); state.data = s ? JSON.parse(s) : { accounts: [], projects: [] }; }
    else state.data = { accounts: [], projects: [] };
}

function saveData() { if (state.currentUser) localStorage.setItem(getUserKey(state.currentUser), JSON.stringify(state.data)); }

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('user-email').value = '';
    document.getElementById('password-input').value = '';
    if (state.isFirstTime) {
        document.getElementById('user-email').placeholder = 'Enter your email';
        document.getElementById('password-input').placeholder = 'Set a password';
        document.getElementById('login-btn').textContent = 'Setup Account';
        document.getElementById('add-user-btn').classList.add('hidden');
    } else {
        document.getElementById('user-email').placeholder = 'Enter your email';
        document.getElementById('password-input').placeholder = 'Enter your password';
        document.getElementById('login-btn').textContent = 'Login';
        document.getElementById('add-user-btn').classList.remove('hidden');
    }
    renderUserList();
}

function renderUserList() {
    var users = getUsers(), c = document.getElementById('user-list');
    if (users.length === 0) { c.innerHTML = ''; return; }
    c.innerHTML = '<p style="color:var(--text-muted);font-size:13px;margin-bottom:6px;width:100%">Quick Login:</p>' + users.map(function(e) { return '<button class="user-btn" onclick="selectUser(\'' + e + '\')">' + esc(e) + '</button>'; }).join('');
}

function selectUser(e) { document.getElementById('user-email').value = e; document.getElementById('password-input').focus(); }

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('user-email').value = '';
    document.getElementById('password-input').value = '';
    renderDashboard();
    updateHeaderDisplay();
}

function handleLogin() {
    var email = document.getElementById('user-email').value.trim().toLowerCase();
    var pw = document.getElementById('password-input').value.trim();
    document.getElementById('login-error').classList.add('hidden');
    if (!email) return showErr('Enter your email');
    if (!pw) return showErr('Enter your password');
    if (state.isFirstTime) doSetup(email, pw);
    else doLogin(email, pw);
}

function doSetup(email, pw) {
    var c = prompt('Confirm your password:');
    if (pw !== c) return showErr('Passwords do not match');
    var users = getUsers();
    if (users.indexOf(email) >= 0) return showErr('Email already exists. Login instead.');
    users.push(email);
    saveUsers(users);
    localStorage.setItem('aim-pw-' + btoa(email), btoa(pw));
    state.currentUser = email;
    localStorage.setItem('aim-current-user', email);
    state.data = { accounts: [], projects: [] };
    saveData();
    toast('Account created!', 'success');
    showDashboard();
}

function doLogin(email, pw) {
    var stored = localStorage.getItem('aim-pw-' + btoa(email));
    if (!stored) return showErr('Email not found. Click "Add New User" below.');
    if (btoa(pw) === stored) {
        state.currentUser = email;
        localStorage.setItem('aim-current-user', email);
        loadData();
        showDashboard();
    } else showErr('Wrong password');
}

function addNewUser() {
    var email = prompt('Enter new user email:');
    if (!email) return;
    email = email.trim().toLowerCase();
    var users = getUsers();
    if (users.indexOf(email) >= 0) return toast('Email already exists', 'warning');
    var pw = prompt('Set password for ' + email + ':');
    if (!pw) return;
    var c = prompt('Confirm password:');
    if (pw !== c) return toast('Passwords mismatch', 'error');
    users.push(email);
    saveUsers(users);
    localStorage.setItem('aim-pw-' + btoa(email), btoa(pw));
    toast('User added! Now login.', 'success');
    renderUserList();
}

function showErr(m) { var e = document.getElementById('login-error'); e.textContent = m; e.classList.remove('hidden'); }
function esc(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(m, t) { if (!t) t = 'success'; var d = document.createElement('div'); d.className = 'toast ' + t; d.textContent = m; document.getElementById('toast-container').appendChild(d); setTimeout(function() { d.remove(); }, 3000); }

function setupEvents() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('password-input').addEventListener('keypress', function(e) { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('user-email').addEventListener('keypress', function(e) { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('add-user-btn').addEventListener('click', addNewUser);
    document.querySelectorAll('.nav-item').forEach(function(i) { i.addEventListener('click', function() { switchView(i.dataset.view); }); });
    document.getElementById('add-project-quick').addEventListener('click', function() { showProjectModal(); });
    document.getElementById('add-account-quick').addEventListener('click', function() { showAccountModal(); });
    document.getElementById('export-data-quick').addEventListener('click', exportData);
    document.getElementById('switch-project-btn').addEventListener('click', showSwitchAI);
    document.getElementById('add-project-btn').addEventListener('click', function() { showProjectModal(); });
    document.getElementById('add-account-btn').addEventListener('click', function() { showAccountModal(); });
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', function() { document.getElementById('import-file').click(); });
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('change-password').addEventListener('click', changePw);
    document.getElementById('reset-all').addEventListener('click', resetAll);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeModal(); });
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.addEventListener('click', handleFilter); });
    document.getElementById('menu-btn').addEventListener('click', function() { document.getElementById('sidebar').classList.toggle('hidden'); });
}

function switchView(v) {
    state.currentView = v;
    document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.toggle('active', i.dataset.view === v); });
    document.querySelectorAll('.view').forEach(function(vw) { vw.classList.toggle('active', vw.id === v + '-view'); });
    if (v === 'dashboard') renderDashboard();
    else if (v === 'projects') renderProjects();
    else if (v === 'accounts') renderAccounts();
}

function renderDashboard() { renderAccountsGrid(); renderProjectsGrid(); updateWorking(); }

function renderAccountsGrid() {
    var accts = state.data.accounts || [];
    document.getElementById('accounts-count').textContent = accts.length;
    var g = document.getElementById('accounts-grid');
    if (!accts.length) { g.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>No AI accounts</p><button class="btn-primary" onclick="showAccountModal()">+ Add Account</button></div>'; return; }
    g.innerHTML = accts.map(function(a) {
        var proj = state.data.projects.find(function(p) { return p.id === a.project_id; });
        var can = proj && proj.remaining_minutes > 0;
        return '<div class="account-card"><div class="card-top"><span class="card-provider">' + provIcon(a.provider) + '</span><span class="card-status ' + (a.is_active ? 'active' : 'inactive') + '"></span></div>' +
            '<div class="card-email">' + esc(a.email) + '</div><div class="card-provider-name">' + a.provider + '</div>' +
            (proj ? '<div class="card-project">' + esc(proj.name) + '</div><div class="card-timer ' + timerClass(proj.remaining_minutes) + '">' + fmt(proj.remaining_minutes) + '</div><div class="card-reset">Reset: ' + (proj.reset_date || 'Not set') + '</div>' : '<div class="card-project">No project</div>') +
            '<div class="card-actions"><button class="btn-secondary" onclick="useAccount(' + a.id + ')"' + (can ? '' : ' disabled') + '>Use</button><button class="btn-secondary" onclick="editAccount(' + a.id + ')">Edit</button><button class="btn-danger" onclick="deleteAccount(' + a.id + ')">Del</button></div></div>';
    }).join('');
}

function renderProjectsGrid() {
    var projs = state.data.projects || [];
    document.getElementById('projects-count').textContent = projs.length;
    var g = document.getElementById('projects-grid');
    if (!projs.length) { g.innerHTML = '<div class="empty-state"><div class="icon">📁</div><p>No projects</p><button class="btn-primary" onclick="showProjectModal()">+ Add Project</button></div>'; return; }
    g.innerHTML = projs.map(function(p) {
        var linked = state.data.accounts.filter(function(a) { return a.project_id === p.id; });
        return '<div class="project-card"><div class="card-top"><span class="card-name">' + esc(p.name) + '</span><span class="status-badge ' + p.status + '">' + p.status + '</span></div>' +
            '<div class="project-timer">Time: ' + fmt(p.remaining_minutes) + '</div><div class="project-reset">Reset: ' + (p.reset_date || '-') + '</div>' +
            (p.notes ? '<div class="card-notes">' + esc(p.notes) + '</div>' : '') +
            (linked.length ? '<div class="linked-accounts">Linked: ' + linked.map(function(a) { return a.provider; }).join(', ') + '</div>' : '') +
            '<div class="card-actions"><button class="btn-secondary" onclick="startTimer(' + p.id + ')">Start</button><button class="btn-secondary" onclick="editProject(' + p.id + ')">Edit</button><button class="btn-danger" onclick="deleteProject(' + p.id + ')">Del</button></div></div>';
    }).join('');
}

function renderProjects() {
    var projs = state.data.projects || [];
    var l = document.getElementById('projects-list');
    if (!projs.length) { l.innerHTML = '<div class="empty-state"><div class="icon">📁</div><p>No projects</p><button class="btn-primary" onclick="showProjectModal()">+ Add Project</button></div>'; return; }
    l.innerHTML = projs.map(function(p) {
        return '<div class="project-card"><div class="card-top"><span class="card-name">' + esc(p.name) + '</span><span class="status-badge ' + p.status + '">' + p.status + '</span></div>' +
            '<div class="project-timer">Time: ' + fmt(p.remaining_minutes) + '</div><div class="project-reset">Reset: ' + (p.reset_date || '-') + '</div>' +
            (p.notes ? '<div class="card-notes">' + esc(p.notes) + '</div>' : '') +
            '<div class="card-actions"><button class="btn-secondary" onclick="editProject(' + p.id + ')">Edit</button><button class="btn-danger" onclick="deleteProject(' + p.id + ')">Del</button></div></div>';
    }).join('');
}

function renderAccounts() {
    var accts = state.data.accounts || [];
    var l = document.getElementById('accounts-list');
    if (!accts.length) { l.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>No accounts</p><button class="btn-primary" onclick="showAccountModal()">+ Add Account</button></div>'; return; }
    l.innerHTML = accts.map(function(a) {
        var proj = state.data.projects.find(function(p) { return p.id === a.project_id; });
        return '<div class="account-card"><div class="card-top"><span class="card-provider">' + provIcon(a.provider) + '</span><span class="card-status ' + (a.is_active ? 'active' : 'inactive') + '"></span></div>' +
            '<div class="card-email">' + esc(a.email) + '</div><div class="card-provider-name">' + a.provider + '</div>' +
            (proj ? '<div class="card-project">' + esc(proj.name) + '</div>' : '') +
            '<div class="card-actions"><button class="btn-secondary" onclick="useAccount(' + a.id + ')">Use</button><button class="btn-secondary" onclick="editAccount(' + a.id + ')">Edit</button><button class="btn-danger" onclick="deleteAccount(' + a.id + ')">Del</button></div></div>';
    }).join('');
}

function updateWorking() {
    var active = state.data.projects.filter(function(p) { return p.status === 'ongoing' && p.remaining_minutes > 0; });
    var c = document.getElementById('multi-working');
    if (!active.length) { c.innerHTML = '<p class="empty-text">No active projects</p>'; return; }
    c.innerHTML = active.map(function(p) {
        var acc = state.data.accounts.find(function(a) { return a.project_id === p.id && a.is_active; });
        return '<div class="multi-working-item"><div class="project-info"><span class="provider-icon">' + (acc ? provIcon(acc.provider) : '📁') + '</span><span class="project-name">' + esc(p.name) + '</span></div><span class="timer ' + timerClass(p.remaining_minutes) + '">' + fmt(p.remaining_minutes) + '</span></div>';
    }).join('');
}

function updateHeaderDisplay() {
    var active = state.data.projects.filter(function(p) { return p.status === 'ongoing' && p.remaining_minutes > 0; });
    if (state.currentUser) document.getElementById('current-user-display').textContent = state.currentUser;
    if (active.length) {
        var p = active[0];
        document.getElementById('current-project-name').textContent = p.name;
        document.getElementById('current-project-status').textContent = p.status;
        document.getElementById('current-account-timer').textContent = fmt(p.remaining_minutes);
    } else {
        document.getElementById('current-project-name').textContent = 'No Project';
        document.getElementById('current-project-status').textContent = '-';
        document.getElementById('current-account-timer').textContent = '--:--:--';
    }
}

function startTimerLoop() { setInterval(function() {
    state.data.projects.forEach(function(p) {
        var acc = state.data.accounts.find(function(a) { return a.project_id === p.id && a.is_active; });
        if (acc && p.remaining_minutes > 0) p.remaining_minutes--;
    });
    saveData();
    if (!document.getElementById('dashboard-screen').classList.contains('hidden') && state.currentView === 'dashboard') { renderAccountsGrid(); renderProjectsGrid(); updateWorking(); updateHeaderDisplay(); }
}, 60000); }

function fmt(m) { if (!m || m < 0) return '00:00:00'; var h = Math.floor(m/60), r = m%60; return String(h).padStart(2,'0') + ':' + String(r).padStart(2,'0') + ':00'; }
function timerClass(m) { if (m <= 0) return 'timer-expired'; if (m <= 30) return 'timer-warning'; return 'timer-active'; }
function provIcon(p) { var i = {'Claude':'🔵','Codex':'⚡','Grok':'🚀','ChatGPT':'💬','Gemini':'🌟','DeepSeek':'🔮'}; return i[p] || '🤖'; }

function showProjectModal(id) {
    var isEdit = id != null, p = isEdit ? state.data.projects.find(function(x) { return x.id === id; }) : null;
    p = p || { name: '', status: 'ongoing', notes: '', time_limit_minutes: 120, reset_date: '' };
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Project' : 'Add Project';
    document.getElementById('modal-body').innerHTML = '<div class="form-group"><label>Project Name *</label><input type="text" id="pn" value="' + esc(p.name) + '"></div>' +
        '<div class="form-row"><div class="form-group"><label>Time Limit (min)</label><input type="number" id="ptl" value="' + p.time_limit_minutes + '" min="1"></div>' +
        '<div class="form-group"><label>Reset Date</label><input type="datetime-local" id="prd" value="' + p.reset_date + '"></div></div>' +
        '<div class="form-group"><label>Status</label><select id="ps"><option value="ongoing"' + (p.status==='ongoing'?' selected':'') + '>Ongoing</option><option value="completed"' + (p.status==='completed'?' selected':'') + '>Completed</option><option value="future"' + (p.status==='future'?' selected':'') + '>Future</option></select></div>' +
        '<div class="form-group"><label>Notes</label><textarea id="pnotes">' + esc(p.notes) + '</textarea></div>';
    document.getElementById('modal-footer').innerHTML = '<button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="saveProject(' + (isEdit?id:'null') + ')">' + (isEdit?'Update':'Create') + '</button>';
    openModal();
}

function saveProject(id) {
    var n = document.getElementById('pn').value.trim(), tl = parseInt(document.getElementById('ptl').value)||120, rd = document.getElementById('prd').value, s = document.getElementById('ps').value, notes = document.getElementById('pnotes').value.trim();
    if (!n) return toast('Enter name', 'error');
    if (id) { var i = state.data.projects.findIndex(function(p){return p.id===id;}); if(i>=0) Object.assign(state.data.projects[i], {name:n,time_limit_minutes:tl,reset_date:rd,status:s,notes:notes}); }
    else { var nid = state.data.projects.length?Math.max.apply(null,state.data.projects.map(function(p){return p.id;}))+1:1; state.data.projects.push({id:nid,name:n,time_limit_minutes:tl,remaining_minutes:tl,reset_date:rd,status:s,notes:notes,created_at:new Date().toISOString()}); }
    saveData(); closeModal(); refresh();
}

function editProject(id) { showProjectModal(id); }
function deleteProject(id) { if(!confirm('Delete?'))return; state.data.projects=state.data.projects.filter(function(p){return p.id!==id;}); state.data.accounts.forEach(function(a){if(a.project_id===id)a.project_id=null;}); toast('Deleted','success'); saveData(); refresh(); }
function startTimer(id) { var p=state.data.projects.find(function(x){return x.id===id;}); if(!p)return; localStorage.setItem('aim-current-project',id); toast('Started: '+p.name,'success'); refresh(); }

function showAccountModal(id) {
    var isEdit = id != null, a = isEdit ? state.data.accounts.find(function(x){return x.id===id;}) : null;
    a = a || {email:'',provider:'Claude',project_id:null};
    var projs = state.data.projects;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Account' : 'Add Account';
    document.getElementById('modal-body').innerHTML = '<div class="form-group"><label>Email *</label><input type="email" id="ae" value="'+esc(a.email)+'"></div>' +
        '<div class="form-group"><label>Provider</label><select id="ap"><option value="Claude">Claude</option><option value="Codex">Codex</option><option value="Grok">Grok</option><option value="ChatGPT">ChatGPT</option><option value="Gemini">Gemini</option><option value="DeepSeek">DeepSeek</option></select></div>' +
        '<div class="form-group"><label>Link Project</label><select id="aproj"><option value="">-- Select --</option>' + projs.map(function(p){return '<option value="'+p.id+'"'+(a.project_id===p.id?' selected':'')+'>'+esc(p.name)+'</option>';}).join('') + '</select></div>';
    document.getElementById('modal-footer').innerHTML = '<button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="saveAccount('+(isEdit?id:'null')+')">'+(isEdit?'Update':'Create')+'</button>';
    setTimeout(function(){ document.getElementById('ap').value = a.provider; }, 50);
    openModal();
}

function saveAccount(id) {
    var email = document.getElementById('ae').value.trim(), prov = document.getElementById('ap').value, projId = document.getElementById('aproj').value ? parseInt(document.getElementById('aproj').value) : null;
    if (!email) return toast('Enter email', 'error');
    if (id) { var i = state.data.accounts.findIndex(function(a){return a.id===id;}); if(i>=0) Object.assign(state.data.accounts[i], {email:email,provider:prov,project_id:projId}); }
    else { var nid = state.data.accounts.length?Math.max.apply(null,state.data.accounts.map(function(a){return a.id;}))+1:1; state.data.accounts.push({id:nid,email:email,provider:prov,project_id:projId,is_active:false,created_at:new Date().toISOString()}); }
    saveData(); closeModal(); refresh();
}

function editAccount(id) { showAccountModal(id); }
function deleteAccount(id) { if(!confirm('Delete?'))return; state.data.accounts=state.data.accounts.filter(function(a){return a.id!==id;}); toast('Deleted','success'); saveData(); refresh(); }

function useAccount(id) {
    var acc = state.data.accounts.find(function(a){return a.id===id;});
    if(!acc)return;
    if(!acc.project_id)return toast('Link to project first','warning');
    var proj = state.data.projects.find(function(p){return p.id===acc.project_id;});
    if(!proj||proj.remaining_minutes<=0)return toast('No time left','warning');
    
    var prevId = localStorage.getItem('aim-active-account');
    var prevProjId = localStorage.getItem('aim-current-project');
    
    if(prevId && prevId != id) {
        var prevProj = state.data.projects.find(function(p){return p.id==prevProjId;});
        if(prevProj) {
            var existing = document.getElementById('swmodal');
            if(existing) existing.remove();
            document.body.innerHTML += '<div id="swmodal" class="switch-modal"><div class="switch-modal-content"><h3>Switch AI?</h3><p>Previous project "'+esc(prevProj.name)+'" will reset at:</p><input type="datetime-local" id="swtime" value="'+nextReset()+'"><div class="switch-modal-actions"><button class="btn-secondary" onclick="document.getElementById(\'swmodal\').remove()">Cancel</button><button class="btn-primary" onclick="doSwitch('+id+','+prevProjId+')">Switch</button></div></div></div>';
            return;
        }
    }
    activateAccount(id, acc.project_id);
}

function doSwitch(newId, prevPid) {
    var t = document.getElementById('swtime').value;
    var pp = state.data.projects.find(function(p){return p.id===prevPid;});
    if(pp){pp.remaining_minutes=0;pp.reset_date=t;}
    document.getElementById('swmodal').remove();
    var na = state.data.accounts.find(function(a){return a.id===newId;});
    activateAccount(newId, na.project_id);
}

function activateAccount(accId, projId) {
    localStorage.setItem('aim-current-project', projId);
    localStorage.setItem('aim-active-account', accId);
    state.data.accounts.forEach(function(a){a.is_active=false;});
    state.data.accounts.find(function(a){return a.id===accId;}).is_active=true;
    var acc = state.data.accounts.find(function(a){return a.id===accId;});
    var proj = state.data.projects.find(function(p){return p.id===projId;});
    toast('Using '+acc.provider+' on '+proj.name, 'success');
    saveData(); refresh();
}

function nextReset() { var d=new Date(); d.setDate(d.getDate()+1); d.setHours(3,0,0,0); return d.toISOString().slice(0,16); }

function showSwitchAI() {
    var projs = state.data.projects.filter(function(p){return p.status==='ongoing';});
    if(!projs.length)return toast('No ongoing projects','warning');
    var opts = projs.map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+' - '+fmt(p.remaining_minutes)+'</option>';}).join('');
    document.getElementById('modal-title').textContent = 'Switch AI';
    document.getElementById('modal-body').innerHTML = '<div class="form-group"><label>Project</label><select id="ssproj">'+opts+'</select></div><div class="form-group"><label>Account</label><select id="ssacct"></select></div>';
    document.getElementById('modal-footer').innerHTML = '<button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="switchAI()">Switch</button>';
    document.getElementById('ssproj').addEventListener('change', updAcctDD);
    updAcctDD();
    openModal();
}

function updAcctDD() {
    var pid = parseInt(document.getElementById('ssproj').value);
    var accts = state.data.accounts.filter(function(a){return a.project_id===pid;});
    document.getElementById('ssacct').innerHTML = accts.length ? accts.map(function(a){return '<option value="'+a.id+'">'+a.provider+' - '+esc(a.email)+'</option>';}).join('') : '<option value="">None</option>';
}

function switchAI() {
    var aid = parseInt(document.getElementById('ssacct').value);
    if(!aid)return toast('Select account','warning');
    activateAccount(aid, parseInt(document.getElementById('ssproj').value));
}

function handleFilter(e) {
    var f = e.target.dataset.filter, v = e.target.closest('.view').id.replace('-view','');
    document.querySelectorAll('#'+v+'-view .filter-btn').forEach(function(b){b.classList.toggle('active',b.dataset.filter===f);});
    if(v==='projects') renderFProjects(f); else if(v==='accounts') renderFAccounts(f);
}

function renderFProjects(f) {
    var p = state.data.projects; if(f!=='all') p=p.filter(function(x){return x.status===f;});
    var l = document.getElementById('projects-list');
    l.innerHTML = p.length ? p.map(function(x){return '<div class="project-card"><div class="card-top"><span class="card-name">'+esc(x.name)+'</span><span class="status-badge '+x.status+'">'+x.status+'</span></div><div class="project-timer">Time: '+fmt(x.remaining_minutes)+'</div>'+(x.notes?'<div class="card-notes">'+esc(x.notes)+'</div>':'')+'<div class="card-actions"><button class="btn-secondary" onclick="startTimer('+x.id+')">Start</button><button class="btn-secondary" onclick="editProject('+x.id+')">Edit</button><button class="btn-danger" onclick="deleteProject('+x.id+')">Del</button></div></div>';}).join('') : '<div class="empty-state"><p>None</p></div>';
}

function renderFAccounts(f) {
    var a = state.data.accounts; if(f==='active') a=a.filter(function(x){return x.is_active;}); else if(f==='inactive') a=a.filter(function(x){return !x.is_active;});
    var l = document.getElementById('accounts-list');
    l.innerHTML = a.length ? a.map(function(x){var p=state.data.projects.find(function(z){return z.id===x.project_id;}); return '<div class="account-card"><div class="card-top"><span class="card-provider">'+provIcon(x.provider)+'</span><span class="card-status '+(x.is_active?'active':'inactive')+'"></span></div><div class="card-email">'+esc(x.email)+'</div><div class="card-provider-name">'+x.provider+'</div>'+(p?'<div class="card-project">'+esc(p.name)+'</div>':'')+'<div class="card-actions"><button class="btn-secondary" onclick="useAccount('+x.id+')">Use</button><button class="btn-secondary" onclick="editAccount('+x.id+')">Edit</button><button class="btn-danger" onclick="deleteAccount('+x.id+')">Del</button></div></div>';}).join('') : '<div class="empty-state"><p>None</p></div>';
}

function openModal(){document.getElementById('modal-overlay').classList.remove('hidden');}
function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');}

function exportData(){
    var d={accounts:state.data.accounts,projects:state.data.projects,exportedAt:new Date().toISOString()};
    var b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='ai-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
    toast('Exported!','success');
}

function importData(e){
    var f=e.target.files[0]; if(!f)return;
    var r=new FileReader(); r.onload=function(ev){
        try{var d=JSON.parse(ev.target.result);if(confirm('Replace data?')){state.data={accounts:d.accounts||[],projects:d.projects||[]};saveData();refresh();toast('Imported!','success');}}catch(er){toast('Error','error');}
    }; r.readAsText(f); e.target.value='';
}

function changePw(){
    var n=prompt('New password:'); if(!n)return;
    var c=prompt('Confirm:'); if(n!==c)return toast('Mismatch','error');
    localStorage.setItem('aim-pw-'+btoa(state.currentUser), btoa(n));
    toast('Changed!','success');
}

function resetAll(){
    if(!confirm('Delete all data?'))return;
    if(!confirm('Final confirm?'))return;
    if(state.currentUser){
        localStorage.removeItem(getUserKey(state.currentUser));
        localStorage.removeItem('aim-pw-'+btoa(state.currentUser));
        var u=getUsers().filter(function(x){return x!==state.currentUser;});saveUsers(u);
        localStorage.removeItem('aim-current-user');
    }
    location.reload();
}

function refresh(){
    if(state.currentView==='dashboard')renderDashboard();
    else if(state.currentView==='projects')renderProjects();
    else if(state.currentView==='accounts')renderAccounts();
}

document.addEventListener('DOMContentLoaded', function(){
    var storedEmail = localStorage.getItem('aim-current-user');
    if (storedEmail) { state.currentUser = storedEmail; }
    
    loadData();
    state.isFirstTime = getUsers().length === 0;
    showLoginScreen();
    setupEvents();
    startTimerLoop();
});
