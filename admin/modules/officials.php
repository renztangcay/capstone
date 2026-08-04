<?php include __DIR__ . '/../includes/db.php';

// Simple JSON-backed persistence for officials when requested via AJAX.
$dataFile = __DIR__ . '/../data/officials.json';

// Ensure data directory exists
if (!is_dir(dirname($dataFile))) {
  @mkdir(dirname($dataFile), 0755, true);
}

// Serve JSON API for list and save actions
if (isset($_GET['action'])) {
  header('Content-Type: application/json; charset=utf-8');
  $action = $_GET['action'];
  if ($action === 'list') {
    if (file_exists($dataFile)) echo file_get_contents($dataFile);
    else echo json_encode([]);
    exit;
  }
  if ($action === 'save' && strtoupper($_SERVER['REQUEST_METHOD']) === 'POST') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    if (is_array($data) && isset($data['officials']) && is_array($data['officials'])) {
      file_put_contents($dataFile, json_encode($data['officials'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
      echo json_encode(['success' => true]);
      exit;
    }
    echo json_encode(['success' => false, 'error' => 'Invalid payload']);
    exit;
  }
  // Unknown action
  echo json_encode(['success' => false, 'error' => 'Unknown action']);
  exit;
}
?>
<style>
  /* Officials grid */
  .officials-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .official-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 14px;
    text-align: center;
    box-shadow: var(--shadow);
  }

  .official-card:hover {
    background: var(--slate);
  }

  .official-ava {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: var(--navy);
    border: 3px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Inter", sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin: 0 auto 10px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .official-name {
    font-weight: 700;
    font-size: 13.5px;
    color: var(--navy);
  }

  .official-role {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin: 3px 0 8px;
  }

  .official-term {
    font-size: 11.5px;
    color: var(--text-mid);
  }
</style>
<div class="sec-head">
  <div class="sec-head-left">
    <h2>Barangay Officials</h2>
    <p></p>
  </div>
  <div class="sec-head-actions">
    <button class="btn btn-gold" onclick="openAddOfficial()">+ Add Official</button>
  </div>
</div>
<div class="filter-bar" style="margin-bottom: 20px;">
  <select class="filter-select" id="offFilterStatus" onchange="renderOfficials()">
    <option value="">All Status</option>
    <option value="Active">Active</option>
    <option value="Inactive">Inactive</option>
  </select>
</div>
<div class="officials-grid" id="officialsGrid">
  <!-- Populated by JS -->
</div>
