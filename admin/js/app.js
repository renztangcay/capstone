function applyTheme(theme) {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', resolvedTheme);
  localStorage.setItem('admin-theme', resolvedTheme);
  if (toggle) {
    toggle.textContent = resolvedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    toggle.setAttribute('aria-label', `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  
  // Reinitialize charts with new theme colors
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

const panelTitles = {
  dashboard: 'Dashboard Overview', officials: 'Barangay Officials', residents: 'Resident Records',
  household: 'Household Management',
  certificates: 'Certificate Issuance', accounts: 'User Access Control',
  reports: 'Reports & Analytics',
  settings: 'System Settings', backup: 'Data Backup & Recovery'
};

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('admin-theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
});

function nav(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.textContent.trim().startsWith(panelTitles[id]?.split(' ')[0] || '')) n.classList.add('active');
    });
  }
  document.getElementById('topbar-title').textContent = panelTitles[id] || id;
  // Reset to list sub-panel for residents
  if (id === 'residents') showSubPanel('res-list');
  if (id === 'household') showHHSubPanel('hh-list');
  closeSidebar();
  // Init panels
  if (id === 'dashboard') initDashboard();
  if (id === 'officials') renderOfficials();
  if (id === 'residents') {
    if (typeof initResidents === 'function') initResidents(); else renderResidents();
  }
  if (id === 'household') {
    if (typeof initHousehold === 'function') initHousehold(); else renderHouseholds();
  }
  if (id === 'certificates') {
    if (typeof initCertificates === 'function') initCertificates(); else renderCerts();
  }
  if (id === 'backup') renderBackupPanel();
  if (id === 'settings') {
    if (typeof renderSystemLogs === 'function') renderSystemLogs();
    if (typeof startAdminSystemLogsRealtime === 'function') startAdminSystemLogsRealtime(1000);
  }
}

async function renderSystemLogs() {
  const logList = document.getElementById('logList');
  if (!logList) return;

  // Pre-load essential data for name resolution if missing on initial load
  try {
    if (window.supabaseClient) {
      if (!window.residents || window.residents.length === 0) {
        window.residents = await window.supabaseClient.select('residents');
      }
      if (!window.households || window.households.length === 0) {
        window.households = await window.supabaseClient.select('households');
      }
      if (!window.officials || window.officials.length === 0) {
        window.officials = await window.supabaseClient.select('officials');
      }
    }
  } catch (e) { console.warn('Could not pre-load data for logs:', e); }

  let logs = [];

  const escapeHtmlLog = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };



  // Color map for log types
  const colorMap = {
    residents: 'var(--sky)',
    households: 'var(--purple)',
    officials_added: 'var(--orange)',
    officials_modified: 'var(--orange)',
    officials_removed: 'var(--red)'
  };

  // Load audit logs from Supabase (persistent) and merge with localStorage (fast)
  let allAuditLogs = [];

  // 1. Load from Supabase audit_logs table
  try {
    if (window.supabaseClient) {
      const dbLogs = await window.supabaseClient.select('audit_logs', 'select=*&order=created_at.desc&limit=50');
      if (Array.isArray(dbLogs)) {
        dbLogs.forEach(dl => {
          allAuditLogs.push({
            table: dl.record_table,
            id: dl.record_id,
            time: dl.created_at,
            type: dl.action_type,
            fields: dl.fields || '',
            name: dl.record_name || '',
            user: dl.performed_by || '',
            _source: 'db'
          });
        });
      }
    }
  } catch (e) { console.warn('Could not load audit_logs from DB:', e); }

  // Local storage reading disabled - System is now 100% database-driven for audit logs

  // Native DB fallbacks removed - System relies strictly on persistent audit_logs table now

  // Render detailed audit logs
  allAuditLogs.forEach(ll => {
    const detail = ll.fields ? ` — updated: ${ll.fields}` : '';
    const prefix = (ll.user === 'Cash Management' || ll.user === 'Treasurer') ? 'Treasurer - ' : (ll.user ? `${ll.user} - ` : '');
    if (ll.table === 'residents') {
      const r = residents.find(x => String(x.id) === String(ll.id));
      const rName = r ? `${escapeHtmlLog(r.first)} ${escapeHtmlLog(r.last)}` : escapeHtmlLog(ll.name || ll.id);
      if (ll.type === 'added') logs.push({ text: `${prefix}Resident profile added: ${rName}`, time: new Date(ll.time), color: 'var(--sky)' });
      else logs.push({ text: `${prefix}Resident modified: ${rName}${detail}`, time: new Date(ll.time), color: 'var(--sky)' });
    } else if (ll.table === 'households') {
      const h = households.find(x => String(x.id) === String(ll.id));
      const hName = h ? escapeHtmlLog(h.head || h.household_head || 'a family') : escapeHtmlLog(ll.name || ll.id);
      if (ll.type === 'added') logs.push({ text: `${prefix}Household record added: ${hName}`, time: new Date(ll.time), color: 'var(--purple)' });
      else logs.push({ text: `${prefix}Household modified: ${hName}${detail}`, time: new Date(ll.time), color: 'var(--purple)' });
    } else if (ll.table === 'officials') {
      if (ll.type === 'removed') {
        logs.push({ text: `${prefix}Official removed: ${escapeHtmlLog(ll.name || ll.id)} (${escapeHtmlLog(ll.fields || 'Role')})`, time: new Date(ll.time), color: 'var(--red)' });
      } else {
        const o = officials.find(x => String(x.id) === String(ll.id) || x.name === ll.id);
        const oName = o ? escapeHtmlLog(o.first_name || o.name) : escapeHtmlLog(ll.name || ll.id);
        if (ll.type === 'added') {
          logs.push({ text: `${prefix}Official added: ${oName} (${escapeHtmlLog(ll.fields || (o && (o.position || o.role)) || '')})`, time: new Date(ll.time), color: 'var(--orange)' });
        } else {
          logs.push({ text: `${prefix}Official modified: ${oName}${detail}`, time: new Date(ll.time), color: 'var(--orange)' });
        }
      }
    } else if (ll.table === 'certificates') {
      const cName = escapeHtmlLog(ll.name || ll.id);
      if (ll.type === 'issued') {
        logs.push({ text: `${prefix}Certificate issued: ${cName}${detail}`, time: new Date(ll.time), color: 'var(--green)' });
      } else {
        logs.push({ text: `${prefix}Certificate modified: ${cName}${detail}`, time: new Date(ll.time), color: 'var(--green)' });
      }
    } else if (ll.table === 'system') {
      if (ll.type === 'backup') {
        logs.push({ text: `${prefix}System Backup Created.${detail}`, time: new Date(ll.time), color: 'var(--purple, #9b59b6)', rawType: ll.type, rawTable: ll.table });
      } else if (ll.type === 'restore') {
        logs.push({ text: `${prefix}System Restore Performed${detail}`, time: new Date(ll.time), color: 'var(--red)', rawType: ll.type, rawTable: ll.table });
      } else if (ll.type === 'login' || ll.type === 'logout') {
        const d = new Date(ll.time);
        let datePart = '—';
        let timePart = '—';
        if (!isNaN(d.getTime())) {
          datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        const actionText = ll.type === 'login' ? 'logged in' : 'logged out';
        const logColor = ll.type === 'login' ? 'var(--sky, #3498db)' : 'var(--orange, #e67e22)';
        logs.push({
          text: `<strong>${escapeHtmlLog(ll.name)}</strong> ${actionText}: ${datePart} at ${timePart}`,
          time: d,
          color: logColor,
          rawType: ll.type,
          rawTable: ll.table
        });
      }
    } else if (ll.table === 'treasurer') {
      const tName = escapeHtmlLog(ll.name || ll.id);
      logs.push({ text: `${prefix}Payment recorded: ${tName}${detail}`, time: new Date(ll.time), color: 'var(--purple, #9b59b6)', rawType: 'payment', rawTable: ll.table });
    }

    // Fallback for previous logs that didn't have rawType/rawTable explicitly pushed in this if-else chain
    // Actually, let's just add it to all logs pushed above.
  });

  // Apply filter
  const filterVal = document.getElementById('sysLogFilter') ? document.getElementById('sysLogFilter').value : 'all';
  const dateFilterVal = document.getElementById('sysLogDateFilter') ? document.getElementById('sysLogDateFilter').value : '';

  if (filterVal !== 'all' || dateFilterVal !== '') {
    logs = logs.filter(l => {
      // Date filter
      if (dateFilterVal) {
        // format local date to YYYY-MM-DD
        const lDateStr = l.time.getFullYear() + '-' + String(l.time.getMonth() + 1).padStart(2, '0') + '-' + String(l.time.getDate()).padStart(2, '0');
        if (lDateStr !== dateFilterVal) return false;
      }

      // Action filter
      if (filterVal !== 'all') {
        const t = l.text.toLowerCase();
        if (filterVal === 'added') return t.includes('added');
        if (filterVal === 'modified') return t.includes('modified');
        if (filterVal === 'issued') return t.includes('issued') || t.includes('payment');
        if (filterVal === 'system') return t.includes('backup') || t.includes('restore');
        if (filterVal === 'login') return t.includes('logged in') || t.includes('logged out');
      }
      return true;
    });
  }

  // Sort logs by time, newest first
  logs.sort((a, b) => b.time - a.time);

  // Take top 100 logs (so it doesn't crash the browser, but enough for scrolling)
  logs = logs.slice(0, 100);

  if (logs.length === 0) {
    logList.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12.5px;">No recent system activity.</div>`;
    return;
  }

  const topLogKey = logs[0] ? `${logs[0].time.toISOString()}|${logs[0].text}` : null;
  const hadNewTopLog = topLogKey && topLogKey !== window._lastSystemLogsTopKey;
  window._lastSystemLogsTopKey = topLogKey;

  logList.innerHTML = logs.map(log => `
    <div class="log-entry">
      <div class="log-dot" style="background:${log.color}"></div>
      <div>
        <div class="log-text">${log.text}</div>
        <div class="log-time">${log.time.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
      </div>
    </div>
  `).join('');

  // If a new log arrived, scroll to the top to show the latest entry.
  if (hadNewTopLog) logList.scrollTop = 0;
}

function startAdminSystemLogsRealtime(intervalMs = 1000) {
  if (window._adminSystemLogsRealtimeStarted) return;
  window._adminSystemLogsRealtimeStarted = true;

  async function refreshSystemLogs() {
    const settingsPanel = document.getElementById('panel-settings');
    if (!settingsPanel?.classList.contains('active')) return;
    if (typeof renderSystemLogs === 'function') await renderSystemLogs();
  }

  window._adminSystemLogsRealtimePoll = setInterval(async () => {
    try {
      await refreshSystemLogs();
    } catch (e) {
      console.warn('Admin system logs realtime poll error', e);
    }
  }, intervalMs);

  window.stopAdminSystemLogsRealtime = function () {
    if (window._adminSystemLogsRealtimePoll) clearInterval(window._adminSystemLogsRealtimePoll);
    window._adminSystemLogsRealtimePoll = null;
    window._adminSystemLogsRealtimeStarted = false;
  };
}

// Basic HTML-escape helper to prevent XSS when inserting untrusted strings into innerHTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showSubPanel(id) {
  document.querySelectorAll('#panel-residents .sub-panel').forEach(p => p.classList.remove('active'));
  const sp = document.getElementById(id);
  if (sp) sp.classList.add('active');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIDEBAR (mobile)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODALS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function resetIndigencyModal() {
  const today = new Date().toISOString().split('T')[0];
  const indName = document.getElementById('indName');
  const indCivil = document.getElementById('indCivil');
  const indAddress = document.getElementById('indAddress');
  const indPurpose = document.getElementById('indPurpose');
  const indDate = document.getElementById('indDate');
  const controlEl = document.getElementById('indControlNo');
  const hid = document.getElementById('indResidentId');
  const resultDiv = document.getElementById('ind-resident-results');
  if (indName) { indName.value = ''; indName.style.borderColor = ''; indName.style.background = ''; }
  if (indCivil) indCivil.value = '';
  if (indAddress) indAddress.value = '';
  if (indPurpose) indPurpose.value = '';
  if (indDate) indDate.value = today;
  if (controlEl) controlEl.value = '';
  if (hid) hid.value = '';
  if (resultDiv) { resultDiv.style.display = 'none'; resultDiv.innerHTML = ''; }
  // Remove the selection indicator checkmark
  const indicator = document.getElementById('indNameSelectedIndicator');
  if (indicator) indicator.remove();
  if (typeof updateIndigencyPreview === 'function') updateIndigencyPreview();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    if (document.querySelectorAll('.modal-overlay.open').length === 0) {
      document.body.style.overflow = '';
    }
  }
  if (id === 'modal-indigency' && typeof resetIndigencyModal === 'function') resetIndigencyModal();
}
function factoryResetAccounts() {
  closeModal('modal-factory-reset');
  var logList = document.getElementById('logList');
  if (logList) {
    var now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    var entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = '<div class="log-dot" style="background:var(--red)"></div><div><div class="log-text">Factory Reset executed — all system accounts and role assignments cleared</div><div class="log-time">Today, ' + escapeHtml(now) + '</div></div>';
    logList.prepend(entry);
  }
  showToast('Factory reset complete. All system accounts and role assignments have been cleared. Resident records and audit logs are preserved.', 'success');
}

// Modal overlay click listener disabled to prevent closing when clicking outside
// TOAST
// ══════════════════════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️ ' };
  const c = document.getElementById('toastContainer');
  if (!c) return;
  // Clear any existing toasts to only show one at a time and prevent stacking/duplicates
  c.innerHTML = '';

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️ '}</span><span>${escapeHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ══════════════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════════════
function confirmLogout() {
  if (confirm('Are you sure you want to logout from the Barangay Admin System?')) {
    showToast('Logging out… Session terminated.', 'info');
    setTimeout(() => { window.location.href = "../index.php?logout=1"; }, 1000);
  }
}

// ══════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════════════════════════════════
const _globalSearch = document.getElementById('globalSearch');
if (_globalSearch) {
  _globalSearch.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    if (!q) return;
    const rMatch = (window.residents || []).filter(r => `${r.first} ${r.last}`.toLowerCase().includes(q));
    const cMatch = (window.certificates || []).filter(c => (c.resident || '').toLowerCase().includes(q));
    if (rMatch.length) { nav('residents', null); setTimeout(() => filterResidents(q), 100); }
    else if (cMatch.length) { nav('certificates', null); setTimeout(() => filterCertsTable(q), 100); }
  });
}

// ══════════════════════════════════════════════════════════════════════
// MOBILE SEARCH TOGGLE
// ══════════════════════════════════════════════════════════════════════
function toggleMobileSearch() {
  const bar = document.getElementById('mobileSearchBar');
  const isVisible = bar.style.display !== 'none';
  bar.style.display = isVisible ? 'none' : 'flex';
  if (!isVisible) {
    const gsm = document.getElementById('globalSearchMobile');
    if (gsm) gsm.focus();
  }
}

// ══════════════════════════════════════════════════════════════════════
// INIT – Bootstrap the app on page load
// ══════════════════════════════════════════════════════════════════════
function updateDashboardHouseholds() {
  // Prefer dashboard module's updater if available
  if (typeof window.updateDashboardStats === 'function') {
    try { window.updateDashboardStats(); return; } catch (e) { /* fallthrough */ }
  }

  // Fallback: safely read global households and update simple count/delta
  const el = document.getElementById('dash-hh-count');
  const delta = document.getElementById('dash-hh-delta');
  const hh = (window.households && Array.isArray(window.households)) ? window.households.length : 0;
  if (el) el.textContent = hh;
  if (delta) delta.textContent = hh === 1 ? '1 household registered' : `${hh} households registered`;
}

async function loadModules() {
  const modules = ['dashboard', 'officials', 'residents', 'household', 'certificates', 'accounts', 'reports', 'settings', 'backup'];
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  const promises = modules.map(async mod => {
    try {
      // Load PHP fragment
      const resp = await fetch(`modules/${mod}.php`);
      if (resp.ok) {
        const html = await resp.text();
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = `panel-${mod}`;
        panel.innerHTML = html;
        mainContent.appendChild(panel);

        // Execute inline module scripts that are loaded with the PHP fragment
        panel.querySelectorAll('script').forEach(oldScript => {
          const newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          document.body.appendChild(newScript);
          oldScript.remove();
        });

        // Run module-specific init after DOM insertion so in-module elements exist
        try {
          if (mod === 'residents' && typeof initResidents === 'function') await initResidents();
          if (mod === 'household' && typeof initHousehold === 'function') await initHousehold();
          if (mod === 'officials' && typeof renderOfficials === 'function') renderOfficials();
          if (mod === 'certificates' && typeof loadPaidCertificates === 'function') await loadPaidCertificates();
        } catch (e) {
          console.warn(`Module init failed for ${mod}:`, e);
        }

      }
    } catch (err) {
      console.error(`Failed to load module: ${mod}`, err);
    }
  });

  await Promise.all(promises);

  // Load modals
  try {
    const resp = await fetch('modules/modals.php');
    if (resp.ok) {
      const container = document.getElementById('modalContainer');
      if (container) container.innerHTML = await resp.text();

      // Modal overlay click listener disabled to prevent closing when clicking outside
    }
  } catch (err) {
    console.error('Failed to load modals', err);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  await loadModules();

  // Restore 2FA toggle and panel state from localStorage
  const saved2faState = localStorage.getItem('admin-2fa-enabled');
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

  nav('dashboard', document.querySelector('.nav-item.active'));
  setTimeout(initCharts, 100);
  updateDashboardHouseholds();
});

