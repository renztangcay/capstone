/**
 * OFFICIALS MANAGEMENT LOGIC
 */

function renderOfficials(statusF) {
  const g = document.getElementById('officialsGrid');
  if (!g) return;
  
  if (statusF === undefined || statusF === null) {
    statusF = document.getElementById('offFilterStatus')?.value || '';
  }
  
  let list = window.officials || [];
  if (statusF) list = list.filter(o => (o.status || 'Active') === statusF);
  
  // Default status to 'Active' if not present
  g.innerHTML = list.map((o, index) => {
    const status = o.status || 'Active';
    const statusBadgeCls = status === 'Active' ? 'badge-active' : 'badge-archived';
    const avatarContent = o.avatar ? `<img src="${o.avatar}" alt="${escapeHtml(o.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<img src="../assets/user.png" alt="Default Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    
    return `
    <div class="official-card">
      <div class="official-ava">${avatarContent}</div>
      <div class="official-name">${escapeHtml(o.name)}</div>
      <div class="official-role">${escapeHtml(o.role)} <span class="badge ${statusBadgeCls}" style="font-size:10px;margin-left:4px;">${escapeHtml(status)}</span></div>
      <div class="official-term">Term: ${escapeHtml(o.term)}</div>
      <div style="margin-top:12px;display:flex;gap:6px;justify-content:center;">
        <button class="btn btn-outline btn-sm" onclick="editOfficial(${index})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="removeOfficial(${index})">Remove</button>
      </div>
    </div>
  `}).join('');
}

function openAddOfficial() {
  const t = document.getElementById('offModalTitle');
  if (t) t.textContent = 'Add Barangay Official';
  const b = document.getElementById('offSaveBtn');
  if (b) b.textContent = 'Add Official';

  document.getElementById('offIndex').value = '';
  document.getElementById('offFirst').value = '';
  document.getElementById('offLast').value = '';
  document.getElementById('offMiddle').value = '';
  document.getElementById('offSuffix').value = '';
  document.getElementById('offRole').value = 'Kagawad';
  document.getElementById('offStatus').value = 'Active';
  document.getElementById('offStart').value = '';
  document.getElementById('offEnd').value = '';
  document.getElementById('offContact').value = '';
  document.getElementById('offEmail').value = '';
  document.getElementById('offAvatar').value = '';

  if (typeof openModal === 'function') openModal('modal-official');
}

function editOfficial(index) {
  const o = window.officials[index];
  if (!o) return;

  const t = document.getElementById('offModalTitle');
  if (t) t.textContent = 'Edit Barangay Official';
  const b = document.getElementById('offSaveBtn');
  if (b) b.textContent = 'Update Official';

  document.getElementById('offIndex').value = index;

  document.getElementById('offFirst').value = o.first || '';
  document.getElementById('offLast').value = o.last || '';
  document.getElementById('offMiddle').value = o.middle || '';
  document.getElementById('offSuffix').value = o.suffix || '';
  document.getElementById('offRole').value = o.role || '';
  document.getElementById('offStatus').value = o.status || 'Active';
  document.getElementById('offStart').value = o.start || '';
  document.getElementById('offEnd').value = o.end || '';
  document.getElementById('offContact').value = o.contact || '';
  document.getElementById('offEmail').value = o.email || '';
  document.getElementById('offAvatar').value = '';

  if (typeof openModal === 'function') openModal('modal-official');
}

function saveOfficial() {
  const index = document.getElementById('offIndex').value;
  const first = document.getElementById('offFirst').value.trim();
  const last = document.getElementById('offLast').value.trim();
  const middle = document.getElementById('offMiddle').value.trim();
  const suffix = document.getElementById('offSuffix').value.trim();
  const role = document.getElementById('offRole').value;
  const status = document.getElementById('offStatus').value;
  const start = document.getElementById('offStart').value;
  const end = document.getElementById('offEnd').value;
  const contact = document.getElementById('offContact').value.trim();
  const email = document.getElementById('offEmail').value.trim();
  const avatarFile = document.getElementById('offAvatar').files[0];

  if (!first || !last) {
    if (typeof showToast === 'function') showToast('Please enter first and last name.', 'error');
    return;
  }

  // Handle image upload
  if (avatarFile) {
    if (avatarFile.size > 2 * 1024 * 1024) { // 2MB limit
      if (typeof showToast === 'function') showToast('Image size must be less than 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Image = e.target.result;
      saveOfficialData(index, first, last, middle, suffix, role, status, start, end, contact, email, base64Image);
    };
    reader.readAsDataURL(avatarFile);
  } else {
    saveOfficialData(index, first, last, middle, suffix, role, status, start, end, contact, email, null);
  }
}

function saveOfficialData(index, first, last, middle, suffix, role, status, start, end, contact, email, avatar) {
  // Construct display strings
  const name = `${first} ${middle} ${last} ${suffix}`.replace(/\s+/g, ' ').trim();
  const initials = first.charAt(0) + last.charAt(0);
  const term = start && end ? `${new Date(start).getFullYear()}–${new Date(end).getFullYear()}` : '';

  const officialData = { 
    name, role, status, term, initials, 
    first, last, middle, suffix, start, end, contact, email 
  };

  // Add avatar if provided
  if (avatar) {
    officialData.avatar = avatar;
  }

  if (index !== '') {
    // Update
    const oldOfficial = window.officials[index] || {};
    
    // Check for modified fields
    const changedFields = [];
    const fieldMap = {
        first: 'First Name', last: 'Last Name', middle: 'Middle Name', suffix: 'Suffix',
        role: 'Role', status: 'Status', start: 'Start Date', end: 'End Date',
        contact: 'Contact', email: 'Email'
    };
    
    if (avatar) {
      changedFields.push('Profile Picture');
    }
    
    for (const [key, label] of Object.entries(fieldMap)) {
        if (officialData[key] !== (oldOfficial[key] || '')) {
            changedFields.push(`${label} - ${officialData[key]}`);
        }
    }

    if (changedFields.length > 0) {
        // Preserve existing avatar if no new one is uploaded
        if (!avatar && oldOfficial.avatar) {
          officialData.avatar = oldOfficial.avatar;
        }
        
        window.officials[index] = officialData;
        if (typeof showToast === 'function') showToast(`${name} updated successfully!`, 'success');
        
        // Log to both localStorage and Supabase audit_logs
        try {
            const logEntry = {
                table: 'officials',
                id: oldOfficial.id || name,
                time: new Date().toISOString(),
                type: 'modified',
                fields: changedFields.join(', '),
                name: name,
                user: (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim()
            };
            const localLogs = JSON.parse(localStorage.getItem('bms_local_logs') || '[]');
            localLogs.push(logEntry);
            localStorage.setItem('bms_local_logs', JSON.stringify(localLogs.slice(-50)));
            if (window.supabaseClient) {
                window.supabaseClient.insert('audit_logs', {
                    record_table: logEntry.table, record_id: String(logEntry.id),
                    action_type: logEntry.type, fields: logEntry.fields,
                    record_name: logEntry.name, performed_by: logEntry.user
                }).catch(() => {});
            }
        } catch (e) { /* ignore */ }
    } else {
         if (typeof showToast === 'function') showToast('No changes detected.', 'info');
    }
    
  } else {
    // Add
    window.officials.push(officialData);
    if (typeof showToast === 'function') showToast(`${name} added to officials.`, 'success');

    // Log to both localStorage and Supabase audit_logs
    try {
        const logEntry = {
            table: 'officials',
            id: officialData.id || name,
            time: new Date().toISOString(),
            type: 'added',
            fields: role,
            name: name,
            user: (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim()
        };
        const localLogs = JSON.parse(localStorage.getItem('bms_local_logs') || '[]');
        localLogs.push(logEntry);
        localStorage.setItem('bms_local_logs', JSON.stringify(localLogs.slice(-50)));
        if (window.supabaseClient) {
            window.supabaseClient.insert('audit_logs', {
                record_table: logEntry.table, record_id: String(logEntry.id),
                action_type: logEntry.type, fields: logEntry.fields,
                record_name: logEntry.name, performed_by: logEntry.user
            }).catch(() => {});
        }
    } catch (e) { /* ignore */ }
  }

  // Persist to server
  if (typeof persistOfficials === 'function') persistOfficials();

  if (typeof closeModal === 'function') closeModal('modal-official');
  renderOfficials();
}

function clearOfficialAvatar() {
  document.getElementById('offAvatar').value = '';
  const index = document.getElementById('offIndex').value;
  if (index !== '') {
    // If editing, remove avatar from official data
    if (window.officials[index]) {
      delete window.officials[index].avatar;
      if (typeof showToast === 'function') showToast('Avatar reset to default.', 'info');
    }
  }
}

function removeOfficial(index) {
  const o = window.officials[index];
  if (o && confirm(`Remove ${o.name} from officials?`)) {
    window.officials.splice(index, 1);
    
    // Log to both localStorage and Supabase audit_logs
    try {
        const logEntry = {
            table: 'officials',
            id: o.id || o.name,
            time: new Date().toISOString(),
            type: 'removed',
            fields: o.role,
            name: o.name,
            user: (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim()
        };
        // Save to localStorage
        const localLogs = JSON.parse(localStorage.getItem('bms_local_logs') || '[]');
        localLogs.push(logEntry);
        localStorage.setItem('bms_local_logs', JSON.stringify(localLogs.slice(-50)));
        // Save to Supabase audit_logs
        if (window.supabaseClient) {
            window.supabaseClient.insert('audit_logs', {
                record_table: logEntry.table,
                record_id: String(logEntry.id),
                action_type: logEntry.type,
                fields: logEntry.fields,
                record_name: logEntry.name,
                performed_by: logEntry.user
            }).catch(() => {});
        }
    } catch (e) { /* ignore */ }

    renderOfficials();
    if (typeof showToast === 'function') showToast(`${o.name} removed.`, 'info');
    if (typeof persistOfficials === 'function') persistOfficials();
  }
}

// Expose functions
window.renderOfficials = renderOfficials;
window.openAddOfficial = openAddOfficial;
window.editOfficial = editOfficial;
window.saveOfficial = saveOfficial;
window.removeOfficial = removeOfficial;
window.clearOfficialAvatar = clearOfficialAvatar;

// Persist current officials array to server-side JSON
async function persistOfficials() {
  try {
    await fetch('modules/officials.php?action=save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officials: window.officials || [] })
    });
  } catch (err) {
    console.error('Failed to persist officials', err);
  }
}

// small helper to escape strings for safe HTML insertion
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Load officials from server on script load
async function loadOfficialsFromServer() {
  try {
    const resp = await fetch('modules/officials.php?action=list');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        window.officials = data;
        renderOfficials();
        return;
      }
    }
    window.officials = window.officials || [];
    renderOfficials();
  } catch (err) {
    console.error('Failed to load officials', err);
    window.officials = window.officials || [];
    renderOfficials();
  }
}

// Immediately try to load saved officials
loadOfficialsFromServer();
