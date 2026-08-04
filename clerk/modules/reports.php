<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  /* Reports grid */
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .report-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    box-shadow: var(--shadow);
    cursor: pointer;
  }

  .report-card:hover {
    background: var(--slate);
  }

  .report-icon {
    font-size: 28px;
    margin-bottom: 10px;
  }

  .report-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--navy);
    margin-bottom: 4px;
  }

  .report-desc {
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.4;
    margin-bottom: 12px;
  }
</style>
<div class="sec-head">
  <div class="sec-head-left">
    <h2>Reports & Export</h2>
    <p>Generate official barangay reports</p>
  </div>
</div>

<div class="reports-grid">
  <div class="report-card">
    <div class="report-icon">📜</div>
    <div class="report-name">Population Report</div>
    <div class="report-desc">Full demographic breakdown of barangay population</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px;">
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopGender" checked> Gender</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopAge" checked> Age Group</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopPWD" checked> PWD</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopSolo" checked> Solo Parent</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopVoters" checked> Voters</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkPopNonVoters" checked> Non-Voters</label>
    </div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary btn-sm"
        onclick="generateReport('Population Report', 'pdf')">📄 PDF</button><button class="btn btn-outline btn-sm"
        onclick="generateReport('Population Report', 'excel')">📊 Excel</button></div>
  </div>
  <div class="report-card">
    <div class="report-icon">🏘️</div>
    <div class="report-name">Household Report</div>
    <div class="report-desc">Summary of registered households and member counts</div>
    <div style="margin:10px 0;">
      <select id="hhReportPurok" class="filter-select" style="width:100%;">
        <option value="">All Puroks</option>
        <option>GEMELINA</option>
        <option>NARRA</option>
        <option>YAKAL</option>
        <option>ALMASIGA</option>
        <option>APITONG</option>
        <option>TUGAS</option>
        <option>TANGUILE</option>
        <option>MOLAVE</option>
        <option>LAWAAN</option>
        <option>ACASIA</option>
        <option>DAO</option>
        <option>KAMAGONG</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary btn-sm"
        onclick="generateReport('Household Report', 'pdf')">📄 PDF</button><button class="btn btn-outline btn-sm"
        onclick="generateReport('Household Report', 'excel')">📊 Excel</button></div>
  </div>
  <div class="report-card">
    <div class="report-icon">👥</div>
    <div class="report-name">Residents Report</div>
    <div class="report-desc">Complete list of registered residents with profiles and status</div>
    <div style="margin:10px 0;">
      <select id="resReportPurok" class="filter-select" style="width:100%;">
        <option value="">All Puroks</option>
        <option>GEMELINA</option>
        <option>NARRA</option>
        <option>YAKAL</option>
        <option>ALMASIGA</option>
        <option>APITONG</option>
        <option>TUGAS</option>
        <option>TANGUILE</option>
        <option>MOLAVE</option>
        <option>LAWAAN</option>
        <option>ACASIA</option>
        <option>DAO</option>
        <option>KAMAGONG</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary btn-sm"
        onclick="generateResidentsReport('pdf')">📄 PDF</button><button class="btn btn-outline btn-sm"
        onclick="generateResidentsReport('excel')">📊 Excel</button></div>
  </div>
  <div class="report-card">
    <div class="report-icon">🧾</div>
    <div class="report-name">Resident Category Report</div>
    <div class="report-desc">Filter residents by category and export the result</div>
    <div style="margin:10px 0;">
      <select id="resReportCategory" class="filter-select" style="width:100%;">
        <option value="">All Categories</option>
        <option value="Voter">Voter</option>
        <option value="Senior Citizen">Senior Citizen</option>
        <option value="PWD">PWD</option>
        <option value="Single Parent">Single Parent</option>
        <option value="Non-Voter">Non-Voter</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      <div id="residentCategoryLiveSummary" style="margin-top:8px;font-size:12px;color:var(--text-muted);">
        Waiting for resident data...
      </div>
    </div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary btn-sm"
        onclick="generateResidentCategoryReport('pdf')">📄 PDF</button><button class="btn btn-outline btn-sm"
        onclick="generateResidentCategoryReport('excel')">📊 Excel</button></div>
  </div>
  <div class="report-card">
    <div class="report-icon">📑</div>
    <div class="report-name">Certificate Report</div>
    <div class="report-desc">Summary of issued certificates and clearances</div>
    <div style="margin:10px 0;">
      <select id="certFilterTypeSelect" class="filter-select" style="width:100%; margin-bottom:8px;">
        <option value="">All Certificate Types</option>
        <option value="Barangay Clearance">Barangay Clearance</option>
        <option value="Certificate of Residency">Certificate of Residency</option>
        <option value="Indigency Certificate">Certificate of Indigency</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px;">
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkCertType" checked> Type Col</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkCertDate" checked> Date Col</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkCertTime" checked> Time Col</label>
      <label style="display:flex;align-items:center;gap:5px;color:var(--text-muted);cursor:pointer;"><input
          type="checkbox" id="chkCertPurpose" checked> Purpose Col</label>
    </div>
    <div style="display:flex;gap:8px;"><button class="btn btn-primary btn-sm"
        onclick="generateReport('Certificate Report', 'pdf')">📄 PDF</button><button class="btn btn-outline btn-sm"
        onclick="generateReport('Certificate Report', 'excel')">📊 Excel</button></div>
  </div>
</div>
