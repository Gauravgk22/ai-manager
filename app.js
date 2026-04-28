const APP_CONFIG = {
    appName: 'Multi-AI Manager',
    version: '2.1.0',
    defaultTimeLimit: 120,
};

const state = {
    isFirstTime: false,
    currentView: 'dashboard',
    data: {
        accounts: [],
        projects: []
    }
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadData();
    checkFirstTime();
    setupEventListeners();
    startTimerLoop();
}

function loadData() {
    const stored = localStorage.getItem('ai-manager-data');
    if (stored) state.data = JSON.parse(stored);
}

function saveData() {
    localStorage.setItem('ai-manager-data', JSON.stringify(state.data));
}

function checkFirstTime() {
    const password = localStorage.getItem('ai-manager-password');
    state.isFirstTime = !password;
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('password-input').placeholder = state.isFirstTime ? 'Set a password' : 'Enter password';
    document.getElementById('login-btn').textContent = state.isFirstTime ? 'Set Password' : 'Access Dashboard';
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    renderDashboard();
    updateHeaderDisplay();
}

function handleLogin() {
    const password = document.getElementById('password-input').value.trim();
    if (!password) return showLoginError('Enter password');
    
    if (state.isFirstTime) {
        const confirm = prompt('Confirm password:');
        if (password !== confirm) return showLoginError('Passwords mismatch');
        localStorage.setItem('ai-manager-password', btoa(password));
        state.isFirstTime = false;
        showToast('Password set!', 'success');
        showDashboard();
    } else {
        if (btoa(password) === localStorage.getItem('ai-manager-password')) {
            showDashboard();
        } else showLoginError('Wrong password');
    }
}

function showLoginError(msg) {
    const e = document.getElementById('login-error');
    e.textContent = msg;
    e.classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('password-input').addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
    
    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
    
    document.getElementById('add-project-quick').addEventListener('click', () => showProjectModal());
    document.getElementById('add-account-quick').addEventListener('click', () => showAccountModal());
    document.getElementById('export-data-quick').addEventListener('click', exportData);
    document.getElementById('switch-project-btn').addEventListener('click', showProjectSelector);
    document.getElementById('add-project-btn').addEventListener('click', () => showProjectModal());
    document.getElementById('add-account-btn').addEventListener('click', () => showAccountModal());
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('change-password').addEventListener('click', changePassword);
    document.getElementById('reset-all').addEventListener('click', resetAllData);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', handleFilter));
    document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('hidden'));
}

function switchView(viewName) {
    state.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewName + '-view'));
    if (viewName === 'dashboard') renderDashboard();
    else if (viewName === 'projects') renderProjects();
    else if (viewName === 'accounts') renderAccounts();
}

function renderDashboard() {
    renderAccountsGrid();
    renderProjectsGrid();
    updateCurrentWorking();
}

function renderAccountsGrid() {
    const accounts = state.data.accounts || [];
    document.getElementById('accounts-count').textContent = accounts.length;
    const grid = document.getElementById('accounts-grid');
    
    if (accounts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>No AI accounts</p><button class="btn-primary" onclick="showAccountModal()">+ Add Account</button></div>';
        return;
    }
    
    grid.innerHTML = accounts.map(acc => {
        const project = state.data.projects.find(p => p.id === acc.project_id);
        const canUse = project && project.remaining_minutes > 0;
        
        return `
        <div class="account-card">
            <div class="card-top">
                <span class="card-provider">${getProviderIcon(acc.provider)}</span>
                <span class="card-status ${acc.is_active ? 'active' : 'inactive'}"></span>
            </div>
            <div class="card-email">${escapeHtml(acc.email)}</div>
            <div class="card-provider-name">${acc.provider}</div>
            ${project ? `
            <div class="card-project">${escapeHtml(project.name)}</div>
            <div class="card-timer ${getTimerClass(project.remaining_minutes)}">${formatTime(project.remaining_minutes)}</div>
            <div class="card-reset">Reset: ${project.reset_date || 'Not set'}</div>
            ` : '<div class="card-project">No project</div>'}
            <div class="card-actions">
                <button class="btn-secondary" onclick="useAccount(${acc.id})" ${!canUse ? 'disabled' : ''}>Use</button>
                <button class="btn-secondary" onclick="editAccount(${acc.id})">Edit</button>
                <button class="btn-danger" onclick="deleteAccount(${acc.id})">Del</button>
            </div>
        </div>`;
    }).join('');
}

function renderProjectsGrid() {
    const projects = state.data.projects || [];
    document.getElementById('projects-count').textContent = projects.length;
    const grid = document.getElementById('projects-grid');
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="icon">📁</div><p>No projects</p><button class="btn-primary" onclick="showProjectModal()">+ Add Project</button></div>';
        return;
    }
    
    grid.innerHTML = projects.map(proj => {
        const linkedAccounts = state.data.accounts.filter(a => a.project_id === proj.id);
        
        return `
        <div class="project-card">
            <div class="card-top">
                <span class="card-name">${escapeHtml(proj.name)}</span>
                <span class="status-badge ${proj.status}">${proj.status}</span>
            </div>
            <div class="project-timer">Time: ${formatTime(proj.remaining_minutes)}</div>
            <div class="project-reset">Next reset: ${proj.reset_date || '-'}</div>
            ${proj.notes ? `<div class="card-notes">${escapeHtml(proj.notes)}</div>` : ''}
            ${linkedAccounts.length > 0 ? `<div class="linked-accounts">Linked: ${linkedAccounts.map(a => a.provider).join(', ')}</div>` : ''}
            <div class="card-actions">
                <button class="btn-secondary" onclick="startProjectTimer(${proj.id})">Start Timer</button>
                <button class="btn-secondary" onclick="editProject(${proj.id})">Edit</button>
                <button class="btn-danger" onclick="deleteProject(${proj.id})">Del</button>
            </div>
        </div>`;
    }).join('');
}

function renderProjects() {
    const projects = state.data.projects || [];
    const list = document.getElementById('projects-list');
    
    if (projects.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">📁</div><p>No projects</p><button class="btn-primary" onclick="showProjectModal()">+ Add Project</button></div>';
        return;
    }
    
    list.innerHTML = projects.map(proj => `
    <div class="project-card">
        <div class="card-top">
            <span class="card-name">${escapeHtml(proj.name)}</span>
            <span class="status-badge ${proj.status}">${proj.status}</span>
        </div>
        <div class="project-timer">Time: ${formatTime(proj.remaining_minutes)}</div>
        <div class="project-reset">Next reset: ${proj.reset_date || '-'}</div>
        ${proj.notes ? `<div class="card-notes">${escapeHtml(proj.notes)}</div>` : ''}
        <div class="card-actions">
            <button class="btn-secondary" onclick="editProject(${proj.id})">Edit</button>
            <button class="btn-danger" onclick="deleteProject(${proj.id})">Del</button>
        </div>
    </div>`).join('');
}

function renderAccounts() {
    const accounts = state.data.accounts || [];
    const list = document.getElementById('accounts-list');
    
    if (accounts.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">👤</div><p>No accounts</p><button class="btn-primary" onclick="showAccountModal()">+ Add Account</button></div>';
        return;
    }
    
    list.innerHTML = accounts.map(acc => {
        const project = state.data.projects.find(p => p.id === acc.project_id);
        return `
        <div class="account-card">
            <div class="card-top">
                <span class="card-provider">${getProviderIcon(acc.provider)}</span>
                <span class="card-status ${acc.is_active ? 'active' : 'inactive'}"></span>
            </div>
            <div class="card-email">${escapeHtml(acc.email)}</div>
            <div class="card-provider-name">${acc.provider}</div>
            ${project ? `<div class="card-project">${escapeHtml(project.name)}</div>` : ''}
            <div class="card-actions">
                <button class="btn-secondary" onclick="useAccount(${acc.id})">Use</button>
                <button class="btn-secondary" onclick="editAccount(${acc.id})">Edit</button>
                <button class="btn-danger" onclick="deleteAccount(${acc.id})">Del</button>
            </div>
        </div>`;
    }).join('');
}

function updateCurrentWorking() {
    const activeProjects = state.data.projects.filter(p => p.status === 'ongoing' && p.remaining_minutes > 0);
    
    const container = document.getElementById('multi-working');
    
    if (activeProjects.length === 0) {
        container.innerHTML = '<p class="empty-text">No active projects</p>';
        return;
    }
    
    container.innerHTML = activeProjects.map(proj => {
        const linkedAccount = state.data.accounts.find(a => a.project_id === proj.id && a.is_active);
        return `
        <div class="multi-working-item">
            <div class="project-info">
                <span class="provider-icon">${linkedAccount ? getProviderIcon(linkedAccount.provider) : '📁'}</span>
                <span class="project-name">${escapeHtml(proj.name)}</span>
            </div>
            <span class="timer ${getTimerClass(proj.remaining_minutes)}">${formatTime(proj.remaining_minutes)}</span>
        </div>
        `;
    }).join('');
}

function updateHeaderDisplay() {
    const activeProjects = state.data.projects.filter(p => p.status === 'ongoing' && p.remaining_minutes > 0);
    
    if (activeProjects.length > 0) {
        const proj = activeProjects[0];
        document.getElementById('current-project-name').textContent = proj.name;
        document.getElementById('current-project-status').textContent = proj.status;
        const linkedAccount = state.data.accounts.find(a => a.project_id === proj.id && a.is_active);
        document.getElementById('current-account-timer').textContent = formatTime(proj.remaining_minutes);
    } else {
        document.getElementById('current-project-name').textContent = 'No Project';
        document.getElementById('current-project-status').textContent = '-';
        document.getElementById('current-account-timer').textContent = '--:--:--';
    }
}

function startTimerLoop() {
    setInterval(() => {
        state.data.projects.forEach(proj => {
            const linkedAccount = state.data.accounts.find(a => a.project_id === proj.id && a.is_active);
            if (linkedAccount && proj.remaining_minutes > 0) {
                proj.remaining_minutes--;
            }
        });
        
        saveData();
        
        if (!document.getElementById('dashboard-screen').classList.contains('hidden')) {
            if (state.currentView === 'dashboard') {
                renderAccountsGrid();
                renderProjectsGrid();
                updateCurrentWorking();
                updateHeaderDisplay();
            }
        }
    }, 60000);
}

function formatTime(minutes) {
    if (!minutes || minutes < 0) return '00:00:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:00`;
}

function getTimerClass(minutes) {
    if (minutes <= 0) return 'timer-expired';
    if (minutes <= 30) return 'timer-warning';
    return 'timer-active';
}

function showProjectModal(projectId = null) {
    const isEdit = projectId !== null;
    let project = { name: '', status: 'ongoing', notes: '', time_limit_minutes: 120, reset_date: '' };
    
    if (isEdit) {
        project = state.data.projects.find(p => p.id === projectId) || project;
    }
    
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Project' : 'Add Project';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Project Name *</label>
            <input type="text" id="project-name" value="${escapeHtml(project.name)}" placeholder="Project A">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Time Limit (minutes)</label>
                <input type="number" id="project-time-limit" value="${project.time_limit_minutes}" min="1">
            </div>
            <div class="form-group">
                <label>Reset Date (IST)</label>
                <input type="datetime-local" id="project-reset-date" value="${project.reset_date}">
            </div>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select id="project-status">
                <option value="ongoing" ${project.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="future" ${project.status === 'future' ? 'selected' : ''}>Future</option>
            </select>
        </div>
        <div class="form-group">
            <label>Notes</label>
            <textarea id="project-notes">${escapeHtml(project.notes)}</textarea>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveProject(${projectId})">${isEdit ? 'Update' : 'Create'}</button>
    `;
    openModal();
}

function saveProject(projectId = null) {
    const name = document.getElementById('project-name').value.trim();
    const timeLimit = parseInt(document.getElementById('project-time-limit').value) || 120;
    const resetDate = document.getElementById('project-reset-date').value;
    const status = document.getElementById('project-status').value;
    const notes = document.getElementById('project-notes').value.trim();
    
    if (!name) return showToast('Enter name', 'error');
    
    if (projectId) {
        const idx = state.data.projects.findIndex(p => p.id === projectId);
        if (idx >= 0) {
            state.data.projects[idx] = { ...state.data.projects[idx], name, time_limit_minutes: timeLimit, reset_date: resetDate, status, notes };
        }
        showToast('Updated!', 'success');
    } else {
        const newId = state.data.projects.length > 0 ? Math.max(...state.data.projects.map(p => p.id)) + 1 : 1;
        state.data.projects.push({
            id: newId, name, time_limit_minutes: timeLimit, remaining_minutes: timeLimit,
            reset_date: resetDate, status, notes, created_at: new Date().toISOString()
        });
        showToast('Created!', 'success');
    }
    
    saveData();
    closeModal();
    refreshView();
}

function editProject(id) { showProjectModal(id); }

function deleteProject(id) {
    if (!confirm('Delete project?')) return;
    state.data.projects = state.data.projects.filter(p => p.id !== id);
    state.data.accounts.forEach(a => { if (a.project_id === id) a.project_id = null; });
    showToast('Deleted', 'success');
    saveData();
    refreshView();
}

function startProjectTimer(id) {
    const proj = state.data.projects.find(p => p.id === id);
    if (!proj) return;
    localStorage.setItem('ai-manager-current-project', id);
    showToast(`Timer started for ${proj.name}`, 'success');
    refreshView();
}

function setCurrentProject(id) {
    localStorage.setItem('ai-manager-current-project', id);
    showToast('Project set!', 'success');
    refreshView();
}

function showAccountModal(accountId = null) {
    const isEdit = accountId !== null;
    let account = { email: '', provider: 'Claude', project_id: null };
    
    if (isEdit) {
        account = state.data.accounts.find(a => a.id === accountId) || account;
    }
    
    const providers = ['Claude', 'Codex', 'Grok', 'ChatGPT', 'Gemini', 'DeepSeek'];
    const projects = state.data.projects;
    
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Account' : 'Add Account';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Email *</label>
            <input type="email" id="account-email" value="${escapeHtml(account.email)}" placeholder="email@example.com">
        </div>
        <div class="form-group">
            <label>Provider</label>
            <select id="account-provider">
                ${providers.map(p => `<option value="${p}" ${account.provider === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Link to Project</label>
            <select id="account-project">
                <option value="">-- Select Project --</option>
                ${projects.map(p => `<option value="${p.id}" ${account.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)} (${p.time_limit_minutes}m)</option>`).join('')}
            </select>
        </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="saveAccount(${accountId})">${isEdit ? 'Update' : 'Create'}</button>
    `;
    openModal();
}

function saveAccount(accountId = null) {
    const email = document.getElementById('account-email').value.trim();
    const provider = document.getElementById('account-provider').value;
    const projectId = document.getElementById('account-project').value ? parseInt(document.getElementById('account-project').value) : null;
    
    if (!email) return showToast('Enter email', 'error');
    
    if (accountId) {
        const idx = state.data.accounts.findIndex(a => a.id === accountId);
        if (idx >= 0) {
            state.data.accounts[idx] = { ...state.data.accounts[idx], email, provider, project_id: projectId };
        }
        showToast('Updated!', 'success');
    } else {
        const newId = state.data.accounts.length > 0 ? Math.max(...state.data.accounts.map(a => a.id)) + 1 : 1;
        state.data.accounts.push({ id: newId, email, provider, project_id: projectId, is_active: false, created_at: new Date().toISOString() });
        showToast('Created!', 'success');
    }
    
    saveData();
    closeModal();
    refreshView();
}

function editAccount(id) { showAccountModal(id); }

function deleteAccount(id) {
    if (!confirm('Delete account?')) return;
    state.data.accounts = state.data.accounts.filter(a => a.id !== id);
    showToast('Deleted', 'success');
    saveData();
    refreshView();
}

function useAccount(id) {
    const account = state.data.accounts.find(a => a.id === id);
    if (!account) return;
    
    if (!account.project_id) return showToast('Link account to project first', 'warning');
    
    const proj = state.data.projects.find(p => p.id === account.project_id);
    if (!proj || proj.remaining_minutes <= 0) return showToast('No time left', 'warning');
    
    const prevActiveId = localStorage.getItem('ai-manager-active-account');
    const prevProjectId = localStorage.getItem('ai-manager-current-project');
    
    if (prevActiveId && prevActiveId != id) {
        const switchModal = document.getElementById('switch-modal');
        if (switchModal) {
            switchModal.remove();
        }
        
        const prevProj = state.data.projects.find(p => p.id == prevProjectId);
        if (prevProj) {
            const body = document.body;
            const modal = document.createElement('div');
            modal.id = 'switch-modal';
            modal.className = 'switch-modal';
            modal.innerHTML = `
                <div class="switch-modal-content">
                    <h3>Switch AI?</h3>
                    <p>Previous: <strong>${prevProj.name}</strong> will reset at:</p>
                    <input type="datetime-local" id="switch-reset-time" value="${getNextResetDate()}">
                    <div class="switch-modal-actions">
                        <button class="btn-secondary" onclick="document.getElementById('switch-modal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="confirmSwitch(${id}, ${prevProjectId})">Switch</button>
                    </div>
                </div>
            `;
            body.appendChild(modal);
            return;
        }
    }
    
    activateAccount(id, account.project_id);
}

function confirmSwitch(newAccountId, prevProjectId) {
    const resetTime = document.getElementById('switch-reset-time').value;
    const prevProj = state.data.projects.find(p => p.id === prevProjectId);
    if (prevProj) {
        prevProj.remaining_minutes = 0;
        prevProj.reset_date = resetTime;
    }
    document.getElementById('switch-modal').remove();
    
    const newAccount = state.data.accounts.find(a => a.id === newAccountId);
    activateAccount(newAccountId, newAccount.project_id);
}

function activateAccount(accountId, projectId) {
    const account = state.data.accounts.find(a => a.id === accountId);
    const proj = state.data.projects.find(p => p.id === projectId);
    
    localStorage.setItem('ai-manager-current-project', projectId);
    localStorage.setItem('ai-manager-active-account', accountId);
    
    state.data.accounts.forEach(a => a.is_active = false);
    account.is_active = true;
    
    showToast(`Using ${account.provider} on ${proj.name}`, 'success');
    saveData();
    refreshView();
}

function getNextResetDate() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
}

function showProjectSelector() {
    const projects = state.data.projects.filter(p => p.status === 'ongoing');
    const allAccounts = state.data.accounts;
    
    if (projects.length === 0) return showToast('No ongoing projects', 'warning');
    
    let options = '';
    projects.forEach(proj => {
        const linkedAccounts = allAccounts.filter(a => a.project_id === proj.id);
        const activeAcc = linkedAccounts.find(a => a.is_active);
        const timeLeft = formatTime(proj.remaining_minutes);
        const status = proj.remaining_minutes > 0 ? 'active' : 'depleted';
        
        options += `<option value="${proj.id}">${proj.name} - ${timeLeft} [${status}]</option>`;
        
        if (linkedAccounts.length > 0) {
            linkedAccounts.forEach(acc => {
                options += `<option value="${proj.id}_${acc.id}" disabled>   ↳ ${acc.provider}: ${acc.email}</option>`;
            });
        }
    });
    
    document.getElementById('modal-title').textContent = 'Switch AI';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>Select Project</label>
            <select id="switch-project-select">${options}</select>
        </div>
        <div class="form-group">
            <label>Select Account</label>
            <select id="switch-account-select">
                <option value="">-- Select after project --</option>
            </select>
        </div>
    `;
    
    document.getElementById('modal-footer').innerHTML = `
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="switchToNewAccount()">Switch</button>
    `;
    
    document.getElementById('switch-project-select').addEventListener('change', updateAccountDropdown);
    openModal();
}

function updateAccountDropdown() {
    const projectId = parseInt(document.getElementById('switch-project-select').value.split('_')[0]);
    const linkedAccounts = state.data.accounts.filter(a => a.project_id === projectId);
    
    const accountSelect = document.getElementById('switch-account-select');
    accountSelect.innerHTML = linkedAccounts.map(acc => 
        `<option value="${acc.id}">${acc.provider} - ${acc.email}</option>`
    ).join('');
    
    if (linkedAccounts.length === 0) {
        accountSelect.innerHTML = '<option value="">No accounts linked</option>';
    }
}

function switchToNewAccount() {
    const selection = document.getElementById('switch-project-select').value;
    const accountId = document.getElementById('switch-account-select').value;
    
    if (!accountId) return showToast('Select account', 'warning');
    
    const projId = parseInt(selection.split('_')[0]);
    confirmSwitch(parseInt(accountId), projId);
}

function handleFilter(e) {
    const filter = e.target.dataset.filter;
    const view = e.target.closest('.view').id.replace('-view', '');
    
    document.querySelectorAll(`#${view}-view .filter-btn`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    if (view === 'projects') renderFilteredProjects(filter);
    else if (view === 'accounts') renderFilteredAccounts(filter);
}

function renderFilteredProjects(filter) {
    let projects = state.data.projects;
    if (filter !== 'all') projects = projects.filter(p => p.status === filter);
    
    const list = document.getElementById('projects-list');
    if (projects.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No projects</p></div>';
        return;
    }
    
    list.innerHTML = projects.map(proj => `
    <div class="project-card">
        <div class="card-top">
            <span class="card-name">${escapeHtml(proj.name)}</span>
            <span class="status-badge ${proj.status}">${proj.status}</span>
        </div>
        <div class="project-timer">Time: ${formatTime(proj.remaining_minutes)}</div>
        ${proj.notes ? `<div class="card-notes">${escapeHtml(proj.notes)}</div>` : ''}
        <div class="card-actions">
            <button class="btn-secondary" onclick="startProjectTimer(${proj.id})">Start</button>
            <button class="btn-secondary" onclick="editProject(${proj.id})">Edit</button>
            <button class="btn-danger" onclick="deleteProject(${proj.id})">Del</button>
        </div>
    </div>`).join('');
}

function renderFilteredAccounts(filter) {
    let accounts = state.data.accounts;
    if (filter === 'active') accounts = accounts.filter(a => a.is_active);
    else if (filter === 'inactive') accounts = accounts.filter(a => !a.is_active);
    
    const list = document.getElementById('accounts-list');
    if (accounts.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No accounts</p></div>';
        return;
    }
    
    list.innerHTML = accounts.map(acc => {
        const project = state.data.projects.find(p => p.id === acc.project_id);
        return `
        <div class="account-card">
            <div class="card-top">
                <span class="card-provider">${getProviderIcon(acc.provider)}</span>
                <span class="card-status ${acc.is_active ? 'active' : 'inactive'}"></span>
            </div>
            <div class="card-email">${escapeHtml(acc.email)}</div>
            <div class="card-provider-name">${acc.provider}</div>
            ${project ? `<div class="card-project">${escapeHtml(project.name)}</div>` : ''}
            <div class="card-actions">
                <button class="btn-secondary" onclick="useAccount(${acc.id})">Use</button>
                <button class="btn-secondary" onclick="editAccount(${acc.id})">Edit</button>
                <button class="btn-danger" onclick="deleteAccount(${acc.id})">Del</button>
            </div>
        </div>`;
    }).join('');
}

function openModal() { document.getElementById('modal-overlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function exportData() {
    const data = { ...state.data, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Exported!', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (confirm('Replace all data?')) {
                state.data = { accounts: data.accounts || [], projects: data.projects || [] };
                saveData();
                refreshView();
                showToast('Imported!', 'success');
            }
        } catch (err) { showToast('Error', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function changePassword() {
    const newPw = prompt('New password:');
    if (!newPw) return;
    const confirm = prompt('Confirm:');
    if (newPw !== confirm) return showToast('Mismatch', 'error');
    localStorage.setItem('ai-manager-password', btoa(newPw));
    showToast('Changed!', 'success');
}

function resetAllData() {
    if (!confirm('DELETE ALL?')) return;
    if (!confirm('Final confirm?')) return;
    localStorage.clear();
    location.reload();
}

function refreshView() {
    if (state.currentView === 'dashboard') renderDashboard();
    else if (state.currentView === 'projects') renderProjects();
    else if (state.currentView === 'accounts') renderAccounts();
}

function getProviderIcon(provider) {
    const icons = { 'Claude': '🔵', 'Codex': '⚡', 'Grok': '🚀', 'ChatGPT': '💬', 'Gemini': '🌟', 'DeepSeek': '🔮' };
    return icons[provider] || '🤖';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}