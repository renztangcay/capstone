/**
 * BACKUP & RESTORE MODULE
 * Connects to Supabase via the PHP API endpoint for export,
 * and uses the JS Supabase client for restore operations.
 */

let pendingRestoreData = null;
let pendingRestoreFile = null;

/* ── CREATE BACKUP (Export) ── */
async function createBackup() {
  const btn = document.getElementById('btnCreateBackup');
  const progress = document.getElementById('backupProgress');
  const bar = document.getElementById('backupBar');
  const progressText = document.getElementById('backupProgressText');
  const summary = document.getElementById('backupSummary');

  // Check which tables are selected
  const include = {
    residents: document.getElementById('bkpResidents')?.checked !== false,
    households: document.getElementById('bkpHouseholds')?.checked !== false,
    certificates: document.getElementById('bkpCerts')?.checked !== false,
    treasurer_transactions: document.getElementById('bkpTransactions')?.checked !== false,
    audit_logs: document.getElementById('bkpAuditLogs')?.checked !== false,
  };

  const selectedTables = [];
  if (include.residents) selectedTables.push('residents');
  if (include.households) selectedTables.push('households');
  if (include.certificates) selectedTables.push('certificates');
  if (include.treasurer_transactions) {
    selectedTables.push('treasurer_transactions');
    selectedTables.push('payments');
  }
  if (include.audit_logs) selectedTables.push('audit_logs');

  if (selectedTables.length === 0) {
    showToast('Please select at least one data table to back up.', 'error');
    return;
  }

  // Show progress
  if (btn) btn.disabled = true;
  if (progress) progress.style.display = 'block';
  if (summary) summary.style.display = 'none';
  if (bar) bar.style.width = '10%';
  if (progressText) progressText.textContent = 'Fetching data from database…';

  try {
    // Fetch data directly from Supabase via JS client
    const backupData = {};
    const tableList = selectedTables;
    let fetched = 0;

    for (const table of tableList) {
      if (bar) bar.style.width = `${10 + (fetched / tableList.length) * 70}%`;
      if (progressText) progressText.textContent = `Fetching ${table}…`;
      try {
        const rows = await window.supabaseClient.select(table, 'select=*');
        backupData[table] = Array.isArray(rows) ? rows : [];
      } catch (err) {
        console.warn(`Failed to fetch ${table}:`, err);
        backupData[table] = [];
      }
      fetched++;
    }

    // Check if there are any records to backup
    const totalRecords = Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0);
    if (totalRecords === 0) {
      if (progress) progress.style.display = 'none';
      if (btn) btn.disabled = false;
      showToast('There are no records to back up in the selected tables.', 'warning');
      return;
    }

    if (bar) bar.style.width = '85%';
    if (progressText) progressText.textContent = 'Preparing download…';

    // Build backup object
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const backupObj = {
      meta: {
        barangay: 'Barangay Central',
        created: now.toISOString(),
        version: '2.0',
        label: 'Manual Backup',
        counts: {},
      },
      data: backupData,
    };

    // Populate counts
    for (const [table, rows] of Object.entries(backupData)) {
      backupObj.meta.counts[table] = rows.length;
    }

    // Construct suffix based on selected options
    const suffixParts = [];
    if (include.residents) suffixParts.push('residents');
    if (include.households) suffixParts.push('households');
    if (include.certificates) suffixParts.push('certificates');
    if (include.treasurer_transactions) suffixParts.push('transactions');
    if (include.audit_logs) suffixParts.push('system-logs');
    const suffixStr = suffixParts.length > 0 ? suffixParts.join('-') : 'all';

    // Create and trigger JSON download
    const json = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brgy_backup_${dateStr}-${suffixStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Create and trigger Excel (CSV) download — one combined sheet for all selected tables
    const allCsvRows = [];
    for (const [table, rows] of Object.entries(backupData)) {
      if (rows && rows.length > 0) {
        allCsvRows.push([`## ${table.toUpperCase()} ##`]);
        const csvContent = convertTableToCSV(table, rows);
        allCsvRows.push(csvContent);
        allCsvRows.push('');   // blank line separator between tables
      }
    }
    if (allCsvRows.length > 0) {
      const csvBlob = new Blob([allCsvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `brgy_backup_${dateStr}-${suffixStr}.csv`;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);
    }

    if (bar) bar.style.width = '100%';
    if (progressText) progressText.textContent = 'Backup complete!';

    // Update summary stats
    const sizeKB = (json.length / 1024).toFixed(1);
    if (summary) {
      summary.style.display = 'flex';
      const setBS = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setBS('bsResidents', backupData.residents?.length || 0);
      setBS('bsHouseholds', backupData.households?.length || 0);
      setBS('bsCerts', backupData.certificates?.length || 0);
      setBS('bsTransactions', backupData.treasurer_transactions?.length || 0);
      setBS('bsAuditLogs', backupData.audit_logs?.length || 0);
    }

    // Update last backup info
    const lastInfo = document.getElementById('lastBackupInfo');
    const lastBackupLabel = `Last backup: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (${sizeKB} KB)`;
    if (lastInfo) {
      lastInfo.textContent = lastBackupLabel;
    }
    localStorage.setItem('bms_last_backup', JSON.stringify({
      when: now.toISOString(),
      label: lastBackupLabel,
      sizeKB,
    }));

    try {
      const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'system',
          record_id: 'backup-' + Date.now(),
          action_type: 'backup',
          fields: `Size: ${sizeKB} KB`,
          record_name: 'Database Backup',
          performed_by: currentUser
        });
      }
    } catch (e) { console.error('Backup log failed', e); }

    showToast(`Backup created successfully! (${sizeKB} KB)`, 'success');

    // Prompt to clear/remove the records from the live database now
    setTimeout(async () => {
      if (confirm(`Backup file downloaded successfully!\n\nDo you want to REMOVE/DELETE these backed up records from the live database now?\n\nThis will clear the selected tables: ${selectedTables.join(', ')}.`)) {
        if (progress) progress.style.display = 'block';
        if (bar) bar.style.width = '10%';
        if (progressText) progressText.textContent = 'Clearing database records…';

        try {
          const SUPABASE_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
          const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

          let deleted = 0;
          for (const table of selectedTables) {
            if (bar) bar.style.width = `${10 + (deleted / selectedTables.length) * 80}%`;
            if (progressText) progressText.textContent = `Clearing ${table}…`;

            // Delete all rows using id filter
            const delUrl = `${SUPABASE_URL}${encodeURIComponent(table)}?id=not.is.null`;
            const delRes = await fetch(delUrl, {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Prefer: 'return=minimal',
              },
            });
            if (!delRes.ok) {
              console.warn(`Failed to clear ${table}: HTTP ${delRes.status}`);
            }
            deleted++;
          }

          if (bar) bar.style.width = '100%';
          if (progressText) progressText.textContent = 'Database cleared!';
          showToast('Database records removed successfully!', 'success');

          // Reload local lists/data
          if (typeof loadAllResidents === 'function') loadAllResidents();
          if (typeof loadHouseholds === 'function') loadHouseholds();
          if (typeof loadCertificates === 'function') loadCertificates();
          if (typeof loadHouseholdsFromDb === 'function') await loadHouseholdsFromDb();
          if (typeof loadResidentsFromDb === 'function') await loadResidentsFromDb();
          if (typeof renderResidents === 'function') renderResidents();
          if (typeof renderHouseholds === 'function') renderHouseholds();
        } catch (delErr) {
          console.error('Failed to clear database records:', delErr);
          showToast('Failed to clear database tables.', 'error');
        } finally {
          setTimeout(() => {
            if (progress) progress.style.display = 'none';
          }, 2000);
        }
      } else {
        if (progress) progress.style.display = 'none';
      }
    }, 500);

  } catch (err) {
    console.error('Backup failed:', err);
    if (progressText) progressText.textContent = 'Backup failed!';
    showToast('Backup failed: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ── PREVIEW RESTORE ── */
function previewRestore(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showToast('Please select a valid .json backup file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validate backup structure
      if (!data.meta || !data.data) {
        showToast('Invalid backup file: missing meta or data fields.', 'error');
        return;
      }

      pendingRestoreData = data;
      pendingRestoreFile = file.name;

      // Update UI
      const preview = document.getElementById('restorePreview');
      const filename = document.getElementById('rpFilename');
      const meta = document.getElementById('rpMeta');
      const fileLabel = document.getElementById('restoreFileName');
      const restoreSummary = document.getElementById('restoreSummary');

      if (filename) filename.textContent = file.name;
      if (fileLabel) fileLabel.textContent = '✅ ' + file.name;

      // Show meta info
      const created = data.meta.created ? new Date(data.meta.created).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Unknown';
      const version = data.meta.version || '—';
      const label = data.meta.label || '—';
      if (meta) meta.textContent = `Created: ${created} · Version: ${version} · Label: ${label}`;

      // Show record counts
      if (restoreSummary) {
        const counts = data.meta.counts || {};
        const tables = Object.keys(data.data);
        restoreSummary.innerHTML = tables.map(t => {
          const count = counts[t] || (Array.isArray(data.data[t]) ? data.data[t].length : 0);
          const label = t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `<div class="backup-stat">
            <div class="bs-value">${count}</div>
            <div class="bs-label">${label}</div>
          </div>`;
        }).join('');
      }

      if (preview) preview.style.display = 'block';
      showToast('Backup file validated. Review and click Restore.', 'success');

    } catch (err) {
      showToast('Invalid backup file: ' + err.message, 'error');
      pendingRestoreData = null;
    }
  };
  reader.readAsText(file);
}

/* ── DRAG & DROP HANDLER ── */
function handleRestoreDrop(e) {
  e.preventDefault();
  const dropZone = document.getElementById('restoreDropZone');
  if (dropZone) dropZone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (!file) return;

  // Set the file to the input and trigger preview
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('backupFile').files = dt.files;
  } catch (ex) { /* older browsers */ }

  previewRestore(document.getElementById('backupFile'));
}

/* ── CANCEL RESTORE ── */
function cancelRestore() {
  pendingRestoreData = null;
  pendingRestoreFile = null;

  const preview = document.getElementById('restorePreview');
  const fileLabel = document.getElementById('restoreFileName');
  const fileInput = document.getElementById('backupFile');

  if (preview) preview.style.display = 'none';
  if (fileLabel) fileLabel.textContent = 'Click to select or drag & drop backup file (.json)';
  if (fileInput) fileInput.value = '';
}

/* ── CONFIRM RESTORE ── */
async function confirmRestore() {
  if (!pendingRestoreData) {
    showToast('No backup file loaded.', 'error');
    return;
  }

  const order = ['residents', 'households', 'payments', 'treasurer_transactions', 'certificates', 'audit_logs'];
  const tableNames = Object.keys(pendingRestoreData.data).sort((a, b) => {
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    const valA = idxA === -1 ? 99 : idxA;
    const valB = idxB === -1 ? 99 : idxB;
    return valA - valB;
  });
  const totalRecords = tableNames.reduce((sum, t) => {
    return sum + (Array.isArray(pendingRestoreData.data[t]) ? pendingRestoreData.data[t].length : 0);
  }, 0);

  if (!confirm(
    `⚠️ RESTORE WARNING\n\n` +
    `This will overwrite ALL data in the following tables:\n` +
    `${tableNames.map(t => '  • ' + t).join('\n')}\n\n` +
    `Total records to restore: ${totalRecords}\n\n` +
    `This action CANNOT be undone. Are you sure?`
  )) return;

  // Double confirm for safety
  if (!confirm('Are you absolutely sure? All current data will be replaced.')) return;

  const progress = document.getElementById('restoreProgress');
  const bar = document.getElementById('restoreBar');
  const progressText = document.getElementById('restoreProgressText');

  if (progress) progress.style.display = 'block';
  if (bar) bar.style.width = '5%';
  if (progressText) progressText.textContent = 'Starting restore…';

  try {
    let completed = 0;

    for (const table of tableNames) {
      const rows = pendingRestoreData.data[table];
      if (!Array.isArray(rows)) continue;

      const pct = Math.round(5 + (completed / tableNames.length) * 90);
      if (bar) bar.style.width = pct + '%';
      if (progressText) progressText.textContent = `Restoring ${table} (${rows.length} records)…`;

      // Step 1: Delete all existing rows in this table
      // We need to delete using a filter that matches all rows
      // Using a broad filter: id != impossible value
      try {
        const SUPABASE_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co/rest/v1/';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

        // Delete all rows using id filter
        const delUrl = `${SUPABASE_URL}${encodeURIComponent(table)}?id=not.is.null`;
        const delRes = await fetch(delUrl, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
          },
        });

        if (!delRes.ok) {
          console.warn(`Failed to clear ${table}: HTTP ${delRes.status}`);
        }
      } catch (delErr) {
        console.warn(`Error clearing ${table}:`, delErr);
      }

      // Step 2: Insert rows in batches (Supabase has limits)
      if (rows.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          try {
            await window.supabaseClient.insert(table, batch);
          } catch (insertErr) {
            console.warn(`Error inserting batch into ${table}:`, insertErr);
          }
        }
      }

      completed++;
    }

    if (bar) bar.style.width = '100%';
    if (progressText) progressText.textContent = 'Restore complete!';

    try {
      const currentUser = (document.querySelector('.user-role')?.textContent || document.querySelector('.user-name')?.textContent || 'Admin').trim();
      if (window.supabaseClient && typeof window.supabaseClient.insert === 'function') {
        await window.supabaseClient.insert('audit_logs', {
          record_table: 'system',
          record_id: 'restore-' + Date.now(),
          action_type: 'restore',
          fields: `Restored ${tableNames.length} tables`,
          record_name: 'Database Restore',
          performed_by: currentUser
        });
      }
    } catch (e) { console.error('Restore log failed', e); }

    showToast('Data restored successfully! Refreshing…', 'success');

    // Reset UI
    cancelRestore();

    // Reload data in app
    setTimeout(() => {
      if (progress) progress.style.display = 'none';
      // Trigger app data reload
      if (typeof loadAllResidents === 'function') loadAllResidents();
      if (typeof loadHouseholds === 'function') loadHouseholds();
      if (typeof loadCertificates === 'function') loadCertificates();
    }, 2000);

  } catch (err) {
    console.error('Restore failed:', err);
    if (progressText) progressText.textContent = 'Restore failed!';
    showToast('Restore failed: ' + err.message, 'error');
  }
}

// Expose to global scope
window.createBackup = createBackup;
window.previewRestore = previewRestore;
window.handleRestoreDrop = handleRestoreDrop;
window.cancelRestore = cancelRestore;
window.confirmRestore = confirmRestore;

window.loadLastBackupInfo = function () {
  const lastInfo = document.getElementById('lastBackupInfo');
  if (!lastInfo) return;
  const stored = localStorage.getItem('bms_last_backup');
  if (!stored) {
    lastInfo.textContent = 'Last backup: Never';
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed && parsed.label) {
      lastInfo.textContent = parsed.label;
    } else {
      lastInfo.textContent = 'Last backup: Never';
    }
  } catch (e) {
    console.warn('Failed to parse last backup info', e);
    lastInfo.textContent = 'Last backup: Never';
  }
};

function convertTableToCSV(table, rows) {
  if (!rows || rows.length === 0) return '';

  // Get all unique keys across all rows to be headers
  const headers = [];
  rows.forEach(row => {
    Object.keys(row).forEach(k => {
      if (!headers.includes(k)) headers.push(k);
    });
  });

  const csvRows = [];
  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of rows) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      // Escape quotes and double-quote cell
      return '"' + String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
