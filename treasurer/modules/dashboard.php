<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  .ledger-table-wrap {
    max-height: 60vh;
    overflow-y: auto;
  }
  .ledger-table-wrap thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--surface-2);
    border-bottom: 2px solid #dee2e6;
  }
  /* Make the Recent Transactions card take full width */
  #page-dashboard .content-grid {
    grid-template-columns: 1fr;
  }
</style>
<!-- PAGE: DASHBOARD -->
<div class="page-header">
  <h2>Treasurer Dashboard</h2>
  <p>Payment collection overview for today</p>
</div>

<!-- Summary Cards -->
<div class="stats-grid">
  <div class="stat-card gold">
    <div class="stat-icon gold"><i class="bi bi-cash-stack"></i></div>
    <div class="stat-value" id="stat-total-cash">₱ 0.00</div>
    <div class="stat-label">Cash Total</div>
  </div>
  <div class="stat-card green">
    <div class="stat-icon green"><i class="bi bi-receipt-cutoff"></i></div>
    <div class="stat-value" id="stat-total-tx">0</div>
    <div class="stat-label">Transactions Today</div>
  </div>
  <div class="stat-card blue">
    <div class="stat-icon blue"><i class="bi bi-clock-history"></i></div>
    <div class="stat-value" id="stat-last-or">—</div>
    <div class="stat-label">Last O.R. Number</div>
  </div>
</div>

<!-- Quick Entry + Recent Ledger -->
<div class="content-grid">

  <!-- TABLE: Recent Transactions -->
  <div class="card">
    <div class="card-body">
      <div class="card-title"><i class="bi bi-journal-text"></i> Recent Transactions</div>

      <div class="table-wrap ledger-table-wrap">
        <table class="data-table" id="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Resident Name</th>
              <th>Certificate</th>
              <th>O.R. No.</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="ledger-tbody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>

    </div>
  </div>

</div>
