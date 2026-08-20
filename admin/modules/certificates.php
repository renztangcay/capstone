<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  /* Cert badges */
  .cert-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }

  .cert-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: var(--shadow);
    cursor: pointer;
  }

  .cert-card:hover {
    background: var(--slate);
  }

  .cert-icon {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .cert-count {
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }

  .cert-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* Modal tuning for certificates */
  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.08); align-items: center; justify-content: center; padding: 1px 20px 80px 20px; z-index: 9999; }
  .modal-overlay.open { display: flex; animation: fadeUp .18s ease; }
  .modal { width: 100%; max-width: 820px; max-height: 86vh; background: var(--white); border-radius: 12px; box-shadow: 0 18px 40px rgba(22,31,57,0.18); overflow: hidden; display: flex; flex-direction: column; margin-top: 60px; margin-bottom: 60px; margin-left: 240px; }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .modal-body { padding: 10px 20px 18px; overflow: auto; }
  .modal-footer { padding: 12px 20px; display:flex; gap:10px; justify-content:flex-end; align-items:center; border-top: 1px solid rgba(0,0,0,0.06); background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1)); }
  .modal-close { background:transparent; border:0; font-size:18px; cursor:pointer; }
  @media (max-width:900px){ .modal { margin-left: 0; } }
  @media (max-width:720px){ .modal { max-width: 100%; border-radius: 10px; } .modal-body{ padding:14px; } }
  .c-preview{ border:1px solid var(--border); padding:14px; border-radius:8px; background:linear-gradient(to bottom, var(--slate), var(--white)); color:var(--text); font-size:13px; line-height:1.6; }
  .c-preview p{ margin:10px 0; }
  .c-preview-input{ display:inline-block; padding:4px 8px; border:1px solid var(--border); border-radius:6px; background:var(--white); font-size:13px; }
  .cert-table-wrap { max-height: 65vh; overflow-y: auto; }
  .cert-table-wrap th { position: sticky; top: 0; z-index: 10; background: var(--slate); border-bottom: 2px solid var(--border); }

  /* ── Certificates & Modals Dark Mode ── */
  [data-theme="dark"] .cert-card {
    background: #1e293b !important;
    border-color: #334155 !important;
  }
  [data-theme="dark"] .cert-card:hover {
    background: #273449 !important;
  }
  [data-theme="dark"] .cert-label {
    color: #94a3b8 !important;
  }
  [data-theme="dark"] .modal-overlay {
    background: rgba(0,0,0,0.65) !important;
  }
  [data-theme="dark"] .modal {
    background: #0f172a !important;
    color: #f1f5f9 !important;
    box-shadow: 0 18px 40px rgba(0,0,0,0.5) !important;
  }
  [data-theme="dark"] .modal-header {
    border-bottom-color: #1e293b !important;
    background: #0f172a !important;
  }
  [data-theme="dark"] .modal-header h3,
  [data-theme="dark"] .modal-header h2 {
    color: #f1f5f9 !important;
  }
  [data-theme="dark"] .modal-body {
    background: #0f172a !important;
    color: #f1f5f9 !important;
  }
  [data-theme="dark"] .modal-footer {
    border-top-color: #1e293b !important;
    background: #0f172a !important;
  }
  [data-theme="dark"] .modal-close {
    color: #94a3b8 !important;
  }
  [data-theme="dark"] .c-preview {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
  }
  [data-theme="dark"] .c-preview-input {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
  }
  [data-theme="dark"] .modal .form-input,
  [data-theme="dark"] .modal .form-select,
  [data-theme="dark"] .modal .form-textarea {
    background: #1e293b !important;
    color: #f1f5f9 !important;
    border-color: #334155 !important;
  }
  [data-theme="dark"] .modal .form-input[readonly],
  [data-theme="dark"] .modal .form-input[disabled] {
    background: #0f172a !important;
    color: #64748b !important;
  }
  [data-theme="dark"] .cert-table-wrap th {
    background: #1e293b !important;
    color: #94a3b8 !important;
    border-bottom-color: #334155 !important;
  }
</style>
<div class="sec-head">
  <div class="sec-head-left">
    <h2>Certificate Management</h2>
    <p>Request, validate, approve and track</p>
  </div>
  <div class="sec-head-actions">

  </div>
</div>
<!-- Add New Indigency button -->
<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
  <button class="btn btn-gold" onclick="openIndigencyModal()"><i class="bi bi-plus-lg"></i> Add New</button>
</div>
<div class="filter-bar">
  <input class="filter-input" placeholder="🔍 Search Control No." id="certSearch" oninput="filterCertsTable(this.value)" style="flex:1">
  <select class="filter-select" id="certTypeFilter" onchange="filterCertsTable()">
    <option value="">All Types</option>
    <option>Barangay Clearance</option>
    <option>Indigency Certificate</option>
    <option>Certificate of Residency</option>
    
  </select>
  <select class="filter-select" id="certStatusFilter" onchange="filterCertsTable()">
    <option value="">All Status</option>
    <option>paid</option>
    <option>issued</option>
  </select>
  <input type="date" class="filter-input" id="certDateFilter" onchange="filterCertsTable()">
</div>
<div class="card">
  <div class="table-wrap cert-table-wrap">
    <table class="responsive-table">
        <thead>
          <tr>
            <th>Resident</th>
            <th>Type</th>
            <th>Control No.</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
      <tbody id="certsBody"></tbody>
    </table>
  </div>
</div>

<!-- Certificate Modal (opened by Open button) -->
<div class="modal-overlay" id="modal-cert">
  <div class="modal">
    <div class="modal-header">
      <h3>Barangay Clearance</h3>
      <button class="modal-close" onclick="closeModal('modal-cert')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Resident <span style="color:#ef4444;">*</span></label><input class="form-input" id="cResident" placeholder="Resident name" style="background: none;border-color:black;" readonly required></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Control No. <span style="color:#ef4444;">*</span></label><input class="form-input" id="cNo" placeholder="Control No." style="background: none;border-color:black;" required></div>
        <div class="form-group"><label class="form-label">O.R. No.</label><input class="form-input" id="cORNo" placeholder="O.R. Number" readonly></div>
      </div>

      <div class="form-row">
        <div class="form-group" id="cBCGroup"><label class="form-label">Barangay Clearance No. <span style="color:#ef4444;">*</span></label><input class="form-input" id="cBCNo" placeholder="Barangay Clearance No." style="background: none;border-color:black;" required></div>
        <div class="form-group"><label class="form-label">Amount Paid (₱)</label><input class="form-input" id="cFee" type="number" readonly></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">CTC No.</label><input class="form-input" id="cCTCNo" placeholder="CTC No." readonly></div>
        <div class="form-group"><label class="form-label">CTC Amount (₱)</label><input class="form-input" id="cCTCAmount" type="number" readonly></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Date <span style="color:#ef4444;">*</span></label><input class="form-input" id="cDate" type="date" onchange="updateCertificateDate()" style="background: none;border-color:black;" required></div>
        <div class="form-group"><label class="form-label">Type</label><input class="form-input" id="cType" readonly></div>
      </div>

      

      <input type="hidden" id="cAmount">

      <hr>
      <div class="form-group"><label class="form-label">Preview</label>
        <div id="cPreview" class="c-preview" aria-hidden="false">
          <p>THIS IS TO CERTIFY that <input class="c-preview-input" id="cPreviewName" placeholder="Applicant's Full Name" style="font-weight:bold; text-transform:uppercase;border-color:black;" required>, legal age, <input class="c-preview-input" id="cPreviewCivilStatus" placeholder="Civil Status" style="border-color:black;width: 90px;" required>, Filipino, is a bona fide resident of <input class="c-preview-input" id="cPreviewAddress" placeholder="Street Address" style="border-color:black;" required>, Central Barangay, Dipolog City.</p>
          <p>This clearance is issued to certify that the above mentioned individual has no derogatory or criminal record filed in this Barangay.</p>
          <p>This clearance is issued to <input class="c-preview-input" id="cPreviewSupport" placeholder="" style="border-color:black;" required> .</p>
          <p>Issued this <span id="cPreviewIssuedDay">__</span> day of <span id="cPreviewIssuedMonthYear">________</span> at Central Barangay Hall, Dipolog City.</p>
        </div>
      </div>
      <input type="hidden" id="cCertName">
      <input type="hidden" id="cCertExtra">
      <input type="hidden" id="cCivilStatus">
      <input type="hidden" id="cAddress">
      <input type="hidden" id="cSupport">
      <input type="hidden" id="cIssuedDay">
      <input type="hidden" id="cIssuedMonth">
      <input type="hidden" id="cIssuedYear">
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-cert')">Cancel</button>
      <button class="btn btn-primary" onclick="printCertificate()" style="display:none;">Print</button>
      <button class="btn btn-success" id="certIssuedBtn" onclick="issueCertificate()">Mark Issued</button>
    </div>
  </div>
</div>
<!-- Residency Certificate Modal -->
<div class="modal-overlay" id="modal-residency">
  <div class="modal">
    <div class="modal-header">
      <h3>Certificate of Residency</h3>
      <button class="modal-close" onclick="resetResidencyModal(); closeModal('modal-residency')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Resident</label><input class="form-input" id="rResident" placeholder="Resident name" style="background: none;border-color:black;" readonly></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Control No. <span style="color:#ef4444;">*</span></label><input class="form-input" id="rNo" placeholder="Control No." style="background: none;border-color:black;"></div>
        <div class="form-group"><label class="form-label">Barangay Certificate No. <span style="color:red;">*</span></label><input class="form-input" id="rBCNo" placeholder="Barangay Certificate No." required style="background: none;border-color:black;"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">O.R. No.</label><input class="form-input" id="rORNo" placeholder="O.R. Number" readonly></div>
        <div class="form-group"><label class="form-label">Date <span style="color:#ef4444;">*</span></label><input class="form-input" id="rDate" type="date" onchange="updateResidencyDate()" style="background: none;border-color:black;"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Type</label><input class="form-input" id="rType" value="Residency Certificate" readonly></div>
        <div class="form-group"><label class="form-label">Amount Paid (₱)</label><input class="form-input" id="rFee" type="number" readonly></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">CTC No.</label><input class="form-input" id="rCTCNo" placeholder="CTC No." readonly></div>
        <div class="form-group"><label class="form-label">CTC Amount (₱)</label><input class="form-input" id="rCTCAmount" type="number" readonly></div>
      </div>
      <input type="hidden" id="rAmount">
      <hr>
      <div class="form-group"><label class="form-label">Preview</label>
        <div id="rPreview" class="c-preview" aria-hidden="false">
          <p>THIS IS TO CERTIFY that <input class="c-preview-input" id="rPreviewName" placeholder="Applicant's Full Name" style="font-weight:bold; text-transform:uppercase;border-color:black;">, legal age, <input class="c-preview-input" id="rPreviewCivilStatus" placeholder="Civil Status" style="border-color:black;width: 90px;">, Filipino, is a bona fide resident of <input class="c-preview-input" id="rPreviewAddress" placeholder="Street Address" style="border-color:black;">, Central Barangay, Dipolog City.</p>
          <p id="rPreviewResidencyPara">This certification is issued upon the request of the above-named individual as proof of residency.</p>
          <p>This certification is further issued to <input class="c-preview-input" id="rPreviewSupport" placeholder="" style="border-color:black;">.</p>
          <p>Issued this <span id="rPreviewIssuedDay">__</span> day of <span id="rPreviewIssuedMonthYear">________</span> at Central Barangay Hall, Dipolog City.</p>
        </div>
      </div>
      <input type="hidden" id="rCertName">
      <input type="hidden" id="rCertExtra">
      <input type="hidden" id="rCivilStatus">
      <input type="hidden" id="rAddress">
      <input type="hidden" id="rSupport">
      <input type="hidden" id="rIssuedDay">
      <input type="hidden" id="rIssuedMonth">
      <input type="hidden" id="rIssuedYear">
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="resetResidencyModal(); closeModal('modal-residency')">Cancel</button>
      <button class="btn btn-primary" onclick="printResidencyCertificate()" style="display:none;">Print</button>
      <button class="btn btn-success" id="rCertIssuedBtn" onclick="issueResidencyCertificate()">Mark Issued</button>
    </div>
  </div>
</div>

<script>
// Consolidated modal scripts: certificate + residency preview and date handling
function updateCertificateDate() {
  const cDateEl = document.getElementById('cDate');
  let dateInput = cDateEl ? cDateEl.value : '';

  if (!dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput = `${year}-${month}-${day}`;
    if (cDateEl) cDateEl.value = dateInput;
  }

  const date = new Date(dateInput + 'T00:00:00');
  const dayNum = date.getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthName = monthNames[date.getMonth()];
  const yearNum = date.getFullYear();

  const previewDay = document.getElementById('cPreviewIssuedDay');
  const previewMonthYear = document.getElementById('cPreviewIssuedMonthYear');
  if (previewDay) previewDay.textContent = dayNum;
  if (previewMonthYear) previewMonthYear.textContent = `${monthName}, ${yearNum}`;

  const hidDay = document.getElementById('cIssuedDay');
  const hidMonth = document.getElementById('cIssuedMonth');
  const hidYear = document.getElementById('cIssuedYear');
  if (hidDay) hidDay.value = dayNum;
  if (hidMonth) hidMonth.value = monthName;
  if (hidYear) hidYear.value = yearNum;
}

function updateResidencyDate() {
  const rDateEl = document.getElementById('rDate');
  let dateInput = rDateEl ? rDateEl.value : '';
  if (!dateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput = `${year}-${month}-${day}`;
    if (rDateEl) rDateEl.value = dateInput;
  }
  const date = new Date(dateInput + 'T00:00:00');
  const dayNum = date.getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthName = monthNames[date.getMonth()];
  const yearNum = date.getFullYear();

  const previewDay = document.getElementById('rPreviewIssuedDay');
  const previewMonthYear = document.getElementById('rPreviewIssuedMonthYear');
  if (previewDay) previewDay.textContent = dayNum;
  if (previewMonthYear) previewMonthYear.textContent = `${monthName}, ${yearNum}`;

  const hidDay = document.getElementById('rIssuedDay');
  const hidMonth = document.getElementById('rIssuedMonth');
  const hidYear = document.getElementById('rIssuedYear');
  if (hidDay) hidDay.value = dayNum;
  if (hidMonth) hidMonth.value = monthName;
  if (hidYear) hidYear.value = yearNum;
}

// Sync preview inputs with form inputs and keep hidden fields updated (certificate)
function syncPreviewFromForm() {
  const resident = document.getElementById('cResident');
  const purpose = document.getElementById('cPurpose');
  const previewName = document.getElementById('cPreviewName');
  const previewSupport = document.getElementById('cPreviewSupport');
  const previewDetails = document.getElementById('cPreviewDetails');

  if (previewName && resident && !previewName.value) {
    const raw = resident.value || '';
    const formatted = (typeof formatResidentName === 'function') ? formatResidentName(raw) : raw;
    previewName.value = formatted;
  }
  if (previewSupport && purpose && !previewSupport.value) previewSupport.value = purpose.value || '';
  const hidExtra = document.getElementById('cCertExtra');
  if (previewDetails && hidExtra && !previewDetails.value) previewDetails.value = hidExtra.value || '';
  updateHiddenFromPreview();
}

function updateHiddenFromPreview() {
  const previewName = document.getElementById('cPreviewName');
  const previewDetails = document.getElementById('cPreviewDetails');
  const previewSupport = document.getElementById('cPreviewSupport');
  const previewCivil = document.getElementById('cPreviewCivilStatus');
  const previewAddress = document.getElementById('cPreviewAddress');
  const hidName = document.getElementById('cCertName');
  const hidExtra = document.getElementById('cCertExtra');
  const hidSupport = document.getElementById('cSupport');
  const hidCivil = document.getElementById('cCivilStatus');
  const hidAddress = document.getElementById('cAddress');
  if (hidName && previewName) hidName.value = previewName.value || '';
  if (hidExtra && previewDetails) hidExtra.value = previewDetails.value || '';
  if (hidSupport && previewSupport) hidSupport.value = previewSupport.value || '';
  if (hidCivil && previewCivil) hidCivil.value = previewCivil.value || '';
  if (hidAddress && previewAddress) hidAddress.value = previewAddress.value || '';
}

// Residency-specific preview sync
function syncResidencyPreview() {
  const resident = document.getElementById('rResident');
  const previewName = document.getElementById('rPreviewName');
  const previewCivil = document.getElementById('rPreviewCivilStatus');
  const previewAddress = document.getElementById('rPreviewAddress');
  const previewSupport = document.getElementById('rPreviewSupport');
  if (previewName && resident && !previewName.value) previewName.value = resident.value || '';

  const hidName = document.getElementById('rCertName');
  const hidCivil = document.getElementById('rCivilStatus');
  const hidAddress = document.getElementById('rAddress');
  const hidSupport = document.getElementById('rSupport');
  if (hidName && previewName) hidName.value = previewName.value || '';
  if (hidCivil && previewCivil) hidCivil.value = previewCivil.value || '';
  if (hidAddress && previewAddress) hidAddress.value = previewAddress.value || '';
  if (hidSupport && previewSupport) hidSupport.value = previewSupport.value || '';
}

// Wire change listeners so hidden inputs stay in sync
document.addEventListener('input', function(e) {
  const ids = ['cPreviewName','cPreviewDetails','cPreviewSupport','cPreviewCivilStatus','cPreviewAddress','cDate','cResident','cPurpose','rDate','rResident','rPreviewCivilStatus','rPreviewAddress','rPreviewSupport', 'rPreviewName'];
  if (e.target && ids.indexOf(e.target.id) !== -1) {
    if (e.target.id === 'cDate') updateCertificateDate();
    if (e.target.id === 'rDate') updateResidencyDate();
    if (['cPreviewName','cPreviewDetails','cPreviewSupport','cPreviewCivilStatus','cPreviewAddress'].indexOf(e.target.id) !== -1) updateHiddenFromPreview();
    if (e.target.id === 'cResident' || e.target.id === 'cPurpose') syncPreviewFromForm();
    if (e.target.id === 'rResident') syncResidencyPreview();

    // Auto-save edited residency fields to localStorage
    if (window.currentCertId && ['rPreviewName','rPreviewCivilStatus','rPreviewAddress','rPreviewSupport'].includes(e.target.id)) {
      try {
        const id = window.currentCertId;
        const c = window.certificates?.find(x => String(x.id) === String(id)) || {};
        const controlNo = c.controlNo || document.getElementById('rNo')?.value || '';
        const savedKey = `barangay_clearance_data_${id}`;
        
        const existing = localStorage.getItem(savedKey) || localStorage.getItem(`barangay_clearance_data_${controlNo}`);
        const p = existing ? JSON.parse(existing) : {};
        
        p.resident = document.getElementById('rPreviewName')?.value || '';
        p.civil = document.getElementById('rPreviewCivilStatus')?.value || '';
        p.address = document.getElementById('rPreviewAddress')?.value || '';
        p.purpose = document.getElementById('rPreviewSupport')?.value || '';
        
        localStorage.setItem(savedKey, JSON.stringify(p));
        if (controlNo) localStorage.setItem(`barangay_clearance_data_${controlNo}`, JSON.stringify(p));
      } catch (err) {}
    }
  }
});

// On load: initialize dates and set up observers for modal open events
document.addEventListener('DOMContentLoaded', function() {
  updateCertificateDate();
  updateResidencyDate();

  const modalCert = document.getElementById('modal-cert');
  if (modalCert) {
    const obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'class') {
          const cls = modalCert.className || '';
          if (cls.split(' ').indexOf('open') !== -1) {
            updateCertificateDate();
            syncPreviewFromForm();
          }
        }
      });
    });
    obs.observe(modalCert, { attributes: true });
  }

  const modalResidency = document.getElementById('modal-residency');
  if (modalResidency) {
    const obs2 = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.attributeName === 'class') {
          const cls = modalResidency.className || '';
          if (cls.split(' ').indexOf('open') !== -1) {
            updateResidencyDate();
            syncResidencyPreview();
          }
        }
      });
    });
    obs2.observe(modalResidency, { attributes: true });
  }
});
</script>
<script>
  if (typeof startCertificatesPolling === 'function') {
    startCertificatesPolling(1000);
  }
</script>

<!-- Indigency Certificate Modal -->
<div class="modal-overlay" id="modal-indigency">
  <div class="modal modal-lg">
    <div class="modal-header">
      <h3>Issue Certificate of Indigency</h3>
      <button class="modal-close" onclick="closeModal('modal-indigency')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-row" style="position:relative;">
        <div class="form-group" style="flex:1;min-width:0;"><label class="form-label">Applicant's Full Name <span style="color:#ef4444;">*</span></label><input class="form-input" id="indName" placeholder="Type to search residents..." autocomplete="off" required oninput="adminSearchResidents(this.value)"><small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;"><i class="bi bi-info-circle"></i> Search and select a resident from the dropdown list</small></div>
        <div id="ind-resident-results" style="position: absolute; top: calc(100% + 6px); background: white; border: 1px solid var(--border); border-top: none; border-radius: 0 0 6px 6px; max-height: 100px; overflow-y: auto; display: none; width: calc(100% - 40px); z-index: 120; box-shadow: var(--shadow);"></div>
        <input type="hidden" id="indResidentId">
        <div class="form-group"><label class="form-label">Civil Status <span style="color:#ef4444;">*</span></label><input class="form-input" id="indCivil" placeholder="e.g. Single, Married" required></div>
      </div>
      <div class="form-group"><label class="form-label">Street Address <span style="color:#ef4444;">*</span></label><input class="form-input" id="indAddress" placeholder="House no., Street" required></div>
      <div class="form-group"><label class="form-label">Purpose <span style="color:#ef4444;">*</span></label><input class="form-input" id="indPurpose" placeholder="e.g. medical financial assistance" required></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Control No. <span style="color:#ef4444;">*</span></label><input class="form-input" id="indControlNo" placeholder="" required></div>
        <div class="form-group"><label class="form-label">Date <span style="color:#ef4444;">*</span></label><input class="form-input" type="date" id="indDate" required></div>
      </div>

      <hr>
      <div class="form-group"><label class="form-label">Preview</label>
        <div id="indPreview" class="c-preview" style="padding:18px;line-height:1.8;">
          <p style="margin:10px 0;">THIS IS TO CERTIFY that <span id="indPreviewName" style="font-weight:700;text-transform:uppercase;">[Applicant's Full Name]</span>, legal age, <span id="indPreviewCivil">[Civil Status]</span>, Filipino, is a bona fide resident of <span id="indPreviewAddress">[Street Address]</span>, Central Barangay, Dipolog City, and an <strong>INDIGENT CITIZEN</strong>.</p>
          <p style="margin:10px 0;">This certification is hereby issued to <span id="indPreviewPurpose" style="font-weight:bold;">[State Purpose]</span>.</p>
          <p style="margin:10px 0;">Issued this <span id="indPreviewDay">__</span> day of <span id="indPreviewMonthYear">________</span> at Central Barangay Hall, Dipolog City.</p>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-indigency')">Cancel</button>
      <button class="btn btn-secondary" onclick="printIndigencyCertificate()"><i class="bi bi-printer"></i> Print</button>
      <button class="btn btn-success" onclick="issueIndigencyCertificate()">Issue Certificate</button>
    </div>
  </div>
</div>

 
