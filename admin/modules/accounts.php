<?php
if (session_status() === PHP_SESSION_NONE) session_start();
include __DIR__ . '/../includes/db.php';

// ── JSON API ──────────────────────────────────────────────────────────────────
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');

    if (empty($_SESSION['is_logged_in']) || ($_SESSION['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $SB_URL = 'https://tkizkixcpfndytpkgfrd.supabase.co';
    $SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0';

    function _sb($method, $path, $data = null) {
        global $SB_URL, $SB_KEY;
        $url  = $SB_URL . $path;
        $body = $data !== null ? json_encode($data) : null;
        $hdrs = ["apikey: $SB_KEY", "Authorization: Bearer $SB_KEY", "Content-Type: application/json", "Prefer: return=representation"];
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST  => $method,
                CURLOPT_TIMEOUT        => 15,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_HTTPHEADER     => $hdrs,
            ]);
            if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            $resp = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        } else {
            $opts = ['method' => $method, 'header' => implode("\r\n", $hdrs), 'timeout' => 15, 'ignore_errors' => true];
            if ($body !== null) $opts['content'] = $body;
            $ctx  = stream_context_create(['http' => $opts, 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
            $resp = @file_get_contents($url, false, $ctx);
            $code = 0;
            foreach ($http_response_header ?? [] as $h) {
                if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $code = (int)$m[1]; break; }
            }
        }
        return ['code' => $code, 'body' => json_decode($resp ?: '[]', true), 'raw' => $resp];
    }

    function is_user_logged_in($username) {
        $session_dir = session_save_path();
        if (empty($session_dir)) {
            $session_dir = sys_get_temp_dir();
        }
        if (!is_dir($session_dir) || !is_readable($session_dir)) {
            return false;
        }
        $username_lower = strtolower($username);
        $files = glob($session_dir . '/sess_*');
        if (!$files) return false;

        $now = time();
        $max_lifetime = intval(ini_get('session.gc_maxlifetime') ?: 1440);

        foreach ($files as $file) {
            if (!is_file($file) || !is_readable($file)) continue;

            // Skip expired session files
            if ($now - filemtime($file) > $max_lifetime) {
                continue;
            }

            $content = @file_get_contents($file);
            if ($content === false) continue;

            $sess_username = '';
            if (preg_match('/username\|s:\d+:"([^"]+)"/i', $content, $matches)) {
                $sess_username = strtolower($matches[1]);
            } else if (stripos($content, '"username"') !== false && stripos($content, '"' . $username . '"') !== false) {
                $sess_username = $username_lower;
            }

            if ($sess_username === $username_lower) {
                if (preg_match('/is_logged_in\|b:1/i', $content) || stripos($content, 'is_logged_in|b:1') !== false) {
                    return true;
                }
            }
        }
        return false;
    }

    $action = $_GET['action'];
    $in     = json_decode(file_get_contents('php://input'), true) ?: [];

    // LIST all users — try with status column first, fall back without it
    if ($action === 'list') {
        // Try selecting all columns including status and last_login
        $r = _sb('GET', '/rest/v1/users?select=id,username,role,status,created_at,last_login&order=id.asc');
        if ($r['code'] === 200 && is_array($r['body'])) {
            echo json_encode(['success' => true, 'data' => $r['body']]);
            exit;
        }

        // Try without last_login
        $r2 = _sb('GET', '/rest/v1/users?select=id,username,role,status,created_at&order=id.asc');
        if ($r2['code'] === 200 && is_array($r2['body'])) {
            $rows = array_map(function($u){ $u['last_login'] = null; return $u; }, $r2['body']);
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        // Try without status and last_login
        $r3 = _sb('GET', '/rest/v1/users?select=id,username,role,created_at&order=id.asc');
        if ($r3['code'] === 200 && is_array($r3['body'])) {
            $rows = array_map(function($u){ $u['status'] = 'active'; $u['last_login'] = null; return $u; }, $r3['body']);
            echo json_encode(['success' => true, 'data' => $rows, 'notice' => 'status and last_login columns missing — run SQL migration']);
            exit;
        }
        echo json_encode(['success' => false, 'message' => 'Failed to load users.', 'debug' => $r3['raw']]);
        exit;
    }

    // TOGGLE STATUS — disable or enable an account
    if ($action === 'toggle_status') {
        $id     = intval($in['id']     ?? 0);
        $status = ($in['status'] ?? '') === 'disabled' ? 'disabled' : 'active';
        if (!$id) { echo json_encode(['success' => false, 'message' => 'Missing ID.']); exit; }

        // Guard: cannot disable yourself or master admin
        $chk  = _sb('GET', "/rest/v1/users?select=username&id=eq.{$id}");
        $tgt  = strtolower($chk['body'][0]['username'] ?? '');
        $self = strtolower($_SESSION['username'] ?? '');
        if ($tgt === $self)   { echo json_encode(['success' => false, 'message' => 'Cannot disable your own account.']); exit; }
        if ($tgt === 'admin') { echo json_encode(['success' => false, 'message' => 'Cannot disable the master admin account.']); exit; }

        // Guard: cannot disable an account if they are currently logged in
        if ($status === 'disabled' && is_user_logged_in($tgt)) {
            echo json_encode(['success' => false, 'message' => 'Cannot disable an account that is currently logged in.']);
            exit;
        }

        $res  = _sb('PATCH', "/rest/v1/users?id=eq.{$id}", ['status' => $status]);
        $verb = $status === 'disabled' ? 'disabled' : 'enabled';
        echo json_encode([
            'success' => $res['code'] === 200,
            'message' => $res['code'] === 200 ? "Account {$verb} successfully." : 'Failed to update status.',
        ]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
    exit;
}
?>
      <div class="sec-head">
        <div class="sec-head-left"><h2>User Accounts</h2><p>Role-based access management</p></div>
      </div>
      <div class="filter-bar">
        <input class="filter-input" id="acctSearch" placeholder="🔍 Search user…" style="flex:1" oninput="acctRender()">
        <select class="filter-select" id="acctRoleFilter" onchange="acctRender()">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="treasurer">Treasurer</option>
          <option value="clerk">Clerk</option>
        </select>
        <select class="filter-select" id="acctStatusFilter" onchange="acctRender()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="responsive-table">
            <thead><tr>
              <th>User</th><th>Role</th><th>Last Login</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody id="accountsTableBody">
              <tr><td colspan="5" style="text-align:center;padding:20px;">Loading accounts…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

<script>
(function () {
  var _data = [];

  /* ── Load from database ─────────────────────────────────────────────────── */
  async function _load() {
    var panel = document.getElementById('panel-accounts');
    if (panel && !panel.classList.contains('active') && _data.length > 0) {
      return;
    }
    try {
      var res  = await fetch('modules/accounts.php?action=list');
      var json = await res.json();
      _data    = json.success ? (json.data || []) : [];
    } catch (e) {
      console.error('Accounts load error:', e);
    }
    acctRender();
  }

  /* ── Render table rows ──────────────────────────────────────────────────── */
  window.acctRender = function () {
    var tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    var q = (document.getElementById('acctSearch')?.value      || '').toLowerCase();
    var r = (document.getElementById('acctRoleFilter')?.value   || '').toLowerCase();
    var s = (document.getElementById('acctStatusFilter')?.value || '').toLowerCase();

    var rows = _data.filter(function (a) {
      if (q && !(a.username || '').toLowerCase().includes(q)) return false;
      if (r && (a.role   || '').toLowerCase() !== r) return false;
      if (s && (a.status || 'active').toLowerCase() !== s) return false;
      return true;
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No accounts found.</td></tr>';
      return;
    }

    var badgeMap = { admin: 'badge-active', treasurer: 'badge-validated', clerk: 'badge-paid' };

    tbody.innerHTML = rows.map(function (a) {
      var isActive   = (a.status || 'active') === 'active';
      var roleLabel  = (a.role || '').charAt(0).toUpperCase() + (a.role || '').slice(1);
      var lastLoginStr = 'Never';
      if (a.last_login) {
        var d = new Date(a.last_login);
        if (!isNaN(d.getTime())) {
          lastLoginStr = d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      }
      var statusBadge = isActive
        ? '<span class="badge badge-active">Active</span>'
        : '<span class="badge" style="background:#fecaca;color:#b91c1c;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">Disabled</span>';
      var btnLabel = isActive ? 'Disable' : 'Enable';
      var btnClass = isActive ? 'btn-danger' : 'btn-primary';
      var next     = isActive ? 'disabled' : 'active';

      var actionBtn = '';
      if (a.role !== 'admin') {
        actionBtn = '<button class="btn ' + btnClass + ' btn-sm" onclick="acctToggle(' + a.id + ',\'' + next + '\',\'' + _e(a.username) + '\')">' + btnLabel + '</button>';
      } else {
        actionBtn = '<span style="color:var(--text-muted);font-size:12px;">—</span>';
      }

      return '<tr>'
        + '<td data-label="User"><strong>' + _e(a.username) + '</strong></td>'
        + '<td data-label="Role"><span class="badge ' + (badgeMap[a.role] || 'badge-paid') + '">' + _e(roleLabel) + '</span></td>'
        + '<td data-label="Last Login">' + lastLoginStr + '</td>'
        + '<td data-label="Status">' + statusBadge + '</td>'
        + '<td data-label="Actions">' + actionBtn + '</td>'
        + '</tr>';
    }).join('');
  };

  /* ── Toggle disable / enable ────────────────────────────────────────────── */
  window.acctToggle = async function (id, nextStatus, username) {
    var verb = nextStatus === 'disabled' ? 'disable' : 'enable';
    if (!confirm('Are you sure you want to ' + verb + ' the account for "' + username + '"?')) return;
    try {
      var res  = await fetch('modules/accounts.php?action=toggle_status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: id, status: nextStatus }),
      });
      var data = await res.json();
      if (typeof showToast === 'function') showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) { _data = []; await _load(); }
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Network error.', 'error');
    }
  };

  /* ── HTML escape ─────────────────────────────────────────────────────────── */
  function _e(s) {
    return String(s || '').replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }

  /* ── Auto-init & Polling ─────────────────────────────────────────────────── */
  _load();
  setInterval(_load, 1000);
})();
</script>
