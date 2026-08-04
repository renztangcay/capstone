<?php
// ── Secure session configuration (must be set before session_start) ───────────
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.use_only_cookies', '1');
    session_start();
}

// ── Security headers ──────────────────────────────────────────────────────────
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: no-referrer-when-downgrade');

// ── Config ────────────────────────────────────────────────────────────────────
define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');
define('SUPABASE_SERVICE_KEY','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYwNjkxOCwiZXhwIjoyMDk0MTgyOTE4fQ.placeholder_replace_with_real_service_key');

// ── Helpers ───────────────────────────────────────────────────────────────────
function supabase_post(string $path, array $payload, string $key): array {
    $url  = SUPABASE_URL . $path;
    $body = json_encode($payload);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: $key",
                "Authorization: Bearer $key",
                "Content-Type: application/json",
                "Accept: application/json",
            ],
        ]);
        $resp   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx  = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "apikey: $key\r\nAuthorization: Bearer $key\r\nContent-Type: application/json\r\nAccept: application/json",
            'content'       => $body,
            'timeout'       => 15,
            'ignore_errors' => true,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp   = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $status = (int)$m[1]; break; }
        }
    }
    return ['status' => $status, 'data' => json_decode($resp ?: '{}', true)];
}

function supabase_get(string $path, string $key): array {
    $url = SUPABASE_URL . $path;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: $key",
                "Authorization: Bearer $key",
                "Accept: application/json",
            ],
        ]);
        $resp   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx  = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => "apikey: $key\r\nAuthorization: Bearer $key\r\nAccept: application/json",
            'timeout'       => 15,
            'ignore_errors' => true,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp   = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $status = (int)$m[1]; break; }
        }
    }
    return ['status' => $status, 'data' => json_decode($resp ?: '[]', true)];
}

function supabase_patch(string $path, array $payload, string $key): array {
    $url  = SUPABASE_URL . $path;
    $body = json_encode($payload);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => [
                "apikey: $key",
                "Authorization: Bearer $key",
                "Content-Type: application/json",
                "Accept: application/json",
            ],
        ]);
        $resp   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $ctx  = stream_context_create(['http' => [
            'method'        => 'PATCH',
            'header'        => "apikey: $key\r\nAuthorization: Bearer $key\r\nContent-Type: application/json\r\nAccept: application/json",
            'content'       => $body,
            'timeout'       => 15,
            'ignore_errors' => true,
        ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
        $resp   = @file_get_contents($url, false, $ctx);
        $status = 0;
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $h, $m)) { $status = (int)$m[1]; break; }
        }
    }
    return ['status' => $status, 'data' => json_decode($resp ?: '{}', true)];
}

// ── Logout handler ───────────────────────────────────────────────────────────
if (isset($_GET['logout'])) {
    if (!empty($_SESSION['username'])) {
        $username = $_SESSION['username'];
        $role = $_SESSION['role'] ?? 'admin';
        $clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $clientIp = trim(explode(',', $clientIp)[0]);

        $logPayload = [
            'record_table' => 'system',
            'record_id'    => $username,
            'action_type'  => 'logout',
            'fields'       => "IP: {$clientIp}",
            'record_name'  => $username,
            'performed_by' => ucfirst($role)
        ];
        supabase_post('/rest/v1/audit_logs', $logPayload, SUPABASE_ANON_KEY);
    }
    session_unset();
    session_destroy();
    header('Location: index.php');
    exit;
}

// ── Auth redirect if already logged in ───────────────────────────────────────
if (!empty($_SESSION['is_logged_in'])) {
    $role = $_SESSION['role'] ?? 'admin';
    if ($role === 'clerk') {
        header('Location: clerk/index.php');
        exit;
    } elseif ($role === 'treasurer') {
        header('Location: treasurer/index.php');
        exit;
    } else {
        header('Location: admin/index.php');
        exit;
    }
}

// ── Rate Limiting ──────────────────────────────────────────────────────────────
$MAX_ATTEMPTS    = 10;
$LOCKOUT_SECONDS = 2 * 60; // 2 minutes
$clientIp        = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$clientIp        = trim(explode(',', $clientIp)[0]); // normalise proxied IPs

if (!isset($_SESSION['rate_limit'])) $_SESSION['rate_limit'] = [];
$rl = &$_SESSION['rate_limit'];

// Clean up stale IP records older than the lockout window
foreach ($rl as $ip => $data) {
    if (time() - ($data['first_at'] ?? 0) > $LOCKOUT_SECONDS) {
        unset($rl[$ip]);
    }
}

$isLockedOut    = false;
$lockoutRemains = 0;
if (isset($rl[$clientIp])) {
    $elapsed = time() - $rl[$clientIp]['first_at'];
    if ($elapsed <= $LOCKOUT_SECONDS && $rl[$clientIp]['count'] >= $MAX_ATTEMPTS) {
        $isLockedOut    = true;
        $lockoutRemains = $LOCKOUT_SECONDS - $elapsed;
    } elseif ($elapsed > $LOCKOUT_SECONDS) {
        // Window expired — reset
        unset($rl[$clientIp]);
    }
}

// ── Login handler ─────────────────────────────────────────────────────────────
$loginError   = '';
$loginSuccess = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if ($isLockedOut) {
        $mins = ceil($lockoutRemains / 60);
        $loginError = "Too many failed attempts. Your IP is temporarily locked. Please try again in {$mins} minute(s).";
    } else {
        // ── Input Sanitization and Validation ──────────────────────────────────
        $rawUsername = $_POST['username'] ?? '';
        $rawPassword = $_POST['password'] ?? '';

        // Strip null bytes
        $rawUsername = str_replace("\0", '', $rawUsername);
        $rawPassword = str_replace("\0", '', $rawPassword);

        // Trim only username, limit lengths
        $username = substr(trim($rawUsername), 0, 100);
        $password = substr($rawPassword, 0, 128); // Do not trim password

        // Validate username characters (alphanumeric, dot, dash, underscore, @)
        if ($username !== '' && !preg_match('/^[\w.\-@]+$/', $username)) {
            $loginError = 'Username contains invalid characters.';
        } elseif ($username === '' || $password === '') {
            $loginError = 'Please enter your username and password.';
        } else {
            $loggedIn  = false;

            // ── Query user status first to see if disabled ────────────────────────
            $encoded  = urlencode($username);
            $userRes  = supabase_get(
                "/rest/v1/users?select=username,password_hash,role,status&username=eq.{$encoded}&limit=1",
                SUPABASE_ANON_KEY
            );

            $userStatus = 'active';
            if ($userRes['status'] === 200 && !empty($userRes['data'][0])) {
                $userStatus = $userRes['data'][0]['status'] ?? 'active';
            }

            if ($userStatus === 'disabled') {
                $loginError = 'Your account has been disabled. Please contact the administrator.';
            } else {
                // ── Strategy 1: public.users table (bcrypt) — PRIMARY ─────────────────
                if ($userRes['status'] === 200 && !empty($userRes['data'][0])) {
                    $row = $userRes['data'][0];
                    if (password_verify($password, $row['password_hash'])) {
                        $loggedIn = true;
                        $_SESSION['role'] = $row['role'] ?? 'admin';
                    }
                }

                // ── Strategy 2: Supabase Auth API — FALLBACK ──────────────────────────
                if (!$loggedIn && ($userRes['status'] !== 200 || empty($userRes['data'][0]))) {
                    $email  = (strtolower($username) === 'admin') ? 'admin@barangay.local' : $username . '@barangay.local';
                    $result = supabase_post('/auth/v1/token?grant_type=password', [
                        'email'    => $email,
                        'password' => $password,
                    ], SUPABASE_ANON_KEY);
 
                    if ($result['status'] >= 200 && $result['status'] < 300 && !empty($result['data']['access_token'])) {
                        $_SESSION['supabase_access_token'] = $result['data']['access_token'];
                        $loggedIn = true;
                        $_SESSION['role'] = strtolower($username) === 'clerk'
                            ? 'clerk' : (strtolower($username) === 'treasurer'
                            ? 'treasurer' : 'admin');
                    }
                }
 
                // ── Strategy 3: Local fallback — used if Supabase is unreachable ───────
                if (!$loggedIn && ($userRes['status'] !== 200 || empty($userRes['data'][0]))) {
                    $localAccounts = [
                        'admin'     => ['password' => 'admin123',     'role' => 'admin'],
                        'clerk'     => ['password' => 'clerk123',     'role' => 'clerk'],
                        'treasurer' => ['password' => 'treasurer123', 'role' => 'treasurer'],
                    ];
                    if (isset($localAccounts[$username]) && $localAccounts[$username]['password'] === $password) {
                        $loggedIn = true;
                        $_SESSION['role'] = $localAccounts[$username]['role'];
                    }
                }
            }

            if ($loggedIn) {
                // ── Success: reset rate limit counter for this IP ──────────────
                unset($rl[$clientIp]);

                session_regenerate_id(true);
                $_SESSION['is_logged_in'] = true;
                $_SESSION['username']     = $username;
                if (empty($_SESSION['role'])) $_SESSION['role'] = 'admin';

                // Update last_login in public.users table (fails silently if column not migrated)
                $now = date('c');
                $encoded = urlencode($username);
                supabase_patch("/rest/v1/users?username=eq.{$encoded}", ['last_login' => $now], SUPABASE_ANON_KEY);

                // Insert into audit_logs table
                $logPayload = [
                    'record_table' => 'system',
                    'record_id'    => $username,
                    'action_type'  => 'login',
                    'fields'       => "IP: {$clientIp}",
                    'record_name'  => $username,
                    'performed_by' => ucfirst($role)
                ];
                supabase_post('/rest/v1/audit_logs', $logPayload, SUPABASE_ANON_KEY);

                $role = $_SESSION['role'];
                if ($role === 'clerk') {
                    header('Location: clerk/index.php');
                } elseif ($role === 'treasurer') {
                    header('Location: treasurer/index.php');
                } else {
                    header('Location: admin/index.php');
                }
                exit;
            } else {
                // Only increment rate limit and show invalid message if it wasn't a disabled account block
                if (empty($loginError)) {
                    // ── Failure: increment rate limit counter ──────────────────────
                    if (!isset($rl[$clientIp])) {
                        $rl[$clientIp] = ['count' => 0, 'first_at' => time()];
                    }
                    $rl[$clientIp]['count']++;

                    $remaining = $MAX_ATTEMPTS - $rl[$clientIp]['count'];
                    if ($rl[$clientIp]['count'] >= $MAX_ATTEMPTS) {
                        $isLockedOut    = true;
                        $lockoutRemains = $LOCKOUT_SECONDS;
                        $loginError = 'Too many failed attempts. Your IP is locked for 2 minutes.';
                    } else {
                        $loginError = 'Invalid username or password. Please try again.'
                            . ($remaining <= 3 ? " ({$remaining} attempt(s) remaining before lockout)" : '');
                    }
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login – Central Barangay Management System</title>
  <meta name="description" content="Secure login portal for the Central Barangay Management System.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --green-dark:  #1b5e20;
      --green-mid:   #2e7d32;
      --green-main:  #388e3c;
      --green-light: #66bb6a;
      --green-pale:  #e8f5e9;
      --white:       #ffffff;
      --gray-100:    #f5f7fa;
      --gray-300:    #d1d5db;
      --gray-500:    #6b7280;
      --gray-700:    #374151;
      --red-err:     #d32f2f;
    }

    html, body {
      height: 100%;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 35%, #43a047 70%, #81c784 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Animated background particles ── */
    body::before {
      content: '';
      position: fixed; inset: 0;
      background:
        radial-gradient(circle at 20% 20%, rgba(255,255,255,.07) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255,255,255,.05) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    /* ── Top banner ── */
    .top-banner {
      position: relative; z-index: 1;
      background: rgba(0,0,0,.25);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,.1);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .top-banner i { color: rgba(255,255,255,.8); font-size: 1rem; }
    .top-banner span {
      color: #fff;
      font-size: .78rem;
      font-weight: 500;
      letter-spacing: .06em;
      text-transform: uppercase;
    }

    /* ── Main layout ── */
    .page-wrap {
      position: relative; z-index: 1;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }

    /* ── Card ── */
    .login-card {
      background: rgba(255,255,255,.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 24px;
      box-shadow: 0 32px 80px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.6);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      animation: slideUp .5s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Card header strip ── */
    .card-header-strip {
      background: linear-gradient(135deg, var(--green-dark), var(--green-main));
      padding: 28px 32px 22px;
      text-align: center;
    }
    .logo-wrap {
      width: 88px; height: 88px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,.4);
      box-shadow: 0 8px 24px rgba(0,0,0,.2);
      margin: 0 auto 14px;
      overflow: hidden;
      background: #fff;
    }
    .logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .card-header-strip h1 {
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      line-height: 1.3;
    }
    .card-header-strip p {
      color: rgba(255,255,255,.7);
      font-size: .75rem;
      margin-top: 4px;
    }

    /* ── Card body ── */
    .card-body {
      padding: 28px 32px 32px;
    }

    /* ── Views ── */
    #viewForgot { display: none; }

    /* ── Form fields ── */
    .field-group { margin-bottom: 16px; }
    .field-group label {
      display: block;
      font-size: .78rem;
      font-weight: 600;
      color: var(--gray-700);
      margin-bottom: 6px;
      letter-spacing: .02em;
    }
    .input-wrap {
      position: relative;
    }
    .input-wrap > i {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--green-main);
      font-size: 1rem;
      pointer-events: none;
    }
    .input-wrap input {
      width: 100%;
      padding: 11px 40px 11px 40px;
      border: 1.5px solid var(--gray-300);
      border-radius: 10px;
      font-size: .9rem;
      font-family: inherit;
      color: var(--gray-700);
      background: var(--gray-100);
      transition: border-color .2s, box-shadow .2s, background .2s;
      outline: none;
    }
    .input-wrap input:focus {
      border-color: var(--green-main);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(56,142,60,.15);
    }
    .input-wrap .toggle-pw {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none; border: none;
      color: var(--gray-500);
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      margin: 0;
      transition: color .2s;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .input-wrap .toggle-pw:hover { color: var(--green-main); }

    /* ── Error alert ── */
    .alert-error {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: .82rem;
      color: var(--red-err);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      animation: shake .35s ease;
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      25%      { transform: translateX(-6px); }
      75%      { transform: translateX(6px); }
    }

    /* ── Buttons ── */
    .btn-primary-login {
      display: block; width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, var(--green-mid), var(--green-main));
      color: #fff;
      font-size: .92rem;
      font-weight: 700;
      letter-spacing: .04em;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: transform .15s, box-shadow .15s, filter .15s;
      box-shadow: 0 4px 16px rgba(46,125,50,.35);
      position: relative;
      overflow: hidden;
    }
    .btn-primary-login:hover {
      filter: brightness(1.07);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(46,125,50,.4);
    }
    .btn-primary-login:active { transform: translateY(0); }
    .btn-primary-login .spinner {
      display: none;
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .6s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .btn-outline {
      display: block; width: 100%;
      margin-top: 10px;
      padding: 10px;
      background: transparent;
      color: var(--green-mid);
      font-size: .82rem;
      font-weight: 600;
      border: 1.5px solid var(--green-mid);
      border-radius: 12px;
      cursor: pointer;
      transition: background .2s, color .2s;
    }
    .btn-outline:hover { background: var(--green-pale); }

    .btn-text {
      background: none; border: none;
      color: var(--green-mid);
      font-size: .8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color .2s;
    }
    .btn-text:hover { color: var(--green-dark); }

    /* ── Divider ── */
    .divider {
      display: flex; align-items: center; gap: 10px;
      margin: 18px 0 14px;
      color: var(--gray-300);
      font-size: .75rem;
    }
    .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--gray-300); }

    /* ── Forgot views ── */
    .forgot-msg {
      font-size: .82rem;
      padding: 8px 12px;
      border-radius: 8px;
      margin-top: 10px;
    }
    .forgot-msg.error   { background:#ffebee; color:var(--red-err); }
    .forgot-msg.success { background:#e8f5e9; color:#2e7d32; }
    .forgot-msg.info    { background:#e3f2fd; color:#1565c0; }

    /* ── Footer ── */
    .card-footer-note {
      text-align: center;
      font-size: .72rem;
      color: var(--gray-500);
      padding: 0 32px 20px;
    }
    .card-footer-note i { color: var(--green-main); }

    /* ── Lockout countdown banner ── */
    .lockout-banner {
      background: #fff3e0;
      border: 1.5px solid #f57c00;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideUp .4s ease both;
    }
    .lockout-banner .lock-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .lockout-banner .lock-text {
      flex: 1;
    }
    .lockout-banner .lock-text strong {
      display: block;
      font-size: .85rem;
      font-weight: 700;
      color: #e65100;
      margin-bottom: 3px;
    }
    .lockout-banner .lock-text span {
      font-size: .78rem;
      color: #bf360c;
    }
    .lockout-countdown {
      font-size: 1.6rem;
      font-weight: 800;
      color: #e65100;
      font-variant-numeric: tabular-nums;
      letter-spacing: .02em;
      flex-shrink: 0;
      min-width: 52px;
      text-align: right;
    }
  </style>
</head>
<body>

<div class="top-banner">
  <i class="bi bi-shield-lock-fill"></i>
  <span>Central Barangay Management System &mdash; Authorized Access Only</span>
</div>

<div class="page-wrap">
  <div class="login-card">

    <div class="card-header-strip">
      <div class="logo-wrap">
        <img src="assets/logo_centtral.jpeg" alt="Barangay Logo" onerror="this.src='icon.png'">
      </div>
      <h1>Barangay Portal</h1>
      <p>Sign in to manage your barangay</p>
    </div>

    <div class="card-body">

      <!-- ── LOGIN VIEW ─────────────────────────────────── -->
      <div id="viewLogin">
        <form id="loginForm" method="POST" action="index.php" autocomplete="off" novalidate>

          <?php if ($isLockedOut): ?>
          <div class="lockout-banner" id="lockoutBanner">
            <div class="lock-icon">🔒</div>
            <div class="lock-text">
              <strong>Too Many Failed Attempts</strong>
              <span>Your access is temporarily locked. Please try again in <strong>2 minutes</strong>.</span>
            </div>
          </div>
          <?php elseif (!empty($loginError)): ?>
          <div class="alert-error" role="alert">
            <i class="bi bi-exclamation-circle-fill"></i>
            <?php echo htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8'); ?>
          </div>
          <?php endif; ?>

          <div class="field-group">
            <label for="username">Username</label>
            <div class="input-wrap">
              <i class="bi bi-person-fill"></i>
              <input type="text" id="username" name="username"
                     placeholder="Enter username" required autocomplete="username"
                     value="<?php echo htmlspecialchars($_POST['username'] ?? '', ENT_QUOTES, 'UTF-8'); ?>"
                     <?php if ($isLockedOut) echo 'disabled'; ?>>
            </div>
          </div>

          <div class="field-group">
            <label for="password">Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock-fill"></i>
              <input type="password" id="password" name="password"
                     placeholder="Enter password" required autocomplete="current-password"
                     <?php if ($isLockedOut) echo 'disabled'; ?>>
              <button type="button" class="toggle-pw" id="togglePw" aria-label="Show password"
                      <?php if ($isLockedOut) echo 'disabled'; ?>>
                <i class="bi bi-eye-slash" id="pwIcon"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-primary-login" id="loginBtn"
                  <?php if ($isLockedOut) echo 'disabled style="opacity:.5;cursor:not-allowed;"'; ?>>
            <span id="loginBtnText"><?php echo $isLockedOut ? '🔒 LOCKED' : 'LOGIN'; ?></span>
            <div class="spinner" id="loginSpinner"></div>
          </button>
        </form>

        <div class="divider">or</div>
        <button type="button" class="btn-outline" id="showForgotBtn">
          <i class="bi bi-key me-1"></i> Forgot Password?
        </button>
      </div>

      <!-- ── FORGOT PASSWORD VIEW ───────────────────────── -->
      <div id="viewForgot" style="display:none;">
        <button type="button" class="btn-text mb-3" id="backToLoginBtn">
          <i class="bi bi-arrow-left"></i> Back to Login
        </button>

        <div id="fpStep1">
          <div class="field-group">
            <label for="forgotUsername">Username</label>
            <div class="input-wrap">
              <i class="bi bi-person-fill"></i>
              <input type="text" id="forgotUsername" placeholder="Enter your username">
            </div>
          </div>
          <div class="field-group">
            <label for="forgotEmail">Registered Email Address</label>
            <div class="input-wrap">
              <i class="bi bi-envelope-fill"></i>
              <input type="email" id="forgotEmail" placeholder="yourname@gmail.com">
            </div>
          </div>
          <button type="button" class="btn-primary-login" id="sendOtpBtn">Send OTP</button>
          <div style="text-align: center; margin-top: 12px;">
            <a href="#" id="useRecoveryCodeLink" style="font-size: 13px; color: var(--gold); text-decoration: none; font-weight: 600;">Use Recovery Code instead</a>
          </div>
          <div id="otpInfo" class="forgot-msg info" style="display:none;"></div>
        </div>

        <div id="fpStep2" style="display:none;">
          <div class="field-group">
            <label for="forgotOtp">6-Digit OTP</label>
            <div class="input-wrap">
              <i class="bi bi-123"></i>
              <input type="text" id="forgotOtp" maxlength="6" placeholder="Enter OTP">
            </div>
          </div>
          <div class="field-group">
            <label for="newPassword">New Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock-fill"></i>
              <input type="password" id="newPassword" placeholder="Min. 6 characters">
              <button type="button" class="toggle-pw" onclick="togglePwField('newPassword','fpPwIcon1')" aria-label="Show password">
                <i class="bi bi-eye-slash" id="fpPwIcon1"></i>
              </button>
            </div>
          </div>
          <div class="field-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock-fill"></i>
              <input type="password" id="confirmPassword" placeholder="Re-enter password">
              <button type="button" class="toggle-pw" onclick="togglePwField('confirmPassword','fpPwIcon2')" aria-label="Show password">
                <i class="bi bi-eye-slash" id="fpPwIcon2"></i>
              </button>
            </div>
          </div>
          <button type="button" class="btn-primary-login" id="resetPwBtn">Reset Password</button>
          <div id="fpMessage" class="forgot-msg" style="display:none;"></div>
        </div>

        <div id="fpStepRecovery" style="display:none;">
          <div class="field-group">
            <label for="recoveryUsername">Username</label>
            <div class="input-wrap">
              <i class="bi bi-person-fill"></i>
              <input type="text" id="recoveryUsername" placeholder="Enter your username">
            </div>
          </div>
          <div class="field-group">
            <label for="recoveryCode">Recovery Code</label>
            <div class="input-wrap">
              <i class="bi bi-shield-lock-fill"></i>
              <input type="text" id="recoveryCode" placeholder="XXXX-XXXX" maxlength="9" style="text-transform: uppercase;">
            </div>
          </div>
          <div class="field-group">
            <label for="recoveryNewPassword">New Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock-fill"></i>
              <input type="password" id="recoveryNewPassword" placeholder="Min. 6 characters">
              <button type="button" class="toggle-pw" onclick="togglePwField('recoveryNewPassword','rcPwIcon1')" aria-label="Show password">
                <i class="bi bi-eye-slash" id="rcPwIcon1"></i>
              </button>
            </div>
          </div>
          <div class="field-group">
            <label for="recoveryConfirmPassword">Confirm Password</label>
            <div class="input-wrap">
              <i class="bi bi-lock-fill"></i>
              <input type="password" id="recoveryConfirmPassword" placeholder="Re-enter password">
              <button type="button" class="toggle-pw" onclick="togglePwField('recoveryConfirmPassword','rcPwIcon2')" aria-label="Show password">
                <i class="bi bi-eye-slash" id="rcPwIcon2"></i>
              </button>
            </div>
          </div>
          <button type="button" class="btn-primary-login" id="resetPwRecoveryBtn">Reset Password</button>
          <div style="text-align: center; margin-top: 12px;">
            <a href="#" id="backToOtpLink" style="font-size: 13px; color: var(--gold); text-decoration: none; font-weight: 600;">Use Email OTP instead</a>
          </div>
          <div id="recoveryMessage" class="forgot-msg" style="display:none;"></div>
        </div>
      </div>

    </div><!-- /.card-body -->

    <div class="card-footer-note">
      <i class="bi bi-shield-check"></i> Secured with Supabase Authentication
    </div>

  </div><!-- /.login-card -->
</div><!-- /.page-wrap -->

<script>
  // ── Toggle password visibility ──────────────────────────────────────────────
  const togglePw = document.getElementById('togglePw');
  const pwIcon   = document.getElementById('pwIcon');
  const pwInput  = document.getElementById('password');
  if (togglePw) {
    togglePw.addEventListener('click', () => {
      const shown = pwInput.type === 'text';
      pwInput.type = shown ? 'password' : 'text';
      pwIcon.className = shown ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  }

  function togglePwField(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    if (!input || !icon) return;
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    icon.className = shown ? 'bi bi-eye-slash' : 'bi bi-eye';
  }

  // ── Login form spinner ──────────────────────────────────────────────────────
  const loginForm    = document.getElementById('loginForm');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginSpinner = document.getElementById('loginSpinner');
  if (loginForm) {
    loginForm.addEventListener('submit', () => {
      loginBtnText.style.display = 'none';
      loginSpinner.style.display = 'block';
    });
  }

  // ── View switching ──────────────────────────────────────────────────────────
  const viewLogin  = document.getElementById('viewLogin');
  const viewForgot = document.getElementById('viewForgot');

  function showForgot() {
    viewLogin.style.display  = 'none';
    viewForgot.style.display = 'block';
    resetForgotFlow();
  }
  function showLogin() {
    viewForgot.style.display = 'none';
    viewLogin.style.display  = 'block';
  }
  function resetForgotFlow() {
    document.getElementById('fpStep1').style.display = 'block';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStepRecovery').style.display = 'none';
    document.getElementById('forgotUsername').value = '';
    document.getElementById('forgotEmail').value = '';
    document.getElementById('recoveryUsername').value = '';
    document.getElementById('recoveryCode').value = '';
    document.getElementById('recoveryNewPassword').value = '';
    document.getElementById('recoveryConfirmPassword').value = '';
    const info = document.getElementById('otpInfo');
    info.style.display = 'none'; info.textContent = '';
    const msg = document.getElementById('fpMessage');
    msg.style.display = 'none'; msg.textContent = '';
    const recMsg = document.getElementById('recoveryMessage');
    recMsg.style.display = 'none'; recMsg.textContent = '';
  }

  document.getElementById('showForgotBtn').addEventListener('click', showForgot);
  document.getElementById('backToLoginBtn').addEventListener('click', showLogin);

  // Toggle between Recovery Code and OTP
  document.getElementById('useRecoveryCodeLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('fpStep1').style.display = 'none';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStepRecovery').style.display = 'block';
  });

  document.getElementById('backToOtpLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('fpStepRecovery').style.display = 'none';
    document.getElementById('fpStep1').style.display = 'block';
  });

  // Automatically insert hyphen in recovery code input as user types
  document.getElementById('recoveryCode').addEventListener('input', (e) => {
    let val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (val.length > 4) {
      val = val.substring(0, 4) + '-' + val.substring(4, 8);
    }
    e.target.value = val.substring(0, 9);
  });

  // ── OTP flow ────────────────────────────────────────────────────────────────
  document.getElementById('sendOtpBtn').addEventListener('click', () => {
    const username = document.getElementById('forgotUsername').value.trim();
    const email    = document.getElementById('forgotEmail').value.trim();
    const info     = document.getElementById('otpInfo');

    if (!username) {
      info.className = 'forgot-msg error';
      info.textContent = 'Please enter your username.';
      info.style.display = 'block';
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      info.className = 'forgot-msg error';
      info.textContent = 'Please enter a valid email address.';
      info.style.display = 'block';
      return;
    }

    info.className = 'forgot-msg info';
    info.textContent = 'Sending verification code...';
    info.style.display = 'block';

    fetch('admin/api/forgot_password_send.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to send verification code.');
        
        info.className = 'forgot-msg success';
        info.textContent = data.message || 'OTP sent! Check your inbox.';
        setTimeout(() => {
          document.getElementById('fpStep1').style.display = 'none';
          document.getElementById('fpStep2').style.display = 'block';
        }, 1000);
      })
      .catch((err) => {
        info.className = 'forgot-msg error';
        info.textContent = err.message;
      });
  });

  document.getElementById('resetPwBtn').addEventListener('click', () => {
    const otp  = document.getElementById('forgotOtp').value.trim();
    const np   = document.getElementById('newPassword').value;
    const cp   = document.getElementById('confirmPassword').value;
    const msg  = document.getElementById('fpMessage');

    const show = (txt, cls) => {
      msg.className = 'forgot-msg ' + cls;
      msg.textContent = txt;
      msg.style.display = 'block';
    };

    if (!otp || otp.length !== 6) return show('Please enter the 6-digit OTP code.', 'error');
    if (np.length < 6)             return show('Password must be at least 6 characters.', 'error');
    if (np !== cp)                 return show('Passwords do not match.', 'error');

    show('Resetting password...', 'info');

    fetch('admin/api/forgot_password_verify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, new_password: np, confirm_password: cp })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to reset password.');

        show(data.message || 'Password updated successfully! Redirecting...', 'success');
        setTimeout(showLogin, 1800);
      })
      .catch((err) => {
        show(err.message, 'error');
      });
  });

  // ── Recovery Code flow ──────────────────────────────────────────────────────
  document.getElementById('resetPwRecoveryBtn').addEventListener('click', () => {
    const username = document.getElementById('recoveryUsername').value.trim();
    const code     = document.getElementById('recoveryCode').value.trim();
    const np       = document.getElementById('recoveryNewPassword').value;
    const cp       = document.getElementById('recoveryConfirmPassword').value;
    const msg      = document.getElementById('recoveryMessage');

    const show = (txt, cls) => {
      msg.className = 'forgot-msg ' + cls;
      msg.textContent = txt;
      msg.style.display = 'block';
    };

    if (!username)        return show('Please enter your username.', 'error');
    if (code.length !== 9) return show('Please enter a valid recovery code (format: XXXX-XXXX).', 'error');
    if (np.length < 6)     return show('Password must be at least 6 characters.', 'error');
    if (np !== cp)         return show('Passwords do not match.', 'error');

    show('Resetting password...', 'info');

    fetch('admin/api/forgot_password_recovery.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, recovery_code: code, new_password: np, confirm_password: cp })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to reset password.');

        show(data.message || 'Password updated successfully! Redirecting...', 'success');
        setTimeout(showLogin, 1800);
      })
      .catch((err) => {
        show(err.message, 'error');
      });
  });

  // ── Lockout auto-unlock (silent timer) ──────────────────────────────────────────
  (function () {
    const banner    = document.getElementById('lockoutBanner');
    const loginBtn  = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginBtnText');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePwBtn   = document.getElementById('togglePw');

    if (!banner) return; // not locked out, nothing to do

    let remaining = <?php echo (int)$lockoutRemains; ?>; // seconds from PHP

    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        // ── Unlock the form without a page reload ──
        banner.style.transition = 'opacity .5s';
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);

        if (usernameInput) { usernameInput.disabled = false; usernameInput.focus(); }
        if (passwordInput) { passwordInput.disabled = false; }
        if (togglePwBtn)   { togglePwBtn.disabled = false; }
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.style.opacity = '';
          loginBtn.style.cursor = '';
        }
        if (loginText) loginText.textContent = 'LOGIN';
      }
    }, 1000);
  })();
</script>
</body>
</html>
