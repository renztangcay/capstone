<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  .sub-panel { display: none; }
  .sub-panel.active { display: block; animation: panelIn 0.2s ease; }
  @keyframes panelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px; flex-wrap: wrap; }
  .breadcrumb a { color: var(--sky); cursor: pointer; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .hhr-paper { background: #fff; padding: 50px; max-width: 1400px; margin: 0 auto; font-family: "Arial", sans-serif; color: #000; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; }
  .hhr-form-id { position: absolute; top: 30px; left: 50px; font-size: 11px; font-weight: bold; }
  .hhr-main-title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 10px; margin-bottom: 30px; letter-spacing: 1px; }
  .hhr-meta-section { width: 450px; margin-bottom: 30px; }
  .hhr-meta-item { display: grid; grid-template-columns: 200px 1fr; align-items: flex-end; margin-bottom: 6px; font-size: 11px; font-weight: bold; }
  .hhr-meta-line { border-bottom: 1px solid #000; min-height: 18px; padding: 0 5px; }
  .hhr-table-wrap { overflow-x: auto; margin-bottom: 30px; border: 1px solid #000; }
  .hhr-table { width: 100%; border-collapse: collapse; }
  .hhr-table th, .hhr-table td { border: 1px solid #000; padding: 5px; font-size: 10px; text-align: center; vertical-align: middle; }
  .hhr-table th { background: #d9ead3; font-weight: bold; text-transform: uppercase; line-height: 1.2; }
  .hhr-input-clean { border: none; outline: none; width: 100%; text-align: center; font-size: 13px; font-weight: bold; background: transparent; color: #000; font-family: "Dancing Script", cursive, Arial; white-space: pre-wrap; word-break: break-word; min-height: 1.2em; display: block; }
  @media print { .no-print { display: none !important; } }
  .hhr-footer-paper { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 40px; }
  .hhr-sig-item { display: flex; gap: 10px; }
  .hhr-sig-label { font-size: 11px; font-weight: bold; white-space: nowrap; }
  .hhr-sig-area { flex: 1; text-align: center; }
  .hhr-sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; min-height: 30px; }
  .hhr-sig-name { font-size: 11px; font-weight: bold; }
  .hhr-sig-sub { font-size: 10px; }
  .hhr-disclaimer-paper { font-size: 9.5px; text-align: justify; line-height: 1.4; margin-top: 50px; color: #333; }

  /* ══════════════════ DARK MODE OVERRIDES ══════════════════ */
  /* Keep the paper white/original — only fix text & hover color visibility */
  [data-theme="dark"] .hhr-table tbody tr:hover td,
  [data-theme="dark"] .hhr-table tbody tr:hover {
    background: #fff !important;
    color: #111 !important;
  }
  [data-theme="dark"] .hhr-table td {
    background: #fff !important;
    color: #111 !important;
  }
  [data-theme="dark"] .hhr-table input,
  [data-theme="dark"] .hhr-table select,
  [data-theme="dark"] .hhr-table textarea {
    color: #111 !important;
  }
  [data-theme="dark"] .hhr-input-clean {
    color: #111 !important;
  }
  [data-theme="dark"] .hhr-table input:hover,
  [data-theme="dark"] .hhr-table select:hover,
  [data-theme="dark"] .hhr-table input:focus,
  [data-theme="dark"] .hhr-table select:focus {
    color: #111 !important;
  }
</style>

<!-- List Panel -->
<div class="sub-panel active" id="hh-list">
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Household Management</h2>
      <p>RBI Form A - Official Records</p>
    </div>
    <!-- Clerk: NO Add Household button -->
  </div>
  <div class="filter-bar">
    <input class="filter-input" placeholder="🔍 Search household head..." id="hhSearch" oninput="applyHHFilters()" style="flex:1">
    <select class="filter-select" id="hhStatusFilter" onchange="applyHHFilters()">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="archived">Archived</option>
    </select>
    <select class="filter-select" id="hhPurokFilter" onchange="applyHHFilters()">
      <option value="">All Puroks</option>
      <option>GEMELINA</option><option>NARRA</option><option>YAKAL</option><option>ALMASIGA</option>
      <option>APITONG</option><option>TUGAS</option><option>TANGUILE</option><option>MOLAVE</option>
      <option>LAWAAN</option><option>ACASIA</option><option>DAO</option><option>KAMAGONG</option>
    </select>
  </div>
  <div class="card">
    <div class="table-wrap">
      <table class="responsive-table" id="householdTable">
        <thead>
          <tr><th>Head Name</th><th>Purok</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody id="householdBody"></tbody>
      </table>
    </div>
    <div id="householdPagination" tabindex="0" role="navigation" aria-label="Household pagination" style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;gap:12px;flex-wrap:wrap;"></div>
  </div>
</div>

<!-- Form Panel (RBI Form A — view only for Clerk) -->
<div class="sub-panel" id="hh-form">
  <div class="breadcrumb">
    <a onclick="window.showHHSubPanel('hh-list')">Household</a> › <span id="hhFormBreadcrumb">RBI Form A Record</span>
  </div>
  <div class="sec-head">
    <div class="sec-head-left">
      <h2 id="hhFormTitle">Household Record Detail</h2>
      <p>Official RBI Form A (Revised 2024)</p>
    </div>
    <div class="sec-head-actions">
      <button class="btn btn-outline btn-sm" onclick="window.showHHSubPanel('hh-list')">← Back</button>
      <div style="display:flex; align-items:center; gap:8px; background:var(--slate); padding:4px 10px; border-radius:6px; border:1px solid var(--border);">
        <span style="font-size:11px; font-weight:600; color:var(--text-muted);">PUROK:</span>
        <select class="filter-select" id="hhPurokInput" style="padding:2px 5px; font-size:12px; border:none; background:transparent;">
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
      <button class="btn btn-primary btn-sm" onclick="addHHRow()">✚ Add Member</button>
      <button class="btn btn-primary btn-sm" onclick="const oldT=document.title; document.title=' '; window.print(); document.title=oldT;">🖨 Print RBI Form A</button>
      <button class="btn btn-gold btn-sm" onclick="saveHousehold()">💾 Save Record</button>
    </div>
  </div>

  <div class="hhr-paper">
    <div class="hhr-form-id">RBI FORM A (Revised 2024)</div>
    <div class="hhr-main-title">RECORDS OF BARANGAY INHABITANTS BY HOUSEHOLD</div>

    <div class="hhr-meta-section">
      <div class="hhr-meta-item"><span>REGION :</span>
        <div class="hhr-meta-line">REGION IX</div>
      </div>
      <div class="hhr-meta-item"><span>PROVINCE :</span>
        <div class="hhr-meta-line">ZAMBOANGA DEL NORTE</div>
      </div>
      <div class="hhr-meta-item"><span>CITY/MUNICIPALITY :</span>
        <div class="hhr-meta-line">CITY OF DIPOLOG</div>
      </div>
      <div class="hhr-meta-item"><span>BARANGAY :</span>
        <div class="hhr-meta-line">CENTRAL</div>
      </div>
      <div class="hhr-meta-item"><span>HOUSEHOLD ADDRESS :</span>
        <div class="hhr-meta-line">
          <div contenteditable="true" class="hhr-input-clean" id="hhAddressInput" style="text-align:left; font-family:Arial; font-size:11px;"></div>
        </div>
      </div>
      <div class="hhr-meta-item"><span>NO. OF HOUSEHOLD MEMBERS :</span>
        <div class="hhr-meta-line"><input class="hhr-input-clean" id="hhMemberCount" readonly style="width:40px; font-family:Arial; font-size:11px;"></div>
      </div>
    </div>

    <div class="hhr-table-wrap">
      <table class="hhr-table">
        <thead>
          <tr>
            <th rowspan="2">#</th>
            <th colspan="4">NAME</th>
            <th rowspan="2">PLACE OF BIRTH</th>
            <th rowspan="2">DATE OF BIRTH</th>
            <th rowspan="2">AGE</th>
            <th rowspan="2">SEX</th>
            <th rowspan="2">CIVIL STATUS</th>
            <th rowspan="2">CITIZENSHIP</th>
            <th rowspan="2">OCCUPATION</th>
            <th rowspan="2" style="width: 20%; font-size: 8px; font-weight: normal; text-transform: none;">
              Indicate if Labor/employed, Unemployed, PWD, OFW, Solo Parent,<br> Out of School Youth (OSY), Out of School
              Children (OSC) and/or IP
            </th>
            <th rowspan="2" class="no-print" style="width: 40px; font-size: 8px;">ACTION</th>
          </tr>
          <tr>
            <th style="font-size: 8px;">LAST NAME</th>
            <th style="font-size: 8px;">FIRST NAME</th>
            <th style="font-size: 8px;">MIDDLE NAME</th>
            <th style="font-size: 8px; width: 40px; padding: 0 4px;">EXT</th>
          </tr>
        </thead>
        <tbody id="hhTableBody"></tbody>
      </table>
    </div>

    <div class="hhr-footer-paper">
      <div class="hhr-sig-item">
          <div class="hhr-sig-label">Name of Household/Head Member</div>
          <div class="hhr-sig-area">
              <div id="hhSigPreparedLine" class="hhr-sig-line" contenteditable="true" style="outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; padding-top: 10px; display: flex; align-items: flex-end; justify-content: center;"></div>
              <div id="hhSigPreparedName" class="hhr-sig-name"></div>
            <div class="hhr-sig-sub">(Signature over Printed Name)</div>
          </div>
        </div>
        <div class="hhr-sig-item">
          <div class="hhr-sig-label">Barangay Secretary</div>
          <div class="hhr-sig-area">
            <div id="hhSigSecretaryLine" class="hhr-sig-line" contenteditable="true" style="outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; padding-top: 10px; display: flex; align-items: flex-end; justify-content: center;"></div>
            <div id="hhSigSecretaryName" class="hhr-sig-name"></div>
            <div class="hhr-sig-sub">(Signature over Printed Name)</div>
          </div>
        </div>
        <div class="hhr-sig-item">
          <div class="hhr-sig-label">Punong Barangay</div>
          <div class="hhr-sig-area">
            <div id="hhSigPunongLine" class="hhr-sig-line" contenteditable="true" style="outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; padding-top: 10px; display: flex; align-items: flex-end; justify-content: center;"></div>
            <div id="hhSigPunongName" class="hhr-sig-name"></div>
            <div class="hhr-sig-sub">(Signature over Printed Name)</div>
          </div>
        </div>
    </div>

    <div class="hhr-disclaimer-paper">
      I hereby certify that the above information are true and correct to the best of my knowledge. I understand that for the Barangay to carry out its mandate pursuant to Section 394 (d)(6) of the Local Government Code of 1991, they must necessarily process my personal information for easy identification of inhabitants, as a tool in planning, and as an updated reference in the number of inhabitants of the Barangay. Therefore, I grant my consent and recognize the authority of the Barangay to process my personal information, subject to the provision of the Philippine Data Privacy Act of 2012.
    </div>
  </div>
</div>
