/**
 * HOUSEHOLD MANAGEMENT LOGIC (RBI FORM A) - v2.2
 */

// Explicitly define global variables
window.hhRowCount = 1;
window.editingHHId = null;
window.hhPageSize = 50;
window.hhCurrentPage = 1;
window.householdSaveInProgress = false;

// Initialize function — load from DB when available
window.initHousehold = async function() {
  if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb();
  else if (typeof renderHouseholds === 'function') renderHouseholds();
};

// helper: escape user-controlled strings before inserting into innerHTML
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Load households from Supabase
async function loadHouseholdsFromDb() {
  try {
    if (!window.supabaseClient) throw new Error('supabaseClient not available');
    const data = await window.supabaseClient.select('households', 'select=*');
    window.households = (data || []).map(h => {
      const norm = Object.assign({}, h);
      norm.status = h.status || 'active';
      norm.purok = norm.purok || '';
      try { if (typeof norm.members === 'string') norm.members = JSON.parse(norm.members || '[]'); } catch (e) { norm.members = norm.members || []; }
      norm.memberCount = Array.isArray(norm.members) ? norm.members.length : (norm.membercount || norm.memberCount || 0);
      norm.head = norm.head || norm.household_head || (Array.isArray(norm.members) && norm.members[0] ? (norm.members[0].lastName ? `${norm.members[0].lastName}, ${norm.members[0].firstName}` : '') : '') || '—';
      return norm;
    });
  } catch (e) {
    console.warn('loadHouseholdsFromDb failed:', e);
    window.households = window.households || [];
  }
  try { renderHouseholds(); } catch (e) { /* ignore */ }
}
window.loadHouseholdsFromDb = loadHouseholdsFromDb;

// Sub-panel switching
window.showHHSubPanel = function(id) {
  const panel = document.getElementById('panel-household');
  if (panel) {
    const subs = panel.getElementsByClassName('sub-panel');
    for (let i = 0; i < subs.length; i++) {
      subs[i].classList.remove('active');
    }
  }
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    if (id === 'hh-form') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  if (id === 'hh-list') window.renderHouseholds();
};

// NEW HOUSEHOLD FORM OPENER
window.openNewHHForm = function() {
  window.editingHHId = null;
  window.hhRowCount = 1;
  
  // Update UI headers
  const t = document.getElementById('hhFormTitle');
  const b = document.getElementById('hhFormBreadcrumb');
  if (t) t.textContent = 'New Household Record';
  if (b) b.textContent = 'New Household Record';
  
  // Clear address
  const addr = document.getElementById('hhAddressInput');
  if (addr) addr.textContent = '';
  // Clear signature lines
  const sigPrepared = document.getElementById('hhSigPreparedLine'); if (sigPrepared) sigPrepared.textContent = '';
  const sigSecretary = document.getElementById('hhSigSecretaryLine'); if (sigSecretary) sigSecretary.textContent = '';
  const sigPunong = document.getElementById('hhSigPunongLine'); if (sigPunong) sigPunong.textContent = '';
  
  // Render table
  window.renderHHTable();
  
  // Switch view
  window.showHHSubPanel('hh-form');
};

// Filter Application
window.applyHHFilters = function() {
  window.hhCurrentPage = 1;
  const search = document.getElementById('hhSearch')?.value || '';
  const status = document.getElementById('hhStatusFilter')?.value || '';
  const purok = document.getElementById('hhPurokFilter')?.value || '';
  window.renderHouseholds(search, purok, status);
};

window.changeHHPage = function(page) {
  const totalPages = Math.max(1, Math.ceil(((window.households || []).length || 0) / window.hhPageSize));
  window.hhCurrentPage = Math.max(1, Math.min(page, totalPages));
  window.renderHouseholds();
};
window.renderHHPagination = function(totalItems = 0, totalPages = 1) {
  const container = document.getElementById('householdPagination');
  if (!container) return;

  const startItem = totalItems ? ((window.hhCurrentPage - 1) * window.hhPageSize) + 1 : 0;
  const endItem = Math.min(window.hhCurrentPage * window.hhPageSize, totalItems);
  const pageLabel = totalItems ? `Showing ${startItem}-${endItem} of ${totalItems}` : 'No household records';

  container.innerHTML = `
    <div style="font-size:13px;color:var(--text-muted)">${pageLabel}</div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-outline btn-sm" onclick="changeHHPage(${window.hhCurrentPage - 1})" ${window.hhCurrentPage <= 1 ? 'disabled' : ''}>← Prev</button>
      <span style="font-size:13px;color:var(--text-muted)">Page ${window.hhCurrentPage} of ${totalPages}</span>
      <button class="btn btn-outline btn-sm" onclick="changeHHPage(${window.hhCurrentPage + 1})" ${window.hhCurrentPage >= totalPages ? 'disabled' : ''}>Next →</button>
    </div>
  `;
};

// Main List Rendering
window.renderHouseholds = function(filter, purokF, statusF) {
  const tb = document.getElementById('householdBody');
  if (!tb) return;

  // Always read current filter values from the DOM if not explicitly provided
  if (filter === undefined || filter === null) filter = document.getElementById('hhSearch')?.value || '';
  if (purokF === undefined || purokF === null) purokF = document.getElementById('hhPurokFilter')?.value || '';
  if (statusF === undefined || statusF === null) statusF = document.getElementById('hhStatusFilter')?.value || '';
  
  const f = filter.toLowerCase();
  let list = window.households || [];
  
  if (f) list = list.filter(h => (h.head + ' ' + h.address).toLowerCase().includes(f));
  if (purokF) list = list.filter(h => h.purok === purokF);
  if (statusF) list = list.filter(h => h.status === statusF);

  const totalPages = Math.max(1, Math.ceil(list.length / window.hhPageSize));
  window.hhCurrentPage = Math.min(window.hhCurrentPage, totalPages);
  const start = (window.hhCurrentPage - 1) * window.hhPageSize;
  const pagedList = list.slice(start, start + window.hhPageSize);
  
  tb.innerHTML = pagedList.length ? pagedList.map((h, i) => `
    <tr>
      <td data-label="Household Head"><strong>${escapeHtml(h.head)}</strong></td>
      <td data-label="Purok">${escapeHtml(h.purok)}</td>
      <td data-label="Status"><span class="badge badge-${escapeHtml(h.status || 'active')}">${escapeHtml((h.status || 'active').toUpperCase())}</span></td>
      <td data-label="Actions">
        <button class="btn btn-primary btn-sm" onclick="editHousehold(${start + i})">Edit</button>
        ${h.status === 'archived' 
          ? `<button class="btn btn-success btn-sm" onclick="archiveHousehold(${start + i}, 'active')">Restore</button>` 
          : `<button class="btn btn-danger btn-sm" onclick="archiveHousehold(${start + i}, 'archived')">Archive</button>`
        }
      </td>
    </tr>
  `).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No household records found.</td></tr>`;

  window.renderHHPagination(list.length, totalPages);
};

// Helper to create a single Form A row
window.createHHRowHtml = function(index, member = {}) {
  const m = {
    lastName: member.lastName || '',
    firstName: member.firstName || '',
    middleName: member.middleName || '',
    ext: member.ext || '',
    pob: member.pob || '',
    dob: member.dob || '',
    age: member.age || '0',
    sex: member.sex || '',
    civilStatus: member.civilStatus || '',
    citizenship: member.citizenship || '',
    occupation: member.occupation || '',
    remarks: member.remarks || ''
  };

  return `
    <td class="row-num">${index + 1}</td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.lastName)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.firstName)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.middleName)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.ext)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.pob)}</div></td>
    <td><input class="hhr-input-clean" type="date" value="${m.dob}" onchange="window.calcHHRowAge(this)"></td>
    <td><div class="hhr-input-clean hhr-age" style="width:35px">${escapeHtml(m.age)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean" style="width:30px">${escapeHtml(m.sex)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.civilStatus)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.citizenship)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.occupation)}</div></td>
    <td><div contenteditable="true" class="hhr-input-clean">${escapeHtml(m.remarks)}</div></td>
    <td class="no-print"><button type="button" class="btn btn-danger btn-sm" onclick="removeHHRow(this)" style="padding: 2px 6px; font-size: 10px;">✖</button></td>
  `;
};

// RBI Form Table Rendering (Initial)
window.renderHHTable = function() {
  const tb = document.getElementById('hhTableBody');
  if (!tb) return;
  tb.innerHTML = '';
  
  let members = [];
  if (window.editingHHId !== null && window.households[window.editingHHId]) {
    members = window.households[window.editingHHId].members || [];
  }
  
  for (let i = 0; i < window.hhRowCount; i++) {
    const row = document.createElement('tr');
    row.innerHTML = window.createHHRowHtml(i, members[i] || {});
    tb.appendChild(row);
  }
  
  const mc = document.getElementById('hhMemberCount');
  if (mc) mc.value = window.hhRowCount;
};

window.calcHHRowAge = function(el) {
  const dob = el.value;
  if (dob) {
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000));
    const ageInput = el.closest('tr').querySelector('.hhr-age');
    if (ageInput) ageInput.textContent = age;
  }
};

window.addHHRow = function() {
  const tb = document.getElementById('hhTableBody');
  if (!tb) return;
  
  const row = document.createElement('tr');
  row.innerHTML = window.createHHRowHtml(window.hhRowCount);
  tb.appendChild(row);
  
  window.hhRowCount++;
  const mc = document.getElementById('hhMemberCount');
  if (mc) mc.value = window.hhRowCount;
};

window.removeHHRow = function(btn) {
  const row = btn.closest('tr');
  row.remove();
  
  // Update numbers
  const rows = document.querySelectorAll('#hhTableBody tr');
  rows.forEach((r, idx) => {
    const numCell = r.querySelector('.row-num');
    if (numCell) numCell.textContent = idx + 1;
  });
  
  window.hhRowCount = rows.length;
  const mc = document.getElementById('hhMemberCount');
  if (mc) mc.value = window.hhRowCount;
};

window.saveHousehold = async function() {
  if (window.householdSaveInProgress) {
    if (typeof showToast === 'function') showToast('Saving in progress. Please wait.', 'info');
    return;
  }

  window.householdSaveInProgress = true;
  const saveButton = document.querySelector('#hh-form .sec-head-actions .btn-gold[onclick*="saveHousehold"]');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.dataset.originalText = saveButton.innerHTML;
    saveButton.innerHTML = '⏳ Saving...';
  }

  const addrEl = document.getElementById('hhAddressInput');
  const address = addrEl ? addrEl.textContent.trim() : '';
  const purok = document.getElementById('hhPurokInput')?.value || 'GEMELINA';
  
  if (!address) {
    if (typeof showToast === 'function') showToast('Please enter a household address.', 'error');
    window.householdSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Record';
    }
    return;
  }

  const rows = document.querySelectorAll('#hhTableBody tr');
  let headName = '—';
  const members = [];

  // --- Validate required fields for the first member (household head) ---
  if (rows.length > 0) {
    const firstRow = rows[0];
    const inputs = firstRow.querySelectorAll('.hhr-input-clean');
    const lastNameEl  = inputs[0]; // Last Name
    const firstNameEl = inputs[1]; // First Name

    const lastNameVal  = lastNameEl  ? lastNameEl.textContent.trim()  : '';
    const firstNameVal = firstNameEl ? firstNameEl.textContent.trim() : '';

    // Clear previous highlights
    [lastNameEl, firstNameEl].forEach(el => {
      if (el && el.closest('td')) {
        el.closest('td').style.background = '';
        el.style.outline = '';
      }
    });

    const missingLabels = [];
    if (!lastNameVal)  { missingLabels.push('Last Name');  if (lastNameEl  && lastNameEl.closest('td'))  { lastNameEl.closest('td').style.background  = 'rgba(239,68,68,0.08)'; lastNameEl.style.outline  = '2px solid #ef4444'; } }
    if (!firstNameVal) { missingLabels.push('First Name'); if (firstNameEl && firstNameEl.closest('td')) { firstNameEl.closest('td').style.background = 'rgba(239,68,68,0.08)'; firstNameEl.style.outline = '2px solid #ef4444'; } }

    if (missingLabels.length > 0) {
      if (typeof showToast === 'function') showToast(`Household Head ${missingLabels.join(' and ')} ${missingLabels.length > 1 ? 'are' : 'is'} required.`, 'error');
      if (!lastNameVal && lastNameEl) lastNameEl.focus();
      else if (!firstNameVal && firstNameEl) firstNameEl.focus();
      window.householdSaveInProgress = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Record';
      }
      return;
    }
  }
  
  rows.forEach((row, idx) => {
    const inputs = row.querySelectorAll('.hhr-input-clean');
    if (inputs.length >= 12) {
      const member = {
        lastName: inputs[0].textContent.trim(),
        firstName: inputs[1].textContent.trim(),
        middleName: inputs[2].textContent.trim(),
        ext: inputs[3].textContent.trim(),
        pob: inputs[4].textContent.trim(),
        dob: inputs[5].value || '',
        age: inputs[6].textContent.trim() || '0',
        sex: inputs[7].textContent.trim(),
        civilStatus: inputs[8].textContent.trim(),
        citizenship: inputs[9].textContent.trim(),
        occupation: inputs[10].textContent.trim(),
        remarks: inputs[11].textContent.trim()
      };
      members.push(member);
      
      if (idx === 0) {
        if (member.lastName || member.firstName) {
          headName = `${member.lastName}, ${member.firstName}`;
        }
      }
    }
  });

  // ── Duplicate household head check (new AND edit) ──────────────────────────
  if (headName && headName !== '—') {
    const normHead = headName.toLowerCase().trim();
    const editingDbId = (window.editingHHId !== null && window.households[window.editingHHId])
      ? window.households[window.editingHHId].id
      : null;
    const duplicate = (window.households || []).find(h =>
      (editingDbId === null || h.id !== editingDbId) &&    // exclude self when editing
      (h.head || '').toLowerCase().trim() === normHead
    );
    if (duplicate) {
      if (typeof showToast === 'function')
        showToast(`A household with head "${headName}" already exists.`, 'error');
      window.householdSaveInProgress = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Record';
      }
      return;
    }
  }

  const registered = new Date().toISOString();


  const payload = {
    head: headName,
    address: address,
    purok: purok,
    membercount: window.hhRowCount,
    members: JSON.stringify(members),
    registered: registered,
    status: 'active'
  };

  // include signature fields when present
  try {
    const p = document.getElementById('hhSigPreparedLine'); if (p && p.textContent.trim()) payload.prepared_by = p.textContent.trim();
    const s = document.getElementById('hhSigSecretaryLine'); if (s && s.textContent.trim()) payload.barangay_secretary = s.textContent.trim();
    const pb = document.getElementById('hhSigPunongLine'); if (pb && pb.textContent.trim()) payload.punong_barangay = pb.textContent.trim();
  } catch (e) { /* ignore DOM errors */ }

  try {
    if (!window.supabaseClient) throw new Error('supabaseClient not available');
    if (window.editingHHId !== null) {
      const existing = window.households[window.editingHHId];
      if (existing && existing.id && !String(existing.id).startsWith('HH-')) {
        // Compare payload against existing and only send changes
        const changedPayload = {};
        const normStr = v => (v || '').toString().trim();
        
        // Members need special comparison
        const oldMembers = existing.members || [];
        const newMembers = JSON.parse(payload.members);
        
        let membersChanged = false;
        let memberChangesDesc = [];
        
        // Find added or modified members
        const isDiff = (a, b) => {
            if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return a !== b;
            const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
            for (let k of keys) if (a[k] !== b[k]) return true;
            return false;
        };

        newMembers.forEach((nm, idx) => {
            const om = oldMembers[idx];
            const name = `${nm.firstName || ''} ${nm.lastName || ''}`.trim() || `Member ${idx+1}`;
            if (!om) {
                memberChangesDesc.push(`Added ${name}`);
                membersChanged = true;
            } else if (isDiff(om, nm)) {
                memberChangesDesc.push(`Modified ${name}`);
                membersChanged = true;
            }
        });
        
        // Find removed members
        if (oldMembers.length > newMembers.length) {
            for (let i = newMembers.length; i < oldMembers.length; i++) {
                const om = oldMembers[i];
                const name = `${om.firstName} ${om.lastName}`.trim() || `Member ${i+1}`;
                memberChangesDesc.push(`Removed ${name}`);
                membersChanged = true;
            }
        }
        
        if (membersChanged) {
           changedPayload.members = payload.members;
           changedPayload._memberChanges = memberChangesDesc.join(', ');
        }

        // Compare simple fields
        const fields = ['head', 'address', 'purok', 'membercount', 'status', 'prepared_by', 'barangay_secretary', 'punong_barangay'];
        for (const k of fields) {
           if (payload[k] !== undefined && normStr(payload[k]) !== normStr(existing[k])) {
              changedPayload[k] = payload[k];
           }
        }

        if (Object.keys(changedPayload).length === 0) {
           if (typeof showToast === 'function') showToast('No changes detected.', 'info');
           window.householdSaveInProgress = false;
           if (saveButton) {
             saveButton.disabled = false;
             saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Record';
           }
           window.showHHSubPanel('hh-list');
           return;
        }

        console.debug('Updating household id', existing.id, changedPayload);
        await window.supabaseClient.update('households', 'id', existing.id, changedPayload);
        await loadHouseholdsFromDb();
        if (typeof showToast === 'function') showToast('Household record updated!', 'success');
      } else {
        console.debug('Inserting new household payload', payload);
        await window.supabaseClient.insert('households', payload);
        await loadHouseholdsFromDb();
        if (typeof showToast === 'function') showToast('New household record saved!', 'success');
      }
    } else {
      console.debug('Inserting new household payload', payload);
      await window.supabaseClient.insert('households', payload);
      await loadHouseholdsFromDb();
      if (typeof showToast === 'function') showToast('New household record saved!', 'success');
    }
  } catch (e) {
    console.error('SaveHousehold error:', e);
    if (typeof showToast === 'function') showToast('Failed saving household: ' + (e && e.message ? e.message : '' + e), 'error');
  } finally {
    window.householdSaveInProgress = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = saveButton.dataset.originalText || '💾 Save Record';
    }
  }

  if (typeof updateDashboardHouseholds === 'function') updateDashboardHouseholds();
  window.showHHSubPanel('hh-list');
};

window.viewHousehold = function(index) {
  const h = window.households[index];
  if (!h) return;
  window.editingHHId = index;
  window.hhRowCount = h.memberCount || 1;
  
  const addr = document.getElementById('hhAddressInput');
  if (addr) addr.textContent = h.address;
  
  const pur = document.getElementById('hhPurokInput');
  if (pur) pur.value = h.purok || 'GEMELINA';
  // populate signature lines from record if available
  try {
    const p = document.getElementById('hhSigPreparedLine'); if (p) p.textContent = h.prepared_by || h.preparedby || '';
    const s = document.getElementById('hhSigSecretaryLine'); if (s) s.textContent = h.barangay_secretary || h.barangaySecretary || '';
    const pb = document.getElementById('hhSigPunongLine'); if (pb) pb.textContent = h.punong_barangay || h.punongBarangay || '';
  } catch (e) { /* ignore DOM errors */ }
  
  window.renderHHTable();
  window.showHHSubPanel('hh-form');
};

window.editHousehold = function(index) {
  window.viewHousehold(index);
};

window.archiveHousehold = function(index, newStatus) {
  const h = window.households[index];
  if (!h) return;
  
  const msg = newStatus === 'archived' ? `Archive household record ${h.id}?` : `Restore household record ${h.id}?`;
  if (confirm(msg)) {
    (async () => {
      try {
        if (!window.supabaseClient) throw new Error('supabaseClient not available');
        if (h.id && !String(h.id).startsWith('HH-')) {
          await window.supabaseClient.update('households', 'id', h.id, { status: newStatus });
          await loadHouseholdsFromDb();
        } else {
          h.status = newStatus;
        }
        window.applyHHFilters();
        if (typeof updateDashboardHouseholds === 'function') updateDashboardHouseholds();
        if (typeof showToast === 'function') showToast(`Household ${newStatus === 'archived' ? 'archived' : 'restored'}.`, 'info');
      } catch (e) {
        console.error('ArchiveHousehold error:', e);
        if (typeof showToast === 'function') showToast('Failed updating household status.', 'error');
      }
    })();
  }
};
