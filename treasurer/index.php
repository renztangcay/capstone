<?php 
include __DIR__ . '/includes/db.php'; 
if (empty($_SESSION['is_logged_in']) || ($_SESSION['role'] ?? '') !== 'treasurer') {
    header('Location: ../index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Central Barangay — Treasurer Dashboard</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
    rel="stylesheet">
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="css/treasurer.css">
</head>

<body>

  <!-- ── SHELL ── -->
  <div class="shell">

    <!-- ── SIDEBAR ── -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-seal">
          <img class="logo" src="../assets/logo_centtral.jpeg" style="height: 60px;" alt="">
        </div>
        <div class="sidebar-brand">
          <div class="lgu"></div>
          <div class="name">Central Barangay</div>
          <div class="sub">Treasurer Portal</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group">
          <div class="nav-label">Main</div>
        </div>
        <div class="nav-item active" onclick="navTo('dashboard', this)">
          <i class="bi bi-grid-1x2-fill nav-icon"></i> Dashboard
        </div>

        <div class="nav-group">
          <div class="nav-label">Transactions</div>
        </div>
        <div class="nav-item" onclick="navTo('entry', this)">
          <i class="bi bi-cash-coin nav-icon"></i> Payment Entry
        </div>
        <div class="nav-item" onclick="navTo('history', this)">
          <i class="bi bi-clock-history nav-icon"></i> Transaction History
        </div>
        <div class="nav-item" onclick="navTo('reports', this)">
          <i class="bi bi-file-earmark-text nav-icon"></i> Reports
        </div>

        <div class="nav-group">
          <div class="nav-label">System</div>
        </div>
        <div class="nav-item" onclick="navTo('settings', this)">
          <i class="bi bi-gear nav-icon"></i> Settings
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="user-avatar">BT</div>
            <div>
              <div class="user-name">Treasurer</div>
              <div class="user-role">Cash Management</div>
            </div>
          </div>
          <div class="sidebar-logout" style="margin-top:10px;">
            <div class="nav-item" onclick="logout()">
              <i class="bi bi-box-arrow-right nav-icon"></i> Logout
            </div>
          </div>
        </div>
    </aside>

    <!-- ── MAIN AREA ── -->
    <div class="main">

      <!-- ── TOPBAR ── -->
      <div class="topbar">
        <button class="topbar-toggle" id="toggleSidebar" onclick="toggleSidebar()">
          <i class="bi bi-list"></i>
        </button>
        <div class="topbar-breadcrumb">
          <span class="bc-home"><i class="bi bi-house-door"></i></span>
          <span class="bc-sep">/</span>
          <span class="bc-current" id="breadcrumb-text">Dashboard</span>
        </div>
        <div class="topbar-right">
          <button class="topbar-btn theme-toggle" id="themeToggle" type="button" onclick="toggleTheme()"
            aria-label="Switch to dark mode" title="Switch to dark mode">
            <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
          </button>
          <div class="topbar-date" id="topbar-date"></div>
        </div>
      </div>

      <!-- Page containers — content loaded from modules/ -->
      <div class="page active" id="page-dashboard"></div>
      <div class="page" id="page-entry" style="display:none;"></div>
      <div class="page" id="page-history" style="display:none;"></div>
      <div class="page" id="page-reports" style="display:none;"></div>
      <div class="page" id="page-settings" style="display:none;"></div>

    </div><!-- /main -->
  </div><!-- /shell -->

  <!-- Toast container -->
  <div class="toast-stack" id="toastStack"></div>

  <!-- jsPDF for PDF export -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script src="../admin/js/supabase-client.js"></script>
  <script src="js/treasurer.js"></script>
</body>

</html>
