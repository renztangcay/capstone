<?php include __DIR__ . '/../includes/db.php'; ?>
<!-- PAGE: PAYMENT ENTRY -->
<div class="page-header">
  <h2>Payment Entry</h2>
  <p>Record a new payment transaction</p>
</div>

<div style="max-width: 520px;">
  <div class="card">
    <div class="card-body">
      <div class="card-title"><i class="bi bi-cash-coin"></i> Transaction Details</div>

      <form id="treasurerFormFull" onsubmit="event.preventDefault(); savePaymentFull(this);">
        <div class="form-group">
          <label class="form-label">Resident Name</label>
          <div class="resident-search-wrapper">
            <input type="text" class="form-control" id="t-resident-full" placeholder="Search resident name…" required autocomplete="off" oninput="searchResidents(this.value)">
            <div id="resident-search-results" class="resident-search-results" role="listbox" aria-label="Resident search results"></div>
          </div>
          <input type="hidden" id="t-resident-id-full">
          <div class="form-hint">Type to search from registered residents</div>
        </div>

        <div class="form-group">
          <label class="form-label">Certificate Type</label>
          <select class="form-control" id="t-cert-type-full" onchange="onCertChangeFull()" required>
            <option value="">— Select Certificate —</option>
            <option value="Clearance">Barangay Clearance</option>
            <option value="Residency">Certificate of Residency</option>
          </select>
          
        </div>

        

        <hr class="form-divider">

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">O.R. Number</label>
            <input type="number" inputmode="numeric" pattern="[0-9]*" class="form-control" id="t-or-no-full" placeholder="e.g. 0001" required>
          </div>
          <div class="form-group">
            <label class="form-label">Amount Paid (₱)</label>
            <input type="number" step="0.01" min="0" class="form-control" id="t-amount-full" placeholder="0.00" required>
            <div class="form-hint">Cash payment only</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">CTC No.</label>
            <input type="number" inputmode="numeric" pattern="[0-9]*" class="form-control" id="t-ctc-no-full" placeholder="e.g. 12345678" required>
          </div>
          <div class="form-group">
            <label class="form-label">Amount of CTC (₱)</label>
            <input type="number" step="0.01" min="0" class="form-control" id="t-ctc-amount-full" placeholder="0.00" required>
          </div>
        </div>

        <button type="submit" class="btn-save">
          <i class="bi bi-check-circle-fill"></i> Save as Paid
        </button>
      </form>

    </div>
  </div>
</div>
