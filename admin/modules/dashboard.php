<?php include __DIR__ . '/../includes/db.php'; ?>
<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow);
    transition: transform 0.2s;
  }

  .stat-card:hover {
    background: var(--slate);
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 22px;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 600;
  }

  .stat-value {
    font-family: 'Inter', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.1;
    margin: 4px 0 2px;
  }

  .stat-delta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .charts-row {
    display: grid;
    grid-template-columns: minmax(0, 340px) 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .chart-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
  }

  .chart-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 14px;
  }

  .bottom-row {
    display: flex;
    gap: 16px;
    margin-bottom: 22px;
    align-items: start;
  }

  .bottom-row .stat-card {
    flex: 1;
    margin: 0;
  }

  .bottom-row .cert-card {
    flex: 1.2;
    margin: 0;
  }

  .bottom-row .chart-card {
    width: 340px;
    flex-shrink: 0;
    margin: 0;
  }
</style>

<div class="sec-head">
  <div class="sec-head-left">
    <h2>Dashboard Overview</h2>
    <p>Barangay Central — Population & Activity Summary</p>
  </div>
  <div class="sec-head-actions">
    <button class="btn btn-outline btn-sm" id="btn-refresh-dashboard" onclick="refreshDashboard()">🔄 Refresh</button>
    <button class="btn btn-gold btn-sm" onclick="nav('reports',null)">📊 Reports</button>
  </div>
</div>

<!-- Population Stats -->
<div class="stats-grid">
  <div class="stat-card" style="--accent:var(--gold)">
    <div class="stat-icon">🗳️</div>
    <div class="stat-label">Registered Voters</div>
    <div class="stat-value" id="dash-voters-count">0</div>
    <div class="stat-delta"></div>
  </div>
  
  <div class="stat-card" style="--accent:var(--sky)">
    <div class="stat-icon">🔕</div>
    <div class="stat-label">Non-Voters</div>
    <div class="stat-value" id="dash-nonvoters-count">0</div>
    <div class="stat-delta"></div>
  </div>
  <div class="stat-card" style="--accent:var(--green)">
    <div class="stat-icon">🏅</div>
    <div class="stat-label">Senior Citizens</div>
    <div class="stat-value" id="dash-seniors-count">0</div>
    <div class="stat-delta">60 years and above</div>
  </div>
  <div class="stat-card" style="--accent:var(--amber)">
    <div class="stat-icon">♿</div>
    <div class="stat-label">PWD</div>
    <div class="stat-value" id="dash-pwd-count">0</div>
    <div class="stat-delta"></div>
  </div>
  <div class="stat-card" style="--accent:var(--red)">
    <div class="stat-icon">👩‍👧</div>
    <div class="stat-label">Single Parents</div>
    <div class="stat-value" id="dash-solo-count">0</div>
    <div class="stat-delta"></div>
  </div>
  <div class="stat-card" style="--accent:var(--purple);cursor:pointer" onclick="nav('residents',null)">
    <div class="stat-icon">👥</div>
    <div class="stat-label">Total Residents</div>
    <div class="stat-value" id="dash-total-residents">0</div>
    <div class="stat-delta"></div>
  </div>
</div>

<!-- Bottom Row (Households, Certificates, and Chart) -->
<div class="bottom-row">
  <div class="stat-card" style="--accent:var(--navy);cursor:pointer" onclick="nav('household',null)">
    <div class="stat-icon">🏠</div>
    <div class="stat-label">Total Households</div>
    <div class="stat-value" id="dash-hh-count">0</div>
    <div class="stat-delta"></div>
  </div>

  <div class="cert-card" onclick="nav('certificates',null);filterCerts('issued')">
    <div class="cert-icon" style="background:var(--green-dim)">📜</div>
    <div>
      <div class="cert-count" style="color:var(--green)" id="dash-issued-certs">0</div>
      <div class="cert-label">Total Certificates Issued</div>
    </div>
  </div>

  <div class="chart-card">
    <div class="chart-label">Gender Distribution</div>
    <canvas id="genderChart" height="240"></canvas>
  </div>
</div>
