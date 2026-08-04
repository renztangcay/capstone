/**
 * ══════════════════════════════════════════════
 *  TREASURER DASHBOARD — LOGIC
 *  Barangay Management System
 * ══════════════════════════════════════════════
 */

/* ── DATA STORE ── */
let ledger = [];

/* ── THEME ── */
function applyTheme(theme) {
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolvedTheme;
  localStorage.setItem('treasurer-theme', resolvedTheme);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const darkMode = resolvedTheme === 'dark';
    toggle.setAttribute('aria-pressed', String(darkMode));
    toggle.setAttribute('aria-label', darkMode ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
    toggle.innerHTML = `<i class="bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}" aria-hidden="true"></i>`;
  }
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
window.toggleTheme = toggleTheme;

const savedTheme = localStorage.getItem('treasurer-theme');
applyTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

/* ── SAMPLE RESIDENTS (removed) ── */
const sampleResidents = [];
const PHILIPPINE_TIME_ZONE = 'Asia/Manila';

function parseDateValue(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return new Date();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    if (/^\d{4}-\d{2}-\d{2}[T ]/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date(value);
}

function getPhilippineDateString(value = new Date()) {
  const date = parseDateValue(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: PHILIPPINE_TIME_ZONE
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}-${month}-${day}`;
}

function getPhilippineTimeString(value = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PHILIPPINE_TIME_ZONE
  }).format(parseDateValue(value));
}

function formatPhilippineDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PHILIPPINE_TIME_ZONE
  }).format(parseDateValue(value));
}

function formatLedgerDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: PHILIPPINE_TIME_ZONE
  }).format(parseDateValue(value));
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', async () => {
  // Loading screen
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 1500);

  // Set today's date in the topbar
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    dateEl.textContent = formatPhilippineDate();
  }

  // Load all page modules
  await loadModule('page-dashboard', 'modules/dashboard.php');
  await loadModule('page-entry', 'modules/entry.php');
  await loadModule('page-history', 'modules/history.php');
  await loadModule('page-reports', 'modules/reports.php');
  await loadModule('page-settings', 'modules/settings.php');

  // Restore 2FA toggle and panel state from localStorage
  const saved2faState = localStorage.getItem('treasurer-2fa-enabled');
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

  // Populate all datalists
  populateDatalist('resident-datalist');
  populateDatalist('resident-datalist-full');

  // Initialize ledger (in-memory)
  ledger = [];

  // Load persisted transactions from Supabase so the page reflects DB state
  await loadTransactions();

  // Render initial state
  renderLedger();
  renderFullLedger();
  updateStats();

  // Start real-time polling
  startTreasurerPolling();
});

let _treasurerPollTimer = null;

async function loadTransactions() {
  if (window.supabaseClient) {
    try {
      const rows = await window.supabaseClient.select('treasurer_transactions', 'select=id,resident_id,resident_name,certificate_type,control_number,or_number,amount,ctc_number,ctc_amount,bc_number,payment_date,status,created_at&order=created_at.desc,payment_date.desc&limit=500');
      if (Array.isArray(rows)) {
        ledger = rows.map(r => {
          const created = r.created_at ? parseDateValue(r.created_at) : (r.payment_date ? parseDateValue(r.payment_date) : new Date());
          const dateObj = parseDateValue(r.payment_date || created);
          const formattedDate = formatLedgerDate(dateObj);
          return {
            id: r.id,
            time: getPhilippineTimeString(created),
            date: formattedDate,
            name: r.resident_name || '',
            cert: r.certificate_type || '',
            certType: r.certificate_type || '',
            orNo: r.or_number || '',
            amount: parseFloat(r.amount) || 0,
            ctcNo: r.ctc_number || '',
            ctcAmount: parseFloat(r.ctc_amount) || 0,
            bcNo: r.bc_number || '',
            status: r.status || 'paid',
            locked: true,
            residentId: r.resident_id || null,
            treasurerTransactionId: r.id,
            pushed: true,
            imported: true
          };
        });
      }
    } catch (e) {
      console.warn('Failed to load treasurer transactions from Supabase', e);
    }
  }
}

function startTreasurerPolling() {
  if (_treasurerPollTimer) clearInterval(_treasurerPollTimer);
  _treasurerPollTimer = setInterval(async () => {
    try {
      const prevSnapshot = JSON.stringify(ledger);
      await loadTransactions();
      const newSnapshot = JSON.stringify(ledger);
      if (prevSnapshot !== newSnapshot) {
        renderLedger();
        renderFullLedger();
        updateStats();
      }
    } catch (e) {
      console.warn('Treasurer polling error:', e);
    }
  }, 1000);
}


/* ── LOAD A MODULE INTO A PAGE CONTAINER ── */
async function loadModule(containerId, url) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const container = document.getElementById(containerId);
      if (container) {
        const html = await res.text();
        container.innerHTML = html;
        // Execute inline scripts in the loaded HTML
        container.querySelectorAll('script').forEach(oldScript => {
          const newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          document.body.appendChild(newScript);
          oldScript.remove();
        });
      }
    }
  } catch (e) {
    console.error(`Failed to load module: ${url}`, e);
  }
}

/* ── POPULATE RESIDENT DATALIST ── */
function populateDatalist(id) {
  const list = document.getElementById(id);
  if (!list) return;
  list.innerHTML = sampleResidents.map(r => `<option value="${r}">`).join('');
}

/* ── SEARCH RESIDENTS FROM DATABASE ── */
let searchTimeout = null;
let selectedResidentNameFull = '';
async function searchResidents(query) {
  const input = document.getElementById('t-resident-full');
  const resultDiv = document.getElementById('resident-search-results');
  const residentIdInput = document.getElementById('t-resident-id-full');

  if (!input || !resultDiv || !residentIdInput) return;

  // Clear selection if the typed text no longer matches the selected resident name
  if (selectedResidentNameFull && query.trim() !== selectedResidentNameFull) {
    residentIdInput.value = '';
    selectedResidentNameFull = '';
  }

  clearTimeout(searchTimeout);

  // Clear if empty
  if (!query.trim()) {
    resultDiv.style.display = 'none';
    residentIdInput.value = '';
    selectedResidentNameFull = '';
    return;
  }

  // Debounce search
  searchTimeout = setTimeout(async () => {
    try {
      resultDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">Searching...</div>';
      resultDiv.style.display = 'block';

      // Use Supabase client directly to search residents
      if (!window.supabaseClient) {
        throw new Error('Database client not available');
      }

      const residents = await window.supabaseClient.select('residents', 'select=id,first,last,mid,suffix,address,purok&status=eq.active&limit=1000000');

      if (!residents || !Array.isArray(residents)) {
        resultDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">No residents found</div>';
        return;
      }

      // Filter results based on query
      const query_lower = query.toLowerCase();
      const parts = query_lower.split(' ').filter(p => p.length > 0);

      const filtered = residents.filter(resident => {
        const fullName = (
          (resident.last || '') + ' ' +
          (resident.first || '') + ' ' +
          (resident.mid || '') + ' ' +
          (resident.suffix || '')
        ).toLowerCase();

        // Check if all parts of the query match
        return parts.every(part => fullName.includes(part));
      });

      if (filtered.length === 0) {
        resultDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">No residents found</div>';
        return;
      }

      // Build search results dropdown
      resultDiv.innerHTML = filtered.map((resident) => {
        // Build full name
        let fullName = (resident.first || '');
        if (resident.mid) {
          fullName += ' ' + resident.mid.trim().charAt(0).toUpperCase() + '.';
        }
        fullName += ' ' + (resident.last || '');
        if (resident.suffix) {
          fullName += ' ' + resident.suffix;
        }
        fullName = fullName.replace(/\s+/g, ' ').trim();

        const safeId = (resident.id + '').replace(/'/g, "\\'");
        const safeName = fullName.replace(/'/g, "\\'");

        return `
        <div style="padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.2s;" 
             class="search-result-item" 
             data-id="${resident.id}" 
             data-name="${fullName}"
             onmouseover="this.style.background='var(--surface-2)'" 
             onmouseout="this.style.background='transparent'"
             onclick="selectResident('${safeId}', '${safeName}')">
          <div style="font-weight: 500;">${fullName}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${resident.address || ''} ${resident.address && resident.purok ? '-' : ''} ${resident.purok || ''}</div>
        </div>
      `;
      }).join('');
      resultDiv.style.display = 'block';

    } catch (e) {
      console.error('Search error:', e);
      resultDiv.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--red); font-size: 12px;">Error: ${e.message}</div>`;
      resultDiv.style.display = 'block';
    }
  }, 300);
}
window.searchResidents = searchResidents;

/* ── SELECT RESIDENT FROM SEARCH RESULTS ── */
function selectResident(residentId, residentName) {
  const residentInput = document.getElementById('t-resident-full');
  const residentIdInput = document.getElementById('t-resident-id-full');
  if (!residentInput || !residentIdInput) return;

  residentInput.value = residentName;
  residentIdInput.value = residentId;
  selectedResidentNameFull = residentName.trim();
  document.getElementById('resident-search-results').style.display = 'none';
}
window.selectResident = selectResident;

/* ── CERTIFICATE CHANGE — Show/Hide BC No. (Dashboard) ── */
function onCertChange() {
  const sel = document.getElementById('t-cert-type');
  const bcGroup = document.getElementById('bc-no-group');
  if (!sel || !bcGroup) return;
  bcGroup.style.display = sel.value === 'Clearance' ? 'block' : 'none';
  if (sel.value !== 'Clearance') {
    const bcInput = document.getElementById('t-bc-no');
    if (bcInput) bcInput.value = '';
  }
}
window.onCertChange = onCertChange;

/* ── CERTIFICATE CHANGE — Show/Hide BC No. (Full Page) ── */
function onCertChangeFull() {
  const sel = document.getElementById('t-cert-type-full');
  const bcGroup = document.getElementById('bc-no-group-full');
  if (!sel || !bcGroup) return;
  bcGroup.style.display = sel.value === 'Clearance' ? 'block' : 'none';
  if (sel.value !== 'Clearance') {
    const bcInput = document.getElementById('t-bc-no-full');
    if (bcInput) bcInput.value = '';
  }
}
window.onCertChangeFull = onCertChangeFull;

/* ── SAVE PAYMENT (Dashboard Quick Entry) ── */
function savePayment(formEl) {
  const resident = document.getElementById('t-resident')?.value.trim();
  const certSel = document.getElementById('t-cert-type');
  const certText = certSel?.options[certSel.selectedIndex]?.text || '';
  const certVal = certSel?.value || '';
  const orNo = document.getElementById('t-or-no')?.value.trim();
  const amount = 0; // Price removed per requirements
  const ctcNo = document.getElementById('t-ctc-no')?.value.trim() || '';
  const ctcAmount = parseFloat(document.getElementById('t-ctc-amount')?.value) || 0;
  const bcNo = document.getElementById('t-bc-no')?.value.trim() || '';

  if (!resident || !certVal || !orNo) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }
  // If Supabase is available, persist payment and certificate immediately
  (async () => {
    const certTypeMap = {
      'Clearance': 'Barangay Clearance',
      'Residency': 'Certificate of Residency',
      'Indigency': 'Certificate of Indigency'
    };
    const certTypeDisplay = certTypeMap[certVal] || certVal;

    // generate control number
    const prefixMap = { Clearance: 'BC', Indigency: 'IN', Residency: 'RES' };
    const prefix = prefixMap[certVal] || 'CERT';
    const controlNo = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;

    const today = getPhilippineDateString();

    let paymentId = null;
    let certificateId = null;

    try {
      if (window.supabaseClient) {
        const paymentPayload = {
          resident_id: null,
          resident_name: resident,
          certificate_type: certTypeDisplay,
          or_number: orNo,
          amount: amount,
          ctc_number: ctcNo || null,
          ctc_amount: ctcAmount,
          bc_number: certVal === 'Clearance' ? (bcNo || null) : null,
          payment_date: today,
          status: 'paid'
        };
        try {
          const paymentResult = await window.supabaseClient.insert('payments', paymentPayload);
          if (Array.isArray(paymentResult) && paymentResult[0]?.id) paymentId = paymentResult[0].id;
        } catch (e) {
          if (e.message && (e.message.includes('23505') || e.message.includes('duplicate key'))) throw e;
          console.warn('Payment insert warning (quick):', e.message || e);
        }

        const certPayload = {
          resident_id: null,
          resident_name: resident,
          certificate_type: certTypeDisplay,
          control_number: controlNo,
          or_number: orNo,
          amount_paid: amount,
          status: 'paid',
          issued_date: null
        };
        if (ctcNo) certPayload.ctc_number = ctcNo;
        if (ctcAmount) certPayload.ctc_amount = ctcAmount;
        if (certVal === 'Clearance' && bcNo) certPayload.bc_number = bcNo;
        if (paymentId) certPayload.payment_id = paymentId;

        try {
          const certResult = await window.supabaseClient.insert('certificates', certPayload);
          if (Array.isArray(certResult) && certResult[0]?.id) certificateId = certResult[0].id;
        } catch (e) {
          const msg = (e && e.message) ? e.message : String(e);
          if (msg.includes('ctc_amount') || msg.includes('ctc_number') || (e && e.code === 'PGRST204')) {
            delete certPayload.ctc_number; delete certPayload.ctc_amount;
            const certResult = await window.supabaseClient.insert('certificates', certPayload);
            if (Array.isArray(certResult) && certResult[0]?.id) certificateId = certResult[0].id;
          } else {
            if (msg.includes('23505') || msg.includes('duplicate key')) throw e;
            console.warn('Certificate insert (quick) failed:', e);
          }
        }
      }
    } catch (err) {
      console.error('Quick payment save error:', err);
      let errMsg = err.message;
      if (errMsg && (errMsg.includes('23505') || errMsg.includes('duplicate key'))) {
        errMsg = 'The O.R. Number already exists for this Certificate Type in the current year. Please use a different one.';
        showToast(errMsg, 'error');
        return; // Stop the flow
      }
    }

    const entry = {
      id: Date.now(),
      time: getPhilippineTimeString(),
      date: formatLedgerDate(),
      name: resident,
      cert: certText,
      certType: certVal,
      orNo: orNo,
      amount: amount,
      ctcNo: ctcNo,
      ctcAmount: ctcAmount,
      bcNo: certVal === 'Clearance' ? bcNo : '',
      status: 'paid',
      locked: true,
      paymentId: paymentId,
      certificateId: certificateId,
      controlNumber: controlNo,
      pushed: !!certificateId || !!paymentId
    };

    ledger.unshift(entry);
    if (formEl) formEl.reset();
    const bcGroupEl = document.getElementById('bc-no-group');
    if (bcGroupEl) bcGroupEl.style.display = 'none';

    renderLedger();
    renderFullLedger();
    updateStats();
    showToast(`Payment recorded — ${resident} (${entry.cert}) — O.R. ${orNo}`, 'success');

    // Audit log for treasurer quick payment
    try {
      const currentUser = 'Treasurer';
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'treasurer',
          record_id: String(paymentId || entry.id || ''),
          action_type: 'payment',
          fields: `O.R. No - ${orNo}, Type - ${certText}, Amount - ${amount}`,
          record_name: resident,
          performed_by: currentUser
        });
      }
    } catch (logErr) { console.error('Audit log failed:', logErr); }

    document.dispatchEvent(new CustomEvent('paymentSaved', { detail: entry }));
  })();
}
window.savePayment = savePayment;

/* ── SAVE PAYMENT (Full Page Entry) ── */
async function savePaymentFull(formEl) {
  const residentId = document.getElementById('t-resident-id-full')?.value.trim();
  const residentName = document.getElementById('t-resident-full')?.value.trim();
  const certSel = document.getElementById('t-cert-type-full');
  const certText = certSel?.options[certSel.selectedIndex]?.text || '';
  const certVal = certSel?.value || '';
  const orNo = document.getElementById('t-or-no-full')?.value.trim();
  const amount = parseFloat(document.getElementById('t-amount-full')?.value) || 0;
  const ctcNo = document.getElementById('t-ctc-no-full')?.value.trim() || '';
  const ctcAmount = parseFloat(document.getElementById('t-ctc-amount-full')?.value) || 0;
  const bcNo = document.getElementById('t-bc-no-full')?.value.trim() || '';
  const ctcAmountVal = document.getElementById('t-ctc-amount-full')?.value.trim() || '';

  if (!residentId || !residentName || !certVal || !orNo || !ctcNo || !ctcAmountVal) {
    showToast('Please select a resident and fill in all required fields.', 'error');
    return;
  }

  if (!window.supabaseClient) {
    showToast('Database client not available. Please refresh the page.', 'error');
    return;
  }

  // Map short cert type codes to full display names (matching DB values)
  const certTypeMap = {
    'Clearance': 'Barangay Clearance',
    'Residency': 'Certificate of Residency',
    'Indigency': 'Certificate of Indigency',
  };
  const certTypeDisplay = certTypeMap[certVal] || certVal;

  // Generate control number
  const prefixMap = { Clearance: 'BC', Indigency: 'IN', Residency: 'RES' };
  const prefix = prefixMap[certVal] || 'CERT';
  const controlNo = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;

  const today = getPhilippineDateString();

  // Show loading state
  const submitBtn = formEl.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

  try {
    // ── 1. Insert payment record directly into Supabase ───────────────────
    const paymentPayload = {
      resident_id: parseInt(residentId, 10),
      resident_name: residentName,
      certificate_type: certTypeDisplay,
      or_number: orNo,
      amount: amount,
      ctc_number: ctcNo || null,
      ctc_amount: ctcAmount,
      bc_number: certVal === 'Clearance' ? (bcNo || null) : null,
      payment_date: today,
      status: 'paid',
    };

    let paymentId = null;
    try {
      const paymentResult = await window.supabaseClient.insert('payments', paymentPayload);
      if (Array.isArray(paymentResult) && paymentResult[0]?.id) {
        paymentId = paymentResult[0].id;
      }
    } catch (e) {
      if (e.message && (e.message.includes('23505') || e.message.includes('duplicate key'))) throw e;
      // Payment table may not have all columns — log but continue to certificate
      console.warn('Payment insert warning:', e.message);
    }

    // ── 2. Insert certificate record directly into Supabase ───────────────
    const certPayload = {
      resident_id: parseInt(residentId, 10),
      resident_name: residentName,
      certificate_type: certTypeDisplay,
      control_number: controlNo,
      or_number: orNo,
      amount_paid: amount,
      status: 'paid',
      issued_date: null,
    };
    // include CTC info when provided so admin modal can display it
    if (ctcNo) certPayload.ctc_number = ctcNo;
    if (ctcAmount) certPayload.ctc_amount = ctcAmount;
    if (certVal === 'Clearance' && bcNo) certPayload.bc_number = bcNo;
    if (paymentId) certPayload.payment_id = paymentId;

    let certResult = null;
    try {
      certResult = await window.supabaseClient.insert('certificates', certPayload);
    } catch (e) {
      // If the certificates table doesn't have ctc columns, retry without them
      const msg = (e && e.message) ? e.message : String(e);
      if (msg.includes('ctc_amount') || msg.includes('ctc_number') || (e && e.code === 'PGRST204')) {
        // remove possible ctc fields and retry
        delete certPayload.ctc_number;
        delete certPayload.ctc_amount;
        try {
          certResult = await window.supabaseClient.insert('certificates', certPayload);
        } catch (e2) {
          console.warn('Certificate insert retry failed:', e2);
          throw e2;
        }
      } else {
        throw e;
      }
    }
    const certificateId = Array.isArray(certResult) && certResult[0]?.id ? certResult[0].id : null;

    // ── 3. Update local ledger ────────────────────────────────────────────
    const entry = {
      id: Date.now(),
      time: getPhilippineTimeString(),
      date: formatLedgerDate(),
      name: residentName,
      cert: certText,
      certType: certVal,
      orNo: orNo,
      amount: amount,
      ctcNo: ctcNo,
      ctcAmount: ctcAmount,
      bcNo: certVal === 'Clearance' ? bcNo : '',
      status: 'paid',
      locked: true,
      residentId: residentId,
      paymentId: paymentId,
      certificateId: certificateId,
      controlNumber: controlNo,
    };

    // Also insert into treasurer_transactions for transaction history
    try {
      if (window.supabaseClient) {
        const txPayload = {
          resident_id: entry.residentId ? parseInt(entry.residentId, 10) : null,
          resident_name: entry.name,
          certificate_type: entry.certType || entry.cert,
          control_number: entry.controlNumber || null,
          or_number: entry.orNo || '',
          amount: entry.amount || 0,
          ctc_number: entry.ctcNo || null,
          ctc_amount: entry.ctcAmount || null,
          bc_number: entry.bcNo || null,
          payment_date: getPhilippineDateString(),
          status: entry.status || 'paid',
          source: 'treasurer-ui'
        };
        try {
          const txRes = await window.supabaseClient.insert('treasurer_transactions', txPayload);
          if (Array.isArray(txRes) && txRes[0]?.id) {
            entry.treasurerTransactionId = txRes[0].id;
            console.log('treasurer_transactions insert result', txRes);
          } else {
            console.warn('treasurer_transactions insert returned empty result', txRes);
          }
        } catch (txErr) {
          console.error('treasurer_transactions insert error', txErr);
          entry.importError = (txErr && txErr.message) ? txErr.message : String(txErr);
          if (typeof showToast === 'function') showToast('Transaction history save failed: ' + entry.importError, 'error');
          // do not block the flow — continue
        }
      }
    } catch (err) {
      console.error('Error while attempting treasurer_transactions insert', err);
    }

    ledger.unshift(entry);

    if (formEl) formEl.reset();
    const bcGroup = document.getElementById('bc-no-group-full');
    if (bcGroup) bcGroup.style.display = 'none';
    const hiddenId = document.getElementById('t-resident-id-full');
    if (hiddenId) hiddenId.value = '';

    renderLedger();
    renderFullLedger();
    updateStats();
    showToast(`Payment recorded — ${residentName} (${certText}) — O.R. ${orNo}`, 'success');

    // Audit log for treasurer full payment entry
    try {
      const currentUser = 'Treasurer';
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'treasurer',
          record_id: String(paymentId || entry.id || ''),
          action_type: 'payment',
          fields: `O.R. No - ${orNo}, Type - ${certText}, Amount - ${amount}`,
          record_name: residentName,
          performed_by: currentUser
        });
      }
    } catch (logErr) { console.error('Audit log failed:', logErr); }

    document.dispatchEvent(new CustomEvent('paymentSaved', { detail: entry }));

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

  } catch (error) {
    console.error('Payment save error:', error);
    let errMsg = error.message || String(error);
    if (errMsg.includes('23505') || errMsg.includes('duplicate key')) {
      errMsg = 'The O.R. Number already exists for this Certificate Type in the current year. Please use a different one.';
    }
    showToast('Error saving payment: ' + errMsg, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}
window.savePaymentFull = savePaymentFull;

// Push local ledger (localStorage) entries to Supabase payments & certificates tables
async function pushLocalLedgerToSupabase(opts = { confirm: true }) {
  if (!window.supabaseClient) {
    showToast && showToast('Supabase client not available. Refresh the page.', 'error');
    return;
  }

  // Use in-memory ledger entries that haven't been pushed yet
  let local = (ledger || []).filter(e => !e.pushed);
  if (!local.length) {
    showToast && showToast('No un-pushed local transactions found.', 'info');
    return 0;
  }

  if (opts.confirm) {
    const proceed = confirm(`Push ${local.length} local transaction(s) to Supabase?`);
    if (!proceed) return;
  }

  let pushed = 0;
  for (let i = 0; i < local.length; i++) {
    const entry = local[i];
    try {
      if (entry.pushed) continue; // already pushed

      // Prepare payment payload
      const paymentPayload = {
        resident_id: entry.residentId ? parseInt(entry.residentId, 10) : null,
        resident_name: entry.name || entry.resident || '',
        certificate_type: (entry.certType && entry.certType.length) ? entry.certType : (entry.cert || ''),
        or_number: entry.orNo || entry.orNo || entry.or_number || '',
        amount: entry.amount || entry.amountPaid || 0,
        ctc_number: entry.ctcNo || entry.ctcNo || null,
        ctc_amount: entry.ctcAmount || entry.ctcAmount || null,
        bc_number: entry.bcNo || entry.bcNo || null,
        payment_date: getPhilippineDateString(),
        status: entry.status || 'paid'
      };

      // Insert payment
      let paymentResult = null;
      try {
        paymentResult = await window.supabaseClient.insert('payments', paymentPayload);
      } catch (e) {
        console.warn('Payment insert warning:', e.message || e);
        // continue — we may still insert certificate without payment
      }
      const paymentId = Array.isArray(paymentResult) && paymentResult[0]?.id ? paymentResult[0].id : (entry.paymentId || null);

      // Ensure control number
      let controlNo = entry.controlNumber || entry.controlNumber || entry.controlNumber || '';
      if (!controlNo) {
        const prefixMap = { Clearance: 'BC', Indigency: 'IN', Residency: 'RES' };
        const key = (entry.certType || entry.cert || '').replace(/\s+/g, '') || '';
        const pKey = Object.keys(prefixMap).find(k => key.toLowerCase().includes(k.toLowerCase())) || (entry.certType || entry.cert || '');
        const prefix = prefixMap[pKey] || 'CERT';
        controlNo = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;
      }

      // Insert certificate
      const certPayload = {
        resident_id: entry.residentId ? parseInt(entry.residentId, 10) : null,
        resident_name: entry.name || entry.resident || '',
        certificate_type: (entry.certType && entry.certType.length) ? entry.certType : (entry.cert || ''),
        control_number: controlNo,
        or_number: entry.orNo || entry.orNo || entry.or_number || '',
        amount_paid: entry.amount || entry.amountPaid || 0,
        status: entry.status || 'paid',
        issued_date: null
      };
      if (entry.bcNo) certPayload.bc_number = entry.bcNo;
      if (paymentId) certPayload.payment_id = paymentId;
      if (entry.ctcNo) certPayload.ctc_number = entry.ctcNo;
      if (entry.ctcAmount) certPayload.ctc_amount = entry.ctcAmount;

      let certResult = null;
      try {
        certResult = await window.supabaseClient.insert('certificates', certPayload);
      } catch (e) {
        // Retry without ctc fields if schema missing
        const msg = (e && e.message) ? e.message : String(e);
        if (msg.includes('ctc_amount') || msg.includes('ctc_number') || (e && e.code === 'PGRST204')) {
          delete certPayload.ctc_number; delete certPayload.ctc_amount;
          certResult = await window.supabaseClient.insert('certificates', certPayload);
        } else {
          throw e;
        }
      }
      const certificateId = Array.isArray(certResult) && certResult[0]?.id ? certResult[0].id : null;

      // Mark entry as pushed and update ids
      entry.pushed = true;
      if (paymentId) entry.paymentId = paymentId;
      if (certificateId) entry.certificateId = certificateId;
      entry.controlNumber = controlNo;

      // update corresponding entry in global ledger
      const idx = ledger.findIndex(l => String(l.id) === String(entry.id));
      if (idx !== -1) ledger[idx] = entry;
      pushed++;
    } catch (err) {
      console.error('Push entry failed', err);
      // continue with next
    }
  }
  renderLedger(); renderFullLedger(); updateStats();
  showToast && showToast(`Pushed ${pushed} transaction(s) to Supabase`, 'success');
  return pushed;
}
window.pushLocalLedgerToSupabase = pushLocalLedgerToSupabase;

// Import local ledger into the new treasurer_transactions table in Supabase
async function importLocalLedgerToTreasurerTransactions(opts = { confirm: true }) {
  if (!window.supabaseClient) {
    showToast && showToast('Supabase client not available. Refresh the page.', 'error');
    return 0;
  }

  // Use in-memory ledger entries that haven't been imported yet
  let local = (ledger || []).filter(e => !e.imported);
  if (!local.length) {
    showToast && showToast('No local transactions found.', 'info');
    return 0;
  }

  if (opts.confirm) {
    const proceed = confirm(`Import ${local.length} local transaction(s) into Supabase treasurer_transactions?`);
    if (!proceed) return 0;
  }

  let imported = 0;
  for (let i = 0; i < local.length; i++) {
    const entry = local[i];
    try {
      if (entry.imported) continue; // already imported

      const payload = {
        resident_id: entry.residentId ? parseInt(entry.residentId, 10) : null,
        resident_name: entry.name || entry.resident || '',
        certificate_type: entry.cert || entry.certType || '',
        control_number: entry.controlNumber || null,
        or_number: entry.orNo || entry.orNo || entry.or_number || '',
        amount: entry.amount || entry.amountPaid || 0,
        ctc_number: entry.ctcNo || null,
        ctc_amount: entry.ctcAmount || null,
        bc_number: entry.bcNo || null,
        payment_date: getPhilippineDateString(entry.date || new Date()),
        status: entry.status || 'paid',
        source: 'local'
      };

      let res = null;
      try {
        res = await window.supabaseClient.insert('treasurer_transactions', payload);
      } catch (e) {
        console.warn('Import insert warning:', e.message || e);
        // mark import error on the entry so user can see it
        entry.importError = (e && e.message) ? e.message : String(e);
      }

      const newId = Array.isArray(res) && res[0]?.id ? res[0].id : null;
      if (newId) {
        entry.imported = true;
        entry.treasurerTransactionId = newId;
        // update global ledger entry
        const idx = ledger.findIndex(l => String(l.id) === String(entry.id));
        if (idx !== -1) ledger[idx] = entry;
        imported++;
      }
    } catch (err) {
      console.error('Import entry failed', err);
      // continue
    }
  }

  renderLedger(); renderFullLedger(); updateStats();
  showToast && showToast(`Imported ${imported} transaction(s) to treasurer_transactions`, 'success');
  return imported;
}
window.importLocalLedgerToTreasurerTransactions = importLocalLedgerToTreasurerTransactions;

function getCertificateLabel(value) {
  const certLabels = {
    'Clearance': 'Barangay Clearance',
    'Barangay Clearance': 'Barangay Clearance',
    'Residency': 'Certificate of Residency',
    'Residency Certificate': 'Certificate of Residency',
    'Certificate of Residency': 'Certificate of Residency',
    'Indigency': 'Indigency Certificate',
    'Indigency Certificate': 'Indigency Certificate',
  };
  return certLabels[value] || value || '';
}

/* ── RENDER LEDGER TABLE (Dashboard — Last 10) ── */
function renderLedger() {
  const tbody = document.getElementById('ledger-tbody');
  if (!tbody) return;

  if (ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No transactions yet today.<br>Use the form to record a payment.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  const entries = ledger.slice(0, 1);
  tbody.innerHTML = entries.map(tx => {
    const certDisplay = getCertificateLabel(tx.cert);
    let statusBadges = '';
    if (tx.importError) statusBadges += `<span class="badge badge-danger">Error</span> `;
    else if (tx.treasurerTransactionId || tx.imported) statusBadges += `<span class="badge badge-imported">Saved</span> `;
    else if (tx.pushed) statusBadges += `<span class="badge badge-pushed">Pushed</span> `;
    else statusBadges += `<span class="badge badge-pending">Pending</span> `;

    statusBadges += `<span class="badge badge-paid"><i class="bi bi-check-circle-fill"></i> Paid</span> <span class="badge badge-cash"><i class="bi bi-cash"></i> Cash</span>`;

    return `
    <tr class="locked">
      <td>${tx.date}</td>
      <td>${tx.time}</td>
      <td class="td-name">${tx.name}</td>
      <td>${certDisplay}</td>
      <td class="td-mono">${tx.orNo}</td>
      <td class="td-amount">₱ ${tx.amount.toFixed(2)}</td>
      <td>${statusBadges}</td>
    </tr>
  `;
  }).join('');
}

/* ── RENDER FULL LEDGER (History Page — All) ── */
function renderFullLedger() {
  const tbody = document.getElementById('ledger-tbody-full');
  if (!tbody) return;

  if (ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No transaction history available.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = ledger.map(tx => `
    ${(() => {
      let statusBadges = '';
      if (tx.importError) statusBadges += `<span class="badge badge-danger">Error</span> `;
      else if (tx.treasurerTransactionId || tx.imported) statusBadges += `<span class="badge badge-imported">Saved</span> `;
      else if (tx.pushed) statusBadges += `<span class="badge badge-pushed">Pushed</span> `;
      else statusBadges += `<span class="badge badge-pending">Pending</span> `;
      statusBadges += `<span class="badge badge-paid"><i class="bi bi-check-circle-fill"></i> Paid</span> <span class="badge badge-cash"><i class="bi bi-cash"></i> Cash</span>`;
      return `
        <tr class="locked">
          <td>${tx.date}</td>
          <td>${tx.time}</td>
          <td class="td-name">${tx.name}</td>
          <td>${getCertificateLabel(tx.cert)}</td>
          <td class="td-mono">${tx.orNo}</td>
          <td class="td-amount">₱ ${tx.amount.toFixed(2)}</td>
          <td>${statusBadges}</td>
        </tr>`;
    })()}
  `).join('');
}

function updateStats() {
  const todayStr = formatLedgerDate();
  const todayTx = ledger.filter(tx => tx.date === todayStr);

  const totalCash = ledger.reduce((sum, tx) => sum + tx.amount, 0);
  const totalTx = todayTx.length;
  const lastOR = ledger.length > 0 ? ledger[0].orNo : '—';

  const cashEl = document.getElementById('stat-total-cash');
  const txEl = document.getElementById('stat-total-tx');
  const orEl = document.getElementById('stat-last-or');

  if (cashEl) {
    const formattedCash = totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    cashEl.textContent = '₱ ' + formattedCash;
  }
  if (txEl) txEl.textContent = totalTx;
  if (orEl) orEl.textContent = lastOR;
}

/* ── NAVIGATION ── */
function navTo(page, el) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  const target = document.getElementById('page-' + page);
  if (target) { target.style.display = 'block'; target.classList.add('active'); }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  const breadcrumb = document.getElementById('breadcrumb-text');
  const labels = { dashboard: 'Dashboard', entry: 'Payment Entry', history: 'Transaction History', reports: 'Reports', settings: 'Settings' };
  if (breadcrumb) breadcrumb.textContent = labels[page] || 'Dashboard';

  // Re-render tables when navigating
  if (page === 'dashboard') { renderLedger(); updateStats(); }
  if (page === 'history') renderFullLedger();
  if (page === 'reports') {
    // Initialize report dates to today
    const today = getPhilippineDateString();
    const dateFromInput = document.getElementById('report-date-from');
    const dateToInput = document.getElementById('report-date-to');
    if (dateFromInput && !dateFromInput.value) dateFromInput.value = today;
    if (dateToInput && !dateToInput.value) dateToInput.value = today;
    // Auto-generate report
    setTimeout(() => generateReport(), 100);
  }

  document.getElementById('sidebar')?.classList.remove('open');
}
window.navTo = navTo;

/* ── SIDEBAR TOGGLE (Mobile) ── */
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}
window.toggleSidebar = toggleSidebar;

/* ── LOGOUT ── */
function logout() {
  const ok = confirm('Are you sure you want to log out?');
  if (!ok) return;
  showToast('Logging out...', 'success');
  setTimeout(() => {
    window.location.href = '../index.php?logout=1';
  }, 1000);
}
window.logout = logout;

/* ── TOAST NOTIFICATION ── */
function showToast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  // Clear existing toasts to only show one at a time and prevent duplicates/stacking
  stack.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.innerHTML = `
    <i class="bi ${type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}"></i>
    <span>${message}</span>
  `;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(24px)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
window.showToast = showToast;

/* ── FILTER BY O.R. NUMBER (History Page) ── */
function filterByOR(query) {
  const tbody = document.getElementById('ledger-tbody-full');
  if (!tbody) return;

  const q = query.trim().toLowerCase();
  const filtered = q ? ledger.filter(tx => tx.orNo.toLowerCase().includes(q)) : ledger;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-search"></i>
            <p>No transactions found for O.R. No. "${query}"</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(tx => {
    let statusBadges = '';
    if (tx.importError) statusBadges += `<span class="badge badge-danger">Error</span> `;
    else if (tx.treasurerTransactionId || tx.imported) statusBadges += `<span class="badge badge-imported">Saved</span> `;
    else if (tx.pushed) statusBadges += `<span class="badge badge-pushed">Pushed</span> `;
    else statusBadges += `<span class="badge badge-pending">Pending</span> `;
    statusBadges += `<span class="badge badge-paid"><i class="bi bi-check-circle-fill"></i> Paid</span> <span class="badge badge-cash"><i class="bi bi-cash"></i> Cash</span>`;

    return `
      <tr class="locked">
        <td>${tx.date}</td>
        <td>${tx.time}</td>
        <td class="td-name">${tx.name}</td>
        <td>${tx.cert}</td>
        <td class="td-mono">${tx.orNo}</td>
        <td class="td-amount">₱ ${tx.amount.toFixed(2)}</td>
        <td>${statusBadges}</td>
      </tr>`;
  }).join('');
}
window.filterByOR = filterByOR;

/* ── SETTINGS: CHANGE PASSWORD ── */
function updateAccountDetails() {
  const username = document.getElementById('settingsUsername').value.trim();
  const currentPassword = document.getElementById('settingsCurrentPassword').value;
  const newPassword = document.getElementById('settingsNewPassword').value;
  const confirmPassword = document.getElementById('settingsConfirmPassword').value;
  const messageBox = document.getElementById('accountDetailsMessage');

  if (!username) {
    if (messageBox) messageBox.innerHTML = '<span class="text-danger">Username is required.</span>';
    return;
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      if (messageBox) messageBox.innerHTML = '<span class="text-danger">Current password is required to change your password.</span>';
      return;
    }

    if (newPassword.length < 6) {
      if (messageBox) messageBox.innerHTML = '<span class="text-danger">New password must be at least 6 characters.</span>';
      return;
    }

    if (newPassword !== confirmPassword) {
      if (messageBox) messageBox.innerHTML = '<span class="text-danger">New password and confirmation do not match.</span>';
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

/* ── REPORTS ── */
function generateReport() {
  const dateFromStr = document.getElementById('report-date-from')?.value;
  const dateToStr = document.getElementById('report-date-to')?.value;
  const certType = document.getElementById('report-cert-type')?.value;

  // Parse dates for filtering
  const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
  const dateTo = dateToStr ? new Date(dateToStr) : null;

  // Filter ledger based on criteria
  let filtered = ledger.filter(tx => {
    // Date range filtering
    if (dateFrom || dateTo) {
      const txDate = new Date(tx.date);
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (txDate > endOfDay) return false;
      }
    }

    // Certificate type filtering
    if (certType && tx.certType !== certType) return false;

    return true;
  });

  // Calculate summary
  const totalTx = filtered.length;
  const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
  const avgAmount = totalTx > 0 ? totalAmount / totalTx : 0;

  // Update summary display
  document.getElementById('report-total-tx').textContent = totalTx;
  document.getElementById('report-total-amount').textContent = '₱ ' + totalAmount.toFixed(2);
  document.getElementById('report-avg-amount').textContent = '₱ ' + avgAmount.toFixed(2);

  // Populate report table
  const tbody = document.getElementById('report-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No transactions match the selected filters.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(tx => `
    <tr>
      <td>${tx.date}</td>
      <td>${tx.time}</td>
      <td class="td-name">${tx.name}</td>
      <td>${getCertificateLabel(tx.cert)}</td>
      <td class="td-mono">${tx.orNo}</td>
      <td class="td-amount">₱ ${tx.amount.toFixed(2)}</td>
      <td>
        <span class="badge badge-paid"><i class="bi bi-check-circle-fill"></i> Paid</span>
        <span class="badge badge-cash"><i class="bi bi-cash"></i> Cash</span>
      </td>
    </tr>
  `).join('');

  showToast(`Report generated: ${totalTx} transactions`, 'success');
}
window.generateReport = generateReport;

function exportReportPDF() {
  const tbody = document.getElementById('report-tbody');

  // Check if report has data
  const emptyCheck = tbody.querySelector('td[colspan]');
  if (emptyCheck) {
    showToast('Generate a report first.', 'error');
    return;
  }

  // Get filter criteria
  const dateFrom = document.getElementById('report-date-from')?.value || 'All';
  const dateTo = document.getElementById('report-date-to')?.value || 'All';
  const certTypeVal = document.getElementById('report-cert-type')?.value;
  const certType = certTypeVal ? getCertificateLabel(certTypeVal) : 'All Certificates';

  // Get summary data
  const totalTx = document.getElementById('report-total-tx')?.textContent || '0';
  const totalAmount = document.getElementById('report-total-amount')?.textContent || '₱ 0.00';
  const avgAmount = document.getElementById('report-avg-amount')?.textContent || '₱ 0.00';

  // Create HTML for PDF
  let pdfContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #000000 !important; -webkit-font-smoothing: antialiased;">
      <style>
        body { margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        thead { display: table-header-group; }
        tbody { display: table-row-group; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { page-break-inside: avoid; page-break-after: auto; }
        h1, h2, h3, p { margin: 0; }
        h1 { margin-bottom: 8px; }
        h2 { margin: 10px 0; }
        h3 { margin-bottom: 10px; }
        .section { margin-bottom: 20px; }
        .summary-table td { padding: 10px; border: 1px solid #e2e8f0; }
      </style>
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #000000;">CENTRAL BARANGAY</h1>
        <p style="margin: 5px 0; color: #000000; font-size: 14px;">Treasurer's Office</p>
        <h2 style="margin: 10px 0; color: #000000;">TRANSACTION REPORT</h2>
      </div>

      <div style="margin-bottom: 20px; border-top: 2px solid #0f2340; border-bottom: 2px solid #0f2340; padding: 15px 0;">
        <p style="margin: 5px 0; color: #000000 !important;"><strong>Generated:</strong> ${new Date().toLocaleString('en-PH')}</p>
        <p style="margin: 5px 0; color: #000000 !important;"><strong>Date Range:</strong> ${dateFrom} to ${dateTo}</p>
        <p style="margin: 5px 0; color: #000000 !important;"><strong>Certificate Type:</strong> ${certType}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #000000; margin-bottom: 10px;">SUMMARY</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f4f7fb;">
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #000000 !important;"><strong>Total Transactions</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #000000 !important;"><strong>${totalTx}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #000000 !important;"><strong>Total Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #000000 !important;"><strong>${totalAmount}</strong></td>
          </tr>
          <tr style="background-color: #f4f7fb;">
            <td style="padding: 10px; border: 1px solid #e2e8f0; color: #000000 !important;"><strong>Average Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #000000 !important;"><strong>${avgAmount}</strong></td>
          </tr>
        </table>
      </div>

      <div>
        <h3 style="color: #000000; margin-bottom: 10px;">TRANSACTION DETAILS</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #0f2340; color: white;">
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">Date</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">Time</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">Resident Name</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">Certificate</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">O.R. No.</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: right;">Amount</th>
              <th style="padding: 8px; border: 1px solid #0f2340; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Add table rows
  document.querySelectorAll('#report-tbody tr').forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f4f7fb';
      const status = cells[6]?.querySelector('.badge-paid')?.textContent.trim() || 'Paid';
      pdfContent += `
        <tr style="background-color: ${bgColor};">
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${cells[0]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${cells[1]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${cells[2]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${cells[3]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${cells[4]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #000000 !important;">${cells[5]?.textContent.trim()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; color: #000000 !important;">${status}</td>
        </tr>
      `;
    }
  });

  pdfContent += `
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px; text-align: center; color: #000000; font-size: 12px;">
        <p>This is an official report generated by Central Barangay Treasurer's Portal</p>
      </div>
    </div>
  `;

  // Generate PDF using html2pdf
  const element = document.createElement('div');
  element.innerHTML = pdfContent;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `treasurer-report-${getPhilippineDateString()}.pdf`,
    image: { type: 'png' },
    html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save();
  showToast('Report exported as PDF', 'success');
}
window.exportReportPDF = exportReportPDF;

function exportReportExcel() {
  const tbody = document.getElementById('report-tbody');

  // Check if report has data
  const emptyCheck = tbody.querySelector('td[colspan]');
  if (emptyCheck) {
    showToast('Generate a report first.', 'error');
    return;
  }

  // Get filter criteria
  const dateFromRaw = document.getElementById('report-date-from')?.value || '';
  const dateToRaw = document.getElementById('report-date-to')?.value || '';
  const certTypeVal = document.getElementById('report-cert-type')?.value;
  const certType = certTypeVal ? getCertificateLabel(certTypeVal) : 'All Certificates';

  // Format raw YYYY-MM-DD filter values to readable "Month Day, Year"
  const formatDateLabel = (str) => {
    if (!str) return 'All';
    try {
      const dt = new Date(str + 'T00:00:00');
      return dt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
    } catch (e) { return str; }
  };
  const dateFrom = formatDateLabel(dateFromRaw);
  const dateTo = formatDateLabel(dateToRaw);

  const headers = ['Date', 'Time', 'Resident Name', 'Certificate', 'O.R. No.', 'Amount', 'Status'];
  const rows = [];

  // Extract from DOM
  document.querySelectorAll('#report-tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7) {
      rows.push([
        cells[0]?.textContent.trim(),
        cells[1]?.textContent.trim(),
        cells[2]?.textContent.trim(),
        cells[3]?.textContent.trim(),
        cells[4]?.textContent.trim(),
        (cells[5]?.textContent || '').replace(/[₱\s]/g, '').trim(),
        cells[6]?.textContent.trim()
      ]);
    }
  });

  // Generate CSV content
  const csvContent = [
    ['Transaction Report', ''],
    [`Generated: ${new Date().toLocaleString('en-PH')}`, ''],
    [`Date Range: ${dateFrom} to ${dateTo}`, ''],
    [`Certificate Type: ${certType}`, ''],
    ['', ''],
    headers,
    ...rows
  ].map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');

  // Trigger download — add UTF-8 BOM so Excel opens it without encoding issues
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Transaction_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Excel report exported successfully.', 'success');
}
window.exportReportExcel = exportReportExcel;

function resetReport() {
  const dateFrom = document.getElementById('report-date-from');
  const dateTo = document.getElementById('report-date-to');
  const certType = document.getElementById('report-cert-type');

  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  if (certType) certType.value = '';

  // Reset counters
  const totalTxEl = document.getElementById('report-total-tx');
  const totalAmtEl = document.getElementById('report-total-amount');
  const avgAmtEl = document.getElementById('report-avg-amount');

  if (totalTxEl) totalTxEl.textContent = '0';
  if (totalAmtEl) totalAmtEl.textContent = '₱ 0.00';
  if (avgAmtEl) avgAmtEl.textContent = '₱ 0.00';

  // Clear table output to empty state
  const tbody = document.getElementById('report-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No data. Adjust filters and generate report.</p>
          </div>
        </td>
      </tr>`;
  }

  showToast('Filters cleared and report reset', 'success');
}
window.resetReport = resetReport;

/* ── TWO-FACTOR AUTHENTICATION (EMAIL OTP) ── */
function toggle2FA(el) {
  el.classList.toggle('on');
  const isOn = el.classList.contains('on');
  localStorage.setItem('treasurer-2fa-enabled', isOn ? 'true' : 'false');
  const setup = document.getElementById('twoFactorSetup');
  const enabled = document.getElementById('twoFactorEnabled');
  if (isOn) { setup.style.display = 'block'; enabled.style.display = 'none'; }
  else {
    if (enabled.style.display === 'block') {
      if (confirm('Disable Email 2FA? This will make your account less secure.')) {
        setup.style.display = 'none'; enabled.style.display = 'none';
        if (typeof showToast === 'function') showToast('Email 2FA disabled', 'info');
      } else { el.classList.add('on'); }
    } else { setup.style.display = 'none'; enabled.style.display = 'none'; }
  }
}
window.toggle2FA = toggle2FA;

function sendEmailOTP() {
  const email = document.getElementById('twoFactorEmail').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (typeof showToast === 'function') showToast('Please enter a valid email address.', 'error'); return;
  }
  if (typeof showToast === 'function') showToast('Sending verification code...', 'info');
  fetch('../admin/api/send_email_otp.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(async r => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Failed to send OTP.');
    if (typeof showToast === 'function') showToast(d.message || 'OTP sent! Check your inbox.', 'success');
  }).catch(e => { if (typeof showToast === 'function') showToast(e.message, 'error'); });
}
window.sendEmailOTP = sendEmailOTP;

function verifyEmailOTP() {
  const email = document.getElementById('twoFactorEmail').value.trim();
  const code = document.getElementById('emailOtpCode').value.trim();
  if (!code || code.length !== 6) { if (typeof showToast === 'function') showToast('Enter a valid 6-digit code.', 'error'); return; }
  fetch('../admin/api/verify_email_otp.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp: code })
  }).then(async r => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Verification failed.');
    document.getElementById('twoFactorSetup').style.display = 'none';
    document.getElementById('twoFactorEnabled').style.display = 'block';
    document.getElementById('active2FAEmail').textContent = email;
    document.getElementById('emailOtpCode').value = '';
    localStorage.setItem('treasurer-2fa-enabled', 'true');
    if (typeof showToast === 'function') showToast('Email 2FA enabled!', 'success');
  }).catch(e => { if (typeof showToast === 'function') showToast(e.message, 'error'); });
}
window.verifyEmailOTP = verifyEmailOTP;

function cancel2FASetup() {
  document.getElementById('twoFactorToggle').classList.remove('on');
  localStorage.setItem('treasurer-2fa-enabled', 'false');
  document.getElementById('twoFactorSetup').style.display = 'none';
  document.getElementById('twoFactorEmail').value = '';
  document.getElementById('emailOtpCode').value = '';
}
window.cancel2FASetup = cancel2FASetup;

function disable2FA() {
  if (confirm('Disable Email 2FA?')) {
    fetch('../admin/api/disable_2fa.php', { method: 'POST' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to disable 2FA.');

        document.getElementById('twoFactorToggle').classList.remove('on');
        localStorage.setItem('treasurer-2fa-enabled', 'false');
        document.getElementById('twoFactorEnabled').style.display = 'none';
        if (typeof showToast === 'function') showToast('Email 2FA disabled', 'info');
      })
      .catch((err) => {
        if (typeof showToast === 'function') showToast(err.message, 'error');
      });
  }
}
window.disable2FA = disable2FA;

function change2FAEmail() {
  document.getElementById('twoFactorEnabled').style.display = 'none';
  document.getElementById('twoFactorSetup').style.display = 'block';
  document.getElementById('twoFactorEmail').value = '';
  document.getElementById('emailOtpCode').value = '';
}
window.change2FAEmail = change2FAEmail;

function downloadRecoveryCodes() {
  const codes = 'Barangay Central - Email Two-Factor Authentication Recovery Codes\n\n' +
    'A1B2-C3D4\nE5F6-G7H8\nI9J0-K1L2\nM3N4-O5P6\n\n' +
    'Keep these codes safe. Each code can only be used once.\n' +
    'Use these if you lose access to your email.\n' +
    'Generated: ' + new Date().toLocaleString();

  const blob = new Blob([codes], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brgy-2fa-email-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('Recovery codes downloaded 💾', 'success');
}
window.downloadRecoveryCodes = downloadRecoveryCodes;

function regenerateRecoveryCodes() {
  if (confirm('Generate new recovery codes? Your old codes will no longer work.')) {
    if (typeof showToast === 'function') showToast('New recovery codes generated! Please download them. 🔑', 'success');
  }
}
window.regenerateRecoveryCodes = regenerateRecoveryCodes;

function updateAccountDetails() {
  const username = document.getElementById('settingsUsername').value.trim();
  const currentPassword = document.getElementById('settingsCurrentPassword').value;
  const newPassword = document.getElementById('settingsNewPassword').value;
  const confirmPassword = document.getElementById('settingsConfirmPassword').value;
  const messageBox = document.getElementById('accountDetailsMessage');

  if (!username) {
    messageBox.innerHTML = '<span style="color:var(--danger)">Username is required.</span>';
    return;
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      messageBox.innerHTML = '<span style="color:var(--danger)">Current password is required to change password.</span>';
      return;
    }
    if (newPassword.length < 6) {
      messageBox.innerHTML = '<span style="color:var(--danger)">New password must be at least 6 characters.</span>';
      return;
    }
    if (newPassword !== confirmPassword) {
      messageBox.innerHTML = '<span style="color:var(--danger)">Passwords do not match.</span>';
      return;
    }
  }

  messageBox.innerHTML = '<span style="color:var(--text-muted)">Saving account details...</span>';

  fetch('../admin/api/update_account.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, currentPassword, newPassword, confirmPassword })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Unable to update account details.');

      messageBox.innerHTML = '<span style="color:var(--success)">' + (data.message || 'Account details updated successfully.') + '</span>';
      if (typeof showToast === 'function') showToast(data.message || 'Account details updated!', 'success');

      document.getElementById('settingsCurrentPassword').value = '';
      document.getElementById('settingsNewPassword').value = '';
      document.getElementById('settingsConfirmPassword').value = '';
    })
    .catch((err) => {
      messageBox.innerHTML = '<span style="color:var(--danger)">' + err.message + '</span>';
      if (typeof showToast === 'function') showToast(err.message, 'error');
    });
}
window.updateAccountDetails = updateAccountDetails;
