/**
 * CERTIFICATE MANAGEMENT LOGIC
 */

/**
 * Load paid certificates from database via API
 * Automatically called on page init and when paymentSaved event is fired
 */
async function loadPaidCertificates() {
  try {
    if (!window.supabaseClient) {
      console.error('Supabase client not loaded');
      return;
    }

    // Fetch directly from Supabase bypassing PHP restrictions
    const params = 'status=in.(paid,issued)&order=date_created.desc&limit=1000';
    const data = await window.supabaseClient.select('certificates', params);

    if (!Array.isArray(data)) {
      console.error('Failed to load certificates:', data);
      return;
    }

    // Format the Supabase records to match the expected frontend structure
    const formatted = data.map(cert => ({
      id: cert.id,
      resident: cert.resident_name,
      residentId: cert.resident_id,
      type: cert.certificate_type,
      controlNo: cert.control_number,
      date: cert.date_created,
      status: cert.status,
      orNo: cert.or_number,
      amount: cert.amount_paid,
      bcNo: cert.bc_number || null,
      ctcNo: cert.ctc_number || cert.ctcNo || null,
      ctcAmount: cert.ctc_amount || cert.ctcAmount || null,
      issuedDate: cert.issued_date,
      paymentId: cert.payment_id,
      notes: cert.notes || '',
      issuedBy: cert.issued_by || ''
    }));

    // Replace the entire array to ensure fresh data (no stale duplicates)
    window.certificates = formatted;

    // Update the navigation badge with pending issuance count
    if (typeof updateCertNavBadge === 'function') updateCertNavBadge();

  } catch (e) {
    console.error('Certificate load error:', e);
  }
}

/**
 * Updates the Certificates sidebar badge with the count of paid but unissued certs.
 */
function updateCertNavBadge() {
  const badge = document.getElementById('certNavBadge');
  if (!badge) return;

  const count = (window.certificates || []).filter(c => c.status === 'paid').length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';

    // Also update dashboard badge if exists
    const dashBadge = document.getElementById('dash-pending-certs');
    if (dashBadge) dashBadge.textContent = count;
  } else {
    badge.style.display = 'none';
  }
}

/**
 * Initialize certificates on page load and start real-time polling
 */
let _certPollTimer = null;

async function initCertificates() {
  await loadPaidCertificates();
  renderCerts();
  startCertPolling();
}

/**
 * Poll the database every 10 seconds for new/updated certificates.
 * Only re-renders when data actually changes to avoid UI flicker.
 */
function startCertPolling() {
  // Clear any existing timer to avoid duplicates
  if (_certPollTimer) clearInterval(_certPollTimer);

  _certPollTimer = setInterval(async () => {
    try {
      const prevSnapshot = JSON.stringify(window.certificates || []);
      await loadPaidCertificates();
      const newSnapshot = JSON.stringify(window.certificates || []);

      // Only re-render if data actually changed
      if (prevSnapshot !== newSnapshot) {
        renderCerts();
        if (typeof showToast === 'function') {
          showToast('Certificates updated.', 'info');
        }
      }
    } catch (e) {
      console.warn('Certificate polling error:', e);
    }
  }, 1000); // every 1 second
}

function stopCertPolling() {
  if (_certPollTimer) { clearInterval(_certPollTimer); _certPollTimer = null; }
}

/**
 * Helper to securely open a certificate using POST (hides data from URL)
 */
function openCertificatePost(paramsObj) {
  const form = document.createElement('form');
  form.target = '_blank';
  form.method = 'POST';
  form.action = '/admin/view-certificate.php';

  for (const key in paramsObj) {
    if (paramsObj.hasOwnProperty(key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = paramsObj[key];
      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * Listen for paymentSaved event from treasurer module
 */
if (typeof window !== 'undefined') {
  document.addEventListener('paymentSaved', async (event) => {
    // Reload certificates when a new payment is saved
    await loadPaidCertificates();
    renderCerts();
  });
  // Also merge quick-entry payment details into frontend list if supabase didn't persist yet
  document.addEventListener('paymentSaved', (event) => {
    try {
      const detail = event?.detail;
      if (!detail) return;
      window.certificates = window.certificates || [];
      // find by controlNumber or certificateId or orNo
      const exists = window.certificates.find(c => String(c.controlNo) === String(detail.controlNumber || detail.controlNumber) || String(c.id) === String(detail.certificateId) || String(c.orNo) === String(detail.orNo));
      const mappedVals = {
        ctcNo: detail.ctcNo || detail.ctcNo || detail.ctc_number || '',
        ctcAmount: detail.ctcAmount || detail.ctcAmount || detail.ctc_amount || 0,
        orNo: detail.orNo || detail.orNo || detail.or_number || ''
      };
      if (!exists) {
        const mapped = {
          id: detail.certificateId || detail.id || Date.now(),
          resident: detail.name || detail.residentName || '',
          residentId: detail.residentId || detail.resident_id || '',
          type: detail.certType || detail.cert || '',
          controlNo: detail.controlNumber || detail.controlNumber || detail.controlNumber || '',
          date: (new Date()).toISOString().split('T')[0],
          status: detail.status || 'paid',
          orNo: mappedVals.orNo,
          amount: detail.amount || detail.amountPaid || mappedVals.ctcAmount || 0,
          bcNo: detail.bcNo || detail.bcNo || '',
          ctcNo: mappedVals.ctcNo,
          ctcAmount: mappedVals.ctcAmount,
          issuedDate: detail.issuedDate || null,
          paymentId: detail.paymentId || null
        };
        window.certificates.unshift(mapped);
      } else {
        // update existing record with possible CTC info
        if (mappedVals.ctcNo) exists.ctcNo = mappedVals.ctcNo;
        if (mappedVals.ctcAmount) exists.ctcAmount = mappedVals.ctcAmount;
        if (mappedVals.orNo) exists.orNo = mappedVals.orNo;
      }
      renderCerts();
    } catch (e) {
      console.warn('paymentSaved merge error', e);
    }
  });
}

// Polling to refresh paid certificates for cross-tab updates
let _certsPollInterval = null;
function startCertificatesPolling(intervalMs = 10000) {
  if (_certsPollInterval) clearInterval(_certsPollInterval);
  _certsPollInterval = setInterval(async () => {
    await loadPaidCertificates();
    renderCerts();
  }, intervalMs);
}
function stopCertificatesPolling() {
  if (_certsPollInterval) { clearInterval(_certsPollInterval); _certsPollInterval = null; }
}

// Start polling when initialized
if (typeof window !== 'undefined') {
  // start on load so admin sees updates automatically
  window.addEventListener('DOMContentLoaded', () => {
    // only start when the certificates panel is present
    if (document.getElementById('panel-certificates') || document.getElementById('certsBody')) {
      startCertificatesPolling(10000);
    }
  });
}

function viewCertificate() {
  // Sync preview inputs into hidden fields first
  try {
    if (typeof syncPreviewFromForm === 'function') syncPreviewFromForm();
    if (typeof updateHiddenFromPreview === 'function') updateHiddenFromPreview();
  } catch (e) { }

  // Prefer values from visible preview inputs, then hidden fields, then form inputs
  const certNo = document.getElementById('cNo')?.value || document.getElementById('cCertNo')?.value || '';
  const resident = document.getElementById('cPreviewName')?.value || document.getElementById('cCertName')?.value || document.getElementById('cResident')?.value || 'RESIDENT NAME';
  const civil = document.getElementById('cPreviewCivilStatus')?.value || document.getElementById('cCivilStatus')?.value || document.getElementById('cPreviewDetails')?.value || document.getElementById('cCertDetails')?.value || document.getElementById('cCertExtra')?.value || '';
  const address = document.getElementById('cPreviewAddress')?.value || document.getElementById('cAddress')?.value || '';
  const gender = resident ? (resident.toLowerCase().includes('mrs') || resident.toLowerCase().includes('ms') ? 'her' : 'his') : 'his';
  const purpose = document.getElementById('cPreviewSupport')?.value || document.getElementById('cSupport')?.value || '';

  const day = document.getElementById('cIssuedDay')?.value || '9th';
  const monthVal = (document.getElementById('cIssuedMonth')?.value || 'February').trim();
  const yearVal = (document.getElementById('cIssuedYear')?.value || '2026').trim();
  const month = (monthVal && yearVal && !monthVal.includes(yearVal)) ? `${monthVal}, ${yearVal}` : (monthVal || yearVal || 'February, 2026');

  const signatory = 'ROSANNA D. DIAZ';

  // Format fee/amount correctly
  const feeInput = document.getElementById('cFee')?.value || '';
  const amount = feeInput ? (feeInput.toLowerCase().includes('php') ? feeInput : `Php${feeInput}.00`) : 'Php50.00';

  const ctcInput = document.getElementById('cAmount')?.value || '';
  const ctcAmount = ctcInput ? (ctcInput.toLowerCase().includes('php') ? ctcInput : `Php${ctcInput}.00`) : 'Php0.00';

  const orNo = document.getElementById('cORNo')?.value || '';
  const bcNo = document.getElementById('cBCNo')?.value || '';
  const ctcNo = document.getElementById('cCTCNo')?.value || '01643046';
  const date = document.getElementById('cDate')?.value || '02/09/2026';
  const type = document.getElementById('cType')?.value || 'Barangay Clearance';

  const params = new URLSearchParams({
    certNo,
    type,
    resident,
    civil,
    address,
    gender,
    purpose,
    day,
    month,
    signatory,
    amount,
    orNo,
    bcNo,
    ctcNo,
    ctcAmount,
    date
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    console.debug('viewCertificate params', paramsObj);
    const certId = window.currentCertId || paramsObj.certNo;
    localStorage.setItem(`barangay_clearance_data_${certId}`, JSON.stringify(paramsObj));
  } catch (e) { }

  window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
}

// Format resident name as: First M. Last
function formatResidentName(rawName) {
  if (!rawName) return '';
  const s = String(rawName).trim();
  if (s.indexOf(',') !== -1) {
    // handle "Last, First Middle" -> convert to parts
    const parts = s.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const last = parts[0];
      const rest = parts[1].split(/\s+/);
      const first = rest[0] || '';
      const middle = rest[1] || '';
      const mi = middle ? (middle.charAt(0).toUpperCase() + '.') : '';
      return `${first} ${mi} ${last}`.replace(/\s+/g, ' ').trim();
    }
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  // 3+ parts: first, middle, last
  const first = parts[0];
  const middle = parts.length > 2 ? parts.slice(1, parts.length - 1).join(' ') : '';
  const last = parts[parts.length - 1];
  const mi = middle ? (middle.charAt(0).toUpperCase() + '.') : '';
  return `${first} ${mi} ${last}`.replace(/\s+/g, ' ').trim();
}

// Parse various date formats into ISO YYYY-MM-DD. Assumes dd/mm/yyyy when ambiguous.
function parseDateToISO(dateStr) {
  if (!dateStr) return '';
  dateStr = String(dateStr).trim();
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // try native parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  // try dd/mm/yyyy or dd-mm-yyyy
  const m = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    // assume dd/mm/yyyy
    const dt = new Date(year, month - 1, day);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  return '';
}

function getYearFromDate(dateStr) {
  if (!dateStr) return new Date().getFullYear();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getFullYear();
  const m = String(dateStr).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

async function printCertificate() {
  // --- Required field validation ---
  const _chk = (a, b) => (document.getElementById(a)?.value || (b ? document.getElementById(b)?.value : '') || '').trim();
  const missing = [];
  if (!_chk('cNo', 'cCertNo')) missing.push('Control No.');
  if (!_chk('cBCNo')) missing.push('BC No.');
  if (!_chk('cDate')) missing.push('Date');
  if (!_chk('cResident')) missing.push('Resident');
  if (!_chk('cPreviewName', 'cCertName')) missing.push('Full Name of Resident');
  if (!_chk('cPreviewCivilStatus', 'cCertDetails')) missing.push('Civil Status');
  if (!_chk('cPreviewAddress', 'cAddress')) missing.push('Street Address');
  if (!_chk('cPreviewSupport', 'cSupport')) missing.push('Purpose');
  if (missing.length > 0) {
    const msg = 'Please fill in required fields: ' + missing.join(', ') + '.';
    if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
    return;
  }

  // Sync preview inputs into hidden fields first
  try {
    if (typeof syncPreviewFromForm === 'function') syncPreviewFromForm();
    if (typeof updateHiddenFromPreview === 'function') updateHiddenFromPreview();
  } catch (e) { }

  // Prefer values from visible preview inputs, then hidden fields, then form inputs
  const certNo = document.getElementById('cNo')?.value || document.getElementById('cCertNo')?.value || '';

  // Check for duplicate control number (allow if not in same year and same certificate type)
  try {
    if (window.supabaseClient) {
      const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(certNo)}`);
      if (dupCheck && dupCheck.length > 0) {
        const dateInput = document.getElementById('cDate')?.value || '';
        const currentYear = getYearFromDate(dateInput);
        const currentCertType = document.getElementById('cType')?.value || 'Barangay Clearance';
        const isDup = dupCheck.some(c => {
          if (String(c.id) === String(window.currentCertId)) return false;
          const dupYear = getYearFromDate(c.issued_date || c.date_created);
          const dupType = c.certificate_type || '';
          return dupYear === currentYear && dupType === currentCertType;
        });
        if (isDup) {
          const msg = 'The Control Number already exists in the current year for this certificate type. Please use a different one.';
          if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
          return;
        }
      }
    }
  } catch (e) { console.error(e); }

  // Check for duplicate Barangay Clearance No. (bc_number) in the current year
  try {
    const bcNoRaw = (document.getElementById('cBCNo')?.value || '').trim();
    if (bcNoRaw && window.supabaseClient) {
      const dupCheckBc = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created&bc_number=eq.${encodeURIComponent(bcNoRaw)}`);
      if (dupCheckBc && dupCheckBc.length > 0) {
        const dateInput = document.getElementById('cDate')?.value || '';
        const currentYear = getYearFromDate(dateInput);
        const isDupBc = dupCheckBc.some(c => {
          if (String(c.id) === String(window.currentCertId)) return false;
          return getYearFromDate(c.issued_date || c.date_created) === currentYear;
        });
        if (isDupBc) {
          const msg = 'The Barangay Clearance No. already exists in the current year. Please use a different one.';
          if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
          return;
        }
      }
    }
  } catch (e) { console.error(e); }

  const resident = document.getElementById('cPreviewName')?.value || document.getElementById('cCertName')?.value || document.getElementById('cResident')?.value || 'RESIDENT NAME';
  const civil = document.getElementById('cPreviewCivilStatus')?.value || document.getElementById('cCivilStatus')?.value || document.getElementById('cPreviewDetails')?.value || document.getElementById('cCertDetails')?.value || document.getElementById('cCertExtra')?.value || '';
  const address = document.getElementById('cPreviewAddress')?.value || document.getElementById('cAddress')?.value || '';
  const gender = resident ? (resident.toLowerCase().includes('mrs') || resident.toLowerCase().includes('ms') ? 'her' : 'his') : 'his';
  const purpose = document.getElementById('cPreviewSupport')?.value || document.getElementById('cSupport')?.value || '';

  const day = document.getElementById('cIssuedDay')?.value || '9th';
  const monthVal = (document.getElementById('cIssuedMonth')?.value || 'February').trim();
  const yearVal = (document.getElementById('cIssuedYear')?.value || '2026').trim();
  const month = (monthVal && yearVal && !monthVal.includes(yearVal)) ? `${monthVal}, ${yearVal}` : (monthVal || yearVal || 'February, 2026');

  const signatory = 'ROSANNA D. DIAZ';

  // Format fee/amount correctly
  const feeInput = document.getElementById('cFee')?.value || '';
  const amount = feeInput ? (feeInput.toLowerCase().includes('php') ? feeInput : `Php${feeInput}.00`) : 'Php50.00';

  const ctcInput = document.getElementById('cCTCAmount')?.value || document.getElementById('cAmount')?.value || '';
  const ctcAmount = ctcInput ? (ctcInput.toLowerCase().includes('php') ? ctcInput : `Php${ctcInput}.00`) : 'Php0.00';

  const orNo = document.getElementById('cORNo')?.value || '';
  const bcNo = document.getElementById('cBCNo')?.value || '';
  const ctcNo = document.getElementById('cCTCNo')?.value || '01643046';
  const date = document.getElementById('cDate')?.value || '02/09/2026';
  const type = document.getElementById('cType')?.value || 'Barangay Clearance';

  const params = new URLSearchParams({
    certNo,
    type,
    resident,
    civil,
    address,
    gender,
    purpose,
    day,
    month,
    signatory,
    amount,
    orNo,
    bcNo,
    ctcNo,
    ctcAmount,
    date,
    print: 'true'
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    const certId = window.currentCertId || paramsObj.certNo;
    localStorage.setItem(`barangay_clearance_data_${certId}`, JSON.stringify(paramsObj));
    openCertificatePost(paramsObj);
  } catch (e) {
    // Fallback to GET if something goes wrong
    window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
  }
}

function certActions(c) {
  // For issued certificates, view the official certificate directly
  // For paid certificates, open the modal to edit
  if (c.status === 'issued') {
    return `<button class="btn btn-primary btn-sm" onclick="viewOfficialCertificate('${c.id}')">View</button>`;
  } else {
    return `<button class="btn btn-primary btn-sm" onclick="openCertModal('${c.id}')">Open</button>`;
  }
}

function viewOfficialCertificate(id) {
  const list = window.certificates || [];
  const c = list.find(x => String(x.id) === String(id) || String(x.controlNo) === String(id));
  if (!c) return;

  // Get certificate values (defaults from in-memory object)
  let certNo = c.controlNo || '';
  let resident = c.certName || c.resident || 'RESIDENT NAME';
  let civil = c.certExtra || c.civil || '';
  let address = c.address || '';
  let purpose = c.support || c.purpose || '';
  let day = c.issuedDay || '';
  let month = c.issuedMonth || '';
  let bcNo = c.bcNo || c.bc_number || c.bc || '';
  let ctcNo = c.ctcNo || c.ctc_no || c.ctc_number || '';
  let ctcAmtRaw = c.ctcAmount != null ? c.ctcAmount : (c.ctc_amount != null ? c.ctc_amount : '');
  let feeRaw = (c.amount != null) ? c.amount : (c.fee != null ? c.fee : (c.amount_paid != null ? c.amount_paid : ''));

  // PRIMARY SOURCE: parse notes JSON from database (works on any browser)
  let notesData = null;
  if (c.notes) {
    try {
      notesData = JSON.parse(c.notes);
    } catch (e) {
      // notes is plain text (old format) — treat as purpose
      purpose = c.notes;
    }
  }
  if (notesData) {
    if (notesData.resident) resident = notesData.resident;
    if (notesData.civil) civil = notesData.civil;
    if (notesData.address) address = notesData.address;
    if (notesData.purpose) purpose = notesData.purpose;
    if (notesData.day) day = notesData.day;
    if (notesData.month) month = notesData.month;
    if (notesData.bcNo) bcNo = notesData.bcNo;
    if (notesData.ctcNo) ctcNo = notesData.ctcNo;
    if (notesData.ctcAmount) ctcAmtRaw = notesData.ctcAmount;
    if (notesData.fee) feeRaw = notesData.fee;
  }

  // SECONDARY SOURCE: look up resident details from window.residents
  if (c.residentId && (!civil || !address || address === 'Echavez Street')) {
    const res = (window.residents || []).find(r => String(r.id) === String(c.residentId));
    if (res) {
      if (!civil && res.civilStatus) civil = res.civilStatus;
      const addrParts = [res.address, res.purok].filter(Boolean);
      if (addrParts.length && (!address || address === 'Echavez Street')) address = addrParts.join(', ');
    }
  }

  // LAST RESORT: localStorage fallback for old certificates issued before this fix
  if (!notesData && !purpose) {
    try {
      const saved = localStorage.getItem(`barangay_clearance_data_${id}`) || localStorage.getItem(`barangay_clearance_data_${c.controlNo}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.resident) resident = data.resident;
        if (data.civil) civil = data.civil;
        if (data.address) address = data.address;
        if (data.purpose) purpose = data.purpose;
      }
    } catch (e) { }
  }
  if (!purpose) purpose = '';

  const gender = resident ? 'her' : 'his';
  // derive day/month from date if not already set from notes
  if (!day) {
    try {
      const dateVal = c.issuedDate || c.date;
      if (dateVal) {
        const dt = new Date(dateVal);
        if (!isNaN(dt.getTime())) {
          day = String(dt.getDate()) + (['11', '12', '13'].includes(String(dt.getDate())) ? 'th' : (dt.getDate() % 10 === 1 ? 'st' : dt.getDate() % 10 === 2 ? 'nd' : dt.getDate() % 10 === 3 ? 'rd' : 'th'));
        }
      }
    } catch (e) { }
  }
  if (!day) day = '9th';
  if (!month) {
    try {
      const dateVal = c.issuedDate || c.date;
      if (dateVal) {
        const dt = new Date(dateVal);
        if (!isNaN(dt.getTime())) {
          month = dt.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
        }
      }
    } catch (e) { }
  }
  if (!month) month = 'February, 2026';

  const signatory = 'ROSANNA D. DIAZ';
  const amount = feeRaw ? (String(feeRaw).toLowerCase().includes('php') ? feeRaw : `Php${feeRaw}.00`) : 'Php50.00';
  const orNo = c.orNo || c.or_number || c.or || '';
  if (!bcNo) bcNo = '';
  if (!ctcNo) ctcNo = '01643046';
  const ctcAmount = ctcAmtRaw ? (String(ctcAmtRaw).toLowerCase().includes('php') ? ctcAmtRaw : `Php${ctcAmtRaw}.00`) : 'Php0.00';
  const date = c.issuedDate || c.date || '02/09/2026';

  // Build URL with parameters
  const params = new URLSearchParams({
    certNo,
    type: c.type || c.certificate_type || 'Barangay Clearance',
    resident,
    civil,
    address,
    gender,
    purpose,
    day,
    month,
    signatory,
    amount,
    orNo,
    bcNo,
    ctcNo,
    ctcAmount,
    date
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    localStorage.setItem(`barangay_clearance_data_${id}`, JSON.stringify(paramsObj));
    openCertificatePost(paramsObj);
  } catch (e) {
    window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
  }
}

function approveCertificate(id) {
  const c = window.certificates.find(x => x.id === id);
  if (c) {
    c.status = 'archived';
    c.approvalStatus = 'approved';
    c.archivedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    renderCerts();
    if (typeof showToast === 'function') showToast(`Certificate ${id} approved and archived!`, 'success');
  }
}

function rejectCertificate(id) {
  const reason = prompt('Please provide a reason for rejection (this will be sent to the resident):');
  if (reason && reason.trim()) {
    const c = window.certificates.find(x => x.id === id);
    if (c) {
      c.status = 'archived';
      c.approvalStatus = 'rejected';
      c.rejectionReason = reason.trim();
      c.archivedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      renderCerts();
      if (typeof showToast === 'function') showToast(`Certificate ${id} rejected and archived.`, 'info');
    }
  } else if (reason !== null) {
    if (typeof showToast === 'function') showToast('Rejection reason is required.', 'error');
  }
}

function renderCerts(filter, status, type, dateFilter) {
  const tb = document.getElementById('certsBody');
  if (!tb) return;

  // Always read current filter values from the DOM if not explicitly provided
  if (filter === undefined || filter === null) filter = document.getElementById('certSearch')?.value || '';
  if (status === undefined || status === null) status = document.getElementById('certStatusFilter')?.value || '';
  if (type === undefined || type === null) type = document.getElementById('certTypeFilter')?.value || '';
  if (dateFilter === undefined || dateFilter === null) dateFilter = document.getElementById('certDateFilter')?.value || '';

  let list = window.certificates || [];
  if (filter) list = list.filter(c => (c.controlNo || '').toLowerCase().includes(filter.toLowerCase()));
  if (status) list = list.filter(c => c.status === status);
  if (type) list = list.filter(c => c.type === type);
  // If a date filter (YYYY-MM-DD) is provided, normalize and match certificate dates
  if (dateFilter) {
    list = list.filter(c => {
      if (!c.date) return false;
      try {
        const norm = parseDateToISO(c.date);
        return norm === dateFilter;
      } catch (e) {
        return false;
      }
    });
  }

  tb.innerHTML = list.length ? list.map(c => {
    let displayDate = '';
    if (c.date) {
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) {
        const hasTime = String(c.date).includes(':') || String(c.date).includes('T');
        if (hasTime) {
          displayDate = d.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        } else {
          displayDate = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      } else {
        const iso = parseDateToISO(c.date);
        if (iso) {
          displayDate = new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          displayDate = c.date;
        }
      }
    }
    return `
      <tr>
        <td data-label="Resident">${c.resident}</td>
        <td data-label="Type">${c.type}</td>
        <td data-label="Control No.">${c.status === 'issued' ? (c.controlNo || '') : ''}</td>
        <td data-label="Date & Time">${displayDate}</td>
        <td data-label="Status"><span class="badge badge-${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></td>
        <td data-label="Actions">${certActions(c)}</td>
      </tr>
    `}).join('') : `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">No records found.</td></tr>`;
}

function filterCertsTable(val = '') {
  const statusF = document.getElementById('certStatusFilter')?.value || '';
  const typeF = document.getElementById('certTypeFilter')?.value || '';
  const dateF = document.getElementById('certDateFilter')?.value || '';
  renderCerts(val || document.getElementById('certSearch')?.value || '', statusF, typeF, dateF);
}

function filterCerts(status) {
  const sf = document.getElementById('certStatusFilter');
  if (sf) sf.value = status;
  renderCerts('', status, '');
}

function filterCertsApproved() {
  if (typeof nav === 'function') nav('certificates', null);
  setTimeout(() => {
    const list = window.certificates.filter(c => c.status === 'archived' && c.approvalStatus === 'approved');
    renderCertsFiltered(list);
  }, 150);
}

function filterCertsRejected() {
  if (typeof nav === 'function') nav('certificates', null);
  setTimeout(() => {
    const list = window.certificates.filter(c => c.status === 'archived' && c.approvalStatus === 'rejected');
    renderCertsFiltered(list);
  }, 150);
}

function renderCertsFiltered(list) {
  const tb = document.getElementById('certsBody');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(c => {
    let displayDate = '';
    if (c.date) {
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) {
        const hasTime = String(c.date).includes(':') || String(c.date).includes('T');
        if (hasTime) {
          displayDate = d.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        } else {
          displayDate = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      } else {
        const iso = parseDateToISO(c.date);
        if (iso) {
          displayDate = new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          displayDate = c.date;
        }
      }
    }
    return `
    <tr>
      <td data-label="Resident">${c.resident}</td>
      <td data-label="Type">${c.type}</td>
      <td data-label="Date & Time">${displayDate}</td>
      <td data-label="Status"><span class="badge badge-${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></td>
      <td data-label="Actions">${certActions(c)}</td>
    </tr>
  `}).join('') : `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">No records found.</td></tr>`;
}

function openCertModal(id) {
  const c = (window.certificates || []).find(x => String(x.id) === String(id));
  if (!c) return;

  // Store current certificate ID for reference
  // prefer numeric id when possible
  const numericId = Number(id);
  window.currentCertId = Number.isFinite(numericId) ? numericId : id;
  const isViewOnly = c.status === 'issued';

  // populate certificate modal fields
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = val || '';
      // Update native stretchable inputs
      if (el.hasAttribute('oninput') && el.getAttribute('oninput').includes('this.size')) {
        el.size = Math.max(el.value.length, el.placeholder ? el.placeholder.length : 10, 4);
      }
    }
  };
  set('cResident', c.resident || '');
  set('cNo', c.status === 'issued' ? (c.controlNo || '') : '');
  // Populate payment-related fields using multiple possible keys from Supabase/PHP record
  const orVal = c.orNo || c.or_number || c.or_number || c.or || '';
  const amountVal = (c.amount != null) ? c.amount : (c.fee != null ? c.fee : (c.amount_paid != null ? c.amount_paid : ''));
  const bcVal = c.bcNo || c.bc_number || c.bc || '';
  const ctcNoVal = c.ctcNo || c.ctc_no || c.ctc_number || '';
  const ctcAmtVal = c.ctcAmount != null ? c.ctcAmount : (c.ctc_amount != null ? c.ctc_amount : '');

  set('cORNo', orVal);
  set('cBCNo', bcVal);
  set('cFee', amountVal);
  set('cAmount', amountVal);
  set('cCTCNo', ctcNoVal);
  set('cCTCAmount', ctcAmtVal);
  set('cDate', c.date || new Date().toISOString().split('T')[0]);
  set('cPurpose', c.purpose || '');
  set('cType', c.type || '');

  // --- Detect Certificate of Residency and route to its own modal ---
  const certTypeText = String(c.type || c.certificate_type || '').toLowerCase();
  const isResidency = certTypeText.includes('residency');

  if (isResidency) {
    // Populate the Residency modal fields instead
    set('rResident', c.resident || '');
    set('rNo', c.status === 'issued' ? (c.controlNo || '') : '');
    set('rORNo', orVal);
    set('rDate', c.date || new Date().toISOString().split('T')[0]);
    set('rType', c.type || '');
    set('rFee', amountVal);
    set('rBCNo', bcVal);
    set('rCTCNo', ctcNoVal);
    set('rCTCAmount', ctcAmtVal);
    set('rAmount', amountVal);

    // populate preview inputs
    const formattedName = formatResidentName(c.certName || c.resident || '') || (c.resident || '');
    const pName = document.getElementById('rPreviewName');
    const pCivil = document.getElementById('rPreviewCivilStatus');
    const pAddress = document.getElementById('rPreviewAddress');
    const pSupport = document.getElementById('rPreviewSupport');
    if (pName) pName.value = formattedName;
    if (pCivil) pCivil.value = c.certExtra || c.civil || '';
    if (pSupport) pSupport.value = c.support || c.purpose || '';

    if (pAddress) pAddress.value = '';

    // populate hidden fields
    set('rCertName', formattedName);
    set('rCivilStatus', c.certExtra || c.civil || '');
    set('rAddress', '');
    set('rSupport', c.support || c.purpose || '');

    // issued date
    if (c.date) {
      try {
        const dt = new Date(c.date);
        set('rIssuedDay', String(dt.getDate()).padStart(2, '0'));
        set('rIssuedMonth', dt.toLocaleString('en-PH', { month: 'long' }));
        set('rIssuedYear', dt.getFullYear());
      } catch (e) { }
    }

    // attach listener to update issued preview when date changes
    try {
      const rDateEl = document.getElementById('rDate');
      if (rDateEl) {
        if (window._residDatePreviewListener && typeof window._residDatePreviewListener === 'function') {
          rDateEl.removeEventListener('change', window._residDatePreviewListener);
          rDateEl.removeEventListener('input', window._residDatePreviewListener);
        }
        const updateResidIssued = () => {
          const v = rDateEl.value || '';
          let dayVal = '';
          let monthVal = '';
          let yearVal = '';
          try {
            const dt = v ? new Date(v) : new Date();
            if (!isNaN(dt.getTime())) {
              dayVal = String(dt.getDate());
              monthVal = dt.toLocaleString('en-PH', { month: 'long' });
              yearVal = dt.getFullYear();
            }
          } catch (e) { }
          const dInput = document.getElementById('rIssuedDay');
          const mInput = document.getElementById('rIssuedMonth');
          const yInput = document.getElementById('rIssuedYear');
          if (dInput) dInput.value = dayVal;
          if (mInput) mInput.value = monthVal;
          if (yInput) yInput.value = yearVal;
          const daySpan = document.getElementById('rPreviewIssuedDay');
          const monthSpan = document.getElementById('rPreviewIssuedMonthYear');
          if (daySpan) daySpan.textContent = dayVal;
          if (monthSpan) monthSpan.textContent = monthVal ? `${monthVal}, ${yearVal}` : '';
        };
        window._residDatePreviewListener = updateResidIssued;
        rDateEl.addEventListener('change', updateResidIssued);
        rDateEl.addEventListener('input', updateResidIssued);

        // Initial population
        updateResidIssued();
      }
    } catch (e) { }

    // Disable/Enable fields based on status
    const rFormInputs = document.querySelectorAll('#modal-residency .form-input, #modal-residency .form-select');
    rFormInputs.forEach(input => { input.disabled = isViewOnly; });

    // Show/Hide buttons
    const rPrintBtn = document.querySelector('#modal-residency [onclick="printResidencyCertificate()"]');
    const rViewBtn = document.querySelector('#modal-residency [onclick="viewResidencyCertificate()"]');
    const rIssuedBtn = document.getElementById('rCertIssuedBtn');
    if (isViewOnly) {
      if (rPrintBtn) rPrintBtn.style.display = 'inline-block';
      if (rViewBtn) rViewBtn.style.display = 'inline-block';
      if (rIssuedBtn) rIssuedBtn.style.display = 'none';
    } else {
      if (rPrintBtn) rPrintBtn.style.display = 'inline-block';
      if (rViewBtn) rViewBtn.style.display = 'inline-block';
      if (rIssuedBtn) rIssuedBtn.style.display = 'inline-block';
    }

    // Restore preview input values from local storage if available for this specific certificate
    try {
      const saved = localStorage.getItem(`barangay_clearance_data_${id}`) || localStorage.getItem(`barangay_clearance_data_${c.controlNo}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.resident && pName) pName.value = data.resident;
        if (data.civil && pCivil) pCivil.value = data.civil;
        if (data.address && pAddress) pAddress.value = data.address;
        if (data.purpose && pSupport) pSupport.value = data.purpose;
      }
    } catch (e) { }

    // Disable letters on Control No. (rNo)
    const rNoEl = document.getElementById('rNo');
    if (rNoEl && !rNoEl.dataset.listenerLettersDisabled) {
      rNoEl.addEventListener('input', function () {
        this.value = this.value.replace(/[a-zA-Z]/g, '');
      });
      rNoEl.dataset.listenerLettersDisabled = 'true';
    }

    if (typeof openModal === 'function') openModal('modal-residency');
    return; // done — skip the clearance modal logic below
  }

  // --- Barangay Clearance (default) continues below ---
  // Show BC No only for Barangay Clearance types
  try {
    const bcGroup = document.getElementById('cBCGroup');
    const isBC = certTypeText.includes('barangay');
    if (bcGroup) bcGroup.style.display = isBC ? '' : 'none';
    if (!isBC) set('cBCNo', '');
  } catch (e) { }
  const isIndigency = certTypeText.includes('indigency');

  // populate preview inputs
  set('cPreviewName', c.certName || c.resident || '');
  set('cPreviewCivilStatus', isIndigency ? '' : (c.certExtra || c.civil || ''));
  set('cPreviewSupport', c.support || c.purpose || '');

  set('cPreviewAddress', '');
  set('cAddress', '');

  set('cCertName', c.certName || c.resident || '');
  set('cCertDetails', isIndigency ? '' : (c.certExtra || c.civil || ''));
  set('cCertExtra', isIndigency ? '' : (c.certExtra || c.civil || ''));
  set('cSupport', c.support || c.purpose || '');
  // issued day/month if date exists
  if (c.date) {
    try {
      const dt = new Date(c.date);
      const dayVal = String(dt.getDate()).padStart(2, '0');
      const monthVal = dt.toLocaleString('en-PH', { month: 'long' });
      const yearVal = dt.getFullYear();
      set('cIssuedDay', dayVal);
      set('cIssuedMonth', monthVal);
      set('cIssuedYear', yearVal);
    } catch (e) { }
  }

  // populate issued preview spans
  const issuedDaySpan = document.getElementById('cPreviewIssuedDay');
  const issuedMonthSpan = document.getElementById('cPreviewIssuedMonthYear');
  try {
    const dayText = document.getElementById('cIssuedDay')?.value || '';
    const monthText = document.getElementById('cIssuedMonth')?.value || '';
    const yearText = document.getElementById('cIssuedYear')?.value || '';
    if (issuedDaySpan) issuedDaySpan.textContent = dayText;
    if (issuedMonthSpan) issuedMonthSpan.textContent = monthText ? `${monthText}, ${yearText}` : '';
  } catch (e) { }

  // attach listener to update issued preview when date changes
  try {
    const dateEl = document.getElementById('cDate');
    if (dateEl) {
      // remove previous listener if any
      if (window._certDatePreviewListener && typeof window._certDatePreviewListener === 'function') {
        dateEl.removeEventListener('change', window._certDatePreviewListener);
        dateEl.removeEventListener('input', window._certDatePreviewListener);
      }
      const updateIssued = () => {
        const v = dateEl.value || '';
        let dayVal = '';
        let monthVal = '';
        let yearVal = '';
        try {
          const dt = v ? new Date(v) : new Date();
          if (!isNaN(dt.getTime())) {
            dayVal = String(dt.getDate()).padStart(2, '0');
            monthVal = dt.toLocaleString('en-PH', { month: 'long' });
            yearVal = dt.getFullYear();
          }
        } catch (e) { }
        const dInput = document.getElementById('cIssuedDay');
        const mInput = document.getElementById('cIssuedMonth');
        const yInput = document.getElementById('cIssuedYear');
        if (dInput) dInput.value = dayVal;
        if (mInput) mInput.value = monthVal;
        if (yInput) yInput.value = yearVal;
        if (issuedDaySpan) issuedDaySpan.textContent = dayVal;
        if (issuedMonthSpan) issuedMonthSpan.textContent = monthVal ? `${monthVal}, ${yearVal}` : '';
      };
      window._certDatePreviewListener = updateIssued;
      dateEl.addEventListener('change', updateIssued);
      dateEl.addEventListener('input', updateIssued);
    }
  } catch (e) { }

  // Disable/Enable all form fields based on status
  const formInputs = document.querySelectorAll('#modal-cert .form-input, #modal-cert .form-select, #modal-cert .form-textarea');
  formInputs.forEach(input => {
    input.disabled = isViewOnly;
  });

  // Hide/Show action buttons based on certificate status
  const printBtn = document.querySelector('#modal-cert [onclick="printCertificate()"]');
  const viewBtn = document.querySelector('#modal-cert [onclick="viewCertificate()"]');
  const issuedBtn = document.getElementById('certIssuedBtn');

  if (isViewOnly) {
    if (printBtn) printBtn.style.display = 'inline-block';
    if (viewBtn) viewBtn.style.display = 'inline-block';
    if (issuedBtn) issuedBtn.style.display = 'none';
  } else {
    // Allow printing from the modal opened by the Open button as well
    if (printBtn) printBtn.style.display = 'inline-block';
    if (viewBtn) viewBtn.style.display = 'inline-block';
    if (issuedBtn) issuedBtn.style.display = 'inline-block';
  }

  // populate inline preview inputs and hidden preview fields
  const name = c.resident || '';
  const extra = c.civil || '';
  const supportText = c.purpose || '';
  const formattedName = formatResidentName(name) || name;
  set('cCertName', formattedName);
  set('cCertDetails', extra);
  set('cCertExtra', extra);
  set('cSupport', supportText);
  // Populate visible preview inputs if present
  const pName = document.getElementById('cPreviewName');
  const pSupport = document.getElementById('cPreviewSupport');
  if (pName) pName.value = formattedName;
  if (pSupport) pSupport.value = supportText;

  // Restore preview input values from local storage if available for this specific certificate
  try {
    const saved = localStorage.getItem(`barangay_clearance_data_${id}`);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.resident) set('cPreviewName', data.resident);
      if (data.civil) set('cPreviewCivilStatus', data.civil);
      if (data.address) set('cPreviewAddress', data.address);
      if (data.purpose) set('cPreviewSupport', data.purpose);
    }
  } catch (e) { }

  // Disable letters on Control No. and BC No. fields
  ['cNo', 'cBCNo'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el && !el.dataset.listenerLettersDisabled) {
      el.addEventListener('input', function () {
        this.value = this.value.replace(/[a-zA-Z]/g, '');
      });
      el.dataset.listenerLettersDisabled = 'true';
    }
  });

  if (typeof openModal === 'function') openModal('modal-cert');
}

// Reset certificate modal when closing
function resetCertModal() {
  window.currentCertId = null;
  // Re-enable all form fields
  const formInputs = document.querySelectorAll('#modal-cert .form-input, #modal-cert .form-select, #modal-cert .form-textarea');
  formInputs.forEach(input => {
    input.disabled = false;
  });
  // Show all action buttons
  const printBtn = document.querySelector('#modal-cert [onclick="printCertificate()"]');
  const viewBtn = document.querySelector('#modal-cert [onclick="viewCertificate()"]');
  const issuedBtn = document.getElementById('certIssuedBtn');
  if (printBtn) printBtn.style.display = 'inline-block';
  if (viewBtn) viewBtn.style.display = 'inline-block';
  if (issuedBtn) issuedBtn.style.display = 'inline-block';
  // clear preview inputs
  const pName = document.getElementById('cPreviewName');
  const pSupport = document.getElementById('cPreviewSupport');
  if (pName) pName.value = '';
  if (pSupport) pSupport.value = '';
}

// Requirements Data & Logic
const certRequirementsData = {
  'REQ-2025-001': {
    resident: 'Maria Santos', type: 'Barangay Clearance', requirements: [
      { name: 'Community Tax Certificate (Cedula)', status: 'uploaded', file: 'santos_cedula.jpg', date: 'Feb 24' },
    ]
  },
  'REQ-2025-002': {
    resident: 'Jose Reyes', type: 'Indigency Certificate', requirements: [
      { name: 'Community Tax Certificate (Cedula)', status: 'uploaded', file: 'reyes_cedula.jpg', date: 'Feb 23' },
    ]
  }
};

function viewCertRequirements(id) {
  const data = certRequirementsData[id];
  const body = document.getElementById('certReqBody');
  if (!body) return;

  if (!data) {
    body.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px">No requirements data found for certificate <strong>#${id}</strong>.</p>`;
    if (typeof openModal === 'function') openModal('modal-cert-req');
    return;
  }

  const uploaded = data.requirements.filter(r => r.status === 'uploaded').length;
  const total = data.requirements.length;

  body.innerHTML = `
    <div style="background:var(--slate);border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Certificate</div>
        <div style="font-size:16px;font-weight:700;color:var(--navy)">#${id}</div>
        <div style="font-size:13px;color:var(--text-mid)">${data.resident} — ${data.type}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Requirements</div>
        <div style="font-size:22px;font-weight:700;color:${uploaded === total ? 'var(--green)' : 'var(--amber)'}">${uploaded}/${total}</div>
        <div style="font-size:11px;color:var(--text-muted)">Submitted</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${data.requirements.map((req, i) => `
        <div style="background:#fff;border:1.5px solid ${req.status === 'uploaded' ? 'var(--green)' : 'var(--border)'};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div style="font-size:22px">${req.status === 'uploaded' ? '✅' : '📋'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--navy)">${req.name}</div>
            ${req.file ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">🖇 ${req.file} · ${req.date}</div>` : `<div style="font-size:12px;color:var(--amber);margin-top:2px">Not yet submitted</div>`}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            ${req.status === 'uploaded'
      ? `<button class="btn btn-outline btn-sm" onclick="showToast('Opening file...','info')">👁 View</button>`
      : `<button class="btn btn-gold btn-sm" onclick="uploadRequirement('${id}',${i})">⬆ Upload</button>`}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  if (typeof openModal === 'function') openModal('modal-cert-req');
}

function uploadRequirement(certId, reqIndex) {
  const data = certRequirementsData[certId]; if (!data) return;
  const req = data.requirements[reqIndex];
  req.status = 'uploaded'; req.file = req.name.toLowerCase().replace(/[^a-z]/g, '_') + '.jpg';
  req.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  viewCertRequirements(certId);
  if (typeof showToast === 'function') showToast(`"${req.name}" uploaded successfully!`, 'success');
}

// Reset certificate modal when closing
function resetCertModal() {
  window.currentCertId = null;
  // Re-enable all form fields
  const formInputs = document.querySelectorAll('#modal-cert .form-input, #modal-cert .form-select, #modal-cert .form-textarea');
  formInputs.forEach(input => {
    input.disabled = false;
  });
  // Show action buttons
  const printBtn = document.querySelector('#modal-cert [onclick="printCertificate()"]');
  const viewBtn = document.querySelector('#modal-cert [onclick="viewCertificate()"]');
  const issuedBtn = document.getElementById('certIssuedBtn');
  if (printBtn) printBtn.style.display = 'inline-block';
  if (viewBtn) viewBtn.style.display = 'inline-block';
  if (issuedBtn) issuedBtn.style.display = 'inline-block';
  // clear preview inputs
  const pName = document.getElementById('cPreviewName');
  const pSupport = document.getElementById('cPreviewSupport');
  if (pName) pName.value = '';
  if (pSupport) pSupport.value = '';
  // clear issued spans
  const issuedDaySpan = document.getElementById('cPreviewIssuedDay');
  const issuedMonthSpan = document.getElementById('cPreviewIssuedMonthYear');
  if (issuedDaySpan) issuedDaySpan.textContent = '';
  if (issuedMonthSpan) issuedMonthSpan.textContent = '';
  // remove date listener if attached
  try {
    const dateEl = document.getElementById('cDate');
    if (dateEl && window._certDatePreviewListener) {
      dateEl.removeEventListener('change', window._certDatePreviewListener);
      dateEl.removeEventListener('input', window._certDatePreviewListener);
      window._certDatePreviewListener = null;
    }
  } catch (e) { }
}

async function issueCertificate() {
  if (!window.currentCertId) {
    if (typeof showToast === 'function') showToast('No certificate selected.', 'error');
    return;
  }

  // --- Required field validation ---
  const _chk = (a, b) => (document.getElementById(a)?.value || (b ? document.getElementById(b)?.value : '') || '').trim();
  const missing = [];
  if (!_chk('cNo', 'cCertNo')) missing.push('Control No.');
  if (!_chk('cBCNo')) missing.push('BC No.');
  if (!_chk('cDate')) missing.push('Date');
  if (!_chk('cResident')) missing.push('Resident');
  if (!_chk('cPreviewName', 'cCertName')) missing.push('Full Name of Resident');
  if (!_chk('cPreviewCivilStatus', 'cCertDetails')) missing.push('Civil Status');
  if (!_chk('cPreviewAddress', 'cAddress')) missing.push('Street Address');
  if (!_chk('cPreviewSupport', 'cSupport')) missing.push('Purpose');
  if (missing.length > 0) {
    const msg = 'Please fill in required fields: ' + missing.join(', ') + '.';
    if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
    return;
  }

  const resident = document.getElementById('cResident').value?.trim();
  const controlNo = (document.getElementById('cNo')?.value || '').trim();
  const date = document.getElementById('cDate').value?.trim();

  const btn = document.getElementById('certIssuedBtn');
  const originalText = btn ? btn.innerHTML : 'Issue';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Issuing...';
  }

  try {
    if (!window.supabaseClient) throw new Error("Database client not loaded");

    // Check for duplicate control number (allow if not in same year and same certificate type)
    const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(controlNo)}`);
    if (dupCheck && dupCheck.length > 0) {
      const currentYear = getYearFromDate(date);
      const c = window.certificates.find(x => String(x.id) === String(window.currentCertId));
      const currentCertType = c ? (c.type || c.certificate_type || 'Barangay Clearance') : 'Barangay Clearance';
      const isDup = dupCheck.some(c => {
        if (String(c.id) === String(window.currentCertId)) return false;
        const dupYear = getYearFromDate(c.issued_date || c.date_created);
        const dupType = c.certificate_type || '';
        return dupYear === currentYear && dupType === currentCertType;
      });
      if (isDup) {
        throw new Error('The Control Number already exists in the current year for this certificate type. Please use a different one.');
      }
    }

    // Check for duplicate Barangay Clearance No. (bc_number) in the current year
    const bcNoVal = document.getElementById('cBCNo')?.value?.trim() || '';
    if (bcNoVal) {
      const dupCheckBc = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created&bc_number=eq.${encodeURIComponent(bcNoVal)}`);
      if (dupCheckBc && dupCheckBc.length > 0) {
        const currentYear = getYearFromDate(date);
        const isDupBc = dupCheckBc.some(c => {
          if (String(c.id) === String(window.currentCertId)) return false;
          return getYearFromDate(c.issued_date || c.date_created) === currentYear;
        });
        if (isDupBc) {
          throw new Error('The Barangay Clearance No. already exists in the current year. Please use a different one.');
        }
      }
    }

    // Collect all fields to persist (match server allowed fields)
    const orNoVal = document.getElementById('cORNo')?.value || '';
    const ctcNoVal = document.getElementById('cCTCNo')?.value || '';
    const ctcAmtVal = document.getElementById('cCTCAmount')?.value || document.getElementById('cAmount')?.value || '';
    const amountPaidVal = document.getElementById('cFee')?.value || '';

    // Build the full certificate document data to persist in the DB
    const certDocData = {
      resident: document.getElementById('cPreviewName')?.value || document.getElementById('cCertName')?.value || resident,
      civil: document.getElementById('cPreviewCivilStatus')?.value || document.getElementById('cCivilStatus')?.value || '',
      address: document.getElementById('cPreviewAddress')?.value || document.getElementById('cAddress')?.value || '',
      purpose: document.getElementById('cPreviewSupport')?.value || document.getElementById('cPurpose')?.value || '',
      day: document.getElementById('cIssuedDay')?.value || '',
      month: document.getElementById('cIssuedMonth')?.value || '',
      year: document.getElementById('cIssuedYear')?.value || '',
      bcNo: bcNoVal,
      ctcNo: ctcNoVal,
      ctcAmount: ctcAmtVal,
      fee: amountPaidVal
    };

    const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
    const issuedNow = new Date().toISOString();
    const payload = {
      control_number: controlNo,
      status: 'issued',
      issued_date: date || issuedNow.split('T')[0],
      date_created: issuedNow,
      issued_by: currentUser,
      notes: JSON.stringify(certDocData)
    };
    if (orNoVal) payload.or_number = orNoVal;
    if (bcNoVal) payload.bc_number = bcNoVal;
    if (ctcNoVal) payload.ctc_number = ctcNoVal;
    if (ctcAmtVal) payload.ctc_amount = ctcAmtVal;
    if (amountPaidVal) payload.amount_paid = amountPaidVal;

    console.debug('Issuing certificate with payload:', payload);

    try {
      await window.supabaseClient.update('certificates', 'id', window.currentCertId, payload);

      // Update local entry so UI and View Action have the exact custom fields
      const c = window.certificates.find(x => String(x.id) === String(window.currentCertId));
      if (c) {
        c.controlNo = controlNo;
        c.status = 'issued';
        c.issuedDate = payload.issued_date;
        c.date = issuedNow;
        c.issuedBy = currentUser;
        c.certName = document.getElementById('cCertName')?.value || document.getElementById('cPreviewName')?.value || c.certName || c.resident;
        c.certExtra = document.getElementById('cCertDetails')?.value || document.getElementById('cPreviewCivilStatus')?.value || c.certExtra;
        c.address = document.getElementById('cPreviewAddress')?.value || document.getElementById('cAddress')?.value || c.address;
        c.support = document.getElementById('cSupport')?.value || document.getElementById('cPreviewSupport')?.value || c.support;
        c.orNo = orNoVal || c.orNo;
        c.bcNo = bcNoVal || c.bcNo;
        c.ctcNo = ctcNoVal || c.ctcNo;
        c.ctcAmount = ctcAmtVal || c.ctcAmount;
        c.fee = amountPaidVal || c.fee;
        c.amount = c.fee;
      }
    } catch (clientErr) {
      let errMsg = clientErr.message;
      if (errMsg.includes('23505') || errMsg.includes('duplicate key')) {
        errMsg = 'The Control Number already exists for this Certificate Type in the current year. Please use a different one.';
      }
      if (typeof showToast === 'function') showToast('Update error: ' + errMsg, 'error');
      console.error('Update failed:', clientErr);
      return;
    }

    // Render the table
    renderCerts();

    // Show success message
    if (typeof showToast === 'function') showToast(`Certificate issued for ${resident} (Control No: ${controlNo})!`, 'success');

    // Manually force an audit log insert for Barangay Clearance / Standard Certificates
    try {
      const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();

      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'certificates',
          record_id: String(window.currentCertId || controlNo || ''),
          action_type: 'issued',
          fields: `Control No - ${controlNo}, Type - ${document.getElementById('cType')?.value || 'Certificate'}`,
          record_name: resident,
          performed_by: currentUser
        });
        console.log('Audit log inserted for certificate issue.');
      }
    } catch (directLogErr) {
      console.error('Direct audit log failed:', directLogErr);
    }

    // Reset and close modal
    resetCertModal();
    if (typeof closeModal === 'function') closeModal('modal-cert');

  } catch (error) {
    console.error("Issue error:", error);
    if (typeof showToast === 'function') showToast('Error issuing certificate: ' + error.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// Expose functions
window.renderCerts = renderCerts;
window.filterCertsTable = filterCertsTable;
window.filterCerts = filterCerts;
window.filterCertsApproved = filterCertsApproved;
window.filterCertsRejected = filterCertsRejected;
window.viewCertRequirements = viewCertRequirements;
window.approveCertificate = approveCertificate;
window.rejectCertificate = rejectCertificate;
window.viewOfficialCertificate = viewOfficialCertificate;
window.uploadRequirement = uploadRequirement;
window.openCertModal = openCertModal;
window.resetCertModal = resetCertModal;
window.issueCertificate = issueCertificate;

// --- Indigency certificate quick-issue helpers ---
function openIndigencyModal() {
  // clear fields and set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('indName').value = '';
  document.getElementById('indCivil').value = '';
  document.getElementById('indAddress').value = '';
  document.getElementById('indPurpose').value = '';
  document.getElementById('indDate').value = today;
  // leave control number empty for manual entry
  const controlEl = document.getElementById('indControlNo');
  if (controlEl) {
    controlEl.value = '';
    if (!controlEl.dataset.listenerLettersDisabled) {
      controlEl.addEventListener('input', function () {
        this.value = this.value.replace(/[a-zA-Z]/g, '');
      });
      controlEl.dataset.listenerLettersDisabled = 'true';
    }
  }
  updateIndigencyPreview();
  if (typeof openModal === 'function') openModal('modal-indigency');
}

function updateIndigencyPreview() {
  const n = document.getElementById('indName').value || "[Applicant's Full Name]";
  const c = document.getElementById('indCivil').value || '[Civil Status]';
  const a = document.getElementById('indAddress').value || '[Street Address]';
  const p = document.getElementById('indPurpose').value || '[State Purpose]';
  const d = document.getElementById('indDate').value || '';
  const ctrl = document.getElementById('indControlNo')?.value || '';
  const dayEl = document.getElementById('indPreviewDay');
  const monthEl = document.getElementById('indPreviewMonthYear');
  if (d) {
    try {
      const dt = new Date(d);
      const day = String(dt.getDate());
      const monthYear = dt.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
      if (dayEl) dayEl.textContent = day;
      if (monthEl) monthEl.textContent = monthYear;
    } catch (e) { }
  }
  document.getElementById('indPreviewName').textContent = n;
  document.getElementById('indPreviewCivil').textContent = c;
  document.getElementById('indPreviewAddress').textContent = a;
  document.getElementById('indPreviewPurpose').innerHTML = p;
  // optional: show control number in preview if element exists
  const ctrlEl = document.getElementById('indPreviewControl');
  if (ctrlEl) ctrlEl.textContent = ctrl;
}

async function issueIndigencyCertificate() {
  const name = document.getElementById('indName').value?.trim();
  const civil = document.getElementById('indCivil').value?.trim();
  const address = document.getElementById('indAddress').value?.trim();
  const purpose = document.getElementById('indPurpose').value?.trim();
  const date = document.getElementById('indDate').value || '';
  const controlNo = document.getElementById('indControlNo')?.value?.trim() || '';

  // --- Validate all required fields ---
  const requiredFields = [
    { id: 'indName', label: "Applicant's Name", value: name },
    { id: 'indCivil', label: 'Civil Status', value: civil },
    { id: 'indAddress', label: 'Street Address', value: address },
    { id: 'indPurpose', label: 'Purpose', value: purpose },
    { id: 'indControlNo', label: 'Control No.', value: controlNo },
    { id: 'indDate', label: 'Date', value: date }
  ];

  // Clear previous error highlights
  requiredFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) { el.style.borderColor = ''; el.style.background = ''; }
  });
  // Keep the green border if resident was selected
  const selectedId = document.getElementById('indResidentId')?.value;
  if (selectedId) {
    const nameEl = document.getElementById('indName');
    if (nameEl) { nameEl.style.borderColor = '#22c55e'; nameEl.style.background = 'rgba(34,197,94,0.06)'; }
  }

  const missing = requiredFields.filter(f => !f.value);
  if (missing.length > 0) {
    // Highlight all empty fields in red
    missing.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) { el.style.borderColor = '#ef4444'; el.style.background = 'rgba(239,68,68,0.06)'; }
    });
    // Focus the first missing field
    const firstEl = document.getElementById(missing[0].id);
    if (firstEl) firstEl.focus();
    const names = missing.map(f => f.label).join(', ');
    if (typeof showToast === 'function') showToast(`Please fill in: ${names}`, 'error');
    return;
  }

  // Strictly require a resident selected from the search dropdown
  const residentId = selectedId ? (Number(selectedId) || selectedId) : null;

  if (!residentId) {
    if (typeof showToast === 'function') showToast('Please search and select a resident from the dropdown list before issuing.', 'error');
    const nameInput = document.getElementById('indName');
    if (nameInput) {
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.background = 'rgba(239,68,68,0.06)';
      nameInput.focus();
    }
    return;
  }

  const btn = document.querySelector('#modal-indigency .btn-success');
  const orig = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Issuing...'; }

  try {
    if (!window.supabaseClient) throw new Error('Database client not loaded');

    // Check for duplicate control number (allow if not in same year and same certificate type)
    const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(controlNo)}`);
    if (dupCheck && dupCheck.length > 0) {
      const currentYear = getYearFromDate(date);
      const currentCertType = 'Indigency Certificate';
      const isDup = dupCheck.some(c => {
        const dupYear = getYearFromDate(c.issued_date || c.date_created);
        const dupType = c.certificate_type || '';
        return dupYear === currentYear && dupType === currentCertType;
      });
      if (isDup) {
        throw new Error('The Control Number already exists in the current year for this certificate type. Please use a different one.');
      }
    }

    const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
    const issuedNow = new Date().toISOString();
    const payload = {
      resident_id: residentId,
      resident_name: name,
      certificate_type: 'Indigency Certificate',
      control_number: controlNo,
      or_number: '',
      amount_paid: 0,
      status: 'issued',
      issued_date: date,
      date_created: issuedNow,
      issued_by: currentUser,
      purpose: purpose || null,
      notes: JSON.stringify({ resident: name, civil: civil, address: address, purpose: purpose })
    };

    try {
      const p = { resident: name, civil: civil, address: address, purpose: purpose };
      localStorage.setItem(`barangay_clearance_data_${controlNo}`, JSON.stringify(p));
    } catch (e) { }

    let res = null;
    try {
      res = await window.supabaseClient.insert('certificates', payload);
    } catch (e) {
      if (e.message.includes('23505') || e.message.includes('duplicate key')) {
        throw new Error('The Control Number already exists for this Certificate Type in the current year. Please use a different one.');
      }
      // retry without purpose if schema differs
      delete payload.purpose;
      res = await window.supabaseClient.insert('certificates', payload);
    }

    const newId = Array.isArray(res) && res[0]?.id ? res[0].id : (res?.id || Date.now());

    // add to local array and re-render — include all modal fields so View shows exact content
    window.certificates = window.certificates || [];
    window.certificates.unshift({
      id: newId,
      resident: name,
      residentId: residentId || null,
      certName: name,
      certExtra: civil || '',
      civil: civil || '',
      address: address || '',
      purpose: purpose || '',
      type: 'Indigency Certificate',
      certificate_type: 'Indigency Certificate',
      controlNo: controlNo,
      control_number: controlNo,
      date: issuedNow,
      issuedDate: date,
      issued_date: date,
      status: 'issued',
      orNo: '',
      or_number: '',
      amount: 0,
      amount_paid: 0,
      issuedBy: currentUser
    });
    renderCerts();

    // Manually force an audit log insert for Indigency
    try {
      const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'certificates',
          record_id: String(newId || controlNo),
          action_type: 'issued',
          fields: `Control No - ${controlNo}, Type - Indigency Certificate`,
          record_name: name,
          performed_by: currentUser
        });
        console.log('Audit log inserted for indigency issue.');
      }
    } catch (directLogErr) {
      console.error('Direct audit log failed:', directLogErr);
    }

    if (typeof showToast === 'function') showToast('Indigency certificate issued.', 'success');
    if (typeof closeModal === 'function') closeModal('modal-indigency');

  } catch (err) {
    console.error('Issue indigency error', err);
    let errMsg = err.message;
    if (errMsg.includes('23505') || errMsg.includes('duplicate key')) {
      errMsg = 'The Control Number already exists for this Certificate Type in the current year. Please use a different one.';
    }
    if (typeof showToast === 'function') showToast('Error issuing certificate: ' + errMsg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}

// wire preview updates
document.addEventListener('input', function (e) {
  if (!e.target) return;
  const ids = ['indName', 'indCivil', 'indAddress', 'indPurpose', 'indDate'];
  if (ids.indexOf(e.target.id) !== -1) updateIndigencyPreview();
});

// --- Resident search within Indigency modal ---
let _indSearchTimeout = null;

// Clear the "selected" visual state when user modifies the name manually
function clearIndigencyResidentSelection() {
  const input = document.getElementById('indName');
  const hid = document.getElementById('indResidentId');
  if (hid) hid.value = '';
  if (input) {
    input.style.borderColor = '';
    input.style.background = '';
  }
  // Remove the checkmark indicator if present
  const indicator = document.getElementById('indNameSelectedIndicator');
  if (indicator) indicator.remove();
}

async function adminSearchResidents(query) {
  const input = document.getElementById('indName');
  const resultDiv = document.getElementById('ind-resident-results');
  const hid = document.getElementById('indResidentId');
  if (!input || !resultDiv) return;

  // User is typing — clear any previous selection so they must re-select
  clearIndigencyResidentSelection();

  clearTimeout(_indSearchTimeout);
  if (!query || !query.trim()) { resultDiv.style.display = 'none'; return; }
  _indSearchTimeout = setTimeout(async () => {
    try {
      resultDiv.innerHTML = '<div style="padding:9px;text-align:center;color:var(--text-muted)">Searching...</div>';
      // Use column flex so single messages can be pushed to the bottom
      resultDiv.style.display = 'flex';
      resultDiv.style.flexDirection = 'column';
      if (!window.supabaseClient) throw new Error('Database client not available');
      const residents = await window.supabaseClient.select('residents', 'select=id,first,last,mid,suffix,address,purok,civilstatus&status=eq.active&limit=1000000');
      if (!Array.isArray(residents) || residents.length === 0) {
        resultDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);margin-top:auto">No residents found</div>';
        return;
      }
      const q = query.toLowerCase().trim();
      const parts = q.split(/\s+/).filter(Boolean);
      const filtered = residents.filter(r => {
        const full = ([r.last, r.first, r.mid, r.suffix].filter(Boolean).join(' ')).toLowerCase();
        return parts.every(p => full.includes(p));
      });
      if (filtered.length === 0) {
        resultDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);margin-top:auto">No residents found</div>';
        return;
      }
      // Store filtered results for selection
      window._indSearchResults = filtered;
      resultDiv.innerHTML = filtered.map((resident, idx) => {
        // Format as: First M. Last
        const first = (resident.first || '').trim();
        const mid = (resident.mid || '').trim();
        const last = (resident.last || '').trim();
        const suffix = (resident.suffix || '').trim();
        const midInitial = mid ? (mid.charAt(0).toUpperCase() + '.') : '';
        let displayName = `${first} ${midInitial} ${last}`.replace(/\s+/g, ' ').trim();
        if (suffix) displayName += ' ' + suffix;
        const safeId = String(resident.id).replace(/'/g, "\\'");
        const safeName = String(displayName).replace(/'/g, "\\'");
        return `<div style="padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s;" onmouseenter="this.style.background='var(--slate)'" onmouseleave="this.style.background=''" onclick="adminSelectResident('${safeId}','${safeName}',${idx})"><div style="font-weight:600">${displayName}</div><div style="font-size:12px;color:var(--text-muted);">${resident.address || ''} ${resident.purok ? ' - ' + resident.purok : ''}</div></div>`;
      }).join('');
    } catch (e) {
      console.error('Indigency resident search error', e);
      resultDiv.innerHTML = `<div style="padding:12px;text-align:center;color:var(--red)">${e.message || String(e)}</div>`;
    }
  }, 250);
}

function adminSelectResident(id, name, idx) {
  const input = document.getElementById('indName');
  const hid = document.getElementById('indResidentId');
  const resultDiv = document.getElementById('ind-resident-results');
  if (input) {
    input.value = name;
    // Visual feedback: green border to show a valid selection
    input.style.borderColor = '#22c55e';
    input.style.background = 'rgba(34,197,94,0.06)';
  }
  if (hid) hid.value = id;
  if (resultDiv) resultDiv.style.display = 'none';

  // Add a small checkmark indicator next to the input
  let indicator = document.getElementById('indNameSelectedIndicator');
  if (!indicator && input && input.parentElement) {
    indicator = document.createElement('span');
    indicator.id = 'indNameSelectedIndicator';
    indicator.textContent = '✓ Selected';
    indicator.style.cssText = 'color:#22c55e;font-size:12px;font-weight:600;margin-left:8px;display:inline-flex;align-items:center;gap:2px;';
    // Insert after input
    input.insertAdjacentElement('afterend', indicator);
  } else if (indicator) {
    indicator.style.display = 'inline-flex';
  }

  // Keep civil status and address empty when selecting a resident
  const civilInput = document.getElementById('indCivil');
  const addressInput = document.getElementById('indAddress');
  if (civilInput) civilInput.value = '';
  if (addressInput) addressInput.value = '';

  updateIndigencyPreview();
}
window.adminSearchResidents = adminSearchResidents;
window.adminSelectResident = adminSelectResident;
window.clearIndigencyResidentSelection = clearIndigencyResidentSelection;

window.openIndigencyModal = openIndigencyModal;
window.issueIndigencyCertificate = issueIndigencyCertificate;

async function printIndigencyCertificate() {
  const name = document.getElementById('indName')?.value?.trim() || '';
  const civil = document.getElementById('indCivil')?.value?.trim() || '';
  const address = document.getElementById('indAddress')?.value?.trim() || '';
  const purpose = document.getElementById('indPurpose')?.value?.trim() || '';
  const dateVal = document.getElementById('indDate')?.value || '';
  const controlNo = document.getElementById('indControlNo')?.value?.trim() || '';

  // --- Validate all required fields before printing ---
  const requiredFields = [
    { id: 'indName', label: "Applicant's Name", value: name },
    { id: 'indCivil', label: 'Civil Status', value: civil },
    { id: 'indAddress', label: 'Street Address', value: address },
    { id: 'indPurpose', label: 'Purpose', value: purpose },
    { id: 'indControlNo', label: 'Control No.', value: controlNo },
    { id: 'indDate', label: 'Date', value: dateVal }
  ];

  // Clear previous error highlights
  requiredFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) { el.style.borderColor = ''; el.style.background = ''; }
  });
  const selectedId = document.getElementById('indResidentId')?.value;
  if (selectedId) {
    const nameEl = document.getElementById('indName');
    if (nameEl) { nameEl.style.borderColor = '#22c55e'; nameEl.style.background = 'rgba(34,197,94,0.06)'; }
  }

  const missing = requiredFields.filter(f => !f.value);
  if (missing.length > 0) {
    missing.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) { el.style.borderColor = '#ef4444'; el.style.background = 'rgba(239,68,68,0.06)'; }
    });
    const firstEl = document.getElementById(missing[0].id);
    if (firstEl) firstEl.focus();
    const names = missing.map(f => f.label).join(', ');
    if (typeof showToast === 'function') showToast(`Please fill in: ${names}`, 'error');
    return;
  }

  if (!selectedId) {
    if (typeof showToast === 'function') showToast('Please search and select a resident from the dropdown list before printing.', 'error');
    const nameInput = document.getElementById('indName');
    if (nameInput) { nameInput.style.borderColor = '#ef4444'; nameInput.style.background = 'rgba(239,68,68,0.06)'; nameInput.focus(); }
    return;
  }

  // Check for duplicate control number (allow if not in same year and same certificate type)
  try {
    if (window.supabaseClient) {
      const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(controlNo)}`);
      if (dupCheck && dupCheck.length > 0) {
        const currentYear = getYearFromDate(dateVal);
        const currentCertType = 'Indigency Certificate';
        const isDup = dupCheck.some(c => {
          const dupYear = getYearFromDate(c.issued_date || c.date_created);
          const dupType = c.certificate_type || '';
          return dupYear === currentYear && dupType === currentCertType;
        });
        if (isDup) {
          const msg = 'The Control Number already exists in the current year for this certificate type. Please use a different one.';
          if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
          return;
        }
      }
    }
  } catch (e) { console.error(e); }

  // derive day and month/year for template
  let day = '';
  let monthYear = '';
  try {
    const dt = new Date(dateVal);
    if (!isNaN(dt.getTime())) {
      day = String(dt.getDate());
      monthYear = dt.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
    }
  } catch (e) { }

  // use provided control number if present
  const signatory = 'ROSANNA D. DIAZ';

  const params = new URLSearchParams({
    certNo: controlNo,
    type: 'Indigency Certificate',
    resident: name,
    civil: civil,
    address: address,
    gender: '',
    purpose: purpose || 'Purpose not specified',
    day: day || '__',
    month: monthYear || '',
    signatory: signatory,
    amount: '',
    orNo: '',
    bcNo: '',
    ctcNo: '',
    date: dateVal,
    print: 'true'
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    localStorage.setItem(`barangay_clearance_data_${controlNo}`, JSON.stringify(paramsObj));
    openCertificatePost(paramsObj);
  } catch (e) {
    window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
  }
}

window.printIndigencyCertificate = printIndigencyCertificate;

function viewResidencyCertificate() {
  // --- Required field validation ---
  const _rChk = id => (document.getElementById(id)?.value || '').trim();
  const rMissing = [];
  if (!_rChk('rNo')) rMissing.push('Control No.');
  if (!_rChk('rDate')) rMissing.push('Date');
  if (!_rChk('rPreviewName')) rMissing.push('Full Name of Resident');
  if (!_rChk('rPreviewCivilStatus')) rMissing.push('Civil Status');
  if (!_rChk('rPreviewAddress')) rMissing.push('Street Address');
  if (!_rChk('rPreviewSupport')) rMissing.push('Purpose');
  if (rMissing.length > 0) {
    const msg = 'Please fill in required fields: ' + rMissing.join(', ') + '.';
    if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
    return;
  }

  try {
    if (typeof syncResidencyPreview === 'function') syncResidencyPreview();
  } catch (e) { }

  const certNo = document.getElementById('rNo')?.value || '';
  const resident = document.getElementById('rPreviewName')?.value || 'RESIDENT NAME';
  const civil = document.getElementById('rPreviewCivilStatus')?.value || '';
  const address = document.getElementById('rPreviewAddress')?.value || '';
  const gender = resident ? (resident.toLowerCase().includes('mrs') || resident.toLowerCase().includes('ms') ? 'her' : 'his') : 'his';
  const purpose = document.getElementById('rPreviewSupport')?.value || '';

  const day = document.getElementById('rIssuedDay')?.value || '9th';
  const monthVal = (document.getElementById('rIssuedMonth')?.value || 'February').trim();
  const yearVal = (document.getElementById('rIssuedYear')?.value || '2026').trim();
  const month = (monthVal && yearVal && !monthVal.includes(yearVal)) ? `${monthVal}, ${yearVal}` : (monthVal || yearVal || 'February, 2026');

  const signatory = 'ROSANNA D. DIAZ';
  const amount = document.getElementById('rFee')?.value || document.getElementById('rAmount')?.value || 'Php50.00';
  const orNo = document.getElementById('rORNo')?.value || '3192404';
  const bcNo = document.getElementById('rBCNo')?.value || '';
  const ctcNo = document.getElementById('rCTCNo')?.value || '';
  const ctcAmount = document.getElementById('rCTCAmount')?.value || '';
  const date = document.getElementById('rDate')?.value || '02/09/2026';
  const type = document.getElementById('rType')?.value || 'Residency Certificate';

  const params = new URLSearchParams({
    certNo, type, resident, civil, address, gender, purpose, day, month, signatory, amount,
    orNo, bcNo: bcNo, ctcNo: ctcNo, ctcAmount: ctcAmount, date
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    const certId = window.currentCertId || paramsObj.certNo;
    localStorage.setItem(`barangay_clearance_data_${certId}`, JSON.stringify(paramsObj));
    openCertificatePost(paramsObj);
  } catch (e) {
    window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
  }
}

async function printResidencyCertificate() {
  // --- Required field validation ---
  const _rChk = id => (document.getElementById(id)?.value || '').trim();
  const rMissing = [];
  if (!_rChk('rNo')) rMissing.push('Control No.');
  if (!_rChk('rDate')) rMissing.push('Date');
  if (!_rChk('rPreviewName')) rMissing.push('Full Name of Resident');
  if (!_rChk('rPreviewCivilStatus')) rMissing.push('Civil Status');
  if (!_rChk('rPreviewAddress')) rMissing.push('Street Address');
  if (!_rChk('rPreviewSupport')) rMissing.push('Purpose');
  if (!_rChk('rBCNo')) rMissing.push('Barangay Certificate No.');
  if (rMissing.length > 0) {
    const msg = 'Please fill in required fields: ' + rMissing.join(', ') + '.';
    if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
    return;
  }

  try {
    if (typeof syncResidencyPreview === 'function') syncResidencyPreview();
  } catch (e) { }

  const certNo = document.getElementById('rNo')?.value || '';
  const rBcNo = document.getElementById('rBCNo')?.value?.trim() || '';

  // Check for duplicate control number (allow if not in same year and same certificate type)
  try {
    if (window.supabaseClient) {
      const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(certNo)}`);
      if (dupCheck && dupCheck.length > 0) {
        const dateInput = document.getElementById('rDate')?.value || '';
        const currentYear = getYearFromDate(dateInput);
        const currentCertType = 'Residency Certificate';
        const isDup = dupCheck.some(c => {
          if (String(c.id) === String(window.currentCertId)) return false;
          const dupYear = getYearFromDate(c.issued_date || c.date_created);
          const dupType = c.certificate_type || '';
          return dupYear === currentYear && dupType === currentCertType;
        });
        if (isDup) {
          const msg = 'The Control Number already exists in the current year for this certificate type. Please use a different one.';
          if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
          return;
        }
      }

      // Block print if Barangay Certificate No. is duplicate in current year
      if (rBcNo) {
        const dupCheckBc = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created&bc_number=eq.${encodeURIComponent(rBcNo)}`);
        if (dupCheckBc && dupCheckBc.length > 0) {
          const dateInput = document.getElementById('rDate')?.value || '';
          const currentYear = getYearFromDate(dateInput);
          const isDupBc = dupCheckBc.some(c => {
            if (String(c.id) === String(window.currentCertId)) return false;
            return getYearFromDate(c.issued_date || c.date_created) === currentYear;
          });
          if (isDupBc) {
            const msg = 'The Barangay Certificate No. (BC No.) already exists in the current year. Please use a different one.';
            if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
            return;
          }
        }
      }
    }
  } catch (e) { console.error(e); }

  const resident = document.getElementById('rPreviewName')?.value || 'RESIDENT NAME';
  const civil = document.getElementById('rPreviewCivilStatus')?.value || '';
  const address = document.getElementById('rPreviewAddress')?.value || '';
  const gender = resident ? (resident.toLowerCase().includes('mrs') || resident.toLowerCase().includes('ms') ? 'her' : 'his') : 'his';
  const purpose = document.getElementById('rPreviewSupport')?.value || '';

  const day = document.getElementById('rIssuedDay')?.value || '9th';
  const monthVal = (document.getElementById('rIssuedMonth')?.value || 'February').trim();
  const yearVal = (document.getElementById('rIssuedYear')?.value || '2026').trim();
  const month = (monthVal && yearVal && !monthVal.includes(yearVal)) ? `${monthVal}, ${yearVal}` : (monthVal || yearVal || 'February, 2026');

  const signatory = 'ROSANNA D. DIAZ';
  const amount = document.getElementById('rFee')?.value || document.getElementById('rAmount')?.value || 'Php50.00';
  const orNo = document.getElementById('rORNo')?.value || '3192404';
  const bcNo = document.getElementById('rBCNo')?.value || '';
  const ctcNo = document.getElementById('rCTCNo')?.value || '';
  const ctcAmount = document.getElementById('rCTCAmount')?.value || '';
  const date = document.getElementById('rDate')?.value || '02/09/2026';
  const type = document.getElementById('rType')?.value || 'Residency Certificate';

  const params = new URLSearchParams({
    certNo, type, resident, civil, address, gender, purpose, day, month, signatory, amount,
    orNo, bcNo: bcNo, ctcNo: ctcNo, ctcAmount: ctcAmount, date, print: 'true'
  });

  try {
    const paramsObj = Object.fromEntries(params.entries());
    const certId = window.currentCertId || paramsObj.certNo;
    localStorage.setItem(`barangay_clearance_data_${certId}`, JSON.stringify(paramsObj));
    openCertificatePost(paramsObj);
  } catch (e) {
    window.open(`/admin/view-certificate.php?${params.toString()}`, '_blank');
  }
}

async function issueResidencyCertificate() {
  if (!window.currentCertId) {
    if (typeof showToast === 'function') showToast('No certificate selected.', 'error');
    return;
  }

  // --- Required field validation ---
  const _rChk = id => (document.getElementById(id)?.value || '').trim();
  const rMissing = [];
  if (!_rChk('rNo')) rMissing.push('Control No.');
  if (!_rChk('rDate')) rMissing.push('Date');
  if (!_rChk('rPreviewName')) rMissing.push('Full Name of Resident');
  if (!_rChk('rPreviewCivilStatus')) rMissing.push('Civil Status');
  if (!_rChk('rPreviewAddress')) rMissing.push('Street Address');
  if (!_rChk('rPreviewSupport')) rMissing.push('Purpose');
  if (!_rChk('rBCNo')) rMissing.push('Barangay Certificate No.');
  if (rMissing.length > 0) {
    const msg = 'Please fill in required fields: ' + rMissing.join(', ') + '.';
    if (typeof showToast === 'function') showToast(msg, 'error'); else alert(msg);
    return;
  }

  const resident = document.getElementById('rResident')?.value?.trim();
  const controlNo = document.getElementById('rNo')?.value?.trim();
  const date = document.getElementById('rDate')?.value?.trim();

  const btn = document.getElementById('rCertIssuedBtn');
  const originalText = btn ? btn.innerHTML : 'Mark Issued';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Issuing...'; }

  try {
    if (!window.supabaseClient) throw new Error("Database client not loaded");

    // Check for duplicate control number (allow if not in same year and same certificate type)
    const dupCheck = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created,certificate_type&control_number=eq.${encodeURIComponent(controlNo)}`);
    if (dupCheck && dupCheck.length > 0) {
      const currentYear = getYearFromDate(date);
      const currentCertType = 'Residency Certificate';
      const isDup = dupCheck.some(c => {
        if (String(c.id) === String(window.currentCertId)) return false;
        const dupYear = getYearFromDate(c.issued_date || c.date_created);
        const dupType = c.certificate_type || '';
        return dupYear === currentYear && dupType === currentCertType;
      });
      if (isDup) {
        throw new Error('The Control Number already exists in the current year for this certificate type. Please use a different one.');
      }
    }

    const orNoVal = document.getElementById('rORNo')?.value || '';
    const bcNoVal = document.getElementById('rBCNo')?.value?.trim() || '';

    // Block issue if Barangay Certificate No. is duplicate in current year
    if (bcNoVal) {
      const dupCheckBc = await window.supabaseClient.select('certificates', `select=id,issued_date,date_created&bc_number=eq.${encodeURIComponent(bcNoVal)}`);
      if (dupCheckBc && dupCheckBc.length > 0) {
        const currentYear = getYearFromDate(date);
        const isDupBc = dupCheckBc.some(c => {
          if (String(c.id) === String(window.currentCertId)) return false;
          return getYearFromDate(c.issued_date || c.date_created) === currentYear;
        });
        if (isDupBc) {
          throw new Error('The Barangay Certificate No. (BC No.) already exists in the current year. Please use a different one.');
        }
      }
    }
    const amountPaidVal = document.getElementById('rAmount')?.value || document.getElementById('rFee')?.value || '';
    const ctcNoVal = document.getElementById('rCTCNo')?.value || '';
    const ctcAmtVal = document.getElementById('rCTCAmount')?.value || '';

    // Build the full certificate document data to persist in the DB
    const certDocData = {
      resident: document.getElementById('rPreviewName')?.value || resident,
      civil: document.getElementById('rPreviewCivilStatus')?.value || '',
      address: document.getElementById('rPreviewAddress')?.value || '',
      purpose: document.getElementById('rPreviewSupport')?.value || '',
      day: document.getElementById('rIssuedDay')?.value || '',
      month: document.getElementById('rIssuedMonth')?.value || '',
      year: document.getElementById('rIssuedYear')?.value || '',
      bcNo: bcNoVal,
      ctcNo: ctcNoVal,
      ctcAmount: ctcAmtVal,
      fee: amountPaidVal
    };

    const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
    const issuedNow = new Date().toISOString();
    const payload = {
      control_number: controlNo,
      status: 'issued',
      issued_date: date || issuedNow.split('T')[0],
      date_created: issuedNow,
      issued_by: currentUser,
      notes: JSON.stringify(certDocData)
    };
    if (orNoVal) payload.or_number = orNoVal;
    if (bcNoVal) payload.bc_number = bcNoVal;
    if (amountPaidVal) payload.amount_paid = amountPaidVal;
    if (ctcNoVal) payload.ctc_number = ctcNoVal;
    if (ctcAmtVal) payload.ctc_amount = ctcAmtVal;

    try {
      localStorage.setItem(`barangay_clearance_data_${controlNo}`, JSON.stringify(certDocData));
    } catch (e) { }

    await window.supabaseClient.update('certificates', 'id', window.currentCertId, payload);

    const c = window.certificates.find(x => String(x.id) === String(window.currentCertId));
    if (c) {
      c.controlNo = controlNo;
      c.status = 'issued';
      c.issuedDate = payload.issued_date;
      c.date = issuedNow;
      c.issuedBy = currentUser;
      c.certName = document.getElementById('rPreviewName')?.value || c.certName || resident;
      c.certExtra = document.getElementById('rPreviewCivilStatus')?.value || c.certExtra;
      c.address = document.getElementById('rPreviewAddress')?.value || c.address;
      c.support = document.getElementById('rPreviewSupport')?.value || c.support;
      c.orNo = orNoVal || c.orNo;
      c.bcNo = bcNoVal || c.bcNo;
      c.ctcNo = ctcNoVal || c.ctcNo;
      c.ctcAmount = ctcAmtVal || c.ctcAmount;
      c.fee = amountPaidVal || c.fee;
      c.amount = c.fee;
    }

    renderCerts();
    if (typeof showToast === 'function') showToast(`Certificate issued for ${resident} (Control No: ${controlNo})!`, 'success');

    // Manually force an audit log insert for Certificate of Residency
    try {
      const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'certificates',
          record_id: String(window.currentCertId || controlNo || ''),
          action_type: 'issued',
          fields: `Control No - ${controlNo}, Type - Certificate of Residency`,
          record_name: resident,
          performed_by: currentUser
        });
        console.log('Audit log inserted for residency issue.');
      }
    } catch (directLogErr) {
      console.error('Direct audit log failed:', directLogErr);
    }

    resetCertModal();
    if (typeof closeModal === 'function') closeModal('modal-residency');
  } catch (error) {
    console.error("Issue error:", error);
    let errMsg = error.message;
    if (errMsg.includes('23505') || errMsg.includes('duplicate key')) {
      errMsg = 'The Control Number already exists for this Certificate Type in the current year. Please use a different one.';
    }
    if (typeof showToast === 'function') showToast('Error issuing certificate: ' + errMsg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
  }
}

window.viewResidencyCertificate = viewResidencyCertificate;
window.printResidencyCertificate = printResidencyCertificate;
window.issueResidencyCertificate = issueResidencyCertificate;

function resetResidencyModal() {
  window.currentCertId = null;
  const formInputs = document.querySelectorAll('#modal-residency .form-input, #modal-residency .form-select, #modal-residency .form-textarea');
  formInputs.forEach(input => {
    input.disabled = false;
  });
  const rPrintBtn = document.querySelector('#modal-residency [onclick="printResidencyCertificate()"]');
  const rViewBtn = document.querySelector('#modal-residency [onclick="viewResidencyCertificate()"]');
  const rIssuedBtn = document.getElementById('rCertIssuedBtn');
  if (rPrintBtn) rPrintBtn.style.display = 'none';
  if (rViewBtn) rViewBtn.style.display = 'none';
  if (rIssuedBtn) rIssuedBtn.style.display = 'inline-block';

  document.getElementById('rPreviewName').value = '';
  document.getElementById('rPreviewCivilStatus').value = '';
  document.getElementById('rPreviewAddress').value = '';
  document.getElementById('rPreviewSupport').value = '';
}
window.resetResidencyModal = resetResidencyModal;
