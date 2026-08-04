// ═══════════════════════════════════════════════════════
// CLERK PORTAL — Application Controller
// Reuses Admin JS modules. Disables add/create actions.
// ═══════════════════════════════════════════════════════

function applyTheme(theme) {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', resolvedTheme);
  localStorage.setItem('clerk-theme', resolvedTheme);
  if (toggle) {
    toggle.textContent = resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    toggle.setAttribute('aria-label', `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  
  // Reinitialize charts with new theme colors if we are on dashboard
  setTimeout(() => {
    const gc = document.getElementById('genderChart');
    if (gc && gc._chart) {
      gc._chart.destroy();
      gc._chart = null;
      if (typeof initCharts === 'function') {
        initCharts();
      }
    }
  }, 100);
}

window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('clerk-theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
});

const panelTitles = {
  dashboard: 'Dashboard Overview',
  residents: 'Resident Records',
  household: 'Household Management',
  certificates: 'Certificate Issuance',
  reports: 'Reports & Analytics',
  backup: 'Data Backup & Recovery',
  settings: 'System Settings'
};

// ── NAVIGATION ──
async function nav(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = panelTitles[id] || id;

  // Reset sub-panels
  if (id === 'residents') { if (typeof showSubPanel === 'function') showSubPanel('res-list'); }
  if (id === 'household') { if (typeof window.showHHSubPanel === 'function') window.showHHSubPanel('hh-list'); }

  closeSidebar();

  // Trigger init/render for each panel and refresh data when available
  try {
    if (id === 'dashboard') {
      if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb();
      if (typeof loadResidentsFromDb === 'function') await loadResidentsFromDb();
      if (typeof loadPaidCertificates === 'function') await loadPaidCertificates();
      if (typeof initDashboard === 'function') initDashboard();
    }

    if (id === 'residents') {
      if (typeof loadResidentsFromDb === 'function') await loadResidentsFromDb();
      if (typeof initResidents === 'function') await initResidents();
      else if (typeof renderResidents === 'function') renderResidents();
    }

    if (id === 'household') {
      if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb();
      if (typeof initHousehold === 'function') await initHousehold();
      else if (typeof renderHouseholds === 'function') renderHouseholds();
    }

    if (id === 'certificates') {
      if (typeof initCertificates === 'function') await initCertificates();
      else if (typeof renderCerts === 'function') renderCerts();
    }

    if (id === 'backup') {
      if (typeof renderBackupPanel === 'function') renderBackupPanel();
    }
  } catch (e) {
    console.warn('Navigation refresh error:', e);
  }
}

// ── SIDEBAR ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.toggle('open');
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ── TOAST ──
window.showToast = function (msg, type = 'info', duration = 3200) {
  const now = Date.now();
  if (window._lastToast && window._lastToast.message === msg && now - window._lastToast.timestamp < 1800) {
    return;
  }
  window._lastToast = { message: msg, timestamp: now };

  const container = document.getElementById('toastContainer');
  if (!container) { console.log('[Toast]', msg); return; }
  // Clear any existing toasts to only show one at a time and prevent stacking/duplicates
  container.innerHTML = '';

  const colors = { success: '#27ae60', error: '#c0392b', info: '#2980b9', warning: '#f39c12' };
  const toast = document.createElement('div');
  toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.18);margin-bottom:8px;animation:fadeUp .2s ease;max-width:340px;word-break:break-word;`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, duration);
};

// ── LOGOUT ──
function confirmLogout() {
  if (confirm('Are you sure you want to log out?')) {
    if (typeof showToast === 'function') {
      showToast('Logging out...', 'info');
    }
    setTimeout(() => {
      window.location.href = '../index.php?logout=1';
    }, 1000);
  }
}

// ── LOAD MODULE ──
async function loadModule(name) {
  const container = document.getElementById('mainContent');
  if (!container) return;
  try {
    const res = await fetch(`modules/${name}.php`);
    const html = await res.text();

    // Create or reuse a panel div
    let panel = document.getElementById('panel-' + name);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'panel-' + name;
      panel.className = 'panel';
      container.appendChild(panel);
    }
    panel.innerHTML = html;

    // Execute inline scripts in the loaded HTML
    panel.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) { newScript.src = oldScript.src; }
      else { newScript.textContent = oldScript.textContent; }
      document.body.appendChild(newScript);
      oldScript.remove();
    });

    // Load backup module state if available
    if (name === 'backup' && typeof window.loadLastBackupInfo === 'function') {
      window.loadLastBackupInfo();
    }
  } catch (e) {
    console.error('Failed to load module:', name, e);
  }
}

// ── MODALS ──
window.openModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};
window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};

// ── RESTRICT CLERK ACTIONS ──
// Prevents accidental add operations by overriding admin add functions
function clerkRestrict(fnName) {
  window[fnName] = function () {
    showToast('This action is restricted for the Clerk portal.', 'warning');
  };
}

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', async () => {
  // Load all modules into panels
  const modules = ['dashboard', 'residents', 'household', 'certificates', 'reports', 'backup', 'settings'];
  for (const m of modules) {
    await loadModule(m);
  }

  // Restore 2FA toggle and panel state from localStorage
  const saved2faState = localStorage.getItem('clerk-2fa-enabled');
  const toggle = document.getElementById('twoFactorToggle');
  const setupPanel = document.getElementById('twoFactorSetup');
  const enabledPanel = document.getElementById('twoFactorEnabled');
  if (toggle) {
    if (saved2faState === 'false') {
      toggle.classList.remove('on');
      if (setupPanel) setupPanel.style.display = 'none';
      if (enabledPanel) enabledPanel.style.display = 'none';
    } else if (saved2faState === 'true') {
      toggle.classList.add('on');
      if (window.is2faEnabled) {
        if (setupPanel) setupPanel.style.display = 'none';
        if (enabledPanel) enabledPanel.style.display = 'block';
      } else {
        if (setupPanel) setupPanel.style.display = 'block';
        if (enabledPanel) enabledPanel.style.display = 'none';
      }
    }
  }

  // Restrict add functions for clerk role
  clerkRestrict('openNewResidentForm');
  clerkRestrict('openNewHHForm');

  // Show dashboard first
  nav('dashboard', document.getElementById('nav-dashboard'));

  // Load initial data
  if (window.supabaseClient) {
    try {
      if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb();
      if (typeof loadPaidCertificates === 'function') await loadPaidCertificates();
      if (typeof initResidents === 'function') await initResidents();
    } catch (e) { /* ignore */ }
  }
});
// Start lightweight polling to keep dashboard in sync without manual refresh
// Polling strategy:
// - Certificates: reuse admin polling if available via startCertificatesPolling
// - Households & Residents: poll by calling loaders every `intervalMs`
(function startClerkRealtime(intervalMs = 1000) {
  // avoid double-start
  if (window._clerkRealtimeStarted) return;
  window._clerkRealtimeStarted = true;

  // Certificates: admin already exposes startCertificatesPolling
  try { if (typeof startCertificatesPolling === 'function') startCertificatesPolling(intervalMs); } catch (e) { /* ignore */ }

  // Residents polling
  window._clerkResidentsPoll = setInterval(async () => {
    try {
      if (typeof loadResidentsFromDb === 'function') await loadResidentsFromDb();
      else if (typeof initResidents === 'function') await initResidents();
    } catch (e) { console.warn('Residents polling error', e); }
  }, intervalMs);

  // Households polling
  window._clerkHouseholdsPoll = setInterval(async () => {
    try { if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb(); } catch (e) { console.warn('Households polling error', e); }
  }, intervalMs);

  // Provide a stop method
  window.stopClerkRealtime = function () {
    try { if (window._clerkResidentsPoll) clearInterval(window._clerkResidentsPoll); } catch (e) { }
    try { if (window._clerkHouseholdsPoll) clearInterval(window._clerkHouseholdsPoll); } catch (e) { }
    try { if (typeof stopCertificatesPolling === 'function') stopCertificatesPolling(); } catch (e) { }
    window._clerkRealtimeStarted = false;
  };
})();

// ── UPDATE ACCOUNT DETAILS ──
function updateAccountDetails() {
  const username = document.getElementById('settingsUsername').value.trim();
  const currentPassword = document.getElementById('settingsCurrentPassword').value;
  const newPassword = document.getElementById('settingsNewPassword').value;
  const confirmPassword = document.getElementById('settingsConfirmPassword').value;
  const messageBox = document.getElementById('accountDetailsMessage');

  if (!username) {
    messageBox.innerHTML = '<span class="text-danger">Username is required.</span>';
    return;
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      messageBox.innerHTML = '<span class="text-danger">Current password is required to change your password.</span>';
      return;
    }

    if (newPassword.length < 6) {
      messageBox.innerHTML = '<span class="text-danger">New password must be at least 6 characters.</span>';
      return;
    }

    if (newPassword !== confirmPassword) {
      messageBox.innerHTML = '<span class="text-danger">New password and confirmation do not match.</span>';
      return;
    }
  }

  const payload = {
    username,
    currentPassword,
    newPassword,
    confirmPassword
  };

  if (messageBox) {
    messageBox.innerHTML = '<span class="text-muted">Saving account details...</span>';
  }

  fetch('../admin/api/update_account.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to update account details.');
      }

      if (messageBox) {
        messageBox.innerHTML = '<span class="text-success">' + (data.message || 'Account details updated successfully.') + '</span>';
      }
      showToast(data.message || 'Account details updated successfully!', 'success');

      const currInput = document.getElementById('settingsCurrentPassword');
      const newInput = document.getElementById('settingsNewPassword');
      const confInput = document.getElementById('settingsConfirmPassword');
      if (currInput) currInput.value = '';
      if (newInput) newInput.value = '';
      if (confInput) confInput.value = '';
    })
    .catch((error) => {
      if (messageBox) {
        messageBox.innerHTML = '<span class="text-danger">' + error.message + '</span>';
      }
      showToast(error.message, 'error');
    });
}
window.updateAccountDetails = updateAccountDetails;

