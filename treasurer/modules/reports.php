<?php include __DIR__ . '/../includes/db.php'; ?>
<!-- PAGE: REPORTS -->
<div class="page-header">
  <h2>Reports</h2>
  <p>Generate and view transaction reports</p>
</div>

<!-- Filters — single compact row -->
<div style="display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">
  <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
    <label class="form-label">From</label>
    <input type="date" class="form-control" id="report-date-from">
  </div>
  <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
    <label class="form-label">To</label>
    <input type="date" class="form-control" id="report-date-to">
  </div>
  <div class="form-group" style="margin-bottom: 0; min-width: 180px;">
    <label class="form-label">Certificate Type</label>
    <select class="form-control" id="report-cert-type">
      <option value="">All Certificates</option>
      <option value="Clearance">Barangay Clearance</option>
      <option value="Residency">Certificate of Residency</option>
    </select>
  </div>
  <button type="button" class="btn-save" onclick="generateReport()" style="padding: 10px 20px; width: auto; white-space: nowrap;">
    <i class="bi bi-arrow-repeat"></i> Generate
  </button>
  <button type="button" class="btn-outline" onclick="exportReportPDF()" style="white-space: nowrap;">
    <i class="bi bi-file-pdf"></i> Export PDF
  </button>
  <button type="button" class="btn-outline" onclick="exportReportExcel()" style="white-space: nowrap;">
    <i class="bi bi-file-earmark-excel"></i> Export Excel
  </button>
  <button type="button" class="btn-outline" onclick="resetReport()" style="white-space: nowrap;">
    <i class="bi bi-x-circle"></i> Reset
  </button>
</div>

<!-- Summary counters -->
<div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 140px; background: var(--surface-2); padding: 14px 18px; border-radius: 10px; border: 1px solid var(--border);">
    <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Transactions</div>
    <div style="font-size: 22px; font-weight: 700; color: var(--text); margin-top: 4px;" id="report-total-tx">0</div>
  </div>
  <div style="flex: 1; min-width: 140px; background: var(--surface-2); padding: 14px 18px; border-radius: 10px; border: 1px solid var(--border);">
    <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Total Amount</div>
    <div style="font-size: 22px; font-weight: 700; color: var(--gold); margin-top: 4px;" id="report-total-amount">₱ 0.00</div>
  </div>
  <div style="flex: 1; min-width: 140px; background: var(--surface-2); padding: 14px 18px; border-radius: 10px; border: 1px solid var(--border);">
    <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Average</div>
    <div style="font-size: 22px; font-weight: 700; color: var(--text); margin-top: 4px;" id="report-avg-amount">₱ 0.00</div>
  </div>
</div>

<!-- Table — no card wrapper -->
<div class="table-wrap">
  <table class="data-table" id="report-table">
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
    <tbody id="report-tbody">
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <p>No data. Adjust filters and generate report.</p>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
