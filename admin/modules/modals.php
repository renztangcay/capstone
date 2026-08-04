<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  /* Edit Resident modal: remove backdrop blur and improve layout/margins */
  #modal-edit-resident {
    backdrop-filter: none !important;
    background: rgba(0,0,0,0.06) !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 12px !important;
    margin-top: 0 !important;
    margin-left: 200px;
  }
  #modal-edit-resident .modal {
    max-width: 980px !important;
    width: 100%;
    border-radius: 10px !important;
  }
  #modal-edit-resident .modal-body { padding: 18px !important; }
  #modal-edit-resident .form-group { margin-bottom: 12px !important; }
  /* Official modal: center, remove blur, adjust layout */
  #modal-official {
    backdrop-filter: none !important;
    background: rgba(0,0,0,0.06) !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 12px !important;
    margin-top: 0 !important;
  }
  #modal-official .modal {
    max-width: 640px !important;
    width: 100%;
    border-radius: 10px !important;
  }
  #modal-official .modal-body { padding: 18px !important; }
  #modal-official .form-group { margin-bottom: 10px !important; }
</style>
<div class="modal-overlay" id="modal-official">
  <div class="modal">
    <div class="modal-header">
      <h3 id="offModalTitle">Add Barangay Official</h3>
      <button class="modal-close" onclick="closeModal('modal-official')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="offIndex">
      <div class="form-row">
        <div class="form-group"><label class="form-label">First Name</label><input class="form-input" id="offFirst" placeholder="Given name"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" id="offLast" placeholder="Surname"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Middle Name</label><input class="form-input" id="offMiddle" placeholder="Middle name"></div>
        <div class="form-group"><label class="form-label">Suffix</label><input class="form-input" id="offSuffix" placeholder="Jr./Sr./III"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Position / Role</label>
          <select class="form-select" id="offRole">
            <option>Barangay Captain</option>
            <option>Kagawad</option>
            <option>Secretary</option>
            <option>Treasurer</option>
            <option>SK Chairman</option>
            <option>Clerk</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" id="offStatus">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Term Start</label><input class="form-input" type="date" id="offStart"></div>
        <div class="form-group"><label class="form-label">Term End</label><input class="form-input" type="date" id="offEnd"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Contact Number</label><input class="form-input" id="offContact" placeholder="+63 9XX XXX XXXX"></div>
        <div class="form-group"><label class="form-label">Email Address</label><input class="form-input" type="email" id="offEmail" placeholder="official@brgy.gov.ph"></div>
      </div>
      <div class="form-group"><label class="form-label">Profile Picture</label><div style="display:flex;gap:8px;align-items:flex-end;"><div style="flex:1;"><input class="form-input" type="file" id="offAvatar" accept="image/*"><small style="color: var(--text-muted); display: block; margin-top: 4px;">Upload JPG, PNG, or GIF (Max 2MB)</small></div><button type="button" class="btn btn-outline btn-sm" onclick="clearOfficialAvatar()" style="height:40px;">Reset to Default</button></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-official')">Cancel</button>
      <button class="btn btn-gold" id="offSaveBtn" onclick="saveOfficial()">Add Official</button>
    </div>
  </div>
</div>

<!-- Resident Modal -->
<div class="modal-overlay" id="modal-resident">
  <div class="modal modal-xl">
    <div class="modal-header">
      <h3>Register New Resident</h3>
      <button class="modal-close" onclick="closeModal('modal-resident')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-row-3">
        <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" id="rLast" placeholder="Surname"></div>
        <div class="form-group"><label class="form-label">First Name</label><input class="form-input" id="rFirst" placeholder="Given name"></div>
        <div class="form-group"><label class="form-label">Middle Name</label><input class="form-input" id="rMiddle" placeholder="Middle name"></div>
      </div>
      <div class="form-row-4">
        <div class="form-group"><label class="form-label">Suffix</label><input class="form-input" id="rSuffix" placeholder="Jr./Sr."></div>
        <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" id="rDob" onchange="calcAge()"></div>
        <div class="form-group"><label class="form-label">Age</label><input class="form-input" id="rAge" placeholder="Auto-calc" readonly></div>
        <div class="form-group"><label class="form-label">Sex</label>
          <select class="form-select" id="rSex"><option>Male</option><option>Female</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Civil Status</label>
          <select class="form-select" id="rCivil"><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select>
        </div>
        <div class="form-group"><label class="form-label">Place of Birth</label><input class="form-input" id="rPob" placeholder="City/Municipality"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Religion</label><input class="form-input" id="rReligion" placeholder="Religion"></div>
        <div class="form-group"><label class="form-label">Citizenship</label><input class="form-input" id="rCitizen" value="Filipino"></div>
      </div>
      <div class="form-group"><label class="form-label">Residence Address</label><input class="form-input" id="rAddress" placeholder="House No., Street, Purok, Barangay"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Purok / Zone</label>
          <select class="form-select" id="rPurok"><option>GEMELINA</option><option>NARRA</option><option>YAKAL</option><option>ALMASIGA</option><option>APITONG</option><option>TUGAS</option><option>TANGUILE</option><option>MOLAVE</option><option>LAWAAN</option><option>ACASIA</option><option>DAO</option><option>KAMAGONG</option></select>
        </div>
        <div class="form-group"><label class="form-label">Contact Number</label><input class="form-input" id="rContact" placeholder="+63 9XX XXX XXXX"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Profession / Occupation</label><input class="form-input" id="rOcc" placeholder="Occupation"></div>
        <div class="form-group"><label class="form-label">Email Address</label><input class="form-input" type="email" id="rEmail" placeholder="email@example.com"></div>
      </div>
      <div class="form-group"><label class="form-label">Categories</label>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="rVoter"> Voter</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="rSenior"> Senior Citizen</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="rPwd"> PWD</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="rSolo"> Single Parent</label>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-resident')">Cancel</button>
      <button class="btn btn-gold" onclick="registerResident()">Register Resident</button>
    </div>
  </div>
</div>

<!-- Certificate Modal -->
<div class="modal-overlay" id="modal-cert">
  <div class="modal modal-lg" style="max-width: 800px;">
    <div class="modal-header">
      <h3>Certificate Details</h3>
      <button class="modal-close" onclick="closeModal('modal-cert')">✖</button>
    </div>
    <div class="modal-body" style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Primary Info -->
      <div class="form-row">
        <div class="form-group"><label class="form-label">Resident Name</label><input class="form-input" id="cResident" readonly></div>
        <div class="form-group"><label class="form-label">Certificate Type</label><input class="form-input" id="cType" readonly></div>
      </div>

      <!-- Payment & Tracking Info -->
      <div style="background: var(--slate); padding: 18px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="margin: 0 0 14px 0; font-size: 14px; color: var(--navy); display: flex; align-items: center; gap: 6px;">
          <i class="bi bi-receipt"></i> Payment & Tracking
        </h4>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Control No.</label><input class="form-input" id="cNo" placeholder="Required to issue"></div>
          <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="cDate"></div>
          <div class="form-group"><label class="form-label">O.R. No.</label><input class="form-input" id="cORNo" readonly></div>
        </div>
        <div class="form-row" style="margin-top: 14px;">
          <div class="form-group"><label class="form-label">BC No.</label><input class="form-input" id="cBCNo" placeholder="If applicable"></div>
          <div class="form-group"><label class="form-label">Fee (₱)</label><input class="form-input" id="cFee" readonly></div>
        </div>
        <div class="form-row" style="margin-top: 14px;">
          <div class="form-group"><label class="form-label">CTC No.</label><input class="form-input" id="cCTCNo" readonly></div>
          <div class="form-group"><label class="form-label">CTC Amt (₱)</label><input class="form-input" id="cAmount" readonly></div>
        </div>
      </div>

      <!-- Document Content -->
      <div style="background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px dashed #cbd5e1;">
        <h4 style="margin: 0 0 14px 0; font-size: 14px; color: var(--navy); display: flex; align-items: center; gap: 6px;">
          <i class="bi bi-file-earmark-text"></i> Document Content
        </h4>

        <div id="cPreview" style="background:#fff;border:1px solid var(--border);padding:24px;border-radius:6px;color:var(--text);font-size:14px;line-height:1.8;box-shadow: 0 2px 8px rgba(0,0,0,0.02);overflow-x:auto;">
          
                    <p style="margin:16px 0;">THIS IS TO CERTIFY that <input id="cCertName" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; font-weight:bold; text-transform:uppercase; width:240px; text-align:center; padding:2px 4px;" placeholder="(name-bold capital)"> legal age, <input id="cCertDetails" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:160px; text-align:center; padding:2px 4px;" placeholder="(input)">, is a bona fide resident of <input id="cPreviewAddress" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:180px; text-align:center; padding:2px 4px;" placeholder="(address)">, Central Barangay, Dipolog City.</p>

          <p style="margin:16px 0;">This clearance is issued to certify that the above mentioned individual has no derogatory or criminal record filed in this Barangay.</p>

          <p style="margin:16px 0;">This clearance is issued to <input id="cSupport" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:180px; text-align:center; padding:2px 4px;" placeholder="(input)">.</p>

          <p style="margin:16px 0;">Issued this <input id="cIssuedDay" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:80px; text-align:center; padding:2px 4px;" placeholder="(day)"> day of <input id="cIssuedMonth" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:100px; text-align:center; padding:2px 4px;" placeholder="(month)">, <input id="cIssuedYear" class="form-input" style="display:inline-block; border:none; border-bottom:2px solid #000; width:80px; text-align:center; padding:2px 4px;" placeholder="(year)"> at Central Barangay Hall, Dipolog City.</p>
          
        </div>
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="resetCertModal();closeModal('modal-cert')">Cancel</button>
      <button class="btn btn-secondary" onclick="printCertificate()"><i class="bi bi-printer"></i> Print</button>
      <button class="btn btn-gold" onclick="viewCertificate()"><i class="bi bi-eye"></i> View Document</button>
      <button class="btn btn-success" id="certIssuedBtn" onclick="issueCertificate()"><i class="bi bi-check-circle"></i> Issue Certificate</button>
    </div>
  </div>
</div>

<!-- Blotter Modal -->
<div class="modal-overlay" id="modal-blotter">
  <div class="modal">
    <div class="modal-header">
      <h3>Record New Blotter Case</h3>
      <button class="modal-close" onclick="closeModal('modal-blotter')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Complainant</label><input class="form-input" id="bComplainant" placeholder="Full name"></div>
        <div class="form-group"><label class="form-label">Suspect</label><input class="form-input" id="bRespondent" placeholder="Full name (if known)"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Case Type</label>
          <select class="form-select" id="bType">
            <option>Noise Complaint</option><option>Physical Injury</option><option>Property Dispute</option>
            <option>Slander/Libel</option><option>Theft</option><option>Domestic Dispute</option><option>Other</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Incident Date</label><input class="form-input" type="datetime-local" id="bDate"></div>
      </div>
      <div class="form-group"><label class="form-label">Location of Incident</label><input class="form-input" id="bLocation" placeholder="Specific location"></div>
      <div class="form-group"><label class="form-label">Narrative</label><textarea class="form-textarea" id="bNarrative" rows="4" placeholder="Describe the incident in detail…"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-blotter')">Cancel</button>
      <button class="btn btn-gold" onclick="addBlotter()">Record Case</button>
    </div>
  </div>
</div>

<!-- Account Modal -->
<div class="modal-overlay" id="modal-account">
  <div class="modal">
    <div class="modal-header">
      <h3>Add User Account</h3>
      <button class="modal-close" onclick="closeModal('modal-account')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">First Name</label><input class="form-input" placeholder="First name"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input class="form-input" placeholder="Last name"></div>
      </div>
      <div class="form-group"><label class="form-label">Email Address</label><input class="form-input" type="email" placeholder="email@brgy.gov.ph"></div>
      <div class="form-group"><label class="form-label">Role</label>
        <select class="form-select"><option>Secretary</option><option>Treasurer</option><option>Clerk</option><option>Resident</option></select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" placeholder="Temporary password"></div>
        <div class="form-group"><label class="form-label">Confirm Password</label><input class="form-input" type="password" placeholder="Repeat password"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-account')">Cancel</button>
      <button class="btn btn-gold" onclick="closeModal('modal-account');showToast('Account created!','success')">Create Account</button>
    </div>
  </div>
</div>

<!-- Reset Password Modal -->
<div class="modal-overlay" id="modal-reset-password">
  <div class="modal" style="max-width:420px;">
    <div class="modal-header">
      <h3>🔑 Reset Password</h3>
      <button class="modal-close" onclick="closeModal('modal-reset-password')">✖</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">User</label>
        <input class="form-input" value="Maria Santos" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input class="form-input" type="password" placeholder="Enter new password">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <input class="form-input" type="password" placeholder="Re-enter password">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-reset-password')">Cancel</button>
      <button class="btn btn-gold" onclick="closeModal('modal-reset-password');showToast('Password reset successfully!','success')">Reset Password</button>
    </div>
  </div>
</div>


<!-- View Cert Requirements Modal -->
<div class="modal-overlay" id="modal-cert-req">
  <div class="modal modal-xl">
    <div class="modal-header">
      <h3>📎 Certificate Requirements</h3>
      <button class="modal-close" onclick="closeModal('modal-cert-req')">✖</button>
    </div>
    <div class="modal-body" id="certReqBody">
      <!-- Populated by JS -->
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-cert-req')">Close</button>
      <button class="btn btn-primary" onclick="showToast('Uploading file…','info')">⬆ Upload Requirement</button>
    </div>
  </div>
</div>

<!-- Edit Resident Modal -->
<div class="modal-overlay" id="modal-edit-resident">
  <div class="modal modal-xl" style="margin-left: 20px;">
    <div class="modal-header">
      <h3>Edit Resident Information</h3>
      <button class="modal-close" onclick="closeModal('modal-edit-resident')">✖</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="editResId">
      <div class="form-group"><label class="form-label">Purok / Zone</label>
        <select class="form-select" id="editPurok"><option>GEMELINA</option><option>NARRA</option><option>YAKAL</option><option>ALMASIGA</option><option>APITONG</option><option>TUGAS</option><option>TANGUILE</option><option>MOLAVE</option><option>LAWAAN</option><option>ACASIA</option><option>DAO</option><option>KAMAGONG</option></select>
      </div>
      <div class="form-group"><label class="form-label">Categories</label>
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
      <button class="btn btn-gold" onclick="saveEditResident()">Save Changes</button>
    </div>
  </div>
</div>
