<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  .history-table-wrap {
    max-height: 65vh;
    overflow-y: auto;
  }
  .history-table-wrap thead th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--surface-2);
    border-bottom: 2px solid #dee2e6;
  }
</style>
<!-- PAGE: TRANSACTION HISTORY -->
<div class="page-header">
  <h2>Transaction History</h2>
  <p>Complete record of all processed payments</p>
</div>

<div class="card">
  <div class="card-body">
    <div class="card-title"><i class="bi bi-journal-text"></i> All Transactions</div>

    <!-- O.R. No. Search Filter -->
    <div class="filter-bar">
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input type="text" id="or-search" placeholder="Search by O.R. No.…" oninput="filterByOR(this.value)">
      </div>
    </div>

    <div class="table-wrap history-table-wrap">
      <table class="data-table">
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
        <tbody id="ledger-tbody-full">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>
</div>
