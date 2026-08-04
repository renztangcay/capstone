<?php
if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: application/json');

include __DIR__ . '/../includes/db.php';

define('SUPABASE_URL',        'https://tkizkixcpfndytpkgfrd.supabase.co');
define('SUPABASE_ANON_KEY',   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraXpraXhjcGZuZHl0cGtnZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY5MTgsImV4cCI6MjA5NDE4MjkxOH0.R2rCcQImxfgCP6z8crUOOl5KIjxjwnj32on8bUfuWB0');

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

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$username = trim($input['username'] ?? '');
$email    = trim($input['email'] ?? '');

if (empty($username) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and email are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

// Check if username exists in database and fetch registered email
$encoded = urlencode($username);
$res = supabase_get("/rest/v1/users?select=username,email&username=eq.{$encoded}&limit=1", SUPABASE_ANON_KEY);

if ($res['status'] !== 200 || empty($res['data'])) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Username not found in the system.']);
    exit;
}

$dbEmail = trim($res['data'][0]['email'] ?? '');
if (empty($dbEmail) || strcasecmp($dbEmail, $email) !== 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'The email address does not match our records for this username.']);
    exit;
}

// Generate OTP
$otp = (string)rand(100000, 999999);

// Store in session
$_SESSION['forgot_otp']      = $otp;
$_SESSION['forgot_username'] = $username;
$_SESSION['forgot_email']    = $email;
$_SESSION['forgot_expiry']   = time() + 600; // 10 minutes

// ── Gmail SMTP via cURL ──────────────────────────────────────────────────
define('GMAIL_USER', 'senpairenz556@gmail.com');
define('GMAIL_PASS', 'wdadpdzumekawyea');

$fromName = 'Barangay Central Portal';
$subject  = 'Reset Your Password - Barangay Central';

$htmlBody = '<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:10px;padding:30px;border:1px solid #e0e0e0;">
    <h2 style="color:#1e3d59;text-align:center;margin-bottom:4px;">Barangay Central</h2>
    <p style="text-align:center;color:#888;font-size:13px;margin-top:0;">Account Recovery</p>
    <hr style="border:none;border-top:2px solid #c8a84b;margin:20px 0;">
    <p style="color:#333;">Hello <strong>' . htmlspecialchars($username) . '</strong>,</p>
    <p style="color:#333;">You have requested to reset your password. Use the verification code below to proceed:</p>
    <div style="background:#f9f9f9;border:2px dashed #c8a84b;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1e3d59;">' . $otp . '</span>
    </div>
    <p style="color:#666;font-size:13px;">&#9203; This code will expire in <strong>10 minutes</strong>.</p>
    <p style="color:#999;font-size:12px;">If you did not request a password reset, please ignore this email or contact support.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p style="color:#bbb;font-size:11px;text-align:center;">Barangay Central Portal &mdash; Automated Security Message</p>
  </div>
</body></html>';

$date     = date('r');
$rawEmail  = "Date: {$date}\r\n";
$rawEmail .= "To: {$email}\r\n";
$rawEmail .= "From: {$fromName} <" . GMAIL_USER . ">\r\n";
$rawEmail .= "Subject: {$subject}\r\n";
$rawEmail .= "MIME-Version: 1.0\r\n";
$rawEmail .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
$rawEmail .= $htmlBody;

$pos = 0;
$ch  = curl_init('smtps://smtp.gmail.com:465');
curl_setopt_array($ch, [
    CURLOPT_MAIL_FROM      => '<' . GMAIL_USER . '>',
    CURLOPT_MAIL_RCPT      => ['<' . $email . '>'],
    CURLOPT_USERNAME       => GMAIL_USER,
    CURLOPT_PASSWORD       => GMAIL_PASS,
    CURLOPT_USE_SSL        => CURLUSESSL_ALL,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_UPLOAD         => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_READFUNCTION   => function($ch, $fp, $length) use (&$rawEmail, &$pos) {
        $chunk = substr($rawEmail, $pos, $length);
        $pos  += strlen($chunk);
        return $chunk;
    },
    CURLOPT_INFILESIZE     => strlen($rawEmail),
]);

curl_exec($ch);
$curlErrNo = curl_errno($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlErrNo !== 0) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to send reset email: ' . $curlError]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Verification code sent! Please check your email inbox.']);
