<?php 
include __DIR__ . '/includes/db.php'; 
if (empty($_SESSION['is_logged_in']) || ($_SESSION['role'] ?? '') !== 'clerk') {
    header('Location: ../index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Central Barangay — Assistant Clerk Portal</title>
  <meta name="description" content="Barangay Central Assistant Clerk Portal — view residents, households, certificates, and generate reports.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <!-- Reuse admin shared stylesheet — identical structure & components -->
  <link rel="stylesheet" href="../admin/css/main.css">
  <!-- Clerk-specific overrides -->
  <link rel="stylesheet" href="css/clerk.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</head>

<body>

  <!-- SIDEBAR OVERLAY -->
  <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-emblem">
        <img class="logo" src="../assets/logo_centtral.jpeg" style="height: 60px;" alt="Barangay Logo">
      </div>
      <div class="brand-text">
        <div class="brand-name">Central Barangay</div>
        <div class="brand-sub">Clerk Portal</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      <div class="nav-item active" id="nav-dashboard" onclick="nav('dashboard',this)"><span class="nav-icon">▦</span>Dashboard</div>

      <div class="nav-section-label">Records</div>
      <div class="nav-item" id="nav-residents" onclick="nav('residents',this)"><span class="nav-icon">👥</span>Residents</div>
      <div class="nav-item" id="nav-household" onclick="nav('household',this)"><span class="nav-icon">🏠</span>Household</div>

      <div class="nav-section-label">Services</div>
      <div class="nav-item" id="nav-certificates" onclick="nav('certificates',this)"><span class="nav-icon">📜</span>Certificates<span class="nav-badge" id="certNavBadge" style="display:none;">0</span></div>

      <div class="nav-section-label">Admin</div>
      <div class="nav-item" id="nav-reports" onclick="nav('reports',this)"><span class="nav-icon">📊</span>Reports</div>
      <div class="nav-item" id="nav-backup" onclick="nav('backup',this)"><span class="nav-icon">💾</span>Backup &amp; Restore</div>
      <div class="nav-item" id="nav-settings" onclick="nav('settings',this)"><span class="nav-icon">⚙️</span>Settings</div>

      <div class="sidebar-user">
        <div class="user-avatar">AC</div>
        <div class="user-info">
          <div class="user-name">Assistant Clerk</div>
          <div class="user-role">Clerk Portal</div>
        </div>
        <button onclick="confirmLogout()" title="Logout"
          style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:background 0.18s;"
          onmouseover="this.style.background='rgba(224,85,85,0.45)'"
          onmouseout="this.style.background='rgba(255,255,255,0.1)'">🚪 Logout</button>
      </div>
    </nav>
  </aside>

  <!-- MAIN -->
  <main class="main">
    <!-- TOPBAR -->
    <div class="topbar">
      <button class="hamburger" id="hamburger" onclick="toggleSidebar()">☰</button>
      <div class="topbar-title" id="topbar-title">Dashboard</div>
      <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" type="button" title="Switch theme">🌙 Dark</button>
    </div>

    <!-- CONTENT -->
    <div class="content" id="mainContent">
      <!-- Modules loaded here -->
    </div>
  </main>

  <!-- TOAST CONTAINER -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Scripts — reuse admin JS where possible, override restrictions in clerk-app.js -->
  <script src="../admin/js/supabase-client.js"></script>
  <script src="../admin/js/data.js"></script>
  <script src="../admin/js/dashboard.js"></script>
  <script src="../admin/js/residents.js"></script>
  <script src="../admin/js/household.js?v=2.0"></script>
  <script src="../admin/js/certificates.js"></script>
  <script src="../admin/js/reports.js"></script>
  <script src="../admin/js/backup.js"></script>
  <script src="js/clerk-app.js"></script>
</body>

</html>
