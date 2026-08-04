<?php include __DIR__ . '/../includes/db.php'; ?>
<!-- Residents module for Clerk — VIEW ONLY (no Add Resident button) -->
<style>
  .sub-panel { display: none; }
  .sub-panel.active { display: block; animation: panelIn 0.2s ease; }
  @keyframes panelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px; flex-wrap: wrap; }
  .breadcrumb a { color: var(--sky); cursor: pointer; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .ird-paper { background: #fff; border: 1px solid #333; padding: 40px; max-width: 900px; margin: 0 auto; font-family: "Arial", sans-serif; color: #000; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
  .ird-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .ird-header-top .form-id { font-size: 14px; font-weight: bold; }
  .ird-header-top .form-title { font-size: 16px; font-weight: bold; text-align: center; flex: 1; text-transform: uppercase; }
  .ird-loc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; margin-bottom: 25px; }
  .ird-loc-item { display: flex; align-items: flex-end; gap: 10px; }
  .ird-loc-label { font-size: 11px; font-weight: bold; text-transform: uppercase; width: 100px; }
  .ird-loc-line { flex: 1; border-bottom: 1px solid #000; height: 20px; }
  .ird-section-box { border: 3px solid #333; padding: 20px; margin-bottom: 20px; box-sizing: border-box; width: 100%; }
  .ird-section-title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 20px; text-transform: uppercase; }
  .ird-field-box { border: 1px solid #333; padding: 5px 10px; min-height: 35px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-sizing: border-box; }
  .ird-field-sub { font-size: 10px; text-align: center; margin-top: 4px; color: #333; }
  .ird-input-clean { border: none; outline: none; width: 100%; text-align: center; font-size: 16px; font-weight: bold; background: transparent; color: #000; font-family: "Dancing Script", cursive, Arial; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; min-height: 1.2em; display: block; }
  .ird-row { display: grid; gap: 10px; margin-bottom: 15px; width: 100%; box-sizing: border-box; }
  .ird-grid-4 { grid-template-columns: 1.2fr 0.8fr 1fr 1fr; }
  .ird-grid-5 { grid-template-columns: 1fr 1.5fr 0.4fr 1fr 1.2fr; }
  .ird-grid-2 { grid-template-columns: 2fr 1fr; }
  .ird-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .ird-edu-title { font-weight: bold; font-size: 12px; margin-right: 10px; }
  .ird-edu-options { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin: 15px 0; }
  .ird-edu-item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
  .ird-disclaimer { font-size: 11px; line-height: 1.4; text-align: justify; margin: 25px 0; }
  .ird-sig-area { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 30px; margin-top: 40px; }
  .ird-sig-col { display: flex; flex-direction: column; align-items: center; }
  .ird-sig-line { width: 100%; border-top: 1px solid #000; margin-top: 40px; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold; }
  .ird-thumb-box { width: 100px; height: 100px; border: 1px solid #333; margin-bottom: 5px; }
  .ird-thumb-label { font-size: 11px; font-weight: bold; text-align: center; }
  /* Hide required indicators when printing */
  @media print {
    .ird-field-sub span[style*="color:#ef4444"] { display: none !important; }
  }
</style>

<div class="sub-panel active" id="res-list">
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Resident Management</h2>
      <p id="res-count">0 registered residents</p>
    </div>
    <!-- Clerk: No Add Resident button (read-only portal) -->
  </div>
  <div class="filter-bar">
    <input class="filter-input" placeholder="🔍 Search name or address..." id="resSearch" oninput="filterResidents(this.value)" style="flex:1;min-width:200px">
    <select class="filter-select" id="resStatusFilter" onchange="applyResidentFilters()">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="archived">Archived</option>
    </select>
    <select class="filter-select" id="resPurokFilter" onchange="applyResidentFilters()">
      <option value="">All Puroks</option>
      <option>GEMELINA</option><option>NARRA</option><option>YAKAL</option><option>ALMASIGA</option>
      <option>APITONG</option><option>TUGAS</option><option>TANGUILE</option><option>MOLAVE</option>
      <option>LAWAAN</option><option>ACASIA</option><option>DAO</option><option>KAMAGONG</option>
    </select>
    <select class="filter-select" id="resCatFilter" onchange="applyResidentFilters()">
      <option value="">All Categories</option>
      <option>Voter</option><option>Senior</option><option>PWD</option><option>Single Parent</option><option>Non-Voter</option>
    </select>
  </div>
  <div class="card">
    <div class="table-wrap">
      <table class="responsive-table" id="residentsTable">
        <thead>
          <tr><th>Name</th><th>Age</th><th>Purok</th><th>Categories</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody id="residentsBody"></tbody>
      </table>
    </div>
    <div id="residentsPagination" tabindex="0" role="navigation" aria-label="Residents pagination" style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;gap:12px;flex-wrap:wrap;"></div>
  </div>
</div>

<div class="sub-panel" id="res-individual">
  <div class="breadcrumb">
    <a onclick="showSubPanel('res-list')">Residents</a> › <span>Individual Record</span>
  </div>
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Individual Resident Record</h2>
      <p>BLGU Official Form - Barangay Central</p>
    </div>
    <div class="sec-head-actions">
      <button class="btn btn-outline" onclick="showSubPanel('res-list')">⬅ Back to List</button>
      <button class="btn btn-gold" onclick="saveResident()">💾 Save Individual Record</button>
      <button class="btn btn-primary" onclick="const oldT=document.title; document.title=' '; window.print(); document.title=oldT;">🖨 Print RBI Form B</button>
    </div>
  </div>

  <div class="ird-paper">
    <div class="ird-header-top">
      <div class="form-id">RBI Form B (Revised 2024)</div>
      <div class="form-title">Individual Records of Barangay Inhabitant</div>
      <div style="width: 150px;"></div>
    </div>

    <div class="ird-loc-grid">
      <div class="ird-loc-item">
        <span class="ird-loc-label">Region</span>
        <div class="ird-loc-line" style="text-align:center; font-weight:bold;">REGION IX</div>
      </div>
      <div class="ird-loc-item">
        <span class="ird-loc-label">City/Mun</span>
        <div class="ird-loc-line" style="text-align:center; font-weight:bold;">CITY OF DIPOLOG</div>
      </div>
      <div class="ird-loc-item">
        <span class="ird-loc-label">Province</span>
        <div class="ird-loc-line" style="text-align:center; font-weight:bold;">ZAMBOANGA DEL NORTE</div>
      </div>
      <div class="ird-loc-item">
        <span class="ird-loc-label">Barangay</span>
        <div class="ird-loc-line" style="text-align:center; font-weight:bold;">CENTRAL</div>
      </div>
    </div>

    <div class="ird-section-box">
      <div class="ird-section-title">Personal Information</div>

      <div style="width: 250px; margin-bottom: 20px;">
        <div class="ird-field-box">
          <div contenteditable="true" class="ird-input-clean" id="ird-philsys"></div>
        </div>
        <div class="ird-field-sub">(PhilSys Card No.)</div>
      </div>

      <div class="ird-row ird-grid-4">
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-last"></div>
          </div>
          <div class="ird-field-sub">(Last Name) <span style="color:#ef4444;">*</span></div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-suffix"></div>
          </div>
          <div class="ird-field-sub">(Suffix, e.g., Jr., I, II, III)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-first"></div>
          </div>
          <div class="ird-field-sub">(First Name) <span style="color:#ef4444;">*</span></div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-middle"></div>
          </div>
          <div class="ird-field-sub">(Middle Name)</div>
        </div>
      </div>

      <div class="ird-row ird-grid-5">
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-dob"></div>
          </div>
          <div class="ird-field-sub">(Birth Date: mm/dd/yyyy)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-pob"></div>
          </div>
          <div class="ird-field-sub">(Birth Place)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-sex"></div>
          </div>
          <div class="ird-field-sub">(Sex)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-civil"></div>
          </div>
          <div class="ird-field-sub">(Civil Status)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-religion"></div>
          </div>
          <div class="ird-field-sub">(Religion)</div>
        </div>
      </div>

      <div class="ird-row ird-grid-2">
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-address"></div>
          </div>
          <div class="ird-field-sub">(Residence Address)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-citizen"></div>
          </div>
          <div class="ird-field-sub">(Citizenship)</div>
        </div>
      </div>

      <div class="ird-row ird-grid-3">
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-occ"></div>
          </div>
          <div class="ird-field-sub">(Profession / Occupation)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-contact"></div>
          </div>
          <div class="ird-field-sub">(Contact Number)</div>
        </div>
        <div>
          <div class="ird-field-box">
            <div contenteditable="true" class="ird-input-clean" id="ird-email"></div>
          </div>
          <div class="ird-field-sub">(E-mail Address)</div>
        </div>
      </div>

      <div class="ird-edu-area">
        <span class="ird-edu-title">HIGHEST EDUCATIONAL ATTAINMENT:</span>
        <div class="ird-edu-options">
          <label class="ird-edu-item"><input type="checkbox" id="edu-elem"> ELEMENTARY</label>
          <label class="ird-edu-item"><input type="checkbox" id="edu-hs"> HIGH SCHOOL</label>
          <label class="ird-edu-item"><input type="checkbox" id="edu-coll"> COLLEGE</label>
          <label class="ird-edu-item"><input type="checkbox" id="edu-pg"> POST GRAD</label>
          <label class="ird-edu-item"><input type="checkbox" id="edu-voc"> VOCATIONAL</label>
        </div>
        <div style="display:flex; align-items:center; gap:20px; font-size:11px; margin-left:140px;">
          <span>Please specify:</span>
          <label class="ird-edu-item"><input type="checkbox" id="edu-grad"> Graduate</label>
          <label class="ird-edu-item"><input type="checkbox" id="edu-ug"> Under Graduate</label>
        </div>
      </div>

      <div class="ird-disclaimer">
        I hereby certify that the above information is true and correct to the best of my knowledge. I understand that
        for the Barangay to carry out its mandate pursuant to Section 394 (d)(6) of the Local Government Code of 1991,
        they must necessarily process my personal information for easy identification of inhabitants, as a tool in
        planning, and as an updated reference in the number of inhabitants of the Barangay. Therefore, I grant my
        consent and recognize the authority of the Barangay to process my personal information, subject to the provision
        of the Philippine Data Privacy Act of 2012.
      </div>

      <div class="ird-sig-area">
        <div class="ird-sig-col" style="justify-content: flex-end;">
          <div contenteditable="true" id="ird-date" style="width: 100%; border-bottom: 1px solid #000; min-height: 25px; outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; text-align: center; margin-top:20px; display: flex; align-items: flex-end; justify-content: center;"></div>
          <div style="width: 100%; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold;">Date Accomplished</div>
        </div>
        <div class="ird-sig-col" style="grid-column: span 2; justify-content: flex-end;">
          <div contenteditable="true" id="ird-accomplisher" style="width: 100%; border-bottom: 1px solid #000; min-height: 25px; outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; text-align: center; margin-top: 20px; display: flex; align-items: flex-end; justify-content: center;"></div>
          <div style="width: 100%; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold;">Name/Signature of Person Accomplishing the Form</div>
        </div>
      </div>

      <div class="ird-sig-area" style="margin-top: 30px;">
        <div class="ird-sig-col" style="justify-content: flex-end;">
          <div style="align-self: flex-start; font-size: 11px; font-weight: bold; margin-bottom: 10px;">Attested By:</div>
          <div contenteditable="true" id="ird-secretary" style="width: 100%; border-bottom: 1px solid #000; min-height: 25px; outline: none; font-weight: bold; font-size: 14px; text-transform: uppercase; text-align: center; display: flex; align-items: flex-end; justify-content: center;"></div>
          <div style="width: 100%; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold;">Barangay Secretary</div>
        </div>
        <div class="ird-sig-col">
          <div class="ird-thumb-box"></div>
          <div class="ird-thumb-label">Left Thumbmark</div>
        </div>
        <div class="ird-sig-col">
          <div class="ird-thumb-box"></div>
          <div class="ird-thumb-label">Right Thumbmark</div>
        </div>
      </div>

      <div style="margin-top: 30px;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: bold;">
          Household Number: 
          <div contenteditable="true" id="ird-household" style="border: 1px solid #111; width: 140px; height: 20px; padding: 0 4px; font-weight: normal; background: transparent; outline: none;"></div>
        </div>
        <div style="margin-top: 6px; font-size: 11px; font-style: italic;">Note: The household number: shall be filled up by the Barangay Secretary.</div>
      </div>
    </div>
  </div>
</div>

<!-- Edit Resident Modal -->
<div class="modal-overlay" id="modal-edit-resident">
  <div class="modal modal-xl" style="margin-top: 150px;">
    <div class="modal-header">
      <h3>Edit Resident Information</h3>
      <button class="modal-close" onclick="closeModal('modal-edit-resident')">✖</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="editResId">
      <div class="form-group">
        <label class="form-label">Purok / Zone</label>
        <select class="form-select" id="editPurok">
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
      <div class="form-group">
        <label class="form-label">Categories</label>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editVoter" onchange="document.getElementById('editNonVoter').checked = !this.checked;"> Voter</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editSenior"> Senior Citizen</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editPwd"> PWD</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editSolo"> Single Parent</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editNonVoter" onchange="document.getElementById('editVoter').checked = !this.checked;"> Non-Voter</label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-edit-resident')">Cancel</button>
      <button class="btn btn-gold" onclick="saveEditResident()">💾 Save Changes</button>
    </div>
  </div>
</div>

<script>
(function startClerkResidentsRealtime(intervalMs = 1000) {
  if (window._clerkResidentsRealtimeStarted) return;
  window._clerkResidentsRealtimeStarted = true;

  async function refreshResidents() {
    if (typeof loadResidentsFromDb === 'function') await loadResidentsFromDb();
    if (typeof renderResidents === 'function') renderResidents();
  }

  function shouldRefresh() {
    const listPanel = document.getElementById('res-list');
    const editModal = document.getElementById('modal-edit-resident');
    return listPanel?.classList.contains('active') && !(editModal?.classList.contains('open'));
  }

  window._clerkResidentsRealtimePoll = setInterval(async () => {
    try {
      if (shouldRefresh()) {
        await refreshResidents();
      }
    } catch (e) {
      console.warn('Clerk residents realtime poll error', e);
    }
  }, intervalMs);

  window.stopClerkResidentsRealtime = function() {
    if (window._clerkResidentsRealtimePoll) clearInterval(window._clerkResidentsRealtimePoll);
    window._clerkResidentsRealtimeStarted = false;
  };
})();
</script>
