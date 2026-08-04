/**
 * RESIDENT MANAGEMENT LOGIC (RBI FORM B)
 */

let editingResId = null;
const RESIDENTS_PAGE_SIZE = 50;
let residentsCurrentPage = 1;
let residentsLastRenderSignature = null;
let residentFormSaveInProgress = false;
let residentEditSaveInProgress = false;

// compute age (years) from a date string (accepts ISO yyyy-mm-dd or mm/dd/yyyy etc.)
function computeAgeFromDob(dob) {
  if (!dob) return 0;
  try {
    const s = String(dob).trim();
    // If format is YYYY-MM-DD or full ISO, Date will parse correctly
    let d = new Date(s);
    if (isNaN(d)) {
      // try YYYY-MM-DD with possible time
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);
      else {
        // try mm/dd/yyyy or m/d/yy
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (m) {
          let mm = m[1].padStart(2, '0');
          let dd = m[2].padStart(2, '0');
          let yyyy = m[3];
          if (yyyy.length === 2) {
            const num = parseInt(yyyy, 10);
            yyyy = (num > 30 ? 1900 + num : 2000 + num);
          }
          d = new Date(`${yyyy}-${mm}-${dd}`);
        }
      }
    }
    if (isNaN(d)) return 0;
    return Math.floor((Date.now() - d) / (365.25 * 86400000));
  } catch (e) {
    return 0;
  }
}

async function loadResidentsFromDb() {
  try {
    const data = await window.supabaseClient.select('residents', 'select=*&order=id.desc');
    // ensure arrays and fields and normalize DB column names to camelCase used in client
    const residentsList = (data || []).map(r => {
      const norm = Object.assign({}, r);
      // helper to normalize string fields coming from DB — treat literal 'null' or 'NULL' (with optional trailing commas/spaces) as empty
      const normalizeStr = (v) => {
        if (v === null || v === undefined) return '';
        if (typeof v !== 'string') return v;
        const t = v.trim().toLowerCase().replace(/[.,\s]+$/g, '');
        return (t === 'null' ? '' : v);
      };
      // normalize common mismatches between DB (lowercase) and client (camelCase)
      norm.civilStatus = r.civilstatus || r.civilStatus || null;
      norm.philsys = r.philsys || r.philSys || null;
      // Ensure arrays are never null
      norm.cats = (Array.isArray(r.cats) ? r.cats : (r.cats || null)) || [];
      norm.education = (Array.isArray(r.education) ? r.education : (r.education || null)) || [];
      norm.age = r.age || 0;
      // normalize dob and recalc age from DOB when possible
      norm.dob = r.dob || null;
      norm.age = computeAgeFromDob(norm.dob) || norm.age || 0;
      norm.status = r.status || 'active';
      // normalize commonly problematic string fields
      norm.address = normalizeStr(r.address || '');
      norm.purok = normalizeStr(r.purok || '');
      norm.last = normalizeStr(r.last || '');
      norm.first = normalizeStr(r.first || '');
      norm.mid = normalizeStr(r.mid || '');
      norm.suffix = normalizeStr(r.suffix || '');
      norm.religion = normalizeStr(r.religion || '');
      norm.citizenship = normalizeStr(r.citizenship || '');
      // map form signature/date/household fields (support several possible DB column namings)
      norm.dateAccomplished = r.dateaccomplished || r.date_accomplished || r.dateAccomplished || null;
      norm.formAccomplisher = r.form_accomplisher || r.accomplisher || r.formAccomplisher || null;
      norm.barangaySecretary = r.barangay_secretary || r.barangaySecretary || r.secretary || null;
      norm.householdNumber = r.household_number || r.householdNumber || r.household || null;
      return norm;
    });
    residentsList.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    window.residents = residentsList;

    const signatureParts = residentsList.slice(0, 100).map(r => `${r.id}:${r.status || ''}:${r.last || ''}:${r.first || ''}:${r.purok || ''}:${Array.isArray(r.cats) ? r.cats.join('|') : ''}`);
    const dataSignature = `${residentsList.length}|${signatureParts.join('||')}`;
    const shouldRender = residentsLastRenderSignature !== dataSignature;

    residentsLastRenderSignature = dataSignature;
    const totalPages = Math.max(1, Math.ceil((window.residents || []).length / RESIDENTS_PAGE_SIZE));
    residentsCurrentPage = Math.min(residentsCurrentPage, totalPages);

    if (shouldRender) {
      renderResidents();
      renderResidentsPagination();
    }
  } catch (e) {
    console.error('Failed loading residents from Supabase', e);
    window.residents = window.residents || [];
  }
  // Update dashboard charts/stats whenever residents are (re)loaded
  if (typeof updateDashboardResidents === 'function') updateDashboardResidents();

  // Update registered residents count in UI if element exists
  try {
    const rc = document.getElementById('res-count');
    if (rc) rc.textContent = `${(window.residents || []).length} registered residents`;
  } catch (e) { /* ignore DOM errors during non-browser runs */ }
}

async function initResidents() {
  await loadResidentsFromDb();
  renderResidents();
}

function showSubPanel(id) {
  const panel = document.getElementById('panel-residents');
  if (panel) {
    const subs = panel.getElementsByClassName('sub-panel');
    for (let i = 0; i < subs.length; i++) {
      subs[i].classList.remove('active');
    }
  }
  const sp = document.getElementById(id);
  if (sp) sp.classList.add('active');
  if (id === 'res-list') renderResidents();
}
window.showSubPanel = showSubPanel;

function renderResidents(filter, statusF, purokF, catF) {
  const tb = document.getElementById('residentsBody');
  if (!tb) return;

  // Always read current filter values from the DOM if not explicitly provided
  if (filter === undefined || filter === null) filter = document.getElementById('resSearch')?.value || '';
  if (statusF === undefined || statusF === null) statusF = document.getElementById('resStatusFilter')?.value || '';
  if (purokF === undefined || purokF === null) purokF = document.getElementById('resPurokFilter')?.value || '';
  if (catF === undefined || catF === null) catF = document.getElementById('resCatFilter')?.value || '';

  // helper to escape strings for safe insertion into innerHTML
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const f = String(filter || '').toLowerCase();
  let list = window.residents || [];

  if (f) list = list.filter(r => `${r.last} ${r.first} ${r.mid} ${r.purok}`.toLowerCase().includes(f));
  if (statusF) list = list.filter(r => r.status === statusF);
  if (purokF) list = list.filter(r => r.purok === purokF);
  if (catF) list = list.filter(r => (r.cats || []).some(c => String(c).toLowerCase() === catF.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(list.length / RESIDENTS_PAGE_SIZE));
  residentsCurrentPage = Math.min(residentsCurrentPage, totalPages);

  const start = (residentsCurrentPage - 1) * RESIDENTS_PAGE_SIZE;
  const pagedList = list.slice(start, start + RESIDENTS_PAGE_SIZE);

  tb.innerHTML = pagedList.length ? pagedList.map(r => `
    <tr>
      <td data-label="Name"><strong>${escapeHtml(r.last)}, ${escapeHtml(r.first)} ${escapeHtml(r.mid)}</strong></td>
      <td data-label="Age">${escapeHtml(computeAgeFromDob(r.dob) || r.age)}</td>
      <td data-label="Purok">${escapeHtml(r.purok)}</td>
      <td data-label="Categories">${(r.cats || []).map(c => `<span class="badge badge-${c === 'Voter' ? 'active' : c === 'Senior' ? 'approved' : c === 'PWD' ? 'paid' : 'validated'}">${escapeHtml(c)}</span>`).join(' ')}</td>
      <td data-label="Status"><span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(r.status === 'active' ? 'Active' : 'Archived')}</span></td>
      <td data-label="Actions">
        <button class="btn btn-outline btn-sm" onclick="viewResident(${r.id})">View Record</button>
        <button class="btn btn-primary btn-sm" onclick="editResident(${r.id})">Edit Info</button>
        ${r.status === 'active'
      ? `<button class="btn btn-danger btn-sm" onclick="archiveResident(${r.id}, 'archived')">Archive</button>`
      : `<button class="btn btn-success btn-sm" onclick="archiveResident(${r.id}, 'active')">Restore</button>`
    }
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">No residents found.</td></tr>`;

  renderResidentsPagination(list.length, totalPages);
}

function renderResidentsPagination(totalItems = 0, totalPages = 1) {
  const container = document.getElementById('residentsPagination');
  if (!container) return;

  const startItem = totalItems ? ((residentsCurrentPage - 1) * RESIDENTS_PAGE_SIZE) + 1 : 0;
  const endItem = Math.min(residentsCurrentPage * RESIDENTS_PAGE_SIZE, totalItems);
  const pageLabel = totalItems ? `Showing ${startItem}-${endItem} of ${totalItems}` : 'No residents';

  container.innerHTML = `
    <div style="font-size:13px;color:var(--text-muted)">${pageLabel}</div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-outline btn-sm" onclick="changeResidentsPage(${residentsCurrentPage - 1})" ${residentsCurrentPage <= 1 ? 'disabled' : ''}>← Prev</button>
      <span style="font-size:13px;color:var(--text-muted)">Page ${residentsCurrentPage} of ${totalPages}</span>
      <button class="btn btn-outline btn-sm" onclick="changeResidentsPage(${residentsCurrentPage + 1})" ${residentsCurrentPage >= totalPages ? 'disabled' : ''}>Next →</button>
    </div>
  `;
}

function changeResidentsPage(page) {
  const totalPages = Math.max(1, Math.ceil(((window.residents || []).length || 0) / RESIDENTS_PAGE_SIZE));
  residentsCurrentPage = Math.max(1, Math.min(page, totalPages));
  renderResidents();
}
window.changeResidentsPage = changeResidentsPage;

function handleResidentsPageKeyboard(event) {
  if (!document.getElementById('res-list')?.classList.contains('active')) return;

  const target = event.target;
  const tagName = target?.tagName?.toLowerCase();
  const isEditable = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
  if (isEditable) return;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    changeResidentsPage(residentsCurrentPage + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    changeResidentsPage(residentsCurrentPage - 1);
  }
}
document.addEventListener('keydown', handleResidentsPageKeyboard);

function applyResidentFilters() {
  residentsCurrentPage = 1;
  const search = document.getElementById('resSearch')?.value || '';
  const status = document.getElementById('resStatusFilter')?.value || '';
  const purok = document.getElementById('resPurokFilter')?.value || '';
  const cat = document.getElementById('resCatFilter')?.value || '';
  renderResidents(search, status, purok, cat);
}
window.applyResidentFilters = applyResidentFilters;

function filterResidents() { applyResidentFilters(); }
window.filterResidents = filterResidents;

function viewResident(id) {
  const r = window.residents.find(x => x.id === id);
  if (!r) return;

  editingResId = id;

  const setVal = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) {
      // Normalize values: treat null, undefined, or literal 'null' (case-insensitive, with optional trailing punctuation/space) as empty
      const normalizeDisplay = (v) => {
        if (v === null || v === undefined) return '';
        if (typeof v !== 'string') return v;
        const t = v.trim().toLowerCase().replace(/[.,\s]+$/g, '');
        return (t === 'null' ? '' : v);
      };
      const normalized = normalizeDisplay(val) || '';
      if (el.tagName === 'INPUT') el.value = normalized;
      else el.textContent = normalized;
    }
  };

  // helper: display date as mm/dd/yyyy
  const formatToDisplayDate = (d) => {
    if (!d) return '';
    try {
      // accept ISO-like strings (YYYY-MM-DD or full ISO)
      const dt = new Date(d);
      if (isNaN(dt)) {
        // try parse YYYY-MM-DD manually
        const m = ('' + d).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[2]}/${m[3]}/${m[1]}`;
        return d;
      }
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const yy = dt.getFullYear();
      return `${mm}/${dd}/${yy}`;
    } catch (e) { return d || ''; }
  };

  // RBI FORM B (Paper) IDs
  setVal('ird-last', r.last);
  setVal('ird-first', r.first);
  setVal('ird-middle', r.mid);
  setVal('ird-suffix', r.suffix);
  setVal('ird-dob', formatToDisplayDate(r.dob));
  setVal('ird-sex', r.sex);
  setVal('ird-address', r.address || '');
  setVal('ird-pob', r.pob);
  setVal('ird-civil', r.civilStatus);
  setVal('ird-religion', r.religion);
  setVal('ird-citizen', r.citizenship);
  setVal('ird-occ', r.occupation);
  setVal('ird-contact', r.contact);
  setVal('ird-philsys', r.philsys);
  setVal('ird-email', r.email);

  // signature/date/household fields
  setVal('ird-date', r.dateAccomplished || r.dateaccomplished || r.date_accomplished);
  setVal('ird-accomplisher', r.formAccomplisher || r.form_accomplisher || r.accomplisher);
  setVal('ird-secretary', r.barangaySecretary || r.barangay_secretary || r.secretary);
  setVal('ird-household', r.householdNumber || r.household_number || r.household);

  // Reset checkboxes
  document.querySelectorAll('#res-individual input[type="checkbox"]').forEach(cb => cb.checked = false);
  if (r.education && Array.isArray(r.education)) {
    const eduMap = {
      'Elementary': 'edu-elem',
      'High School': 'edu-hs',
      'College': 'edu-coll',
      'Post Grad': 'edu-pg',
      'Vocational': 'edu-voc',
      'Graduate': 'edu-grad',
      'Under Graduate': 'edu-ug'
    };
    r.education.forEach(edu => {
      const id = eduMap[edu] || ('edu-' + (typeof edu === 'string' ? edu.toLowerCase().replace(/\s+/g, '') : ''));
      const cb = document.getElementById(id);
      if (cb) cb.checked = true;
    });
  }

  showSubPanel('res-individual');
}
window.viewResident = viewResident;

function openNewResidentForm() {
  editingResId = null;
  const setVal = (fieldId, val) => {
    const el = document.getElementById(fieldId);
    if (el) {
      if (el.tagName === 'INPUT') el.value = val;
      else el.textContent = val;
    }
  };

  setVal('ird-last', '');
  setVal('ird-first', '');
  setVal('ird-middle', '');
  setVal('ird-suffix', '');
  setVal('ird-dob', '');
  setVal('ird-sex', '');
  setVal('ird-address', '');
  setVal('ird-pob', '');
  setVal('ird-civil', '');
  setVal('ird-religion', '');
  setVal('ird-citizen', '');
  setVal('ird-occ', '');
  setVal('ird-contact', '');
  setVal('ird-philsys', '');
  setVal('ird-email', '');

  // clear signature/date/household
  setVal('ird-date', '');
  setVal('ird-accomplisher', '');
  setVal('ird-secretary', '');
  setVal('ird-household', '');

  document.querySelectorAll('#res-individual input[type="checkbox"]').forEach(cb => cb.checked = false);

  showSubPanel('res-individual');
}
window.openNewResidentForm = openNewResidentForm;

async function saveResident() {
  if (residentFormSaveInProgress) {
    if (typeof showToast === 'function') showToast('Saving in progress. Please wait.', 'info');
    return;
  }

  residentFormSaveInProgress = true;
  const saveButton = document.querySelector('#res-individual button[onclick*="saveResident"]');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.dataset.originalText = saveButton.innerHTML;
    saveButton.innerHTML = '⏳ Saving...';
  }

  const getVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.tagName === 'INPUT' ? el.value : el.textContent).trim();
  };

  try {
    // --- Validate required fields ---
    const requiredFields = [
      { id: 'ird-last', label: 'Last Name' },
      { id: 'ird-first', label: 'First Name' }
    ];

    const missing = requiredFields.filter(f => !getVal(f.id));
    if (missing.length > 0) {
      const el = document.getElementById(missing[0].id);
      if (el) el.focus();
      const names = missing.map(f => f.label).join(' and ');
      if (typeof showToast === 'function') showToast(`${names} ${missing.length > 1 ? 'are' : 'is'} required.`, 'error');
      residentFormSaveInProgress = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Individual Record';
      }
      return;
    }

    let r = window.residents.find(x => x.id === editingResId);
    const isNew = !r;

    // ── Duplicate name check (new AND edit) ──────────────────────────────────
    const newLast = getVal('ird-last').toLowerCase().trim();
    const newFirst = getVal('ird-first').toLowerCase().trim();
    const duplicate = (window.residents || []).find(x =>
      x.id !== editingResId &&                                // exclude self when editing
      (x.last || '').toLowerCase().trim() === newLast &&
      (x.first || '').toLowerCase().trim() === newFirst
    );
    if (duplicate) {
      if (typeof showToast === 'function')
        showToast(`A resident named "${getVal('ird-last')}, ${getVal('ird-first')}" already exists.`, 'error');
      residentFormSaveInProgress = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Individual Record';
      }
      return;
    }

    // helper: parse mm/dd/yyyy (or many common display formats) to ISO yyyy-mm-dd
    const parseDisplayToIso = (s) => {
      if (!s) return null;
      const v = ('' + s).trim();
      // if already ISO-like, normalize
      const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m) {
        let mm = m[1].padStart(2, '0');
        let dd = m[2].padStart(2, '0');
        let yyyy = m[3];
        if (yyyy.length === 2) {
          // naive two-digit year handling: assume 19xx for >30, else 20xx
          const num = parseInt(yyyy, 10);
          yyyy = (num > 30 ? 1900 + num : 2000 + num);
        }
        return `${yyyy}-${mm}-${dd}`;
      }
      // last resort: try Date parse
      const d = new Date(v);
      if (!isNaN(d)) {
        const y = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      }
      return null;
    };

    const rawDob = getVal('ird-dob');
    const isoDob = rawDob ? parseDisplayToIso(rawDob) : null;

    const payload = {
      last: getVal('ird-last'),
      first: getVal('ird-first'),
      mid: getVal('ird-middle'),
      suffix: getVal('ird-suffix'),
      dob: isoDob || null,
      sex: getVal('ird-sex') || null,
      address: getVal('ird-address') || null,
      pob: getVal('ird-pob') || null,
      civilstatus: getVal('ird-civil') || null,
      religion: getVal('ird-religion') || null,
      citizenship: getVal('ird-citizen') || null,
      occupation: getVal('ird-occ') || null,
      contact: getVal('ird-contact') || null,
      philsys: getVal('ird-philsys') || null,
      email: getVal('ird-email') || null,
      education: []
    };

    // include computed age based on DOB so DB stays in sync
    if (isoDob) payload.age = computeAgeFromDob(isoDob);

    // collect signature/date/household (only include when non-empty to avoid server errors if columns are absent)
    const _dateVal = getVal('ird-date'); if (_dateVal) payload.date_accomplished = _dateVal;
    const _accVal = getVal('ird-accomplisher'); if (_accVal) payload.form_accomplisher = _accVal;
    const _secVal = getVal('ird-secretary'); if (_secVal) payload.barangay_secretary = _secVal;
    const _hhVal = getVal('ird-household'); if (_hhVal) payload.household_number = _hhVal;

    if (document.getElementById('edu-elem')?.checked) payload.education.push('Elementary');
    if (document.getElementById('edu-hs')?.checked) payload.education.push('High School');
    if (document.getElementById('edu-coll')?.checked) payload.education.push('College');
    if (document.getElementById('edu-pg')?.checked) payload.education.push('Post Grad');
    if (document.getElementById('edu-voc')?.checked) payload.education.push('Vocational');
    if (document.getElementById('edu-grad')?.checked) payload.education.push('Graduate');
    if (document.getElementById('edu-ug')?.checked) payload.education.push('Under Graduate');

    if (isNew) {
      payload.registered = new Date().toISOString();
      payload.status = 'active';
      console.debug('Saving new resident payload:', payload);
      await window.supabaseClient.insert('residents', payload);
      // refresh local data immediately; latest records are ordered by id desc
      await loadResidentsFromDb();
    } else {
      // Only send fields that actually changed
      // Compare each field against the original record
      const normStr = v => (v || '').toString().trim();
      const normArr = arr => (arr || []).map(c => c.trim().toLowerCase()).sort().join('|');
      const changedPayload = {};

      // Compare each field against the original record
      const fieldMap = {
        last: 'last', first: 'first', mid: 'mid', suffix: 'suffix',
        dob: 'dob', sex: 'sex', address: 'address', pob: 'pob',
        civilstatus: 'civilStatus', religion: 'religion', citizenship: 'citizenship',
        occupation: 'occupation', contact: 'contact', philsys: 'philsys', email: 'email',
        date_accomplished: 'dateAccomplished', form_accomplisher: 'formAccomplisher',
        barangay_secretary: 'barangaySecretary', household_number: 'householdNumber'
      };

      for (const [payloadKey, origKey] of Object.entries(fieldMap)) {
        if (payload[payloadKey] !== undefined && normStr(payload[payloadKey]) !== normStr(r[origKey] || r[payloadKey])) {
          changedPayload[payloadKey] = payload[payloadKey];
        }
      }

      // Compare arrays (education)
      if (normArr(payload.education) !== normArr(r.education)) changedPayload.education = payload.education;

      // Compare age
      if (payload.age !== undefined && payload.age !== r.age) changedPayload.age = payload.age;

      if (Object.keys(changedPayload).length === 0) {
        if (typeof showToast === 'function') showToast('No changes detected.', 'info');
        residentFormSaveInProgress = false;
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Individual Record';
        }
        showSubPanel('res-list');
        return;
      }

      console.debug('Updating resident id', r.id, 'changed fields:', changedPayload);
      await window.supabaseClient.update('residents', 'id', r.id, changedPayload);
      await loadResidentsFromDb();
    }
    renderResidents();
    if (typeof updateDashboardResidents === 'function') updateDashboardResidents();
    if (typeof showToast === 'function') showToast('Individual Record (Form B) saved successfully.', 'success');
    showSubPanel('res-list');
  } catch (e) {
    console.error('SaveResident error:', e);
    const msg = (e && e.message) ? e.message : ('' + e);
    if (typeof showToast === 'function') showToast('Failed saving record: ' + msg, 'error');
  } finally {
    residentFormSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Individual Record';
    }
  }
}
window.saveResident = saveResident;

async function archiveResident(id, newStatus) {
  const r = window.residents.find(x => x.id === id);
  if (!r) return;
  const msg = newStatus === 'archived' ? `Archive ${r.first} ${r.last}?` : `Restore ${r.first} ${r.last}?`;
  if (!confirm(msg)) return;

  try {
    console.debug('Setting status for resident', id, 'to', newStatus);
    await window.supabaseClient.update('residents', 'id', id, { status: newStatus });
    await loadResidentsFromDb();
    applyResidentFilters();
    if (typeof showToast === 'function') showToast(`${r.first} ${r.last} ${newStatus === 'archived' ? 'archived' : 'restored'}.`, 'success');
  } catch (e) {
    console.error('ArchiveResident error:', e);
    const msgErr = (e && e.message) ? e.message : ('' + e);
    if (typeof showToast === 'function') showToast('Failed updating status: ' + msgErr, 'error');
  }
}
window.archiveResident = archiveResident;

function editResident(id) {
  const r = window.residents.find(x => x.id === id);
  if (!r) return;

  const setField = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const setCheck = (id, check) => { const el = document.getElementById(id); if (el) el.checked = check; };

  setField('editResId', r.id);
  setField('editPurok', r.purok);

  const isVoter = r.cats.includes('Voter');
  setCheck('editVoter', isVoter);
  setCheck('editSenior', r.cats.includes('Senior'));
  setCheck('editPwd', r.cats.includes('PWD'));
  setCheck('editSolo', r.cats.includes('Single Parent'));
  setCheck('editNonVoter', !isVoter);

  if (typeof openModal === 'function') openModal('modal-edit-resident');
}
window.editResident = editResident;

async function saveEditResident() {
  if (residentEditSaveInProgress) {
    if (typeof showToast === 'function') showToast('Saving in progress. Please wait.', 'info');
    return;
  }

  residentEditSaveInProgress = true;
  const saveButton = document.querySelector('#modal-edit-resident .btn-gold');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.dataset.originalText = saveButton.innerHTML;
    saveButton.innerHTML = '⏳ Saving...';
  }

  const id = parseInt(document.getElementById('editResId').value);
  const r = window.residents.find(x => x.id === id);
  if (!r) {
    residentEditSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Changes';
    }
    return;
  }

  const newPurok = document.getElementById('editPurok').value.trim();
  const cats = [];
  if (document.getElementById('editVoter').checked) {
    cats.push('Voter');
  } else if (document.getElementById('editNonVoter')?.checked) {
    cats.push('Non-Voter');
  } else {
    cats.push('Non-Voter'); // default if none selected
  }

  if (document.getElementById('editSenior').checked) cats.push('Senior');
  if (document.getElementById('editPwd').checked) cats.push('PWD');
  if (document.getElementById('editSolo').checked) cats.push('Single Parent');

  // Only include fields that actually changed
  const payload = {};
  if (newPurok !== (r.purok || '').trim()) payload.purok = newPurok;
  const normCats = arr => arr.map(c => c.trim().toLowerCase()).sort().join('|');
  if (normCats(cats) !== normCats(r.cats || [])) payload.cats = cats;

  // If nothing changed, skip the update
  if (Object.keys(payload).length === 0) {
    residentEditSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Changes';
    }
    if (typeof closeModal === 'function') closeModal('modal-edit-resident');
    if (typeof showToast === 'function') showToast('No changes detected.', 'info');
    return;
  }

  try {
    await window.supabaseClient.update('residents', 'id', id, payload);
    await loadResidentsFromDb();
    if (typeof closeModal === 'function') closeModal('modal-edit-resident');
    renderResidents();
    if (typeof showToast === 'function') showToast('Information updated successfully!', 'success');
    if (typeof updateDashboardResidents === 'function') updateDashboardResidents();
  } catch (e) {
    console.error(e);
    if (typeof showToast === 'function') showToast('Failed updating info.', 'error');
  } finally {
    residentEditSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Changes';
    }
  }
}
window.saveEditResident = saveEditResident;

function registerResident() {
  const last = document.getElementById('rLast').value.trim();
  const first = document.getElementById('rFirst').value.trim();
  if (!last || !first) { if (typeof showToast === 'function') showToast('Please fill in required fields.', 'error'); return; }

  // ── Duplicate name check ───────────────────────────────────────────────────
  const duplicate = (window.residents || []).find(x =>
    (x.last || '').toLowerCase().trim() === last.toLowerCase() &&
    (x.first || '').toLowerCase().trim() === first.toLowerCase()
  );
  if (duplicate) {
    if (typeof showToast === 'function')
      showToast(`A resident named "${last}, ${first}" already exists.`, 'error');
    return;
  }

  const dob = document.getElementById('rDob').value;
  const age = dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : 0;

  const cats = [];
  if (document.getElementById('rVoter').checked) {
    cats.push('Voter');
  } else {
    cats.push('Non-Voter');
  }
  if (document.getElementById('rSenior').checked) cats.push('Senior');
  if (document.getElementById('rPwd').checked) cats.push('PWD');
  if (document.getElementById('rSolo').checked) cats.push('Single Parent');

  const newR = {
    id: window.residents.length + 1,
    last, first, mid: document.getElementById('rMiddle').value || '',
    suffix: document.getElementById('rSuffix').value || '',
    dob, age, sex: document.getElementById('rSex').value === 'Male' ? 'M' : 'F',
    purok: document.getElementById('rPurok').value,
    cats, status: 'active',
    registered: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    occupation: document.getElementById('rOcc').value || '',
    contact: document.getElementById('rContact').value || ''
  };

  window.residents.unshift(newR);
  if (typeof closeModal === 'function') closeModal('modal-resident');
  renderResidents();
  if (typeof showToast === 'function') showToast(`${first} ${last} registered successfully!`, 'success');
  if (typeof updateDashboardResidents === 'function') updateDashboardResidents();
}
window.registerResident = registerResident;

function calcAge() {
  const dob = document.getElementById('rDob').value;
  if (dob) {
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000));
    const el = document.getElementById('rAge');
    if (el) el.value = age;
  }
}
window.calcAge = calcAge;

// Ensure core functions are available globally for inline handlers and nav
window.renderResidents = renderResidents;
window.openNewResidentForm = openNewResidentForm;
window.initResidents = initResidents;
