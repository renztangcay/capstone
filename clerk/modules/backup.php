<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
.upload-zone { border: 2px dashed var(--border); border-radius: 10px; padding: 36px; text-align: center; cursor: pointer; transition: border-color 0.18s, background 0.18s; }
.upload-zone:hover, .upload-zone.dragover { border-color: var(--sky); background: var(--sky-dim); }
.upload-icon { font-size: 36px; opacity: 0.35; margin-bottom: 10px; }
.upload-text { font-size: 14px; color: var(--text-muted); }
.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
.backup-summary { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; }
.backup-stat { background: var(--slate); border-radius: 8px; padding: 10px 16px; text-align: center; flex: 1; min-width: 110px; }
.backup-stat .bs-value { font-size: 22px; font-weight: 700; color: var(--navy); line-height: 1.2; }
.backup-stat .bs-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.restore-preview { display: none; margin-top: 16px; padding: 16px; border-radius: 8px; background: var(--slate); border: 1px solid var(--border); }
.restore-preview .rp-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.restore-preview .rp-filename { font-weight: 600; color: var(--navy); font-size: 14px; }
.restore-preview .rp-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.restore-preview .rp-actions { display: flex; gap: 10px; }
.table-selector { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
.table-selector label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-mid); cursor: pointer; }
.table-selector input[type="checkbox"] { accent-color: var(--gold); width: 16px; height: 16px; }
.backup-progress { display: none; margin-top: 14px; }
.backup-progress .bp-bar-bg { width: 100%; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.backup-progress .bp-bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--sky)); border-radius: 4px; transition: width 0.3s ease; width: 0%; }
.backup-progress .bp-text { font-size: 12px; color: var(--text-muted); margin-top: 6px; text-align: center; }
</style>

<div class="sec-head">
  <div class="sec-head-left">
    <h2>Backup &amp; Restore</h2>
    <p>Protect and recover your barangay data</p>
  </div>
</div>

<div class="backup-grid">
  <!-- DATA BACKUP CARD -->
  <div class="card">
    <div style="padding:20px;">
      <h4 style="margin-bottom:4px;display:flex;align-items:center;gap:8px;">📦 Data Backup</h4>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Download a complete copy of all barangay records in JSON format and remove/clear them from the active database.</p>
      <div class="table-selector">
        <label><input type="checkbox" id="bkpResidents" checked> Residents</label>
        <label><input type="checkbox" id="bkpHouseholds" checked> Households</label>
        <label><input type="checkbox" id="bkpCerts" checked> Certificates</label>
        <label><input type="checkbox" id="bkpTransactions" checked> Transactions</label>
        <label><input type="checkbox" id="bkpAuditLogs" checked> System Logs</label>
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:12px;">
        <button class="btn btn-primary" id="btnCreateBackup" onclick="createBackup()">
          <i class="bi bi-download"></i> Download Backup File
        </button>
        <div style="font-size:12px;color:var(--text-muted);" id="lastBackupInfo">Last backup: Never</div>
      </div>
      <script>window.loadLastBackupInfo?.();</script>
      <div class="backup-progress" id="backupProgress">
        <div class="bp-bar-bg"><div class="bp-bar" id="backupBar"></div></div>
        <div class="bp-text" id="backupProgressText">Preparing backup…</div>
      </div>
      <div class="backup-summary" id="backupSummary" style="display:none;">
        <div class="backup-stat"><div class="bs-value" id="bsResidents">0</div><div class="bs-label">Residents</div></div>
        <div class="backup-stat"><div class="bs-value" id="bsHouseholds">0</div><div class="bs-label">Households</div></div>
        <div class="backup-stat"><div class="bs-value" id="bsCerts">0</div><div class="bs-label">Certificates</div></div>
        <div class="backup-stat"><div class="bs-value" id="bsTransactions">0</div><div class="bs-label">Transactions</div></div>
        <div class="backup-stat"><div class="bs-value" id="bsAuditLogs">0</div><div class="bs-label">System Logs</div></div>
      </div>
    </div>
  </div>

  <!-- RESTORE CARD -->
  <div class="card">
    <div style="padding:20px;">
      <h4 style="margin-bottom:4px;display:flex;align-items:center;gap:8px;">📤 Restore System</h4>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Upload a previously saved backup file to restore data. <strong style="color:var(--red);">Warning:</strong> This will overwrite current records in the selected tables.</p>
      <div class="upload-zone" id="restoreDropZone"
           onclick="document.getElementById('backupFile').click()"
           ondragover="event.preventDefault();this.classList.add('dragover')"
           ondragleave="this.classList.remove('dragover')"
           ondrop="handleRestoreDrop(event)">
        <div class="upload-icon">📄</div>
        <div class="upload-text" id="restoreFileName">Click to select or drag &amp; drop backup file (.json)</div>
        <input type="file" id="backupFile" style="display:none" accept=".json" onchange="previewRestore(this)">
      </div>
      <div class="restore-preview" id="restorePreview">
        <div class="rp-header"><span style="font-size:18px;">✅</span><span class="rp-filename" id="rpFilename">backup.json</span></div>
        <div class="rp-meta" id="rpMeta">—</div>
        <div class="backup-summary" id="restoreSummary" style="margin-bottom:14px;"></div>
        <div class="rp-actions">
          <button class="btn btn-primary" onclick="confirmRestore()"><i class="bi bi-arrow-counterclockwise"></i> Restore Data</button>
          <button class="btn btn-outline" onclick="cancelRestore()">Cancel</button>
        </div>
      </div>
      <div class="backup-progress" id="restoreProgress">
        <div class="bp-bar-bg"><div class="bp-bar" id="restoreBar"></div></div>
        <div class="bp-text" id="restoreProgressText">Restoring data…</div>
      </div>
    </div>
  </div>
</div>
